import stream from 'stream';
import HTTPParser from 'http-parser-js';
import { URL } from 'url';
import { Logger } from './logger.js';

const httpParser = new HTTPParser.HTTPParser();

class HttpTransformer extends stream.Transform {

    constructor(upstreamUrl, downstreamUrl, rewriteHeaders = [], replaceHeaders = {}) {
        super();
        this.replaceHeaders = replaceHeaders;
        this.rewriteHeaders = rewriteHeaders;
        this.upstreamUrl = upstreamUrl;
        this.upstreamHost = `${this.upstreamUrl.host}${this.upstreamUrl.port ? `:${this.upstreamUrl.port}` : ''}`;
        try {
            this.downstreamUrl = new URL(downstreamUrl);
            this.downstreamHost = `${this.downstreamUrl.host}${this.downstreamUrl.port ? `:${this.downstreamUrl.port}` : ''}`;
        } catch {}
        this.logger = Logger('http-transformer');
    }

    _transform(chunk, encoding, callback) {
        const self = this;
        httpParser.initialize(HTTPParser.HTTPParser.REQUEST);
        httpParser.onHeadersComplete = (info) => {
            this.logger.isTraceEnabled() &&
                this.logger.trace(`HTTP request: ${info.method} ${info.url} HTTP/${info.versionMajor}.${info.versionMinor}`);
            self.push(`${info.method} ${info.url} HTTP/${info.versionMajor}.${info.versionMinor}\r\n`);
            const headers = info.headers;
            for (let i = 0; i < headers.length; i += 2) {
                const name = headers[i];
                let value = headers[i+1];
                if (this.rewriteHeaders.includes(name)) {
                    if (value.toLowerCase().startsWith('http')) {
                        try {
                            const url = new URL(value);
                            if (url.host == this.downstreamUrl.host) {
                                url.protocol = this.upstreamUrl.protocol;
                                url.host = this.upstreamUrl.host;
                                url.port = this.upstreamUrl.port;
                                value = url.href;
                            }
                        } catch {
                        }
                    } else {
                        value = this.upstreamHost;
                    }
                } else if (self.replaceHeaders[name] !== undefined) {
                    value = self.replaceHeaders[name].length > 0 ? self.replaceHeaders[name] : undefined;
                }

                if (value) {
                    this.logger.isTraceEnabled() && this.logger.trace(`  ${name}: ${value}`);
                    self.push(`${name}: ${value}\r\n`);
                }
            }
            self.push('\r\n');
        }
        httpParser.onBody = (body, start, len) => {
            self.push(body);
        }
        httpParser.onMessageComplete = callback;

        if (httpParser.execute(chunk) < 0) {
            this.push(chunk);
            callback();
            return;
        }
        httpParser.finish();
    }
}

export default HttpTransformer;
