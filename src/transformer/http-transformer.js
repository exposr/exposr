import stream from 'stream';
import HTTPParser from 'http-parser-js';
import { URL } from 'url';
import { Logger } from '../logger.js';

class HttpTransformer extends stream.Transform {

    constructor(upstreamUrl, downstreamUrl, rewriteHeaders = [], replaceHeaders = {}) {
        super();
        this.replaceHeaders = replaceHeaders;
        this.rewriteHeaders = rewriteHeaders;
        this.upstreamUrl = upstreamUrl;
        this.upstreamHost = this.upstreamUrl.host;
        try {
            this.downstreamUrl = new URL(downstreamUrl);
        } catch {}
        this.logger = Logger('http-transformer');
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
                            if (url.hostname == this.downstreamUrl.hostname) {
                                url.protocol = this.upstreamUrl.protocol;
                                url.hostname = this.upstreamUrl.hostname;
                                url.port = this.upstreamUrl.port;
                                value = url.href;
                            }
                        } catch (e) {
                        }
                    } else {
                        value = this.upstreamHost;
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

        this.logger.trace(`upstreamUrl=${upstreamUrl}, downstreamUrl=${downstreamUrl}`);
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
