import net, { Socket } from 'net';
import tls from 'tls';
import portNumbers from 'port-numbers';
import dnscache from 'dnscache';

class UpstreamConnector {
    constructor(url, opts = {}) {
        this.dnscache = new dnscache({
            enable: true,
            ttl: 60,
            cachesize: 10,
        })
        this.opts = opts;
        this.url = url;
        this.protocol = url.protocol.slice(0, -1);
        const protocolInfo = portNumbers.getPort(this.protocol);
        this.tls = this.protocol === 'tls' || this.protocol === 'https' || this.protocol === 'wss';
        this.port = url.port == '' ? protocolInfo.port : url.port;
        this.serverName = !net.isIP(this.url.hostname) ? this.url.hostname : undefined;
    }

    _connect_tls(sock, address, callback) {
        const conOpts = {
            socket: sock,
        };

        if (this.serverName) {
            conOpts.servername = this.serverName;
        }

        if (this.opts.allowInsecure) {
            conOpts['checkServerIdentity'] = () => undefined;
            conOpts.rejectUnauthorized = false;
        }

        this._connect_net(sock, address, (err, netSocket) => {
            if (err) {
                return callback(err);
            }

            const connection = tls.connect(conOpts, () => {
                callback(undefined, connection);
            });

            connection.on('error', (err) => {
                console.log(err);
                callback(err);
            });
        });
    }

    _connect_net(sock, address, callback) {
        const conOpts = {
            host: address,
            port: this.port,
            setDefaultEncoding: 'binary'
        };

        const connection = sock.connect(conOpts);

        connection.once('ready', () => {
            callback(undefined, connection);
        });

        connection.on('error', (err) => {
            callback(err);
        });
    }

    _connect(sock, address, callback) {
        if (this.tls) {
            this._connect_tls(sock, address, callback);
        } else {
            this._connect_net(sock, address, callback);
        }
    }

    connect(callback) {
        const sock = new Socket();

        this.dnscache.lookup(this.url.hostname, (err, address) => {
            if (err) {
                callback(err);
            } else {
                this._connect(sock, address, callback);
            }
        });

        return sock;
    }
}

export default UpstreamConnector;