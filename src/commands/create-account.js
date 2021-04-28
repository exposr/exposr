import AccountService from '../service/account-service.js';
import Logger from '../logger.js';

export default async () => {
    const accountService = new AccountService();
    if (await accountService.create() && accountService.account?.account_id_hr) {
        Logger.info(`Created account ${accountService.account.account_id_hr}`);
    } else {
        Logger.error("Failed to create account");
    }
    return true;
}