import hri from 'human-readable-ids';
import Config from './config.js';
import { Logger } from './logger.js';
import HttpTransformer from './http-transformer.js';
import { Tunnel, Errors as TunnelErrors } from './tunnel.js';
import { TunnelManager, Errors as TunnelManagerErrors } from './tunnel-manager.js';

const logger = Logger();
const tunnelManager = new TunnelManager(Config.get('server'));

const createAndEstablish = async (ctx) => {
    const opts = {
        transformerStream: () => { return ctx.transformerStream(ctx.tunnelConfig.ingress.http.url) },
        allowInsecure: ctx.allowInsecure,
    };
    const tunnel = new Tunnel(ctx.upstream, opts);
    tunnel.on('open', (endpoint) => {
        logger.info(`Tunnel established: ${ctx.tunnelConfig.ingress.http.url} <> ${ctx.upstream}`);
        ctx.established = true;
    });
    tunnel.on('close', (endpoint, wasEstablished) => {
        ctx.established = false;
        ctx.wasEstablished = wasEstablished;
        wasEstablished &&
            logger.info("Tunnel connection lost, re-connecting");
        setTimeout(() => {
            createAndEstablish(ctx);
        }, wasEstablished ? 0 : 1000);
    });
    tunnel.on('error', (err) => {
        if (!ctx.lastTunnelErr || ctx.lastTunnelErr.code != err.code) {
            if (!ctx.established) {
                logger.error(`Could not establish tunnel: ${err.message}`);
            } else {
                logger.error(`Tunnel request failed: ${err.message}`);
            }
        }
        ctx.lastTunnelErr = err;
    });

    const tunnelConfig = {
        tunnelId: ctx.tunnelId,
        upstream: ctx.upstream,
        httpMode: Config.get('http-mode'),
    };
    tunnelManager.create(tunnelConfig).then((tunnelConfig) => {
        logger.info(`Tunnel '${ctx.tunnelId}' allocated, establishing tunnel...`)
        ctx.tunnelConfig = tunnelConfig;
        tunnel.connect(tunnelConfig.endpoints.ws.url);
    }).catch((err) => {
        if (!ctx.lastTunnelManagerErr || ctx.lastTunnelManagerErr.code != err.code) {
            logger.error(`Failed to allocate tunnel '${ctx.tunnelId}': ${err.message}, retrying`);
        }
        if (err.code === TunnelManagerErrors.ERR_NOT_AUTHORIZED) {
            logger.error(`Not authorized to allocate tunnel '${ctx.tunnelId}`);
        } else {
            setTimeout(() => {
                createAndEstablish(ctx);
            }, 2000)
        }
        ctx.lastTunnelManagerErr = err;
    });
};

const rewriteHeaders = Config.get('http-header-rewrite') || [];
const replaceHeaders = Config.get('http-header-replace') || {};
const transformEnabled = Config.get('http-mode') && (rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0);
const transformerStream = (downstream) => {
    if (transformEnabled) {
        return new HttpTransformer(Config.get('upstream-url'), downstream, rewriteHeaders, replaceHeaders)
    }
}

export default () => {
    if (Config.get('_')[0] === 'tunnel') {
        logger.info(`Upstream target: ${Config.get('upstream-url')}`);
        logger.info(`HTTP mode: ${Config.get('http-mode') ? 'enabled': 'disabled'}`);
        if (Config.get('http-mode')) {
            logger.info(`HTTP header rewrite: ${rewriteHeaders.join(", ")}`);
            logger.info(`HTTP header replace: ${Object.entries(replaceHeaders).map(kv => `${kv[0]}=${kv[1]}`).join(", ") }`);
        }
        (async () => {
            const ctx = {
                transformerStream: transformerStream,
                upstream: Config.get('upstream-url'),
                tunnelId: Config.get('tunnel-id') || hri.hri.random(),
                allowInsecure: Config.get('insecure'),
                established: false
            };
            logger.info(`Allocating tunnel '${ctx.tunnelId}'`);
            createAndEstablish(ctx);
        })();
    }
}