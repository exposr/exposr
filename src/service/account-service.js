import axios from 'axios';
import Config from '../config.js';
import Logger from '../logger.js';

class AccountService {
    constructor() {
        if (AccountService.instance instanceof AccountService) {
            return AccountService.instance;
        }
        AccountService.instance = this;

        const baseUrl = new URL(Config.get('server'));
        baseUrl.pathname += 'v1/account';
        this.httpClient = axios.create({
            baseURL: baseUrl.href,
            timeout: 5000
        });

        this.account = {
            account_id: Config.get('account'),
            account_id_hr: Config.get('account'),
        }
    }

    async refreshToken(force = false) {
        const accountId = this.account?.account_id;
        if (!accountId) {
            return false;
        }
        if (this.token && !force) {
            return this.token;
        }
        this.token = undefined;
        try {
            const response = await this.httpClient.get(`/${accountId}/token`, {
                validateStatus: (status) => {
                    return status <= 204;
                }
            });
            this.token = response.data.token;
            return this.token;
        } catch(error) {
            Logger.error(`Failed to get refresh token for account ${this.account.account_id}: ${error.message}`);
        }
        return false;
    }

    async create() {
        try {
            const response = await this.httpClient.post('', {
                validateStatus: (status) => {
                    return status <= 204;
                }
            });
            this.account = response.data;
            return true;
        } catch(error) {
            if (error.response) {
                if (error.response.status == 404) {
                    Logger.error('Account registration not enabled');
                } else {
                    Logger.error(`Failed to create account: ${error.response.status}`);
                }
            } else {
                Logger.error(`Failed to create account: ${error.message}`);
            }
        }
        return false;
    }
}

export default AccountService;