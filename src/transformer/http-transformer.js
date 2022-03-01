import stream from 'stream';
import HTTPParser from 'http-parser-js';
import { URL } from 'url';
import Console from '../console/index.js';

class HttpTransformer extends stream.Transform {

    constructor(targetUrl, ingressUrl, rewriteHeaders = [], replaceHeaders = {}) {
        super();
        this.replaceHeaders = replaceHeaders;
        this.rewriteHeaders = rewriteHeaders;
        this.targetUrl = targetUrl;
        this.targetHost = this.targetUrl.host;
        try {
            this.ingressUrl = new URL(ingressUrl);
        } catch {}
        this.logger = new Console().logger;
        this.enabled = true;

        const httpParser = this.httpParser = new HTTPParser.HTTPParser();
        this.httpParser.initialize(HTTPParser.HTTPParser.REQUEST);
        httpParser.onHeadersComplete = (info) => {
            this.logger.isTraceEnabled() &&
                this.logger.trace(`HTTP request: ${info.method} ${info.url} HTTP/${info.versionMajor}.${info.versionMinor}`);
            this.push(`${info.method} ${info.url} HTTP/${info.versionMajor}.${info.versionMinor}\r\n`);
            const headers = info.headers;
            for (let i = 0; i < headers.length; i += 2) {
                const name = headers[i].toLowerCase();
                let value = headers[i+1];
                if (this.rewriteHeaders.includes(name)) {
                    if (value.toLowerCase().startsWith('http')) {
                        try {
                            const url = new URL(value);
                            if (url.hostname == this.ingressUrl.hostname) {
                                url.protocol = this.targetUrl.protocol;
                                url.hostname = this.targetUrl.hostname;
                                url.port = this.targetUrl.port;
                                value = url.href;
                            }
                        } catch (e) {
                        }
                    } else {
                        value = this.targetHost;
                    }
                } else if (this.replaceHeaders[name] !== undefined) {
                    value = this.replaceHeaders[name].length > 0 ? this.replaceHeaders[name] : undefined;
                }

                if (value) {
                    this.logger.isTraceEnabled() && this.logger.trace(`  ${headers[i]}: ${value}`);
                    this.push(`${headers[i]}: ${value}\r\n`);
                }

                if (name === 'connection' && value.toLowerCase() == 'upgrade') {
                    this._upgrade = true;
                }
            }
            this.push('\r\n');
        }

        httpParser.onBody = (body, start, len) => {
            this.push(body);
            httpParser.nextRequest();
        }

        httpParser.onMessageComplete = () => {
            if (this._upgrade) {
                this.logger.trace(`upgrade request, disabling transformer`);
                this.enabled = false;
            }
        };

        this.logger.trace(`targetUrl=${targetUrl}, ingressUrl=${ingressUrl}`);
    }

    _transform(chunk, encoding, callback) {
        if (!this.enabled) {
            this.push(chunk);
            return callback();
        }

        if (this.httpParser.execute(chunk) >= 0) {
            return callback();
        } else {
            this.push(chunk);
            return callback();
        }
    }
}

export default HttpTransformer;
