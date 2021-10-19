import { EventEmitter } from 'events';
import Config from '../config.js';
import { Logger } from '../logger.js';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import HttpTransformer from '../transformer/http-transformer.js';
import Tunnel from '../tunnel.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT,
    ERROR_NO_TUNNEL,
    ERROR_NO_TUNNEL_ENDPOINT,
    ERROR_NO_TUNNEL_UPSTREAM,
    ERROR_UNKNOWN,
    SERVER_ERROR_AUTH_NO_ACCESS_TOKEN,
    SERVER_ERROR_AUTH_PERMISSION_DENIED,
    SERVER_ERROR_TUNNEL_ALREADY_CONNECTED,
    SERVER_ERROR_TUNNEL_NOT_FOUND
} from '../utils/errors.js';
import ConfigureTunnel from './configure-tunnel.js';

const logger = Logger('connect-tunnel');

const establishTunnel = async (ctx) => {
    const isFatal = (err) => {
        const fatalErrors = [
            SERVER_ERROR_AUTH_NO_ACCESS_TOKEN,
            SERVER_ERROR_TUNNEL_NOT_FOUND,
            SERVER_ERROR_TUNNEL_ALREADY_CONNECTED,
            SERVER_ERROR_AUTH_PERMISSION_DENIED,
            ERROR_NO_TUNNEL_ENDPOINT,
            ERROR_NO_ACCOUNT,
        ];
        return fatalErrors.includes(err.code);
    }

    const opts = {
        transformerStream: () => {
            return ctx.transformerStream(ctx.config.ingress?.http?.url)
        },
        allowInsecure: ctx.allowInsecure,
    };

    const reconnect = (ctx) => {
        if (ctx.timer || ctx.terminate) {
            return false;
        }
        ctx.refreshConfig = true;
        ctx.timer = setTimeout(() => {
            ctx.timer = undefined;
            establishTunnel(ctx);
        }, ctx.wasEstablished ? 0 : 1000);
        ctx.wasEstablished = false;
        return true;
    }

    const terminate = (ctx, err) => {
        if (err) {
            ctx.lastErr = err;
        }
        ctx.terminate = true;
        ctx.timer && clearTimeout(ctx.timer);
        ctx.timer = undefined;
        ctx.event.emit('terminate');
    };

    const tunnelService = new TunnelService();
    const res = await tunnelService.read(ctx.refreshConfig);
    if (res instanceof Error) {
        isFatal(res) ? terminate(ctx, res) : reconnect(ctx);
        return;
    }

    ctx.config = res;
    ctx.refreshConfig = false;
    if (ctx.config?.transport?.ws?.url == undefined) {
        terminate(ctx, new ClientError(ERROR_NO_TUNNEL_ENDPOINT));
        return;
    }

    if (ctx.config?.upstream?.url == undefined) {
        terminate(ctx, new ClientError(ERROR_NO_TUNNEL_UPSTREAM));
        return;
    }

    const tunnel = ctx.tunnel = new Tunnel(ctx.config.upstream.url, opts);
    tunnel.on('open', (endpoint) => {
        logger.info(`Tunnel established to ${ctx.config.upstream.url}`);
        Object.keys(ctx.config.ingress).forEach((ingress) => {
            const url = ctx.config.ingress[ingress]?.url;
            const urls = ctx.config.ingress[ingress]?.urls;
            if (urls) {
                urls.forEach(url => {
                    logger.info(`Ingress ${ingress.toUpperCase()}: ${url}`);
                });
            }
            else if (url) {
                logger.info(`Ingress ${ingress.toUpperCase()}: ${url}`);
            }
        });
        ctx.established = true;
        ctx.refreshConfig = true;
        ctx.lastErr = undefined;
    });
    tunnel.on('close', (endpoint, wasEstablished) => {
        ctx.established = false;
        ctx.wasEstablished = wasEstablished;
        if (reconnect(ctx) && wasEstablished) {
            logger.info("Tunnel connection lost, re-connecting");
        }
    });
    tunnel.on('error', (err) => {
        if (!ctx.lastErr || ctx.lastErr.code != err.code) {
            if (!ctx.established) {
                logger.error(`Could not establish tunnel: ${err.message}`);
            } else {
                logger.error(`Tunnel request failed: ${err.message}`);
            }
        }

        ctx.lastErr = err;
        ctx.refreshConfig = true;

        if ((err instanceof Error) && isFatal(err)) {
            terminate(ctx, err);
        } else {
            reconnect(ctx);
        }
    });

    logger.debug(`Connecting to ${ctx.config.transport.ws.url}`);
    tunnel.connect(ctx.config.transport.ws.url);
};

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        logger.trace("No account provided");
        return new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService();
    if (!tunnelService.tunnelId) {
        logger.trace("No tunnel provided");
        return new ClientError(ERROR_NO_TUNNEL);
    }

    if (!await ConfigureTunnel()) {
        logger.trace("failed to configure tunnel");
        return new ClientError(ERROR_UNKNOWN);
    }

    const rewriteHeaders = Config.get('http-header-rewrite') || [];
    const replaceHeaders = Config.get('http-header-replace') || {};
    const transformEnabled = Config.get('http-mode') && (rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0);
    const transformerStream = (downstream) => {
        if (transformEnabled && downstream) {
            return new HttpTransformer(Config.get('upstream-url'), downstream, rewriteHeaders, replaceHeaders)
        }
    }

    logger.info(`Local HTTP parsing: ${Config.get('http-mode') ? 'enabled': 'disabled'}`);
    if (Config.get('http-mode')) {
        logger.info(`HTTP header rewrite: ${rewriteHeaders.join(", ")}`);
        logger.info(`HTTP header replace: ${Object.entries(replaceHeaders).map(kv => `${kv[0]}=${kv[1]}`).join(", ") }`);
    }

    const ctx = {
        allowInsecure: Config.get('insecure'),
        transformerStream,
        established: false,
        event: new EventEmitter(),
    };
    establishTunnel(ctx);

    const sigHandler = () => {
        ctx.terminate = true;
        ctx.tunnel.disconnect();
        ctx.timer && clearTimeout(ctx.timer);
        ctx.lastErr = undefined;
        ctx.refreshConfig = true;
        ctx.event.emit('terminate');
    };
    process.on('SIGTERM', sigHandler);
    process.on('SIGINT', sigHandler);

    await new Promise((resolve) => {
        ctx.event.once('terminate', resolve);
    });

    return ctx.lastErr;
}