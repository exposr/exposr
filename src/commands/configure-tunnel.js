import merge from 'deepmerge';
import Config from '../config.js';
import { Logger } from '../logger.js';
import AccountService from '../service/account-service.js';
import TunnelService from '../service/tunnel-service.js';
import {
    ClientError,
    ERROR_NO_ACCOUNT,
    ERROR_NO_TUNNEL
} from '../utils/errors.js';

const logger = Logger('configure-tunnel');

export default async () => {
    const configOptions = {
        'upstream-url': {upstream: { url: Config.get('upstream-url')?.href}},
        'transport-ws': {endpoints: { ws: { enabled: Config.get('transport-ws')}}},
        'transport-ssh': {endpoints: { ssh: { enabled: Config.get('transport-ssh')}}},
        'ingress-http': {ingress: { http: { enabled: Config.get('ingress-http')}}},
    };

    const accountService = new AccountService();
    if (!accountService.account?.account_id) {
        logger.trace('No account provided');
        return new ClientError(ERROR_NO_ACCOUNT);
    }

    const tunnelService = new TunnelService();
    if (!tunnelService.tunnelId) {
        logger.trace("No tunnel provided");
        return new ClientError(ERROR_NO_TUNNEL);
    }

    const options = Object.keys(configOptions).filter(key => Config.has(key))

    const props = merge.all(
        options.map(key => configOptions[key])
    );

    options.forEach((opt) => {
        logger.info(`Setting ${opt} to ${Config.get(opt)}`);
    })

    logger.trace(props);
    if (!await tunnelService.update(props)) {
        logger.error(`Failed to configure tunnel ${tunnelService.tunnelId}`);
        return false;
    }

    return true;
}