import axios from 'axios';
import Config from '../config.js';
import
    { ClientError,
      ERROR_ACCOUNT_REGISTRATION_DISABLED,
      ERROR_NO_ACCOUNT,
      ERROR_UNKNOWN,
      SERVER_ERROR_AUTH_PERMISSION_DENIED,
    } from '../utils/errors.js';
import Version from '../version.js';

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
            timeout: 5000,
            headers: {
                'User-Agent': Version.useragent,
            }
        });

        this.account = {
            account_id: Config.get('account'),
            account_id_hr: Config.get('account'),
        }
    }

    reset() {
        this.account = {}
    }

    async refreshToken(force = false) {
        const accountId = this.account?.account_id;
        if (!accountId) {
            return new ClientError(ERROR_NO_ACCOUNT);
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
        } catch (error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            if (err == SERVER_ERROR_AUTH_PERMISSION_DENIED) {
                return new ClientError(ERROR_NO_ACCOUNT);
            }
            return new ClientError(err ?? ERROR_UNKNOWN);
        }
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
        } catch (error) {
            if (error.response) {
                if (error.response.status == 404) {
                    return new ClientError(ERROR_ACCOUNT_REGISTRATION_DISABLED);
                } else {
                    const err = error.response?.data?.error;
                    return new ClientError(err ?? ERROR_UNKNOWN);
                }
            } else {
                return error;
            }
        }
    }
}

export default AccountService;