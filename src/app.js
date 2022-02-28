import yargs from 'yargs';
import os from 'os';
import { URL } from 'url';
import Version from './version.js';
import Console from './console/index.js';
import { commands as adminCommands } from './commands/admin/index.js';
import { commands as accountCommands } from './commands/account/index.js';
import { commands as tunnelCommands } from './commands/tunnel/index.js';

export const validate_url = (str) => {
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

export const validate_bool = (bool) => {
    const isTrue = /^\s*(true|1|on|yes|enabled?)\s*$/i.test(bool);
    const isFalse = /^\s*(false|0|off|no|disabled?)\s*$/i.test(bool);
    if (!isTrue && !isFalse) {
        console.log(`Boolean expression expected - got ${bool}`)
        process.exit(-1);
    }
    return isTrue;
}

export const validate_array = (arrayish) => {
    const array = arrayish?.split(',').filter((x) => x.length > 0);
    return array;
}

const parse = (args, cons, callback) => {
    const version = Version.version;
    let versionStr = `version: ${version.version} (pkg ${version.package})`;
    versionStr += version?.build?.commit ? `\ncommit: ${version?.build?.commit}/${version?.build?.branch}` : '';
    versionStr += version?.build?.date ? `\ntimestamp: ${version.build.date}` : '';

    return yargs(args)
        .env("EXPOSR")
        .version(versionStr)
        .middleware([
            async (argv) => {
                await cons.init(argv['non-interactive'] == false);
                argv.cons = cons;
            }
        ], true)
        .command('account', 'Server account management', (yargs) => {
            return yargs
                .command(accountCommands)
                .demandCommand();
        })
        .command('tunnel', 'Tunnel management', (yargs) => {
            yargs
                .option('account', {
                    alias: 'a',
                    type: 'string',
                    description: 'Account ID'
                })
                .command(tunnelCommands)
                .demandCommand();
        })
        .command('admin', false, (yargs) => {
            return yargs
                .option('api-key', {
                    demandOption: true,
                    type: 'string',
                    description: 'Admin API key',
                })
                .command(adminCommands)
                .demandCommand();
        })
        .demandCommand()
        .option('server', {
              alias: 's',
              type: 'string',
              description: 'Tunnel server API endpoint',
              coerce: (url) => {
                return typeof url == 'string' ? new URL(url) : url;
            },
        })
        .option('non-interactive', {
            type: 'boolean',
            default: false,
            description: 'Use non-interactive console mode',
        })
        .demandOption('server')
        .wrap(process.stdout.columns - 1 || 110)
        .scriptName('exposr')
        .parse(process.argv.slice(2), callback);
}

export default async function run(args) {

    const cb = (err, _, out) => {
        if (process.env.NODE_ENV === 'test') {
            return;
        }

        if (out) {
            process.stdout.write(out + os.EOL);
        }
        if (err) {
            process.exit(-1);
        } else if (out) {
            process.exit(0);
        }
    };

    const cons = new Console();
    await parse(args, cons, cb);
    await cons.shutdown();
    return 0;
}; 