import hri from 'human-readable-ids';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import Config from '../config.js';
import { Logger } from '../logger.js';
import { ClientError,
         ERROR_NO_ACCOUNT
       } from '../utils/errors.js';

const logger = Logger('create-tunnel');

export default async () => {
    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        logger.trace('No account provided');
        return new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService();
    const tunnelId = Config.get('tunnel-id') || hri.hri.random();
    const res = await tunnelService.create(tunnelId);
    if (res === true) {
        logger.info(`Tunnel ${tunnelService.tunnelId} created`);
    } else {
        logger.error(`Failed to create tunnel ${tunnelId}: ${res.message}`);
    }
    return res;
}