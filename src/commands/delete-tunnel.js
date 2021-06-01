import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import { Logger } from '../logger.js';
import { ClientError,
         ERROR_NO_ACCOUNT,
         ERROR_NO_TUNNEL
        } from '../utils/errors.js';

const logger = Logger('delete-tunnel');

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        logger.trace("No account provided");
        return new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService();
    const tunnelId = tunnelService.tunnelId;
    if (!tunnelService.tunnelId) {
        logger.trace("No tunnel provided");
        return new ClientError(ERROR_NO_TUNNEL);
    }

    if (await tunnelService.delete(tunnelId)) {
        logger.info(`Tunnel ${tunnelId} deleted`);
    }

    return true;
}