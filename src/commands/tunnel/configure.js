import merge from 'deepmerge';
import yargs from 'yargs';
import { validate_array, validate_bool, validate_url } from '../../command-execute.js';
import IO from '../../io.js';
import AccountService from '../../service/account-service.js';
import TunnelService from '../../service/tunnel-service.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT,
    ERROR_NO_TUNNEL
} from '../../utils/errors.js';

export const command = 'configure <tunnel-id>';
export const desc = 'Configure an existing tunnel';
export const builder = function (yargs) {
    yargs.command('<tunnel-id> set <options...>', 'Set one or more options', (yargs) => { });
    yargs.command('<tunnel-id> unset <options...>', 'Unset one or more options', (yargs) => { });
    yargs.demandCommand();
    return yargs;
}

export const handler = async function (argv) {
    const args = argv._.slice(3);
    const cmd = argv._[2];
    const opts = {
        io: argv.io,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    };
 
    switch (cmd) {
        case 'set':
            return configureTunnelHandler(opts, args);
        case 'unset':
            return unsetHandler(opts, args);
        default:
            console.log(`unknown command ${cmd}`);
    }
}

const unsetHandler = async (opts, args) => {
};

export const configureTunnelHandler = async function (opts, args) {
    const io = new IO(opts.io.output, opts.io.input);

    const parse_fn = (argv) => {
        return yargs(argv)
            .command('upstream-url <url>', 'Configure the upstream URL for the tunnel', (yargs) => {
                yargs
                    .positional('url', {
                        required: true,
                        type: 'string',
                        coerce: validate_url,
                        description: 'URL of the upstream',
                    })
                    .example('exposr tunnel configure my-tunnel set upstream-url http://example.com');
            }, (argv) => {
                argv['value'] = argv['url'];
            })
            .command('transport-ws <enabled>', 'Enable/disable the WebSocket transport layer',  (yargs) => {
                yargs
                    .positional('enabled', {
                        required: true,
                        type: 'string',
                        coerce: validate_bool,
                        description: 'Boolean to enable/disable'
                    })
                    .example('exposr tunnel configure my-tunnel set transport-ws on')
                    .example('exposr tunnel configure my-tunnel set transport-ws off');
            }, (argv) => {
                argv['value'] = argv['enabled'];
            })
            .command('transport-ssh <enabled>', 'Enable/disable the SSH transport layer',  (yargs) => {
                yargs
                    .positional('enabled', {
                        required: true,
                        type: 'string',
                        coerce: validate_bool,
                        description: 'Boolean to enable/disable'
                    })
                    .example('exposr tunnel configure my-tunnel set transport-ssh on')
                    .example('exposr tunnel configure my-tunnel set transport-ssh off');
            }, (argv) => {
                argv['value'] = argv['enabled'];
            })
            .command('ingress-http <enabled>', 'Enable/disable the HTTP ingress',  (yargs) => {
                yargs
                    .positional('enabled', {
                        required: true,
                        type: 'string',
                        coerce: validate_bool,
                        description: 'Boolean to enable/disable'
                    })
                    .example('exposr tunnel configure my-tunnel set ingress-http on')
                    .example('exposr tunnel configure my-tunnel set ingress-http off');
            }, (argv) => {
                argv['value'] = argv['enabled'];
            })
            .command('ingress-http-altnames <domains>', 'Set HTTP alternative host names for the HTTP ingress',  (yargs) => {
                yargs
                    .positional('domains', {
                        required: true,
                        type: 'string',
                        coerce: validate_array,
                        description: 'Alternative FQDN name or list of FQDN names',
                    })
                    .example('exposr tunnel configure my-tunnel set ingress-http-altnames sub.example.com')
                    .example('exposr tunnel configure my-tunnel set ingress-http-altnames sub.example.com,sub2.example.com');
            }, (argv) =>  {
                argv['value'] = argv['domains'];
            })
            .command('ingress-sni <enabled>', 'Enable/disable the SNI ingress',  (yargs) => {
                yargs
                    .positional('enabled', {
                        required: true,
                        type: 'string',
                        coerce: validate_bool,
                        description: 'Boolean to enable/disable'
                    })
                    .example('exposr tunnel configure my-tunnel set ingress-sni on')
                    .example('exposr tunnel configure my-tunnel set ingress-sni off');
            }, (argv) => {
                argv['value'] = argv['enabled'];
            })
            .demandCommand()
            .version(false)
            .wrap(opts?.io?.output?.columns - 1 || 110)
            .scriptName('exposr tunnel configure <tunnel-id>')
            .parse();
    };

    const parsed = {}; 
    do {
        const res = parse_fn(args.slice(0, 2));
        if (res) {
            parsed[res._] = res.value;
        }
        args = args.slice(2);
    } while (args.length != 0);

    const result = await configureTunnel(opts, parsed)
        .then(() => {
            io.success(`Tunnel ${opts.tunnelId} configured`);
            return true;
        })
        .catch((e) => {
            io.error(`${e.message}`);
        });
    return result; 
}

export const configureTunnel = async (args, config) => {
    const io = new IO(args.io.output, args.io.input);

    const configOptions = {
        'upstream-url': {upstream: { url: config['upstream-url']?.href}},
        'transport-ws': {transport: { ws: { enabled: config['transport-ws']}}},
        'transport-ssh': {transport: { ssh: { enabled: config['transport-ssh']}}},
        'ingress-http': {ingress: { http: { enabled: config['ingress-http']}}},
        'ingress-http-altnames': {ingress: { http: { alt_names: config['ingress-http-altnames']}}},
        'ingress-sni': {ingress: { sni: { enabled: config['ingress-sni']}}},
    };

    const accountService = new AccountService(args);
    if (!accountService.account?.account_id) {
        throw new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService(args);
    if (!tunnelService.tunnelId) {
        throw new ClientError(ERROR_NO_TUNNEL);
    }

    const options = Object.keys(configOptions).filter(key => config[key] != undefined)

    const props = merge.all(
        options.map(key => configOptions[key])
    );

    options.forEach((opt) => {
        io.info(`Setting ${opt} to ${config[opt]}`);
    })

    return tunnelService.update(props);
}