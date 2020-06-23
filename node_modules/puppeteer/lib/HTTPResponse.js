"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPResponse = void 0;
const SecurityDetails_1 = require("./SecurityDetails");
class HTTPResponse {
    constructor(client, request, responsePayload) {
        this._contentPromise = null;
        this._headers = {};
        this._client = client;
        this._request = request;
        this._bodyLoadedPromise = new Promise((fulfill) => {
            this._bodyLoadedPromiseFulfill = fulfill;
        });
        this._remoteAddress = {
            ip: responsePayload.remoteIPAddress,
            port: responsePayload.remotePort,
        };
        this._status = responsePayload.status;
        this._statusText = responsePayload.statusText;
        this._url = request.url();
        this._fromDiskCache = !!responsePayload.fromDiskCache;
        this._fromServiceWorker = !!responsePayload.fromServiceWorker;
        for (const key of Object.keys(responsePayload.headers))
            this._headers[key.toLowerCase()] = responsePayload.headers[key];
        this._securityDetails = responsePayload.securityDetails
            ? new SecurityDetails_1.SecurityDetails(responsePayload.securityDetails)
            : null;
    }
    _resolveBody(err) {
        return this._bodyLoadedPromiseFulfill(err);
    }
    remoteAddress() {
        return this._remoteAddress;
    }
    url() {
        return this._url;
    }
    ok() {
        return this._status === 0 || (this._status >= 200 && this._status <= 299);
    }
    status() {
        return this._status;
    }
    statusText() {
        return this._statusText;
    }
    headers() {
        return this._headers;
    }
    securityDetails() {
        return this._securityDetails;
    }
    buffer() {
        if (!this._contentPromise) {
            this._contentPromise = this._bodyLoadedPromise.then(async (error) => {
                if (error)
                    throw error;
                const response = await this._client.send('Network.getResponseBody', {
                    requestId: this._request._requestId,
                });
                return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
            });
        }
        return this._contentPromise;
    }
    async text() {
        const content = await this.buffer();
        return content.toString('utf8');
    }
    async json() {
        const content = await this.text();
        return JSON.parse(content);
    }
    request() {
        return this._request;
    }
    fromCache() {
        return this._fromDiskCache || this._request._fromMemoryCache;
    }
    fromServiceWorker() {
        return this._fromServiceWorker;
    }
    frame() {
        return this._request.frame();
    }
}
exports.HTTPResponse = HTTPResponse;
