import { HTTPResponse as HTTPResponse, } from '../api/HTTPResponse.js';
/**
 * @internal
 */
export class BidiHTTPResponse extends HTTPResponse {
    #request;
    #remoteAddress;
    #status;
    #statusText;
    #url;
    #fromCache;
    #headers = {};
    #timings;
    constructor(request, { response }) {
        super();
        this.#request = request;
        this.#remoteAddress = {
            ip: '',
            port: -1,
        };
        this.#url = response.url;
        this.#fromCache = response.fromCache;
        this.#status = response.status;
        this.#statusText = response.statusText;
        // TODO: File and issue with BiDi spec
        this.#timings = null;
        // TODO: Removed once the Firefox implementation is compliant with https://w3c.github.io/webdriver-bidi/#get-the-response-data.
        for (const header of response.headers || []) {
            // TODO: How to handle Binary Headers
            // https://w3c.github.io/webdriver-bidi/#type-network-Header
            if (header.value.type === 'string') {
                this.#headers[header.name.toLowerCase()] = header.value.value;
            }
        }
    }
    remoteAddress() {
        return this.#remoteAddress;
    }
    url() {
        return this.#url;
    }
    status() {
        return this.#status;
    }
    statusText() {
        return this.#statusText;
    }
    headers() {
        return this.#headers;
    }
    request() {
        return this.#request;
    }
    fromCache() {
        return this.#fromCache;
    }
    timing() {
        return this.#timings;
    }
    frame() {
        return this.#request.frame();
    }
    fromServiceWorker() {
        return false;
    }
}
//# sourceMappingURL=HTTPResponse.js.map