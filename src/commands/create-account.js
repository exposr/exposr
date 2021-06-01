import AccountService from '../service/account-service.js';
import Logger from '../logger.js';
import { ClientError } from '../utils/errors.js';

export default async () => {
    const accountService = new AccountService();
    const res = await accountService.create();
    if (res === true && accountService.account?.account_id_hr) {
        Logger.info(`Created account ${accountService.account.account_id_hr}`);
        return true;
    } else {
        if (res instanceof ClientError) {
            Logger.error(`Failed to create account: ${res.message}`);
        }
        return false;
    }
}