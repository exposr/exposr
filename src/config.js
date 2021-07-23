import yargs from 'yargs';
import { URL } from 'url';
import Version from './version.js';

const validate_url = (str) => {
    try {
        const url = new URL(str);
        if (url.protocol.startsWith('tcp') && url.port == '') {
            throw new Error(`Port required for protocol ${url.protocol.slice(0, -1)}`);
        }

        return url;
    } catch (err) {
        console.log(`${str}: ${err.message}`);
        process.exit(-1);
    }
}

const validate_bool = (bool) => {
    const isTrue = /^\s*(true|1|on)\s*$/i.test(bool);
    const isFalse = /^\s*(false|0|off)\s*$/i.test(bool);
    if (!isTrue && !isFalse) {
        console.log(`Boolean expression expected - got ${bool}`)
        process.exit(-1);
    }
    return isTrue;
}

const args = yargs
    .env("EXPOSR")
    .version(false)
    .option('version', {
        alias: 'v',
        describe: 'Show version information',
        coerce: () => {
            const version = Version.version;
            console.log(`version: ${version.version} (pkg ${version.package})`);
            version?.build?.commit && console.log(`commit: ${version?.build?.commit}/${version?.build?.branch}`);
            version?.build?.date && console.log(`timestamp: ${version.build.date}`);
            process.exit(0);
        }
    })
    .command('tunnel <upstream-url> [tunnel-id]', 'Create and connect tunnel using Websocket transport', (yargs) => {
        yargs.positional('upstream-url', {
            describe: 'Target URL to connect tunnel to',
            coerce: validate_url,
        }),
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to create, random name if not specified'
        }),
        yargs.option('ingress', {
            type: 'string',
            choices: ['http', 'sni'],
            default: 'http',
            description: 'Ingress method to request from server',
            coerce: (value) => {
                return typeof value === 'string' ? [value] : value;
            },
        }),
        yargs.example([
            ['$0 tunnel http://example.com', 'Create a random tunnel and connect to example.com'],
            ['$0 tunnel https://example.com example', 'Create tunnel example and connect to example.com over https'],
        ])
    }, (argv) => {
        argv.ingress.forEach((ingress) => argv[`ingress-${ingress}`] = true);
        argv['transport-ws'] = true;
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
        }),
        yargs.option('upstream-url', {
            describe: 'Set upstream target url'
        })
    })
    .command('configure-tunnel <tunnel-id> <option> <value>', 'Set tunnel configuration', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel to configure'
        }),
        yargs.positional('option', {
            describe: 'Configuration option to set',
            choices: [
                'upstream-url',
                'transport-ws',
                'transport-ssh',
                'ingress-http',
                'ingress-sni',
            ],
        }),
        yargs.positional('value', {
            implies: 'option',
            type: 'string',
        }),
        yargs.example([
            ['$0 configure-tunnel example upstream-url https://example.com', ''],
        ])
    }, (argv) => {
        const fn = {
            'upstream-url': validate_url,
            'transport-ws': validate_bool,
            'transport-ssh': validate_bool,
            'ingress-http': validate_bool,
            'ingress-sni': validate_bool,
        }

        argv[argv.option] = fn[argv.option](argv.value);
        delete argv.value;
    })
    .command('connect-tunnel <tunnel-id> [upstream-url]', 'Establish connection to existing tunnel using Websocket transport', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel to connect to'
        }),
        yargs.positional('upstream-url', {
            describe: 'Target URL to connect tunnel to',
            coerce: validate_url,
        }),
        yargs.option('ingress', {
            type: 'string',
            choices: ['http', 'sni'],
            default: 'http',
            description: 'Ingress method to request from server',
            coerce: (value) => {
                return typeof value === 'string' ? [value] : value;
            },
        }),
        yargs.example([
            ['$0 connect-tunnel example https://example.com', 'Connect tunnel example to https://example.com'],
        ])
    }, (argv) => {
        argv.ingress.forEach((ingress) => argv[`ingress-${ingress}`] = true);
        argv['transport-ws'] = true;
    })
    .command('disconnect-tunnel <tunnel-id>', 'Disconnect a connected tunnel', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to disconnect'
        })
    })
    .command('tunnel-info <tunnel-id>', 'Read state of existing tunnel', (yargs) => {
        yargs.positional('tunnel-id', {
            describe: 'Tunnel ID to read'
        })
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
    .scriptName('exposr')
class Config {
    constructor() {
        this._config = args.argv;
    }

    get(key) {
        return this._config[key];
    }

    has(key) {
        return this._config[key] != undefined;
    }

}

export default new Config();