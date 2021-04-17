import { EventEmitter } from 'events';
import WebSocket from 'ws';
import UpstreamConnector from './upstream-connector.js';
import WebSocketTransport from './transport/ws/ws-transport.js';
import { Logger } from './logger.js';

const logger = Logger("tunnel");

export const Errors = {
    ERR_NOT_AUTHORIZED: -65536,
    ERR_UNEXP: -65537,
    ERR_CON_TIMEOUT: -65538,
}

export class Tunnel extends EventEmitter {
    constructor(upstream, opts) {
        super();
        this.opts = opts;
        this.upstreamConnector = new UpstreamConnector(upstream, {
            allowInsecure: opts.allowInsecure,
        });
        this.established = false;
    }

    connect(endpoint) {
        const ws = this.sock = new WebSocket(endpoint, { handshakeTimeout: 2000 });

        ws.once('unexpected-response', (req, res) => {
            const err = new Error(`Failed to establish websocket to ${endpoint}: ${res.statusCode} ${res.statusMessage}`)
            if (res.statusCode == 401) {
                err.code = Errors.ERR_NOT_AUTHORIZED;
            } else {
                err.code = Errors.ERR_UNEXP;
            }
            this.emit('error', err);
        });

        ws.once('timeout', () => {
            const err = new Error(`Failed to establish websocket to ${endpoint}: Handshake timeout`)
            err.code = Errors.ERR_CON_TIMEOUT;
            this.emit('error', err);
        })

        ws.once('open', () => {
            const transport = new WebSocketTransport({
                socket: ws
            });
            transport.listen((sock) => {
                logger.trace(`listen new sock paused=${sock.isPaused()}`);
                const upstream = this.upstreamConnector.connect((err, upstreamSock) => {
                    if (err) {
                        sock.destroy();
                        upstream && upstream.destroy();
                        this.emit('error', err);
                        return;
                    }

                    const transformerStream = this.opts.transformerStream();
                    let pipe = upstreamSock.pipe(sock);
                    if (transformerStream) {
                        pipe = pipe.pipe(transformerStream);
                    }
                    pipe.pipe(upstreamSock);

                    logger.trace(`upstream connected paused=${sock.isPaused()}`);
                    sock.accept();
                });

                upstream.once('close', () => {
                    sock.unpipe();
                    sock.destroy();
                });

                sock.once('close', () => {
                    upstream.unpipe();
                    upstream.destroy();
                });
            });

            ws.once('close', () => {
                transport.close();
                transport.destroy();
            });

            this.established = true;
            this.emit('open', endpoint);

         });

        ws.once('error', (wsErr) => {
            const err = new Error();
            err.code = wsErr.code;
            if (this.established) {
                err.message = `Websocket error: ${wsErr.message}`;
            } else {
                err.message = `Failed to establish websocket to ${endpoint}: ${wsErr.message}`;
            }
            this.emit('error', err);
        });

        ws.once('close', (code, reason) => {
            const wasEstablished = this.established;
            this.established = false;
            this.emit('close', endpoint, wasEstablished)
        });
    }

    disconnect() {
        if (this.sock) {
            this.sock.close();
            this.sock = undefined;
        }
    }
}

export default Tunnel;