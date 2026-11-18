import { HTTPResponse } from '../api/HTTPResponse.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { SecurityDetails } from '../common/SecurityDetails.js';
import { normalizeHeaderValue } from '../util/httpUtils.js';
import { emitRequestServedFromCache, emitResponse } from './NetworkEvents.js';
/**
 * @internal
 */
export class BidiHTTPResponse extends HTTPResponse {
    /**
     * Returns a new BidiHTTPResponse or updates the existing one if it already exists.
     */
    static from(data, request, cdpSupported) {
        const existingResponse = request.response();
        if (existingResponse) {
            // Update existing response data with up-to-date data.
            existingResponse.#data = data;
            return existingResponse;
        }
        const response = new BidiHTTPResponse(data, request, cdpSupported);
        response.#initialize();
        return response;
    }
    #data;
    #request;
    #securityDetails;
    #cdpSupported = false;
    constructor(data, request, cdpSupported) {
        super();
        this.#data = data;
        this.#request = request;
        this.#cdpSupported = cdpSupported;
        // @ts-expect-error non-standard property.
        const securityDetails = data['goog:securityDetails'];
        if (cdpSupported && securityDetails) {
            this.#securityDetails = new SecurityDetails(securityDetails);
        }
    }
    #initialize() {
        if (this.#data.fromCache) {
            this.#request._fromMemoryCache = true;
        }
        // Requests from dedicated workers have no frame and are not reported.
        const page = this.#request.frame()?.page();
        if (!page) {
            return;
        }
        if (this.#data.fromCache) {
            emitRequestServedFromCache(page, this.#request);
        }
        emitResponse(page, this);
    }
    remoteAddress() {
        return {
            ip: '',
            port: -1,
        };
    }
    url() {
        return this.#data.url;
    }
    status() {
        return this.#data.status;
    }
    statusText() {
        return this.#data.statusText;
    }
    headers() {
        const headers = {};
        for (const header of this.#data.headers) {
            // TODO: How to handle Binary Headers
            // https://w3c.github.io/webdriver-bidi/#type-network-Header
            if (header.value.type === 'string') {
                const headerName = header.name.toLowerCase();
                const value = headerName in headers
                    ? `${headers[headerName]}\n${header.value.value}`
                    : header.value.value;
                headers[headerName] = normalizeHeaderValue(headerName, value);
            }
        }
        return headers;
    }
    request() {
        return this.#request;
    }
    fromCache() {
        return this.#data.fromCache;
    }
    timing() {
        const bidiTiming = this.#request.timing();
        return {
            requestTime: bidiTiming.requestTime,
            proxyStart: -1,
            proxyEnd: -1,
            dnsStart: bidiTiming.dnsStart,
            dnsEnd: bidiTiming.dnsEnd,
            connectStart: bidiTiming.connectStart,
            connectEnd: bidiTiming.connectEnd,
            sslStart: bidiTiming.tlsStart,
            sslEnd: -1,
            workerStart: -1,
            workerReady: -1,
            workerFetchStart: -1,
            workerRespondWithSettled: -1,
            workerRouterEvaluationStart: -1,
            workerCacheLookupStart: -1,
            sendStart: bidiTiming.requestStart,
            sendEnd: -1,
            pushStart: -1,
            pushEnd: -1,
            receiveHeadersStart: bidiTiming.responseStart,
            receiveHeadersEnd: bidiTiming.responseEnd,
        };
    }
    encodedDataLength() {
        // Chromium reports -1 when the size is unknown, e.g. for data: URLs.
        return Math.max(this.#data.bytesReceived, 0);
    }
    frame() {
        return this.#request.frame();
    }
    fromServiceWorker() {
        return false;
    }
    securityDetails() {
        if (!this.#cdpSupported) {
            throw new UnsupportedOperation();
        }
        return this.#securityDetails ?? null;
    }
    async content() {
        return await this.#request.getResponseContent();
    }
    stream() {
        throw new UnsupportedOperation();
    }
}
//# sourceMappingURL=HTTPResponse.js.map