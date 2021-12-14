import hri from 'human-readable-ids';
import IO from '../../io.js';
import AccountService from '../../service/account-service.js';
import TunnelService from '../../service/tunnel-service.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT
} from '../../utils/errors.js';

export const command = 'create [tunnel-id]';
export const desc = 'Create a new tunnel';
export const builder = function (yargs) {
    return yargs.positional('tunnel-id', {
        describe: 'Tunnel to create, if no tunnel name is given a random identifier is allocated'
    })
}
export const handler = async function (argv) {
    const io = new IO(argv.io.output, argv.io.input);

    await createTunnel({
        io: argv.io,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    }).then((tunnel) => {
        io.success(`Tunnel ${tunnel.id} created`);
    })
    .catch((e) => {
        io.error(`${e.message}`);
    });
}

export const createTunnel = async (opts) => {
    const io = new IO(opts.io.output, opts.io.input);

    const accountService = new AccountService(opts);

    if (!accountService.account?.account_id) {
        throw new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelId = opts.tunnelId || hri.hri.random();
    const tunnelService = new TunnelService(opts);

    return tunnelService.create(tunnelId).catch((e) => {
        e.message = `Failed to create tunnel ${tunnelId}: ${e.message}`;
        throw e;
    });
}