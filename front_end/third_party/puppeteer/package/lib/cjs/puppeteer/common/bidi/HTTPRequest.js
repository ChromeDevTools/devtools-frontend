"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _HTTPRequest_url, _HTTPRequest_resourceType, _HTTPRequest_method, _HTTPRequest_postData, _HTTPRequest_headers, _HTTPRequest_initiator, _HTTPRequest_frame;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPRequest = void 0;
const HTTPRequest_js_1 = require("../../api/HTTPRequest.js");
/**
 * @internal
 */
class HTTPRequest extends HTTPRequest_js_1.HTTPRequest {
    constructor(event, frame, redirectChain) {
        super();
        this._response = null;
        _HTTPRequest_url.set(this, void 0);
        _HTTPRequest_resourceType.set(this, void 0);
        _HTTPRequest_method.set(this, void 0);
        _HTTPRequest_postData.set(this, void 0);
        _HTTPRequest_headers.set(this, {});
        _HTTPRequest_initiator.set(this, void 0);
        _HTTPRequest_frame.set(this, void 0);
        __classPrivateFieldSet(this, _HTTPRequest_url, event.request.url, "f");
        __classPrivateFieldSet(this, _HTTPRequest_resourceType, event.initiator.type.toLowerCase(), "f");
        __classPrivateFieldSet(this, _HTTPRequest_method, event.request.method, "f");
        __classPrivateFieldSet(this, _HTTPRequest_postData, undefined, "f");
        __classPrivateFieldSet(this, _HTTPRequest_initiator, event.initiator, "f");
        __classPrivateFieldSet(this, _HTTPRequest_frame, frame, "f");
        this._requestId = event.request.request;
        this._redirectChain = redirectChain ?? [];
        this._navigationId = event.navigation;
        for (const { name, value } of event.request.headers) {
            // TODO: How to handle Binary Headers
            // https://w3c.github.io/webdriver-bidi/#type-network-Header
            if (value) {
                __classPrivateFieldGet(this, _HTTPRequest_headers, "f")[name.toLowerCase()] = value;
            }
        }
    }
    url() {
        return __classPrivateFieldGet(this, _HTTPRequest_url, "f");
    }
    resourceType() {
        return __classPrivateFieldGet(this, _HTTPRequest_resourceType, "f");
    }
    method() {
        return __classPrivateFieldGet(this, _HTTPRequest_method, "f");
    }
    postData() {
        return __classPrivateFieldGet(this, _HTTPRequest_postData, "f");
    }
    headers() {
        return __classPrivateFieldGet(this, _HTTPRequest_headers, "f");
    }
    response() {
        return this._response;
    }
    isNavigationRequest() {
        return Boolean(this._navigationId);
    }
    initiator() {
        return __classPrivateFieldGet(this, _HTTPRequest_initiator, "f");
    }
    redirectChain() {
        return this._redirectChain.slice();
    }
    enqueueInterceptAction(pendingHandler) {
        // Execute the handler when interception is not supported
        void pendingHandler();
    }
    frame() {
        return __classPrivateFieldGet(this, _HTTPRequest_frame, "f");
    }
}
exports.HTTPRequest = HTTPRequest;
_HTTPRequest_url = new WeakMap(), _HTTPRequest_resourceType = new WeakMap(), _HTTPRequest_method = new WeakMap(), _HTTPRequest_postData = new WeakMap(), _HTTPRequest_headers = new WeakMap(), _HTTPRequest_initiator = new WeakMap(), _HTTPRequest_frame = new WeakMap();
//# sourceMappingURL=HTTPRequest.js.map