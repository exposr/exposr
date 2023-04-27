import { setTimeout } from 'timers/promises';
import TunnelService from '../../service/tunnel-service.js';
import HttpTransformer from '../../transformer/http-transformer.js';
import TunnelTransport from '../../tunnel/tunnel-transport.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT,
    ERROR_NO_TUNNEL_ENDPOINT,
    ERROR_NO_TUNNEL_TARGET,
    SERVER_ERROR_AUTH_NO_ACCESS_TOKEN,
    SERVER_ERROR_AUTH_PERMISSION_DENIED,
    SERVER_ERROR_TUNNEL_NOT_FOUND
} from '../../utils/errors.js';
import { signalWait } from '../../utils/utils.js';
import { createAccount } from '../account/create.js';
import { configureTunnelHandler } from './configure.js';
import { createTunnel } from './create.js';
import { deleteTunnel } from './delete.js';
import Tunnel from '../../tunnel/tunnel.js';

export const command = 'connect [tunnel-id] [target-url] [options..]';
export const desc = 'Establish tunnel using the WebSocket transport';
export const builder = function (yargs) {
    return yargs
        .positional('tunnel-id', {
            default: null,
            describe: 'Tunnel to create, if no tunnel name is given a random identifier is allocated'
        })
        .positional('target-url', {
            describe: 'Target URL to connect to, if not given will use already configured target'
        })
        .positional('options', {
            default: [],
        })
        .option('insecure', {
            alias: 'k',
            type: 'boolean',
            description: 'Skip target TLS certificate verification',
            default: false,
        })
        .option('http-mode', {
            type: 'boolean',
            default: false,
            description: 'Enable local HTTP parsing mode'
        })
        .option('http-header-replace', {
            alias: 'H',
            type: 'string',
            description: 'Set HTTP header in target request'
        })
        .coerce('http-header-replace', (opt) => {
            const httpHeaders = {};
            const httpHeaderArgs = opt || [];
            (httpHeaderArgs instanceof Array ? httpHeaderArgs : [httpHeaderArgs]).forEach((v) => {
                const kv = v.split(/:(.*)/).map((x) => x.trim())
                if (kv.length === 3) {
                    httpHeaders[kv[0].toLowerCase()] = kv[1];
                }
            })
            return Object.keys(httpHeaders).length > 0 ? httpHeaders : undefined;
        })
        .option('http-header-rewrite', {
            alias: 'R',
            type: 'string',
            description: 'Headers to rewrite URLs in for target requests',
            default: ['host', 'referer', 'origin'],
        })
        .coerce('http-header-rewrite', (opt) => {
            if (opt === undefined) {
                return [];
            }
            return opt instanceof Array ? opt : [opt];
        });
}

