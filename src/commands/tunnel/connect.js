import { setTimeout } from 'timers/promises';
import TunnelService from '../../service/tunnel-service.js';
import HttpTransformer from '../../transformer/http-transformer.js';
import Tunnel from '../../tunnel.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT,
    ERROR_NO_TUNNEL_ENDPOINT,
    ERROR_NO_TUNNEL_UPSTREAM,
    SERVER_ERROR_AUTH_NO_ACCESS_TOKEN,
    SERVER_ERROR_AUTH_PERMISSION_DENIED,
    SERVER_ERROR_TUNNEL_NOT_FOUND
} from '../../utils/errors.js';
import { signalWait } from '../../utils/utils.js';
import { createAccount } from '../account/create.js';
import { configureTunnelHandler } from './configure.js';
import { createTunnel } from './create.js';
import { deleteTunnel } from './delete.js';

export const command = 'connect [tunnel-id] [upstream-url] [options..]';
export const desc = 'Establish tunnel using the WebSocket transport';
export const builder = function (yargs) {
    return yargs
        .positional('tunnel-id', {
            default: null,
            describe: 'Tunnel to create, if no tunnel name is given a random identifier is allocated'
        })
        .positional('upstream-url', {
            describe: 'Target URL to connect to, if not given will use already configured target'
        })
        .positional('options', {
            default: [],
        })
        .option('insecure', {
            alias: 'k',
            type: 'boolean',
            description: 'Skip upstream TLS certificate verification',
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
            description: 'Set HTTP header in upstream request'
        })
        .coerce('http-header-replace', (opt) => {
            const httpHeaders = {};
            const httpHeaderArgs = opt || [];
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
            description: 'Headers to rewrite URLs in for upstream requests',
            default: ['host', 'referer', 'origin'],
        })
        .coerce('http-header-rewrite', (opt) => {
            if (opt === undefined) {
                return [];
            }
            return opt instanceof Array ? opt : [opt];
        })

}
export const handler = async function (argv) {
    const cons = argv.cons;

    // The following hacks are to rearrange the arguments
    // because we're doing things not properly supported by yargs
    if (argv.options.length % 2) {
        argv.options.unshift(argv.upstreamUrl);
        delete argv['upstream-url'];
        delete argv['upstreamUrl'];
    }

    if (argv['tunnel-id'] && !argv['upstream-url']) {
        try {
            new URL(argv['tunnel-id']);
            argv['upstream-url'] = argv['upstreamUrl'] = argv['tunnel-id'];
            argv['tunnel-id'] = argv['tunnelId'] = undefined;
        } catch (e) {
        }
    }

    // Handle the case when only a tunnel id is given
    if (argv['upstream-url']) {
        try {
            new URL(argv['upstream-url']);
        } catch (e) {
            // Failed to parse as an URL, assume it's a tunnel id
            argv['tunnel-id'] = argv['upstream-url'];
            argv.tunnelId = argv['upstream-url'];
            argv['upstream-url'] = argv.upstreamUrl = undefined;
        }
    }

    const configArgs = [
        ...argv.options,
    ];

    if (argv['upstream-url']) {
        configArgs.push('upstream-url');
        configArgs.push(argv['upstream-url']);
    }

    if (!configArgs.includes('ingress-http') && argv['upstream-url']?.startsWith('http')) {
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
        await createAccount({
            cons: argv.cons,
            server: argv.server,
        }).then((account) => {
            accountId = account?.account_id_hr;
            success(`success (${accountId})`);
            cons.status.success(`Created account ${accountId}`);
        }).catch((e) => {
            fail(`failed (${e.message})`);
            cons.status.fail('Failed to create account')
        });
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
        }).catch((e) => {
            fail(`failed (${e.message})`);
            cons.status.fail('Failed to create tunnel')
        });
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
    const transformerStream = (upstream, downstream) => {
        if (transformEnabled && upstream && downstream) {
            return new HttpTransformer(upstream, downstream, rewriteHeaders, replaceHeaders)
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

    const isFatal = (e) => {
        const fatalErrors = [
            SERVER_ERROR_AUTH_NO_ACCESS_TOKEN,
            SERVER_ERROR_TUNNEL_NOT_FOUND,
            SERVER_ERROR_AUTH_PERMISSION_DENIED,
            ERROR_NO_TUNNEL_ENDPOINT,
            ERROR_NO_ACCOUNT,
        ];
        return fatalErrors.includes(e.code);
    }

    let retryDelay = 1000;

    cons.status.spinner("Connecting...")
    while (true) {
        const {success, fail} = cons.logger.log('Establishing tunnel...');
        const [error, res] = await establishTunnel(args)
            .then(({tunnel, config}) => {
                success(`connected to ${config.upstream.url}`);
                Object.keys(config.ingress).forEach((ingress) => {
                    const url = config.ingress[ingress]?.url;
                    const urls = config.ingress[ingress]?.urls;
                    if (urls == undefined) {
                        urls = [url];
                    }
                    urls.forEach(url => {
                        cons.log.info(`Ingress ${ingress.toUpperCase()}: ${url}`);
                    });
                });
                return [undefined, {tunnel, config}];
            })
            .catch((e) => {
                fail(`failed (${e.message})`);
                const reconnect = !(e && isFatal(e));
                return [{reconnect, e}]
            });

        if (error) {
            const {reconnect, e} = error;
            if (!reconnect) {
                e && cons.status.fail(`Failed to establish tunnel: ${e.message}`);
                break;
            }

            const cancelTimeout = new AbortController();
            const cancelSignal = new AbortController();

            const result = await Promise.race([
                setTimeout(1000, 'timeout', { signal: cancelTimeout.signal }),
                signalWait(['SIGINT', 'SIGTERM'], cancelSignal.signal),
            ]).finally(() => {
                cancelTimeout.abort();
                cancelSignal.abort();
            });

            if (result == 'timeout') {
                retryDelay = Math.max(retryDelay * 1.1, 5000);
                continue;
            } else {
                break;
            }
        }

        const {tunnel, config} = res;

        cons.status.success(`Tunnel ${config.id} connected to ${config.upstream.url}`);
        const cancelSignal = new AbortController();
        const cancelDisconnect = new AbortController();
        const disconnectWait = new Promise((resolve) => {
            const closeHandler = () => {
                cons.log.warn(`Lost connection to tunnel ${config.id}`);
                cons.status.spinner("Reconnecting...")
                resolve('reconnect');
            };
            tunnel.once('close', closeHandler);
            cancelDisconnect.signal.addEventListener('abort', () => {
                tunnel.removeListener('close', closeHandler);
                resolve();
            }, {
                once: true,
            });
        });

        const result = await Promise.race([
           signalWait(['SIGINT', 'SIGTERM'], cancelSignal.signal, 'signal'),
           disconnectWait,
        ]).finally(() => {
            cancelSignal.abort();
            cancelDisconnect.abort();
        });

        if (result == 'signal') {
            tunnel.disconnect();
            break;
        }
        retryDelay = 1000;
    }
}

const establishTunnel = async (args) => {
    const tunnelService = new TunnelService(args);

    const config = await tunnelService.read(true)

    if (config.transport?.ws?.url == undefined) {
        throw new ClientError(ERROR_NO_TUNNEL_ENDPOINT);
    }

    if (config.upstream?.url == undefined) {
        throw new ClientError(ERROR_NO_TUNNEL_UPSTREAM);
    }

    if (config?.connection?.connected == true) {
        await tunnelService.disconnect();
    }

    const opts = {
        upstreamUrl: config.upstream.url,
        websocketUrl: config.transport.ws.url,
        transformerStream: () => {
            return args.transformerStream(config.upstream?.url, config.ingress?.http?.url)
        },
        allowInsecure: args.allowInsecure,
    };

    const tunnel = new Tunnel(opts);

    const cancelSignal = new AbortController();
    const cancelConnect = new AbortController();
    return Promise.race([
        signalWait(['SIGINT', 'SIGTERM'], cancelSignal.signal, 'signal'),
        tunnel.connect(cancelConnect.signal),
    ]).then(() => {
        return {tunnel, config};
    }).finally(() => {
        cancelSignal.abort();
        cancelConnect.abort();
    });
}