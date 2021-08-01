import Logger from '../logger.js';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import {
    ERROR_ACCOUNT_REGISTRATION_DISABLED,
    ERROR_NO_ACCOUNT,
    SERVER_ERROR_AUTH_PERMISSION_DENIED,
    SERVER_ERROR_BAD_INPUT,
    SERVER_ERROR_TUNNEL_ALREADY_CONNECTED
} from '../utils/errors.js';
import ConfigureTunnel from './configure-tunnel.js';
import ConnectTunnel from './connect-tunnel.js';
import CreateAccount from './create-account.js';
import CreateTunnel from './create-tunnel.js';
import DeleteTunnel from './delete-tunnel.js';

export default async () => {
    const accountService = new AccountService();
    const tunnelService = new TunnelService();

    const handleErr = async (err) => {
        if (err instanceof Error == false) {
            return undefined;
        }

        Logger.isTraceEnabled() && Logger.trace(err.message);

        if (err?.code == ERROR_NO_ACCOUNT) {
            accountService.reset();
        }

        if (err?.code == SERVER_ERROR_TUNNEL_ALREADY_CONNECTED) {
            Logger.info("Tunnel already connected, attempting to disconnect");
            const res = await tunnelService.disconnect();
            if (res !== true) {
                Logger.error("Failed to disconnect tunnel");
                return false;
            }
        }

        const fatal = [
            ERROR_ACCOUNT_REGISTRATION_DISABLED,
            SERVER_ERROR_AUTH_PERMISSION_DENIED,
            SERVER_ERROR_BAD_INPUT,
        ]

        if (fatal.includes(err?.code)) {
            return false;
        }

        await new Promise(r => setTimeout(r, 1000));
        return true;
    };

    let failRetry;
    do {
        if (accountService.account?.account_id) {
            Logger.info(`Using account ${accountService.account.account_id}`);
        } else {
            failRetry = await handleErr(await CreateAccount());
            if (failRetry !== undefined) {
                continue;
            }
        }

        failRetry = await handleErr(await CreateTunnel());
        if (failRetry !== undefined) {
            continue;
        }

        failRetry = await handleErr(await ConnectTunnel());
    } while (failRetry == true);

    await DeleteTunnel();
}