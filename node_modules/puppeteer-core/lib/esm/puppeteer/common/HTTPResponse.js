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
var _HTTPResponse_instances, _HTTPResponse_client, _HTTPResponse_request, _HTTPResponse_contentPromise, _HTTPResponse_bodyLoadedPromise, _HTTPResponse_remoteAddress, _HTTPResponse_status, _HTTPResponse_statusText, _HTTPResponse_url, _HTTPResponse_fromDiskCache, _HTTPResponse_fromServiceWorker, _HTTPResponse_headers, _HTTPResponse_securityDetails, _HTTPResponse_timing, _HTTPResponse_parseStatusTextFromExtrInfo;
import { HTTPResponse as BaseHTTPResponse, } from '../api/HTTPResponse.js';
import { createDeferredPromise } from '../util/DeferredPromise.js';
import { ProtocolError } from './Errors.js';
import { SecurityDetails } from './SecurityDetails.js';
/**
 * @internal
 */
export class HTTPResponse extends BaseHTTPResponse {
    constructor(client, request, responsePayload, extraInfo) {
        super();
        _HTTPResponse_instances.add(this);
        _HTTPResponse_client.set(this, void 0);
        _HTTPResponse_request.set(this, void 0);
        _HTTPResponse_contentPromise.set(this, null);
        _HTTPResponse_bodyLoadedPromise.set(this, createDeferredPromise());
        _HTTPResponse_remoteAddress.set(this, void 0);
        _HTTPResponse_status.set(this, void 0);
        _HTTPResponse_statusText.set(this, void 0);
        _HTTPResponse_url.set(this, void 0);
        _HTTPResponse_fromDiskCache.set(this, void 0);
        _HTTPResponse_fromServiceWorker.set(this, void 0);
        _HTTPResponse_headers.set(this, {});
        _HTTPResponse_securityDetails.set(this, void 0);
        _HTTPResponse_timing.set(this, void 0);
        __classPrivateFieldSet(this, _HTTPResponse_client, client, "f");
        __classPrivateFieldSet(this, _HTTPResponse_request, request, "f");
        __classPrivateFieldSet(this, _HTTPResponse_remoteAddress, {
            ip: responsePayload.remoteIPAddress,
            port: responsePayload.remotePort,
        }, "f");
        __classPrivateFieldSet(this, _HTTPResponse_statusText, __classPrivateFieldGet(this, _HTTPResponse_instances, "m", _HTTPResponse_parseStatusTextFromExtrInfo).call(this, extraInfo) ||
            responsePayload.statusText, "f");
        __classPrivateFieldSet(this, _HTTPResponse_url, request.url(), "f");
        __classPrivateFieldSet(this, _HTTPResponse_fromDiskCache, !!responsePayload.fromDiskCache, "f");
        __classPrivateFieldSet(this, _HTTPResponse_fromServiceWorker, !!responsePayload.fromServiceWorker, "f");
        __classPrivateFieldSet(this, _HTTPResponse_status, extraInfo ? extraInfo.statusCode : responsePayload.status, "f");
        const headers = extraInfo ? extraInfo.headers : responsePayload.headers;
        for (const [key, value] of Object.entries(headers)) {
            __classPrivateFieldGet(this, _HTTPResponse_headers, "f")[key.toLowerCase()] = value;
        }
        __classPrivateFieldSet(this, _HTTPResponse_securityDetails, responsePayload.securityDetails
            ? new SecurityDetails(responsePayload.securityDetails)
            : null, "f");
        __classPrivateFieldSet(this, _HTTPResponse_timing, responsePayload.timing || null, "f");
    }
    _resolveBody(err) {
        if (err) {
            return __classPrivateFieldGet(this, _HTTPResponse_bodyLoadedPromise, "f").resolve(err);
        }
        return __classPrivateFieldGet(this, _HTTPResponse_bodyLoadedPromise, "f").resolve();
    }
    remoteAddress() {
        return __classPrivateFieldGet(this, _HTTPResponse_remoteAddress, "f");
    }
    url() {
        return __classPrivateFieldGet(this, _HTTPResponse_url, "f");
    }
    ok() {
        // TODO: document === 0 case?
        return __classPrivateFieldGet(this, _HTTPResponse_status, "f") === 0 || (__classPrivateFieldGet(this, _HTTPResponse_status, "f") >= 200 && __classPrivateFieldGet(this, _HTTPResponse_status, "f") <= 299);
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
    securityDetails() {
        return __classPrivateFieldGet(this, _HTTPResponse_securityDetails, "f");
    }
    timing() {
        return __classPrivateFieldGet(this, _HTTPResponse_timing, "f");
    }
    buffer() {
        if (!__classPrivateFieldGet(this, _HTTPResponse_contentPromise, "f")) {
            __classPrivateFieldSet(this, _HTTPResponse_contentPromise, __classPrivateFieldGet(this, _HTTPResponse_bodyLoadedPromise, "f").then(async (error) => {
                if (error) {
                    throw error;
                }
                try {
                    const response = await __classPrivateFieldGet(this, _HTTPResponse_client, "f").send('Network.getResponseBody', {
                        requestId: __classPrivateFieldGet(this, _HTTPResponse_request, "f")._requestId,
                    });
                    return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
                }
                catch (error) {
                    if (error instanceof ProtocolError &&
                        error.originalMessage === 'No resource with given identifier found') {
                        throw new ProtocolError('Could not load body for this request. This might happen if the request is a preflight request.');
                    }
                    throw error;
                }
            }), "f");
        }
        return __classPrivateFieldGet(this, _HTTPResponse_contentPromise, "f");
    }
    request() {
        return __classPrivateFieldGet(this, _HTTPResponse_request, "f");
    }
    fromCache() {
        return __classPrivateFieldGet(this, _HTTPResponse_fromDiskCache, "f") || __classPrivateFieldGet(this, _HTTPResponse_request, "f")._fromMemoryCache;
    }
    fromServiceWorker() {
        return __classPrivateFieldGet(this, _HTTPResponse_fromServiceWorker, "f");
    }
    frame() {
        return __classPrivateFieldGet(this, _HTTPResponse_request, "f").frame();
    }
}
_HTTPResponse_client = new WeakMap(), _HTTPResponse_request = new WeakMap(), _HTTPResponse_contentPromise = new WeakMap(), _HTTPResponse_bodyLoadedPromise = new WeakMap(), _HTTPResponse_remoteAddress = new WeakMap(), _HTTPResponse_status = new WeakMap(), _HTTPResponse_statusText = new WeakMap(), _HTTPResponse_url = new WeakMap(), _HTTPResponse_fromDiskCache = new WeakMap(), _HTTPResponse_fromServiceWorker = new WeakMap(), _HTTPResponse_headers = new WeakMap(), _HTTPResponse_securityDetails = new WeakMap(), _HTTPResponse_timing = new WeakMap(), _HTTPResponse_instances = new WeakSet(), _HTTPResponse_parseStatusTextFromExtrInfo = function _HTTPResponse_parseStatusTextFromExtrInfo(extraInfo) {
    if (!extraInfo || !extraInfo.headersText) {
        return;
    }
    const firstLine = extraInfo.headersText.split('\r', 1)[0];
    if (!firstLine) {
        return;
    }
    const match = firstLine.match(/[^ ]* [^ ]* (.*)/);
    if (!match) {
        return;
    }
    const statusText = match[1];
    if (!statusText) {
        return;
    }
    return statusText;
};
//# sourceMappingURL=HTTPResponse.js.map