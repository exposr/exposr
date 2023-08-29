import { EventEmitter } from 'events';
import WebSocket from 'ws';
import TargetConnector from './target-connector.js';
import { WebSocketMultiplex } from '@exposr/ws-multiplex';
import { ClientError } from '../utils/errors.js';
import Console from '../console/index.js';

export class TunnelTransport extends EventEmitter {
    constructor(opts) {
        super();
        this.opts = opts;

        this.targetConnector = new TargetConnector(opts.targetUrl, {
            allowInsecure: opts.allowInsecure,
        });
        this.connected = false;

        this.logger = new Console().log;
    }

    connect(endpoint, cancelSignal) {
        return new Promise((resolve, reject) => {

            const abortHandler = () => {
                this.close();
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
            this._connect(endpoint);
        });
    }

    _connect(endpoint) {
        const ws = this._ws_sock = new WebSocket(endpoint, { handshakeTimeout: 2000 });

        ws.once('unexpected-response', (req, res) => {
            res.on('data', (chunk) => {
                let err;
                try {
                    const errCode = JSON.parse(chunk);
                    if (typeof errCode?.error == 'string') {
                        err = new ClientError(errCode.error);
                    } else {
                        if (res.statusCode == 401 || res.statusCode == 403) {
                            err = new ClientError(SERVER_ERROR_AUTH_PERMISSION_DENIED);
                        } else if (res.statusCode == 503) {
                            err = new ClientError(SERVER_ERROR_TUNNEL_ALREADY_CONNECTED);
                        } else {
                            err = new ClientError(ERROR_UNKNOWN);
                        }
                    }
                } catch (e) {
                    err = e;
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
            const wsm = this._wsm = new WebSocketMultiplex(ws) ;

            wsm.on('connection', (sock) => {
                const target = this._target = this.targetConnector.connect((err, targetSock) => {
                    if (err) {
                        sock.destroy();
                        targetSock?.destroy();
                        return;
                    }
                    const transformerStream = this.opts.transformerStream();
                    let pipe = targetSock.pipe(sock);
                    if (transformerStream) {
                        pipe = pipe.pipe(transformerStream);
                    }
                    pipe.pipe(targetSock);
                });

                const close = () => {
                    target.unpipe(sock);
                    sock.unpipe(target);
                    target.destroy();
                    sock.destroy();
                };
                target.on('close', close);
                target.on('error', close);
                sock.on('close', close);
                sock.on('error', close);
            });

            wsm.on('close', () => {
                this._close();
            });

            wsm.on('error', (err) => {
                this._close(undefined, err.message);
            });

            ws.once('close', () => {
                wsm.destroy();
            });

            this.connected = true;
            this.emit('open', endpoint);
        });

        ws.once('error', (err) => {
            this.emit('error', err);
        });

        ws.once('close', (code, reason) => {
            reason = reason?.toString('utf-8') || "";
            reason = `${reason != "" ? reason : "Connection closed"} (${code})`
            this._close(code, reason);
        });
    }

    async _close(code, reason) {
        if (!this.connected) {
            return;
        }
        this.connected = false;

        this._target?.destroy();

        this._wsm?.removeAllListeners();
        await this._wsm?.destroy();
        delete this._wsm;

        this._ws_sock?.terminate();
        this._ws_sock?.removeAllListeners();
        delete this._ws_sock;

        this.emit('close', code, reason)
    }

    async close() {
        return this._close();
    }
}

export default TunnelTransport;