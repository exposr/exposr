import axios from 'axios';
import {
    ClientError,
    ERROR_UNKNOWN
} from '../utils/errors.js';
import Version from '../version.js';
import AccountService from './account-service.js';

class TunnelService {
    constructor(opts) {
        if (TunnelService.instance instanceof TunnelService) {
            return TunnelService.instance;
        }
        TunnelService.instance = this;

        this._accountService = new AccountService(opts);

        const baseUrl = new URL(opts.server);
        baseUrl.pathname += 'v1/tunnel';
        this.httpClient = axios.create({
            baseURL: baseUrl.href,
            timeout: 5000,
            headers: {
                'User-Agent': Version.useragent,
            }
        });

        this.tunnelId = opts.tunnelId;
        this.tunnelData = undefined;
    }

    async read(force = false) {
        if (this.tunnelData && !force) {
            return this.tunnelData;
        }

        const token = await this._accountService.refreshToken(force).catch((e) => { throw e });

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
                throw error;
            }
            const err = error.response?.data?.error;
            throw new ClientError(err ?? ERROR_UNKNOWN);
        }
    }

    async create(tunnelId) {
        const token = await this._accountService.refreshToken().catch((e) => { throw e; });

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
            return response.data;
        } catch (error) {
            if (error.response == undefined) {
                throw error;
            }
            const err = error.response?.data?.error;
            const detailed = error.response?.data?.field || error.response?.data?.details;
            throw new ClientError(err ?? ERROR_UNKNOWN, detailed);
        }
    }

    async update(props) {
        const token = await this._accountService.refreshToken().catch((e) => { throw e });

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
            return response.data;
        } catch(error) {
            if (error.response == undefined) {
                throw error;
            }
            const err = error.response?.data?.error;
            const detailed = error.response?.data?.field || error.response?.data?.details;
            throw new ClientError(err ?? ERROR_UNKNOWN, detailed);
        }
    }

    async delete() {
        const token = await this._accountService.refreshToken().catch((e) => { throw e });

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
                throw error;
            }
            const err = error.response?.data?.error;
            throw new ClientError(err ?? ERROR_UNKNOWN);
        }
    }

    async disconnect() {
       const token = await this._accountService.refreshToken().catch((e) => { throw e });

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
                throw error;
            }
            const err = error.response?.data?.error;
            throw new ClientError(err ?? ERROR_UNKNOWN);
        }
    }
}

export default TunnelService;