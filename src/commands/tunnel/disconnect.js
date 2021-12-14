import IO from '../../io.js';
import AccountService from '../../service/account-service.js';
import TunnelService from '../../service/tunnel-service.js';
import { ClientError, ERROR_NO_ACCOUNT, ERROR_NO_TUNNEL } from '../../utils/errors.js';

export const command = 'disconnect <tunnel-id>';
export const desc = 'Disconnect a tunnel';
export const builder = function (yargs) {
    return yargs.positional('tunnel-id', {
        describe: 'Tunnel to disconnect'
    })
}

export const handler = async function (argv) {
    const io = new IO(argv.io.output, argv.io.input);

    await disconnectTunnel({
        io: argv.io,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    }).then((disconnected) => {
        if (disconnected) {
            io.success(`Tunnel ${argv['tunnel-id']} disconnected`);
        } else {
            io.failure(`Tunnel ${argv['tunnel-id']} not disconnected`);
        }
    })
    .catch((e) => {
        io.error(`${e.message}`);
    });
}

export const disconnectTunnel = async (opts) => {
    const accountService = new AccountService(opts);
    if (!accountService.account?.account_id) {
        throw new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService(opts);
    const tunnelId = tunnelService.tunnelId;
    if (!tunnelService.tunnelId) {
        throw new ClientError(ERROR_NO_TUNNEL);
    }

    return tunnelService.disconnect(tunnelId);
}