export const handler = async function (argv) {
    const cons = argv.cons;

    if (argv['tunnel-id'] == undefined && argv['target-url'] == undefined) {
        throw Error("Need at least one of tunnel-id or target-url");
    }

    // The following hacks are to rearrange the arguments
    // because we're doing things not properly supported by yargs
    if (argv.options.length % 2) {
        argv.options.unshift(argv.targetUrl);
        delete argv['target-url'];
        delete argv['targetUrl'];
    }

    if (argv['tunnel-id'] && !argv['target-url']) {
        try {
            new URL(argv['tunnel-id']);
            argv['target-url'] = argv['targetUrl'] = argv['tunnel-id'];
            argv['tunnel-id'] = argv['tunnelId'] = undefined;
        } catch (e) {
        }
    }

    // Handle the case when only a tunnel id is given
    if (argv['target-url']) {
        try {
            new URL(argv['target-url']);
        } catch (e) {
            // Failed to parse as an URL, assume it's a tunnel id
            argv['tunnel-id'] = argv['target-url'];
            argv.tunnelId = argv['target-url'];
            argv['target-url'] = argv.targetUrl = undefined;
        }
    }

    const configArgs = [
        ...argv.options,
    ];

    if (argv['target-url']) {
        configArgs.push('target-url');
        configArgs.push(argv['target-url']);
    }

    if (!configArgs.includes('ingress-http') && argv['target-url']?.startsWith('http')) {
        configArgs.push('ingress-http');
        configArgs.push('on');
    }

    if (!configArgs.includes('transport-ws')) {
        configArgs.push('transport-ws');
        configArgs.push('on');
    }

    let accountId = argv['account'];
    if (!accountId) {
        const {success, fail} = cons.logger.log(`No account ID provided, creating account...`);
        const res = await createAccount({
            cons: argv.cons,
            server: argv.server,
        }).then((account) => {
            accountId = account?.account_id_hr;
            success(`success (${accountId})`);
            cons.status.success(`Created account ${accountId}`);
            return true;
        }).catch((e) => {
            fail(`failed (${e.message})`);
            cons.status.fail('Failed to create account')
            return false;
        });
        if (!res) {
            return;
        }
    }

    let tunnelId = argv['tunnel-id'];
    let autoCreated = false;
    if (!tunnelId) {
        const {success, fail} = cons.logger.log(`Creating tunnel...`);
        const tunnel = await createTunnel({
            cons: argv.cons,
            account: accountId,
            server: argv.server,
        }).then((tunnel) => {
            autoCreated = true;
            tunnelId = tunnel.id;
            success(`success (${tunnelId})`);
            cons.status.success(`Created tunnel ${tunnelId}`);
            return tunnel;
        }).catch((e) => {
            fail(`failed (${e.message})`);
            cons.status.fail('Failed to create tunnel')
            return undefined;
        });

        if (!tunnel) {
            return;
        }
    }

    const opts = {
        cons: argv.cons,
        server: argv['server'],
        account: accountId,
        tunnelId: tunnelId,
        insecure: argv['insecure'],
        'http-mode': argv['http-mode'],
        'http-header-replace': argv['http-header-replace'],
        'http-header-rewrite': argv['http-header-rewrite'],
    };

    if (!await configureTunnelHandler(opts, configArgs)) {
        return;
    }

    await connectTunnel(opts)
        .catch((e) => {
            cons.log.error(e.message);
            cons.status.fail(`${e.message}`);
        });

    if (autoCreated) {
        const {warn, fail} = cons.logger.log(`Deleting tunnel ${tunnelId}...`);
        await deleteTunnel(opts)
            .then(() => {
                warn('done');
            })
            .catch((e) => {
                fail(`failed (${e.message})`);
                cons.status.fail('Failed to delete tunnel')
            });
    }

    cons.status.success(`Tunnel ${tunnelId} disconnected`);
}

export const connectTunnel = async (args) => {
    const cons = args.cons;

    const rewriteHeaders = args['http-header-rewrite'] || [];
    const replaceHeaders = args['http-header-replace'] || {};
    const transformEnabled = args['http-mode'] && (rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0);
    const transformerStream = (target, ingress) => {
        if (transformEnabled && target && ingress) {
            return new HttpTransformer(target, ingress, rewriteHeaders, replaceHeaders)
        }
    }

    if (args['http-mode']) {
        cons.log.info(`Local HTTP parsing: ${args['http-mode'] ? 'enabled': 'disabled'}`);
        cons.log.info(`HTTP header rewrite: ${rewriteHeaders.join(", ")}`);
        cons.log.info(`HTTP header replace: ${Object.entries(replaceHeaders).map(kv => `${kv[0]}=${kv[1]}`).join(", ") }`);
    }

    await maintainTunnel({
        ...args,
        transformerStream,
    });
}

