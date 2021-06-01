import { EventEmitter } from 'events';
import WebSocket from 'ws';
import UpstreamConnector from './upstream-connector.js';
import WebSocketTransport from './transport/ws/ws-transport.js';
import { Logger } from './logger.js';
import { ClientError } from './utils/errors.js';

const logger = Logger("tunnel-connector");

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
                logger.trace(err);
                this.emit('error', err);
            });
        });

        ws.once('timeout', () => {
            const err = new ClientError(ERROR_SERVER_TIMEOUT);
            logger.trace(err);
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
        if (this.sock) {
            this.sock.close();
            this.sock = undefined;
        }
    }
}

export default Tunnel;