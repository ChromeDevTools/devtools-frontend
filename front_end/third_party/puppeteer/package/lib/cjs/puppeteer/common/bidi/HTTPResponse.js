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
var _HTTPResponse_request, _HTTPResponse_remoteAddress, _HTTPResponse_status, _HTTPResponse_statusText, _HTTPResponse_url, _HTTPResponse_fromCache, _HTTPResponse_headers, _HTTPResponse_timings;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPResponse = void 0;
const HTTPResponse_js_1 = require("../../api/HTTPResponse.js");
/**
 * @internal
 */
class HTTPResponse extends HTTPResponse_js_1.HTTPResponse {
    constructor(request, responseEvent) {
        super();
        _HTTPResponse_request.set(this, void 0);
        _HTTPResponse_remoteAddress.set(this, void 0);
        _HTTPResponse_status.set(this, void 0);
        _HTTPResponse_statusText.set(this, void 0);
        _HTTPResponse_url.set(this, void 0);
        _HTTPResponse_fromCache.set(this, void 0);
        _HTTPResponse_headers.set(this, {});
        _HTTPResponse_timings.set(this, void 0);
        const { response } = responseEvent;
        __classPrivateFieldSet(this, _HTTPResponse_request, request, "f");
        __classPrivateFieldSet(this, _HTTPResponse_remoteAddress, {
            ip: '',
            port: -1,
        }, "f");
        __classPrivateFieldSet(this, _HTTPResponse_url, response.url, "f");
        __classPrivateFieldSet(this, _HTTPResponse_fromCache, response.fromCache, "f");
        __classPrivateFieldSet(this, _HTTPResponse_status, response.status, "f");
        __classPrivateFieldSet(this, _HTTPResponse_statusText, response.statusText, "f");
        // TODO: update once BiDi has types
        __classPrivateFieldSet(this, _HTTPResponse_timings, response.timings ?? null, "f");
        // TODO: Removed once the Firefox implementation is compliant with https://w3c.github.io/webdriver-bidi/#get-the-response-data.
        for (const header of response.headers || []) {
            __classPrivateFieldGet(this, _HTTPResponse_headers, "f")[header.name] = header.value ?? '';
        }
    }
    remoteAddress() {
        return __classPrivateFieldGet(this, _HTTPResponse_remoteAddress, "f");
    }
    url() {
        return __classPrivateFieldGet(this, _HTTPResponse_url, "f");
    }
    status() {
        return __classPrivateFieldGet(this, _HTTPResponse_status, "f");
    }
    statusText() {
        return __classPrivateFieldGet(this, _HTTPResponse_statusText, "f");
    }
    headers() {
        return __classPrivateFieldGet(this, _HTTPResponse_headers, "f");
    }
    request() {
        return __classPrivateFieldGet(this, _HTTPResponse_request, "f");
    }
    fromCache() {
        return __classPrivateFieldGet(this, _HTTPResponse_fromCache, "f");
    }
    timing() {
        return __classPrivateFieldGet(this, _HTTPResponse_timings, "f");
    }
    frame() {
        return __classPrivateFieldGet(this, _HTTPResponse_request, "f").frame();
    }
}
exports.HTTPResponse = HTTPResponse;
_HTTPResponse_request = new WeakMap(), _HTTPResponse_remoteAddress = new WeakMap(), _HTTPResponse_status = new WeakMap(), _HTTPResponse_statusText = new WeakMap(), _HTTPResponse_url = new WeakMap(), _HTTPResponse_fromCache = new WeakMap(), _HTTPResponse_headers = new WeakMap(), _HTTPResponse_timings = new WeakMap();
//# sourceMappingURL=HTTPResponse.js.map