import IO from '../../io.js';
import AccountService from '../../service/account-service.js';
import TunnelService from '../../service/tunnel-service.js';
import { ClientError, ERROR_NO_ACCOUNT, ERROR_NO_TUNNEL } from '../../utils/errors.js';

export const command = 'info <tunnel-id>';
export const desc = 'Fetch tunnel information';
export const builder = function (yargs) {
    return yargs.positional('tunnel-id', {
        describe: 'Tunnel to fetch information for'
    })
}

export const handler = async function (argv) {
    const io = new IO(argv.io.output, argv.io.input);

    await tunnelInfo({
        io: argv.io,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    })
    .catch((e) => {
        io.error(`${e.message}`);
    });
}

export const tunnelInfo = async (opts) => {
    const io = new IO(opts.io.output, opts.io.input);

    const accountService = new AccountService(opts);
    if (!accountService.account?.account_id) {
        throw new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService(opts);
    if (!tunnelService.tunnelId) {
        throw new ClientError(ERROR_NO_TUNNEL);
    }

    const tunnel = await tunnelService.read(true);

    io.info(`Tunnel: ${tunnel.id}`);
    if (tunnel?.connection?.connected != undefined) {
        io.info(`Connected: ${tunnel.connection.connected}`);
        tunnel?.connection?.peer && io.info(`Peer: ${tunnel.connection.peer}`);
        tunnel?.connection?.connected_at && io.info(`Connected at: ${tunnel.connection.connected_at}`);
        tunnel?.connection?.alive_at && io.info(`Alive at: ${tunnel.connection.alive_at}`);
    }
    tunnel.connection.disconnected_at && io.info(`Disconnected at: ${tunnel.connection.disconnected_at}`);
    io.info(`Created at: ${tunnel.created_at}`);

    io.info(`Transports`);
    Object.keys(tunnel.transport).forEach(ep => {
        io.info(`  ${ep.toUpperCase()}: ${tunnel.transport[ep]?.url}`);
    });

    io.info(`Ingress points`);
    Object.keys(tunnel.ingress).forEach(ing => {
        const urls = [];
        tunnel.ingress[ing]?.url && urls.push(tunnel.ingress[ing]?.url);
        urls.push(...(tunnel.ingress[ing].urls || []));
        [...new Set(urls)].forEach(url => {
            io.info(`  ${ing.toUpperCase()}: ${url}`);
        });
    });

    io.info('Configuration');
    io.info(`  upstream-url: ${tunnel.upstream?.url ? tunnel.upstream?.url : '<not set>'}`);
    io.info(`  ingress-http: ${tunnel.ingress?.http?.enabled ? tunnel.ingress?.http?.enabled : '<not set>'}`);
    io.info(`  ingress-http-altnames: ${tunnel.ingress?.http?.alt_names ? tunnel.ingress?.http?.alt_names.join(',') : '<not set>'}`);
    io.info(`  transport-ws: ${tunnel.transport?.ws?.enabled ? tunnel.transport?.ws?.enabled : '<not set>'}`);
    io.info(`  transport-ssh: ${tunnel.transport?.ssh?.enabled ? tunnel.transport?.ssh?.enabled : '<not set>'}`);

    return true;
}