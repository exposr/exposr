import stream from 'stream';
import HTTPParser from 'http-parser-js';
import { URL } from 'url';

const httpParser = new HTTPParser.HTTPParser();

class HttpTransformer extends stream.Transform {

    constructor(upstreamUrl, rewriteHeaders = [], replaceHeaders = {}) {
        super();
        this.replaceHeaders = replaceHeaders;
        this.rewriteHeaders = rewriteHeaders;
        this.upstreamUrl = upstreamUrl;
    }

    _transform(chunk, encoding, callback) {
        const self = this;
        httpParser.initialize(HTTPParser.HTTPParser.REQUEST);
        httpParser.onHeadersComplete = (info) => {
            self.push(`${info.method} ${info.url} HTTP/${info.versionMajor}.${info.versionMinor}\r\n`);
            const headers = info.headers;
            for (let i = 0; i < headers.length; i += 2) {
                const name = headers[i];
                let value = headers[i+1];
                if (this.rewriteHeaders.includes(name)) {
                    const url = new URL(value);
                    url.protocol = this.upstreamUrl.protocol;
                    url.host = this.upstreamUrl.host;
                    url.port = this.upstreamUrl.port;
                    value = url.href;
                } else if (self.replaceHeaders[name] !== undefined) {
                    value = self.replaceHeaders[name].length > 0 ? self.replaceHeaders[name] : undefined;
                }

                if (value) {
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
