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
    const cons = argv.cons;

    await tunnelInfo({
        cons,
        server: argv['server'],
        account: argv['account'],
        tunnelId: argv['tunnel-id'],
    })
    .catch((e) => {
        cons.logger.error(e.message);
    });
}

export const tunnelInfo = async (opts) => {

    const accountService = new AccountService(opts);
    if (!accountService.account?.account_id) {
        throw new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService(opts);
    if (!tunnelService.tunnelId) {
        throw new ClientError(ERROR_NO_TUNNEL);
    }

    const tunnel = await tunnelService.read(true);

    console.log(`Tunnel: ${tunnel.id}`);
    if (tunnel?.connection?.connected != undefined) {
        console.log(`Connected: ${tunnel.connection.connected}`);
        tunnel?.connection?.peer && console.log(`Peer: ${tunnel.connection.peer}`);
        tunnel?.connection?.connected_at && console.log(`Connected at: ${tunnel.connection.connected_at}`);
        tunnel?.connection?.alive_at && console.log(`Alive at: ${tunnel.connection.alive_at}`);
    }
    tunnel.connection.disconnected_at && console.log(`Disconnected at: ${tunnel.connection.disconnected_at}`);
    console.log(`Created at: ${tunnel.created_at}`);

    console.log(`Transports`);
    Object.keys(tunnel.transport).forEach(ep => {
        console.log(`  ${ep.toUpperCase()}: ${tunnel.transport[ep]?.url}`);
    });

    console.log(`Ingress points`);
    Object.keys(tunnel.ingress).forEach(ing => {
        const urls = [];
        tunnel.ingress[ing]?.url && urls.push(tunnel.ingress[ing]?.url);
        urls.push(...(tunnel.ingress[ing].urls || []));
        [...new Set(urls)].forEach(url => {
            console.log(`  ${ing.toUpperCase()}: ${url}`);
        });
    });

    console.log('Configuration');
    console.log(`  target-url: ${tunnel.target?.url ? tunnel.target?.url : '<not set>'}`);
    console.log(`  ingress-http: ${tunnel.ingress?.http?.enabled ? tunnel.ingress?.http?.enabled : '<not set>'}`);
    console.log(`  ingress-http-altnames: ${tunnel.ingress?.http?.alt_names ? tunnel.ingress?.http?.alt_names.join(',') : '<not set>'}`);
    console.log(`  transport-ws: ${tunnel.transport?.ws?.enabled ? tunnel.transport?.ws?.enabled : '<not set>'}`);
    console.log(`  transport-ssh: ${tunnel.transport?.ssh?.enabled ? tunnel.transport?.ssh?.enabled : '<not set>'}`);

    return true;
}