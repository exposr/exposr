import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import Logger from '../logger.js';

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        Logger.error("No account provided");
        return false;
    }

    const tunnelService = new TunnelService();
    if (!tunnelService.tunnelId) {
        Logger.error("No tunnel provided");
        return false;
    }

    const tunnel = await tunnelService.read(true);
    if (!tunnel || !tunnel?.id) {
        Logger.error("No such tunnel");
        return false;
    }

    Logger.info(`Tunnel: ${tunnel.id}`);
    if (tunnel?.connection?.connected != undefined) {
        Logger.info(`Connected: ${tunnel.connection.connected}`);
        tunnel?.connection?.peer && Logger.info(`Peer: ${tunnel.connection.peer}`);
        tunnel?.connection?.connected_at && Logger.info(`Connected at: ${tunnel.connection.connected_at}`);
        tunnel?.connection?.alive_at && Logger.info(`Alive at: ${tunnel.connection.alive_at}`);
    }
    tunnel.connection.disconnected_at && Logger.info(`Disconnected at: ${tunnel.connection.disconnected_at}`);

    return true;
}