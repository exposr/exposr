import axios from 'axios';
import Version from '../version.js';
import { ClientError,
         ERROR_UNKNOWN,
       } from '../utils/errors.js';

class AdminService {
    constructor(opts) {
        if (AdminService.instance instanceof AdminService) {
            return AdminService.instance;
        }
        AdminService.instance = this;

        this.apiToken = Buffer.from(opts.apiKey).toString('base64');

        const baseUrl = new URL(opts.server);
        baseUrl.pathname += 'v1/admin';
        this.httpClient = axios.create({
            baseURL: baseUrl.href,
            timeout: 5000,
            headers: {
                'User-Agent': Version.useragent,
            }
        });
    }

    async tunnelList(cursor = undefined, count = 10, verbose = false) {
        const params = {
            cursor,
            count,
            verbose,
        };

        try {
            const response = await this.httpClient.get(`/tunnel`,
            {
                params,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                },
                validateStatus: (status) => {
                    return status <= 200;
                }
            });
            return {
                cursor: response?.data?.cursor || false,
                tunnels: response?.data?.tunnels || [],
            }
        } catch (error) {
            if (error.response == undefined) {
                throw error;
            }
            const err = error.response?.data?.error;
            throw new ClientError(err ?? ERROR_UNKNOWN);
        }
    }

}

export default AdminService;