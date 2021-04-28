import yargs from 'yargs';
import { URL } from 'url';

const args = yargs
    .command('tunnel <upstream-url> [tunnel-id]', 'Create and connect tunnel', (yargs) => {
        yargs.positional('upstream-url', {
            describe: 'Target URL to connect tunnel to'
        }),
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to create, random name if not specified'
        }),
        yargs.example([
            ['$0 tunnel http://example.com', 'Create a random tunnel and connect to example.com'],
            ['$0 tunnel https://example.com example', 'Create tunnel example and connect to example.com over https'],
        ])
    })
    .command('create-account', 'Create account at tunnel server', (yargs) => { })
    .command('create-tunnel [tunnel-id]', 'Create tunnel', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to create, if no tunnel id is given a random tunnel is allocated'
        })
    })
    .command('delete-tunnel <tunnel-id>', 'Delete existing tunnel', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to delete'
        })
    })
    .command('connect-tunnel <tunnel-id> <upstream-url>', 'Establish connection to existing tunnel', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to connect to'
        }),
        yargs.positional('upstream-url', {
            describe: 'Target URL to connect tunnel to'
        }),
        yargs.example([
            ['$0 connect-tunnel example https://example.com', 'Connect tunnel example to https://example.com'],
        ])
    })
    .demandCommand()
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
    .option('account', {
        alias: 'a',
        type: 'string',
        description: 'Account ID'
    })
    .option('insecure', {
        alias: 'k',
        type: 'boolean',
        description: 'Skip upstream TLS certificate verification',
        default: false,
    })
    .option('ingress-http', {
        type: 'boolean',
        description: 'Request HTTP ingress from tunnel server (automatic based on upstream URL)'
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
    .coerce('upstream-url', (url) => {
        try {
            return new URL(url);
        } catch (err) {
            console.log(err.message);
            process.exit(-1);
        }
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
    .wrap(110)
class Config {
    constructor() {
        this._config = args.argv;

        if (this._config['ingress-http'] === undefined) {
            const proto = this._config['upstream-url']?.protocol;
            this._config['ingress-http'] = proto == 'http:' || proto == 'https:';
        }
    }

    get(key) {
        return this._config[key];
    }

}

export default new Config();