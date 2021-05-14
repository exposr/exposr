import Tunnel from '../tunnel.js';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import Config from '../config.js';
import Logger from '../logger.js';
import HttpTransformer from '../transformer/http-transformer.js';
import { EventEmitter } from 'events';

const establishTunnel = async (ctx) => {
    const opts = {
        transformerStream: () => {
            return ctx.transformerStream(ctx.config.ingress?.http?.url)
        },
        allowInsecure: ctx.allowInsecure,
    };

    const reconnect = (ctx) => {
        if (ctx.timer) {
            return;
        }
        ctx.timer = setTimeout(() => {
            ctx.timer = undefined;
            establishTunnel(ctx);
        }, ctx.wasEstablished ? 0 : 1000);
    }

    const tunnel = ctx.tunnel = new Tunnel(ctx.upstream, opts);
    tunnel.on('open', (endpoint) => {
        if (ctx.config.ingress?.http?.url) {
            Logger.info(`Tunnel established: ${ctx.config.ingress.http.url} <> ${ctx.upstream}`);
        } else {
            Logger.warn("Tunnel established, but no ingress points returned by server");
        }
        ctx.established = true;
        ctx.refreshConfig = true;
        ctx.lastTunnelErr = undefined;
    });
    tunnel.on('close', (endpoint, wasEstablished) => {
        ctx.established = false;
        ctx.wasEstablished = wasEstablished;
        if (ctx.terminate) {
            return;
        }
        wasEstablished &&
            Logger.info("Tunnel connection lost, re-connecting");
        reconnect(ctx);
    });
    tunnel.on('error', (err) => {
        if (!ctx.lastTunnelErr || ctx.lastTunnelErr.code != err.code) {
            if (!ctx.established) {
                Logger.error(`Could not establish tunnel: ${err.message}`);
            } else {
                Logger.error(`Tunnel request failed: ${err.message}`);
            }
        }
        if (!ctx.established) {
            reconnect(ctx);
        }
        ctx.lastTunnelErr = err;
        ctx.refreshConfig = true;
    });

    const tunnelService = new TunnelService();
    const config = await tunnelService.read(ctx.refreshConfig);
    if (config) {
        ctx.config = config;
        ctx.refreshConfig = false;
    }

    if (ctx.config?.endpoints?.ws?.url == undefined) {
        Logger.error(`No tunnel connection endpoint available`);
        ctx.event.emit('terminate');
        return;
    }

    Logger.debug(`Connecting to ${ctx.config.endpoints.ws.url}`);
    tunnel.connect(ctx.config.endpoints.ws.url);
    return;
};

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        Logger.error("No account provided");
        return false;
    }

    const tunnelService = new TunnelService();
    if (!tunnelService.tunnelId) {
        Logger.error("No tunnel provided");
        return false;
    }

    if (!Config.get('upstream-url')) {
        Logger.error("No upstream target URL provided");
        return false;
    }

    const props = {
        ingress: {
            http: {
                enabled: Config.get('ingress-http'),
            },
        },
        upstream: {
            url: Config.get('upstream-url'),
        }
    }

    if (!await tunnelService.update(props)) {
        Logger.error(`Failed to configure tunnel ${tunnelService.tunnelId}`);
        return false;
    }

    const rewriteHeaders = Config.get('http-header-rewrite') || [];
    const replaceHeaders = Config.get('http-header-replace') || {};
    const transformEnabled = Config.get('http-mode') && (rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0);
    const transformerStream = (downstream) => {
        if (transformEnabled && downstream) {
            return new HttpTransformer(Config.get('upstream-url'), downstream, rewriteHeaders, replaceHeaders)
        }
    }

    Logger.info(`Upstream target: ${Config.get('upstream-url')}`);
    Logger.info(`Local HTTP parsing: ${Config.get('http-mode') ? 'enabled': 'disabled'}`);
    if (Config.get('http-mode')) {
        Logger.info(`HTTP header rewrite: ${rewriteHeaders.join(", ")}`);
        Logger.info(`HTTP header replace: ${Object.entries(replaceHeaders).map(kv => `${kv[0]}=${kv[1]}`).join(", ") }`);
    }

    const ctx = {
        upstream: Config.get('upstream-url'),
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
        ctx.event.emit('terminate');
    };
    process.on('SIGTERM', sigHandler);
    process.on('SIGINT', sigHandler);
    await new Promise((resolve) => {
        ctx.event.once('terminate', resolve);
    });

    return true;
}