import hri from 'human-readable-ids';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import Config from '../config.js';
import Logger from '../logger.js';

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        Logger.error("No account provided");
        return false;
    }

    const tunnelService = new TunnelService();
    const tunnelId = Config.get('tunnel-id') || hri.hri.random();
    if (await tunnelService.create(tunnelId)) {
        Logger.info(`Tunnel ${tunnelService.tunnelId} created`);
    }

    return true;
}