const maintainTunnel = async (args) => {
    const cons = args.cons;
    cons.status.spinner("Connecting...")

    const tunnelService = new TunnelService(args);

    const getEndpoint = async () => {
        return tunnelService.read(true).then((config) => {
            return [config.transport?.ws?.url];
        }).catch((e) => {
            return [undefined, e];
        });
    };

    const config = await tunnelService.read(true)

    if (config.transport?.ws?.url == undefined) {
        throw new ClientError(ERROR_NO_TUNNEL_ENDPOINT);
    }

    if (config.target?.url == undefined) {
        throw new ClientError(ERROR_NO_TUNNEL_TARGET);
    }

    const maxConnections = config?.transport?.max_connections || 1;

    const tunnel = new Tunnel({
        targetUrl: config.target.url,
        websocketUrl: config.transport.ws.url,
        transformerStream: () => {
            return args.transformerStream(config.target?.url, config.ingress?.http?.url)
        },
        allowInsecure: args.allowInsecure,
        maxTransports: maxConnections,
        getEndpoint,
    });

    const ctx = {
        state: 'init',
        banner: false,
        has_connected: false,
        prev_status: {}
    };

    const handleStatus = (status, source) => {
        switch (ctx.state) {
        case 'init':
            ctx.cons = cons.logger.log(`Connecting tunnel ${config.id}...`);
            ctx.state = 'connecting';
            break;
        case 're-init':
            if (!cons.interactive && !ctx.cons && source == 0) {
                ctx.cons = cons.logger.log(`Attempting to reconnect ${config.id}...`);
            }
            ctx.state = 'connecting';
        case 'connecting':
            if (status.connected) {
                if (ctx.cons) {
                    ctx.cons?.success(`connected to ${config.target.url}`);
                } else {
                }
                if (!ctx.banner) {
                    ctx.banner = true;
                    Object.keys(config.ingress).forEach((ingress) => {
                        const url = config.ingress[ingress]?.url;
                        let urls = config.ingress[ingress]?.urls;
                        if (urls == undefined) {
                            urls = [url];
                        }
                        urls.forEach(url => {
                            cons.log.info(`Ingress ${ingress.toUpperCase()}: ${url}`);
                        });
                    });
                }
                ctx.state = 'connected';
                delete ctx.cons;
            } else {
                const allFailed = status.transports.every((transport) => transport.error != undefined);
                if (allFailed) {
                    const error = status.transports[0].error;
                    ctx.cons?.fail(`failed: ${error.message}`);
                    cons.status.spinner(`Reconnecting tunnel ${config.id}... (${error.message})`)
                    ctx.state = "re-init";
                    delete ctx.cons;
                }
                break;
            }
        case 'connected':
            if (status.connected) {
                cons.status.success(`Tunnel ${config.id} connected to ${config.target.url} (${status.current_connections}/${status.max_connections} connections)`);
                if (!cons.interactive && status.current_connections != ctx.prev_status.current_connections) {
                    const {success} = cons.logger.log(`Tunnel ${config.id} connection ${status.current_connections}/${status.max_connections} connected`);
                    success();
                } else if (cons.interactive && ctx.has_connected && ctx.prev_status.current_connections == 0) {
                    const {success} = cons.logger.log(`Tunnel ${config.id} connection to ${config.target.url} re-established`);
                    success();
                }
                ctx.has_connected = true;
            } else {
                const close = status.transports?.[0]?.closed || "Unknown reason";
                cons.log.warn(`Lost connection to tunnel ${config.id}: ${close}`);
                cons.status.spinner(`Reconnecting tunnel ${config.id}...`);
                ctx.state = 're-init';
            }
            break;
        }
        ctx.prev_status = status;
    };

    tunnel.on('status', handleStatus);

    const cancelSignal = new AbortController();
    await Promise.race([
        signalWait(['SIGINT', 'SIGTERM'], cancelSignal.signal, 'signal'),
        tunnel.connect(cancelSignal.signal)
     ]).finally(() => {
        tunnel.removeListener('status', handleStatus);
        cancelSignal.abort();
     });
};