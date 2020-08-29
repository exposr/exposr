import { EventEmitter } from 'events';
import WebSocket from 'ws';
import WebSocketMultiplex from './ws-multiplex.js';
import UpstreamConnector from './upstream-connector.js';

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

    connect(tunnel) {
        const ws = this.sock = new WebSocket(tunnel.endpoint, { handshakeTimeout: 2000 });

        ws.once('unexpected-response', (req, res) => {
            const err = new Error(`Failed to establish websocket to ${tunnel.endpoint}: ${res.statusCode} ${res.statusMessage}`)
            if (res.statusCode == 401) {
                err.code = Errors.ERR_NOT_AUTHORIZED;
            } else {
                err.code = Errors.ERR_UNEXP;
            }
            this.emit('error', err);
        });

        ws.once('timeout', () => {
            const err = new Error(`Failed to establish websocket to ${tunnel.endpoint}: Handshake timeout`)
            err.code = Errors.ERR_CON_TIMEOUT;
            this.emit('error', err);
        })

        ws.once('open', () => {
            const multiplex = new WebSocketMultiplex(ws);

            const channels = {};
            multiplex.on('connect', (channel) => {
                this.upstreamConnector.connect((err, upstream) => {
                    if (err) {
                        multiplex.close(channel);
                        this.emit('error', err);
                        return;
                    }
                    channels[channel] = upstream;
                    multiplex.open(channel);
                });
            });

            multiplex.on('open', (channel, stream) => {
                const transformerStream = this.opts.transformerStream();
                const upstream = channels[channel];
                if (!upstream) {
                    return;
                }

                let pipe = upstream.pipe(stream);
                if (transformerStream)
                    pipe = pipe.pipe(transformerStream);
                pipe.pipe(upstream);
            });

            multiplex.on('close', (channel) => {
                const upstream = channels[channel];
                if (!upstream) {
                    return;
                }
                upstream.unpipe();
                upstream.end();
                delete channels[channel];
            });

            ws.once('close', () => {
                multiplex.terminate();
                ws.terminate();
            });

            this.established = true;
            this.emit('open', tunnel);
        });

        ws.once('error', (wsErr) => {
            const err = new Error();
            err.code = wsErr.code;
            if (this.established) {
                err.message = `Websocket error: ${wsErr.message}`;
            } else {
                err.message = `Failed to establish websocket to ${tunnel.endpoint}: ${wsErr.message}`;
            }
            this.emit('error', err);
        });

        ws.once('close', (code, reason) => {
            const wasEstablished = this.established;
            this.established = false;
            this.emit('close', tunnel, wasEstablished)
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