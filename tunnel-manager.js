import axios from 'axios';

export const Errors = {
    ERR_NOT_AUTHORIZED: -65536
}

const statusCodeMapper = {
    401: Errors.ERR_NOT_AUTHORIZED
};

export class TunnelManager {

    constructor(baseUri) {
        this.baseUri = baseUri;
    }

    async create(tunnelId = undefined) {
        const method = tunnelId === undefined ? 'POST' : 'PUT';
        const url = `${this.baseUri}v1/tunnel`.concat(tunnelId !== undefined ? `/${tunnelId}` : '');

        try {
            const response = await axios({
                method,
                url,
                data: {
                }
            })
            if (response.status == 200 || response.status == 201) {
                return response.data;
            } else {
                const err = new Error(`Failed to create tunnel: ${response.status} ${response.statusText}`)
                const errorCode = statusCodeMapper[response.status];
                if (errorCode) {
                    err.code = errorCode;
                }
                throw err;
            }
        } catch (err) {
            throw err;
        }
    }
}

export default TunnelManager;