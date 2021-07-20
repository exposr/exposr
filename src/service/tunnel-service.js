import axios from 'axios';
import Config from '../config.js';
import Version from '../version.js';
import AccountService from './account-service.js';
import { ClientError,
         ERROR_UNKNOWN,
       } from '../utils/errors.js';

class TunnelService {
    constructor() {
        if (TunnelService.instance instanceof TunnelService) {
            return TunnelService.instance;
        }
        TunnelService.instance = this;

        const baseUrl = new URL(Config.get('server'));
        baseUrl.pathname += 'v1/tunnel';
        this.httpClient = axios.create({
            baseURL: baseUrl.href,
            timeout: 5000,
            headers: {
                'User-Agent': Version.useragent,
            }
        });

        this.tunnelId = Config.get('tunnel-id');
        this.tunnelData = undefined;
    }

    async read(force = false) {
        if (this.tunnelData && !force) {
            return this.tunnelData;
        }

        const token = await new AccountService().refreshToken(force);
        if (typeof token != 'string') {
            return token;
        }

        try {
            const response = await this.httpClient.get(`/${this.tunnelId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                validateStatus: (status) => {
                    return status <= 201;
                }
            });
            this.tunnelData = response.data;
            return this.tunnelData;
        } catch (error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            return new ClientError(err ?? ERROR_UNKNOWN);
        }
    }

    async create(tunnelId) {
        const token = await new AccountService().refreshToken();
        if (typeof token != 'string') {
            return token;
        }

        try {
            const response = await this.httpClient.put(`/${tunnelId}`, {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                validateStatus: (status) => {
                    return status <= 201;
                }
            });
            this.tunnelData = response.data;
            this.tunnelId = tunnelId;
            return true;
        } catch (error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            const field = error.response?.data?.field;
            return new ClientError(err ?? ERROR_UNKNOWN, field);
        }
    }

    async update(props) {
        const token = await new AccountService().refreshToken();
        if (typeof token != 'string') {
            return token;
        }

        try {
            const response = await this.httpClient.patch(`/${this.tunnelId}`, props,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                validateStatus: (status) => {
                    return status <= 201;
                }
            });
            this.tunnelData = response.data;
            return true;
        } catch(error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            const field = error.response?.data?.field;
            return new ClientError(err ?? ERROR_UNKNOWN, field);
        }
    }

    async delete() {
       const token = await new AccountService().refreshToken();
        if (typeof token != 'string') {
            return token;
        }

        try {
            const response = await this.httpClient.delete(`/${this.tunnelId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                validateStatus: (status) => {
                    return status <= 204;
                }
            });
            this.tunnelData = undefined;
            this.tunnelId = undefined;
            return true;
        } catch (error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            return new ClientError(err ?? ERROR_UNKNOWN);
        }
    }

    async disconnect() {
       const token = await new AccountService().refreshToken();
        if (typeof token != 'string') {
            return token;
        }

        try {
            const response = await this.httpClient.post(`/${this.tunnelId}/disconnect`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                validateStatus: (status) => {
                    return status <= 204;
                }
            });
            return response?.data?.result;
        } catch (error) {
            if (error.response == undefined) {
                return error;
            }
            const err = error.response?.data?.error;
            return new ClientError(err ?? ERROR_UNKNOWN);
        }
    }
}

export default TunnelService;