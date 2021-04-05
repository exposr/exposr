import hri from 'human-readable-ids';
import Config from './config.js';
import HttpTransformer from './http-transformer.js';
import { Tunnel, Errors as TunnelErrors } from './tunnel.js';
import { TunnelManager, Errors as TunnelManagerErrors } from './tunnel-manager.js';

const tunnelManager = new TunnelManager(Config.get('server'));

const createAndEstablish = async (ctx) => {
    const opts = {
        transformerStream: ctx.transformerStream,
        allowInsecure: ctx.allowInsecure,
    };
    const tunnel = new Tunnel(ctx.upstream, opts);
    tunnel.on('open', (endpoint) => {
        console.log(`Tunnel established: ${ctx.tunnelConfig.ingress.http.url} <> ${ctx.upstream}`);
        ctx.established = true;
    });
    tunnel.on('close', (endpoint, wasEstablished) => {
        ctx.established = false;
        ctx.wasEstablished = wasEstablished;
        wasEstablished &&
            console.log("Tunnel connection lost, re-connecting");
        setTimeout(() => {
            createAndEstablish(ctx);
        }, wasEstablished ? 0 : 1000);
    });
    tunnel.on('error', (err) => {
        if (!ctx.lastTunnelErr || ctx.lastTunnelErr.code != err.code) {
            if (!ctx.established) {
                console.log(`Could not establish tunnel: ${err.message}`);
            } else {
                console.log(`Tunnel request failed: ${err.message}`);
            }
        }
        ctx.lastTunnelErr = err;
    });

    tunnelManager.create(ctx.tunnelId).then((tunnelConfig) => {
        console.log(`Tunnel '${ctx.tunnelId}' allocated, establishing tunnel...`)
        ctx.tunnelConfig = tunnelConfig;
        tunnel.connect(tunnelConfig.endpoints.ws.url);
    }).catch((err) => {
        if (!ctx.lastTunnelManagerErr || ctx.lastTunnelManagerErr.code != err.code) {
            console.log(`Failed to allocate tunnel '${ctx.tunnelId}': ${err.message}, retrying`);
        }
        if (err.code === TunnelManagerErrors.ERR_NOT_AUTHORIZED) {
            console.log(`Not authorized to allocate tunnel '${ctx.tunnelId}`);
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
const transformEnabled = rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0;
const transformerStream = () => {
    if (transformEnabled) {
        return new HttpTransformer(Config.get('upstream-url'), rewriteHeaders, replaceHeaders)
    }
}

export default () => {
    if (Config.get('_')[0] === 'tunnel') {
        (async () => {
            const ctx = {
                transformerStream: transformerStream,
                upstream: Config.get('upstream-url'),
                tunnelId: Config.get('tunnel-id') || hri.hri.random(),
                allowInsecure: Config.get('insecure'),
                established: false
            };
            console.log(`Allocating tunnel '${ctx.tunnelId}'`);
            createAndEstablish(ctx);
        })();
    }
}