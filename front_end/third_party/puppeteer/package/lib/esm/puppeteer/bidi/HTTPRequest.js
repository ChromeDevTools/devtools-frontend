var _a;
import { HTTPRequest } from '../api/HTTPRequest.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { BidiHTTPResponse } from './HTTPResponse.js';
export const requests = new WeakMap();
/**
 * @internal
 */
export class BidiHTTPRequest extends HTTPRequest {
    static from(bidiRequest, frame) {
        const request = new _a(bidiRequest, frame);
        request.#initialize();
        return request;
    }
    #redirect;
    #response = null;
    id;
    #frame;
    #request;
    constructor(request, frame) {
        super();
        requests.set(request, this);
        this.#request = request;
        this.#frame = frame;
        this.id = request.id;
    }
    get client() {
        throw new UnsupportedOperation();
    }
    #initialize() {
        this.#request.on('redirect', request => {
            this.#redirect = _a.from(request, this.#frame);
        });
        this.#request.once('success', data => {
            this.#response = BidiHTTPResponse.from(data, this);
        });
        this.#frame?.page().trustedEmitter.emit("request" /* PageEvent.Request */, this);
    }
    url() {
        return this.#request.url;
    }
    resourceType() {
        throw new UnsupportedOperation();
    }
    method() {
        return this.#request.method;
    }
    postData() {
        throw new UnsupportedOperation();
    }
    hasPostData() {
        throw new UnsupportedOperation();
    }
    async fetchPostData() {
        throw new UnsupportedOperation();
    }
    headers() {
        const headers = {};
        for (const header of this.#request.headers) {
            headers[header.name.toLowerCase()] = header.value.value;
        }
        return headers;
    }
    response() {
        return this.#response;
    }
    failure() {
        if (this.#request.error === undefined) {
            return null;
        }
        return { errorText: this.#request.error };
    }
    isNavigationRequest() {
        return this.#request.navigation !== undefined;
    }
    initiator() {
        return this.#request.initiator;
    }
    redirectChain() {
        if (this.#redirect === undefined) {
            return [];
        }
        const redirects = [this.#redirect];
        for (const redirect of redirects) {
            if (redirect.#redirect !== undefined) {
                redirects.push(redirect.#redirect);
            }
        }
        return redirects;
    }
    enqueueInterceptAction(pendingHandler) {
        // Execute the handler when interception is not supported
        void pendingHandler();
    }
    frame() {
        return this.#frame ?? null;
    }
    continueRequestOverrides() {
        throw new UnsupportedOperation();
    }
    continue(_overrides = {}) {
        throw new UnsupportedOperation();
    }
    responseForRequest() {
        throw new UnsupportedOperation();
    }
    abortErrorReason() {
        throw new UnsupportedOperation();
    }
    interceptResolutionState() {
        throw new UnsupportedOperation();
    }
    isInterceptResolutionHandled() {
        throw new UnsupportedOperation();
    }
    finalizeInterceptions() {
        throw new UnsupportedOperation();
    }
    abort() {
        throw new UnsupportedOperation();
    }
    respond(_response, _priority) {
        throw new UnsupportedOperation();
    }
}
_a = BidiHTTPRequest;
//# sourceMappingURL=HTTPRequest.js.map