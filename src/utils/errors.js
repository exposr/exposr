class CustomError extends Error {
    constructor(code, message) {
        super();
        this.code = `${code}`;
        this.errno = code;
        this.message = message || this.code;
    }
}

export default CustomError;
export class ClientError extends Error {

    constructor(code, detailed) {
        super(code);
        this.code = code;
        this.detailed = detailed instanceof Array ? detailed.join(', ') : detailed;

        const m = {};
        m[SERVER_ERROR_TUNNEL_NOT_FOUND] = 'Tunnel not found';
        m[SERVER_ERROR_TUNNEL_NOT_CONNECTED] = 'Tunnel not connected';
        m[SERVER_ERROR_TUNNEL_ALREADY_CONNECTED] = 'Tunnel already connected';
        m[SERVER_ERROR_TUNNEL_HTTP_INGRESS_DISABLED] = 'HTTP ingress not enabled for tunnel';
        m[SERVER_ERROR_TUNNEL_TRANSPORT_REQUEST_LIMIT] = 'Tunnel transport concurrent connection limit';
        m[SERVER_ERROR_TUNNEL_TARGET_CON_REFUSED] = 'Target connection refused';
        m[SERVER_ERROR_TUNNEL_INGRESS_BAD_ALT_NAMES] = detailed ? `The altname ${detailed} can not be configured for this tunnel` : 'Ingress altname can not be configured';
        m[SERVER_ERROR_HTTP_INGRESS_REQUEST_LOOP] = 'Request loop at ingress';
        m[SERVER_ERROR_UNKNOWN_ERROR] = 'Unknown server error';
        m[SERVER_ERROR_BAD_INPUT] = detailed ? `Bad input: ${detailed}` : 'Bad input';
        m[SERVER_ERROR_AUTH_NO_ACCESS_TOKEN] = 'Access token missing';
        m[SERVER_ERROR_AUTH_PERMISSION_DENIED] = 'Permission denied';
        m[ERROR_UNKNOWN] = 'Unknown client error';
        m[ERROR_ACCOUNT_REGISTRATION_DISABLED] = 'Account registration not enabled';
        m[ERROR_SERVER_TIMEOUT] = 'Timeout';
        m[ERROR_NO_ACCOUNT] = 'No account was provided';
        m[ERROR_NO_TUNNEL] = 'No tunnel was provided';
        m[ERROR_NO_TUNNEL_ENDPOINT] = 'No tunnel endpoint available';
        this.message = m[code] || 'Unknown error';
    }
}

// Error ENUMs from exposr-server
export const SERVER_ERROR_TUNNEL_NOT_FOUND = 'TUNNEL_NOT_FOUND';
export const SERVER_ERROR_TUNNEL_NOT_CONNECTED = 'TUNNEL_NOT_CONNECTED';
export const SERVER_ERROR_TUNNEL_ALREADY_CONNECTED = 'TUNNEL_ALREADY_CONNECTED';
export const SERVER_ERROR_TUNNEL_HTTP_INGRESS_DISABLED = 'TUNNEL_HTTP_INGRESS_DISABLED';
export const SERVER_ERROR_TUNNEL_TRANSPORT_REQUEST_LIMIT = 'TUNNEL_TRANSPORT_REQUEST_LIMIT';
export const SERVER_ERROR_TUNNEL_TRANSPORT_CON_TIMEOUT = 'TUNNEL_TRANSPORT_CON_TIMEOUT';
export const SERVER_ERROR_TUNNEL_TARGET_CON_REFUSED = 'TUNNEL_TARGET_CON_RESET';
export const SERVER_ERROR_TUNNEL_TARGET_CON_FAILED = 'TUNNEL_TARGET_CON_FAILED';
export const SERVER_ERROR_TUNNEL_INGRESS_BAD_ALT_NAMES = 'TUNNEL_INGRESS_BAD_ALT_NAMES';
export const SERVER_ERROR_HTTP_INGRESS_REQUEST_LOOP = 'HTTP_INGRESS_REQUEST_LOOP';
export const SERVER_ERROR_UNKNOWN_ERROR = 'UNKNOWN_ERROR';
export const SERVER_ERROR_BAD_INPUT = 'BAD_INPUT';
export const SERVER_ERROR_AUTH_NO_ACCESS_TOKEN = 'AUTH_NO_TOKEN';
export const SERVER_ERROR_AUTH_PERMISSION_DENIED = 'PERMISSION_DENIED';

// Client error codes
export const ERROR_UNKNOWN = 0;
export const ERROR_ACCOUNT_REGISTRATION_DISABLED = 1;
export const ERROR_SERVER_TIMEOUT = 2;
export const ERROR_NO_ACCOUNT = 3;
export const ERROR_NO_TUNNEL = 4;
export const ERROR_NO_TUNNEL_ENDPOINT = 5;
export const ERROR_NO_TUNNEL_TARGET = 6;