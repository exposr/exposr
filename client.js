import yargs from 'yargs';
import { URL } from 'url';
import hri from 'human-readable-ids';
import HttpTransformer from './http-transformer.js';
import { Tunnel, Errors as TunnelErrors } from './tunnel.js';
import { TunnelManager, Errors as TunnelManagerErrors } from './tunnel-manager.js';

const parseUrl = (url) => {
    try {
        return new URL(url);
    } catch (err) {
        console.log(err.message);
        process.exit(-1);
    }
};

const argv = yargs.command('tunnel <upstream-url>', '', (yargs) => {
    yargs
        .positional('upstream-url', {
            describe: 'Upstream target URL'
        })
        .coerce('upstream-url', (opt) => {
            return parseUrl(opt);
        })
  }, (argv) => {
    if (argv.verbose) {
        console.info('Establish tunnel to upstream-url');
    }
  })
  .option('server', {
    alias: 's',
    type: 'string',
    description: 'Tunnel server endpoint'
  })
  .coerce('server', (opt) => {
      return parseUrl(opt);
  })
  .demandOption('server')
  .option('tunnel-id', {
      alias: 'i',
      type: 'string',
      description: 'Tunnel ID, name of tunnel'
  })
  .option('insecure', {
      alias: 'k',
      type: 'boolean',
      description: 'Skip upstream TLS certificate verification',
      default: false,
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
    description: 'Headers to rewrite URLs in for upstream requests'
  })
  .coerce('http-header-rewrite', (opt) => {
      if (opt === undefined) {
          return [];
      }
      return opt instanceof Array ? opt : [opt];
  })
  .argv

const tunnelManager = new TunnelManager(argv['server']);

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

const rewriteHeaders = argv['http-header-rewrite'] || [];
const replaceHeaders = argv['http-header-replace'] || {};
const transformEnabled = rewriteHeaders.length > 0 || Object.keys(replaceHeaders).length > 0;
const transformerStream = () => {
    if (transformEnabled) {
        return new HttpTransformer(argv['upstream-url'], rewriteHeaders, replaceHeaders)
    }
}

if (argv._[0] === 'tunnel') {
    (async () => {
        const ctx = {
            transformerStream: transformerStream,
            upstream: argv['upstream-url'],
            tunnelId: argv['tunnel-id'] || hri.hri.random(),
            allowInsecure: argv['insecure'],
            established: false
        };
        console.log(`Allocating tunnel '${ctx.tunnelId}'`);
        createAndEstablish(ctx);
    })();
}