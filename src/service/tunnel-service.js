import axios from 'axios';
import Config from '../config.js';
import Logger from '../logger.js';
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
            timeout: 5000
        });

        this.tunnelId = Config.get('tunnel-id');
        this.tunnelConfig = undefined;
    }

    async config(force = false) {
        if (this.tunnelConfig && !force) {
            return this.tunnelConfig;
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
            this.tunnelConfig = response.data;
            return this.tunnelConfig;
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
            this.tunnelConfig = response.data;
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
            this.tunnelConfig = response.data;
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
            this.tunnelConfig = undefined;
            this.tunnelId = undefined;
            return true;
        } catch (error) {
            Logger.error(`Failed to delete tunnel ${this.tunnelId}: ${error.message}`);
        }
        return false;
    }
}

export default TunnelService;