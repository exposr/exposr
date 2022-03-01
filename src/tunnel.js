import { EventEmitter } from 'events';
import WebSocket from 'ws';
import TargetConnector from './target-connector.js';
import WebSocketTransport from './transport/ws/ws-transport.js';
import { ClientError } from './utils/errors.js';
import Console from './console/index.js';

export class Tunnel extends EventEmitter {
    constructor(opts) {
        super();
        this.opts = opts;

        this.targetConnector = new TargetConnector(opts.targetUrl, {
            allowInsecure: opts.allowInsecure,
        });
        this.established = false;

        this.logger = new Console().log;
    }

    connect(cancelSignal) {
        const cancelController = new AbortController();
        return new Promise((resolve, reject) => {

            const abortHandler = () => {
                this._ws_sock && this._ws_sock.disconnect();
                handler(new Error('aborted'));
            };

            const handler = (e) => {
                this.removeListener('open', openHandler);
                this.removeListener('close', closeHandler);
                this.removeListener('error', errorHandler);

                cancelSignal && cancelSignal.removeEventListener('abort', abortHandler);

                if (e) {
                    reject(e);
                } else {
                    resolve();
                }
            };

            const openHandler = () => { return handler(); }
            const errorHandler = (e) => { return handler(e); }
            const closeHandler = () => { return handler(new Error('Connection closed')); }

            this.once('open', openHandler);
            this.once('error', errorHandler);
            this.once('close', closeHandler);

            cancelSignal && cancelSignal.addEventListener('abort', abortHandler, { once: true });
            this._connect();
        });
    }

    _connect() {
        const endpoint = this.opts.websocketUrl;
        const ws = this._ws_sock = new WebSocket(endpoint, { handshakeTimeout: 2000 });

        ws.once('unexpected-response', (req, res) => {
            res.on('data', (chunk) => {
                let err;
                const errCode = JSON.parse(chunk);
                if (typeof errCode?.error == 'string') {
                    err = new ClientError(errCode.error);
                } else {
                    if (res.statusCode == 401 || res.statusCode == 403) {
                        err = new ClientError(SERVER_ERROR_AUTH_PERMISSION_DENIED);
                    } else if (res.statusCode == 503) {
                        err = new ClientError(SERVER_ERROR_TUNNEL_ALREADY_CONNECTED);
                    } else {
                        err = new ClientError(ERROR_UNKNOWN);
                    }
                }
                this.logger.trace(err);
                this.emit('error', err);
            });
        });

        ws.once('timeout', () => {
            const err = new ClientError(ERROR_SERVER_TIMEOUT);
            this.logger.trace(err);
            this.emit('error', err);
        })

        ws.once('open', () => {
            const transport = new WebSocketTransport({
                socket: ws
            });
            transport.listen((sock) => {
                this.logger.trace(`listen new sock paused=${sock.isPaused()}`);
                const target = this.target = this.targetConnector.connect((err, targetSock) => {
                    if (err) {
                        sock.destroy();
                        target && target.destroy();
                        this.emit('error', err);
                        return;
                    }

                    const transformerStream = this.opts.transformerStream();
                    let pipe = targetSock.pipe(sock);
                    if (transformerStream) {
                        pipe = pipe.pipe(transformerStream);
                    }
                    pipe.pipe(targetSock);

                    this.logger.trace(`target connected paused=${sock.isPaused()}`);
                    sock.accept();
                });

                target.once('close', () => {
                    sock.unpipe();
                    sock.destroy();
                });

                sock.once('close', () => {
                    target.unpipe();
                    target.destroy();
                });
            });

            ws.once('close', () => {
                transport.close();
                transport.destroy();
            });

            this.established = true;
            this.emit('open', endpoint);
        });

        ws.once('error', (err) => {
            this.emit('error', err);
        });

        ws.once('close', (code, reason) => {
            const wasEstablished = this.established;
            this.established = false;
            this.emit('close', endpoint, wasEstablished)
        });
    }

    disconnect() {
        if (this._ws_sock) {
            this._ws_sock.close();
            delete this._ws_sock;
        }
    }
}

export default Tunnel;