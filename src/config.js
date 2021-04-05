import yargs from 'yargs';
import { URL } from 'url';

const args = yargs
    .option('server', {
          alias: 's',
          type: 'string',
          description: 'Tunnel server API endpoint',
          coerce: (url) => {
            try {
                return new URL(url);
            } catch (err) {
                console.log(err.message);
                process.exit(-1);
            }
        },
    })
    .demandOption('server')
    .option('tunnel-id', {
        alias: 'n',
        type: 'string',
        description: 'Tunnel name/identifier'
    })
    .option('insecure', {
        alias: 'k',
        type: 'boolean',
        description: 'Skip upstream TLS certificate verification',
        default: false,
    })
    .option('log-level', {
        type: 'string',
        default: 'info',
        choices: ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'off'],

    })
    .option('log-format', {
        type: 'string',
        default: 'basic',
        choices: ['basic', 'json'],
    })
    .command('tunnel <upstream-url>', '', (yargs) => {
        yargs.positional('upstream-url', {
                describe: 'Upstream target URL'
            })
            .coerce('upstream-url', (url) => {
                try {
                    return new URL(url);
                } catch (err) {
                    console.log(err.message);
                    process.exit(-1);
                }
            })
        }, (argv) => {
            if (argv.verbose) {
                console.info('Establish tunnel to upstream-url');
            }
        }
    )
    .option('http-mode', {
        type: 'boolean',
        description: 'Enable HTTP mode (enabled for HTTP upstream, unless disabled)'
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

class Config {
    constructor() {
        this._config = args.argv;

        if (this._config['http-mode'] === undefined) {
            const proto = this._config['upstream-url'].protocol;
            this._config['http-mode'] = proto == 'http:' || proto == 'https:';
        }
    }

    get(key) {
        return this._config[key];
    }

}

export default new Config();