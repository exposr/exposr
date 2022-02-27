import hri from 'human-readable-ids';
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
    const cons = argv.cons;
    const {success, fail} = cons.logger.log(`Creating tunnel...`);

    await createTunnel({
        cons,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    }).then((tunnel) => {
        success(`success (${tunnel.id})`);
        cons.status.success(`Created tunnel ${tunnel.id}`);
    })
    .catch((e) => {
        fail(`failed (${e.message})`);
        cons.status.fail(`Could not create tunnel`);
    });
}

export const createTunnel = async (opts) => {
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