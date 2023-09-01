import { EventEmitter } from 'events';
import Mutex from '../utils/mutex.js';
import { setTimeout } from 'timers/promises';
import TunnelTransport from './tunnel-transport.js';

class Tunnel extends EventEmitter {
    constructor(props) {
        super();
        this._maxTransports = props.maxTransports || 1;
        this._getEndpoint = props.getEndpoint;
        this._props = props;
        this._transports = [];
        this._connectMutex = new Mutex();
        this._connectionId = 0;
        this.connections = 0;

        this._cancelController = new AbortController();
        this._cancelSignal = this._cancelController.signal;
    }

    async connect(signal) {

        for (let i = 0; i < this._maxTransports; i++) {
            this._createTransport();
        }

        this._emitStatus();

        const connections = this._transports.map((transport) => {
            return this._connectTransport(transport.id, transport.tunnel, transport.abortController.signal);
        });

        const abortController = new AbortController();
        const abort = new Promise((resolve) => {
            signal.addEventListener('abort', resolve,
                {
                    once: true,
                    signal: abortController.signal,
                });
        });

        const result = await Promise.race([
            Promise.allSettled(connections),
            abort
        ]);

        if (signal?.aborted == true) {
            this._transports.forEach((transport) => {
                transport.abortController.abort();
            });
            await Promise.allSettled(connections);
        }

        abortController.abort();
    }

    async disconnect() {
        while (this._transports.length > 0) {
            const transport = this._transports.pop();
            await transport.tunnel.close();
        }
    }

    _emitStatus(source) {
        const current_connections = this._transports.filter((transport) => transport.tunnel.connected == true).length;
        this.emit('status', {
            connected: current_connections > 0,
            current_connections,
            max_connections: this._transports.length,
            transports: this._transports.map((transport) => {
                return {
                    id: transport.id,
                    connected: transport.tunnel.connected,
                    error: transport.error,
                    closed: transport.closed,
                }
            }),
        }, source);
    }

    _createTransport() {
        const tunnel = new TunnelTransport({
            ...this._props,
        });

        this._transports.push({
            id: this._connectionId++,
            tunnel,
            abortController: new AbortController,
        });
    }

    _setError(id, error) {
        const index = this._transports.findIndex((transport) => transport.id == id);
        if (index != -1) {
            this._transports[index].error = error;
        }
    }

    _setCloseReason(id, reason) {
        const index = this._transports.findIndex((transport) => transport.id == id);
        if (index != -1) {
            this._transports[index].closed = reason;
        }
    }

    async _connectTransport(id, tunnel, signal) {

        let retryDelay = 1000;
        while (signal.aborted == false) {
            if (!(await this._connectMutex.acquire(signal).catch(() => { return false }))) {
                break;
            }

            let endpoint, connected, error;
            [endpoint, error] = await this._getEndpoint();
            if (endpoint) {
                [connected, error] = await tunnel.connect(endpoint, signal)
                        .then(() => { return [true, undefined] })
                        .catch((e) => { return [false, e]});
            }

            this._connectMutex.release();

            if (error) {
                this._setError(id, error);
                this._emitStatus(id);
                const result = await setTimeout(retryDelay, 'timeout', signal);
                if (result == 'timeout') {
                    retryDelay = Math.min(retryDelay * (1.1 + (Math.random() * 0.05)), 5000 + Math.floor(Math.random() * 100));
                    continue;
                }
            } else if (connected) {
                this._setError(id, undefined);
                this._setCloseReason(id, undefined);
                this._emitStatus(id);
                retryDelay = 1000;

                const result = await new Promise((resolve) => {
                    const closeHandler = (code, reason) => {
                        handler([code, reason]);
                    };
                    const signalHandler = () => {
                        handler('signal');
                    };
                    const handler = (result) => {
                        tunnel.removeListener('close', closeHandler);
                        signal.removeEventListener('abort', closeHandler);
                        resolve(result);
                    };
                    tunnel.once('close', closeHandler);
                    signal.addEventListener('abort', signalHandler, { once: true });
                });
                if (result != 'signal') {
                    const [code, reason] = result;
                    this._setCloseReason(id, reason);
                    if (code == 1008) {
                        break;
                    }
                }
                this._emitStatus(id);
            }
        }
        this._emitStatus(id);
    }
}

export default Tunnel;