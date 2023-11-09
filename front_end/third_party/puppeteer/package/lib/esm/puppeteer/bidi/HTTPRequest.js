import { HTTPRequest } from '../api/HTTPRequest.js';
/**
 * @internal
 */
export class BidiHTTPRequest extends HTTPRequest {
    _response = null;
    _redirectChain;
    _navigationId;
    #url;
    #resourceType;
    #method;
    #postData;
    #headers = {};
    #initiator;
    #frame;
    constructor(event, frame, redirectChain = []) {
        super();
        this.#url = event.request.url;
        this.#resourceType = event.initiator.type.toLowerCase();
        this.#method = event.request.method;
        this.#postData = undefined;
        this.#initiator = event.initiator;
        this.#frame = frame;
        this._requestId = event.request.request;
        this._redirectChain = redirectChain;
        this._navigationId = event.navigation;
        for (const header of event.request.headers) {
            // TODO: How to handle Binary Headers
            // https://w3c.github.io/webdriver-bidi/#type-network-Header
            if (header.value.type === 'string') {
                this.#headers[header.name.toLowerCase()] = header.value.value;
            }
        }
    }
    get client() {
        throw new Error('Not implemented');
    }
    url() {
        return this.#url;
    }
    resourceType() {
        return this.#resourceType;
    }
    method() {
        return this.#method;
    }
    postData() {
        return this.#postData;
    }
    headers() {
        return this.#headers;
    }
    response() {
        return this._response;
    }
    isNavigationRequest() {
        return Boolean(this._navigationId);
    }
    initiator() {
        return this.#initiator;
    }
    redirectChain() {
        return this._redirectChain.slice();
    }
    enqueueInterceptAction(pendingHandler) {
        // Execute the handler when interception is not supported
        void pendingHandler();
    }
    frame() {
        return this.#frame;
    }
    continueRequestOverrides() {
        throw new Error('Not implemented');
    }
    async continue(_overrides = {}) {
        throw new Error('Not implemented');
    }
    responseForRequest() {
        throw new Error('Not implemented');
    }
    abortErrorReason() {
        throw new Error('Not implemented');
    }
    interceptResolutionState() {
        throw new Error('Not implemented');
    }
    isInterceptResolutionHandled() {
        throw new Error('Not implemented');
    }
    async finalizeInterceptions() {
        throw new Error('Not implemented');
    }
    abort() {
        throw new Error('Not implemented');
    }
    respond(_response, _priority) {
        throw new Error('Not implemented');
    }
    failure() {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=HTTPRequest.js.map