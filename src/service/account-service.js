import assert from 'assert/strict';
import axios from 'axios';
import {
    ClientError,
    ERROR_ACCOUNT_REGISTRATION_DISABLED,
    ERROR_NO_ACCOUNT,
    ERROR_UNKNOWN,
    SERVER_ERROR_AUTH_PERMISSION_DENIED
} from '../utils/errors.js';
import Version from '../version.js';

class AccountService {
    constructor(opts) {
        assert(opts.server != undefined, "opts.server not given");

        if (AccountService.instance instanceof AccountService) {
            return AccountService.instance;
        }
        AccountService.instance = this;

        const baseUrl = new URL(opts.server);
        baseUrl.pathname += 'v1/account';
        this.httpClient = axios.create({
            baseURL: baseUrl.href,
            timeout: 5000,
            headers: {
                'User-Agent': Version.useragent,
            }
        });

        this.account = {
            account_id: opts.account,
            account_id_hr: opts.account, 
        }
    }

    reset() {
        this.account = {}
    }

    async refreshToken(force = false) {
        const accountId = this.account?.account_id;
        if (!accountId) {
            throw new ClientError(ERROR_NO_ACCOUNT);
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
                throw error;
            }
            const err = error.response?.data?.error;
            if (err == SERVER_ERROR_AUTH_PERMISSION_DENIED) {
                throw new ClientError(ERROR_NO_ACCOUNT);
            }
            throw new ClientError(err ?? ERROR_UNKNOWN);
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
            return response.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status == 404) {
                    throw new ClientError(ERROR_ACCOUNT_REGISTRATION_DISABLED);
                } else {
                    const err = error.response?.data?.error;
                    throw new ClientError(err ?? ERROR_UNKNOWN);
                }
            } else {
                throw error;
            }
        }
    }
}

export default AccountService;