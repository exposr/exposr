import CreateAccount from './create-account.js';
import CreateTunnel from './create-tunnel.js';
import DeleteTunnel from './delete-tunnel.js';
import ConnectTunnel from './connect-tunnel.js';
import AccountService from '../service/account-service.js';
import Logger from '../logger.js';

export default async () => {
    const accountService = new AccountService();
    if (accountService.account?.account_id) {
        Logger.info(`Using account ${accountService.account.account_id}`);
    } else if (!await CreateAccount()) {
            return;
    }
    if (!await CreateTunnel()) {
        return;
    }
    await ConnectTunnel();
    await DeleteTunnel();
}