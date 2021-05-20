import axios from 'axios';
import Config from '../config.js';
import Logger from '../logger.js';
import Version from '../version.js';
import AccountService from './account-service.js';

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

        const token = await new AccountService().refreshToken();
        if (!token) {
            return false;
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
            Logger.error(`Failed to read tunnel configuration: ${error.message}`);
        }
        return false;
    }

    async create(tunnelId) {
        const token = await new AccountService().refreshToken();
        if (!token) {
            return false;
        }

        const props = {
            ingress: {
                http: {
                    enabled: Config.get('ingress-http'),
                }
            }
        }

        try {
            const response = await this.httpClient.put(`/${tunnelId}`, props,
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
            Logger.error(`Failed to create tunnel: ${error.response.status}`);
        }
        return false;
    }

    async update(props) {
        const token = await new AccountService().refreshToken();
        if (!token) {
            return false;
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
            Logger.error(`Failed to update tunnel ${this.tunnelId}: ${error.message}`);
        }
        return false;

    }

    async delete() {
       const token = await new AccountService().refreshToken();
        if (!token) {
            return false;
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
            Logger.error(`Failed to delete tunnel ${this.tunnelId}: ${error.message}`);
        }
        return false;
    }

    async disconnect() {
       const token = await new AccountService().refreshToken();
        if (!token) {
            return false;
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
            Logger.error(`Failed to disconnect tunnel ${this.tunnelId}: ${error.message}`);
        }
        return false;
    }


}

export default TunnelService;