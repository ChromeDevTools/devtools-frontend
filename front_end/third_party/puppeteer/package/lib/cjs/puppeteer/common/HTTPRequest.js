"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _HTTPRequest_instances, _HTTPRequest_client, _HTTPRequest_isNavigationRequest, _HTTPRequest_allowInterception, _HTTPRequest_interceptionHandled, _HTTPRequest_url, _HTTPRequest_resourceType, _HTTPRequest_method, _HTTPRequest_postData, _HTTPRequest_headers, _HTTPRequest_frame, _HTTPRequest_continueRequestOverrides, _HTTPRequest_responseForRequest, _HTTPRequest_abortErrorReason, _HTTPRequest_interceptResolutionState, _HTTPRequest_interceptHandlers, _HTTPRequest_initiator, _HTTPRequest_continue, _HTTPRequest_respond, _HTTPRequest_abort;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPRequest = void 0;
const HTTPRequest_js_1 = require("../api/HTTPRequest.js");
const assert_js_1 = require("../util/assert.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
class HTTPRequest extends HTTPRequest_js_1.HTTPRequest {
    get client() {
        return __classPrivateFieldGet(this, _HTTPRequest_client, "f");
    }
    constructor(client, frame, interceptionId, allowInterception, data, redirectChain) {
        super();
        _HTTPRequest_instances.add(this);
        this._failureText = null;
        this._response = null;
        this._fromMemoryCache = false;
        _HTTPRequest_client.set(this, void 0);
        _HTTPRequest_isNavigationRequest.set(this, void 0);
        _HTTPRequest_allowInterception.set(this, void 0);
        _HTTPRequest_interceptionHandled.set(this, false);
        _HTTPRequest_url.set(this, void 0);
        _HTTPRequest_resourceType.set(this, void 0);
        _HTTPRequest_method.set(this, void 0);
        _HTTPRequest_postData.set(this, void 0);
        _HTTPRequest_headers.set(this, {});
        _HTTPRequest_frame.set(this, void 0);
        _HTTPRequest_continueRequestOverrides.set(this, void 0);
        _HTTPRequest_responseForRequest.set(this, null);
        _HTTPRequest_abortErrorReason.set(this, null);
        _HTTPRequest_interceptResolutionState.set(this, {
            action: HTTPRequest_js_1.InterceptResolutionAction.None,
        });
        _HTTPRequest_interceptHandlers.set(this, void 0);
        _HTTPRequest_initiator.set(this, void 0);
        __classPrivateFieldSet(this, _HTTPRequest_client, client, "f");
        this._requestId = data.requestId;
        __classPrivateFieldSet(this, _HTTPRequest_isNavigationRequest, data.requestId === data.loaderId && data.type === 'Document', "f");
        this._interceptionId = interceptionId;
        __classPrivateFieldSet(this, _HTTPRequest_allowInterception, allowInterception, "f");
        __classPrivateFieldSet(this, _HTTPRequest_url, data.request.url, "f");
        __classPrivateFieldSet(this, _HTTPRequest_resourceType, (data.type || 'other').toLowerCase(), "f");
        __classPrivateFieldSet(this, _HTTPRequest_method, data.request.method, "f");
        __classPrivateFieldSet(this, _HTTPRequest_postData, data.request.postData, "f");
        __classPrivateFieldSet(this, _HTTPRequest_frame, frame, "f");
        this._redirectChain = redirectChain;
        __classPrivateFieldSet(this, _HTTPRequest_continueRequestOverrides, {}, "f");
        __classPrivateFieldSet(this, _HTTPRequest_interceptHandlers, [], "f");
        __classPrivateFieldSet(this, _HTTPRequest_initiator, data.initiator, "f");
        for (const [key, value] of Object.entries(data.request.headers)) {
            __classPrivateFieldGet(this, _HTTPRequest_headers, "f")[key.toLowerCase()] = value;
        }
    }
    url() {
        return __classPrivateFieldGet(this, _HTTPRequest_url, "f");
    }
    continueRequestOverrides() {
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        return __classPrivateFieldGet(this, _HTTPRequest_continueRequestOverrides, "f");
    }
    responseForRequest() {
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        return __classPrivateFieldGet(this, _HTTPRequest_responseForRequest, "f");
    }
    abortErrorReason() {
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        return __classPrivateFieldGet(this, _HTTPRequest_abortErrorReason, "f");
    }
    interceptResolutionState() {
        if (!__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f")) {
            return { action: HTTPRequest_js_1.InterceptResolutionAction.Disabled };
        }
        if (__classPrivateFieldGet(this, _HTTPRequest_interceptionHandled, "f")) {
            return { action: HTTPRequest_js_1.InterceptResolutionAction.AlreadyHandled };
        }
        return { ...__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f") };
    }
    isInterceptResolutionHandled() {
        return __classPrivateFieldGet(this, _HTTPRequest_interceptionHandled, "f");
    }
    enqueueInterceptAction(pendingHandler) {
        __classPrivateFieldGet(this, _HTTPRequest_interceptHandlers, "f").push(pendingHandler);
    }
    async finalizeInterceptions() {
        await __classPrivateFieldGet(this, _HTTPRequest_interceptHandlers, "f").reduce((promiseChain, interceptAction) => {
            return promiseChain.then(interceptAction);
        }, Promise.resolve());
        const { action } = this.interceptResolutionState();
        switch (action) {
            case 'abort':
                return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_abort).call(this, __classPrivateFieldGet(this, _HTTPRequest_abortErrorReason, "f"));
            case 'respond':
                if (__classPrivateFieldGet(this, _HTTPRequest_responseForRequest, "f") === null) {
                    throw new Error('Response is missing for the interception');
                }
                return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_respond).call(this, __classPrivateFieldGet(this, _HTTPRequest_responseForRequest, "f"));
            case 'continue':
                return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_continue).call(this, __classPrivateFieldGet(this, _HTTPRequest_continueRequestOverrides, "f"));
        }
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
    frame() {
        return __classPrivateFieldGet(this, _HTTPRequest_frame, "f");
    }
    isNavigationRequest() {
        return __classPrivateFieldGet(this, _HTTPRequest_isNavigationRequest, "f");
    }
    initiator() {
        return __classPrivateFieldGet(this, _HTTPRequest_initiator, "f");
    }
    redirectChain() {
        return this._redirectChain.slice();
    }
    failure() {
        if (!this._failureText) {
            return null;
        }
        return {
            errorText: this._failureText,
        };
    }
    async continue(overrides = {}, priority) {
        // Request interception is not supported for data: urls.
        if (__classPrivateFieldGet(this, _HTTPRequest_url, "f").startsWith('data:')) {
            return;
        }
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!__classPrivateFieldGet(this, _HTTPRequest_interceptionHandled, "f"), 'Request is already handled!');
        if (priority === undefined) {
            return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_continue).call(this, overrides);
        }
        __classPrivateFieldSet(this, _HTTPRequest_continueRequestOverrides, overrides, "f");
        if (__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority === undefined ||
            priority > __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority) {
            __classPrivateFieldSet(this, _HTTPRequest_interceptResolutionState, {
                action: HTTPRequest_js_1.InterceptResolutionAction.Continue,
                priority,
            }, "f");
            return;
        }
        if (priority === __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority) {
            if (__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").action === 'abort' ||
                __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").action === 'respond') {
                return;
            }
            __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").action =
                HTTPRequest_js_1.InterceptResolutionAction.Continue;
        }
        return;
    }
    async respond(response, priority) {
        // Mocking responses for dataURL requests is not currently supported.
        if (__classPrivateFieldGet(this, _HTTPRequest_url, "f").startsWith('data:')) {
            return;
        }
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!__classPrivateFieldGet(this, _HTTPRequest_interceptionHandled, "f"), 'Request is already handled!');
        if (priority === undefined) {
            return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_respond).call(this, response);
        }
        __classPrivateFieldSet(this, _HTTPRequest_responseForRequest, response, "f");
        if (__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority === undefined ||
            priority > __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority) {
            __classPrivateFieldSet(this, _HTTPRequest_interceptResolutionState, {
                action: HTTPRequest_js_1.InterceptResolutionAction.Respond,
                priority,
            }, "f");
            return;
        }
        if (priority === __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority) {
            if (__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").action === 'abort') {
                return;
            }
            __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").action = HTTPRequest_js_1.InterceptResolutionAction.Respond;
        }
    }
    async abort(errorCode = 'failed', priority) {
        // Request interception is not supported for data: urls.
        if (__classPrivateFieldGet(this, _HTTPRequest_url, "f").startsWith('data:')) {
            return;
        }
        const errorReason = errorReasons[errorCode];
        (0, assert_js_1.assert)(errorReason, 'Unknown error code: ' + errorCode);
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _HTTPRequest_allowInterception, "f"), 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!__classPrivateFieldGet(this, _HTTPRequest_interceptionHandled, "f"), 'Request is already handled!');
        if (priority === undefined) {
            return __classPrivateFieldGet(this, _HTTPRequest_instances, "m", _HTTPRequest_abort).call(this, errorReason);
        }
        __classPrivateFieldSet(this, _HTTPRequest_abortErrorReason, errorReason, "f");
        if (__classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority === undefined ||
            priority >= __classPrivateFieldGet(this, _HTTPRequest_interceptResolutionState, "f").priority) {
            __classPrivateFieldSet(this, _HTTPRequest_interceptResolutionState, {
                action: HTTPRequest_js_1.InterceptResolutionAction.Abort,
                priority,
            }, "f");
            return;
        }
    }
}
exports.HTTPRequest = HTTPRequest;
_HTTPRequest_client = new WeakMap(), _HTTPRequest_isNavigationRequest = new WeakMap(), _HTTPRequest_allowInterception = new WeakMap(), _HTTPRequest_interceptionHandled = new WeakMap(), _HTTPRequest_url = new WeakMap(), _HTTPRequest_resourceType = new WeakMap(), _HTTPRequest_method = new WeakMap(), _HTTPRequest_postData = new WeakMap(), _HTTPRequest_headers = new WeakMap(), _HTTPRequest_frame = new WeakMap(), _HTTPRequest_continueRequestOverrides = new WeakMap(), _HTTPRequest_responseForRequest = new WeakMap(), _HTTPRequest_abortErrorReason = new WeakMap(), _HTTPRequest_interceptResolutionState = new WeakMap(), _HTTPRequest_interceptHandlers = new WeakMap(), _HTTPRequest_initiator = new WeakMap(), _HTTPRequest_instances = new WeakSet(), _HTTPRequest_continue = async function _HTTPRequest_continue(overrides = {}) {
    const { url, method, postData, headers } = overrides;
    __classPrivateFieldSet(this, _HTTPRequest_interceptionHandled, true, "f");
    const postDataBinaryBase64 = postData
        ? Buffer.from(postData).toString('base64')
        : undefined;
    if (this._interceptionId === undefined) {
        throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.continueRequest');
    }
    await __classPrivateFieldGet(this, _HTTPRequest_client, "f")
        .send('Fetch.continueRequest', {
        requestId: this._interceptionId,
        url,
        method,
        postData: postDataBinaryBase64,
        headers: headers ? (0, HTTPRequest_js_1.headersArray)(headers) : undefined,
    })
        .catch(error => {
        __classPrivateFieldSet(this, _HTTPRequest_interceptionHandled, false, "f");
        return handleError(error);
    });
}, _HTTPRequest_respond = async function _HTTPRequest_respond(response) {
    __classPrivateFieldSet(this, _HTTPRequest_interceptionHandled, true, "f");
    const responseBody = response.body && (0, util_js_1.isString)(response.body)
        ? Buffer.from(response.body)
        : response.body || null;
    const responseHeaders = {};
    if (response.headers) {
        for (const header of Object.keys(response.headers)) {
            const value = response.headers[header];
            responseHeaders[header.toLowerCase()] = Array.isArray(value)
                ? value.map(item => {
                    return String(item);
                })
                : String(value);
        }
    }
    if (response.contentType) {
        responseHeaders['content-type'] = response.contentType;
    }
    if (responseBody && !('content-length' in responseHeaders)) {
        responseHeaders['content-length'] = String(Buffer.byteLength(responseBody));
    }
    const status = response.status || 200;
    if (this._interceptionId === undefined) {
        throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.fulfillRequest');
    }
    await __classPrivateFieldGet(this, _HTTPRequest_client, "f")
        .send('Fetch.fulfillRequest', {
        requestId: this._interceptionId,
        responseCode: status,
        responsePhrase: HTTPRequest_js_1.STATUS_TEXTS[status],
        responseHeaders: (0, HTTPRequest_js_1.headersArray)(responseHeaders),
        body: responseBody ? responseBody.toString('base64') : undefined,
    })
        .catch(error => {
        __classPrivateFieldSet(this, _HTTPRequest_interceptionHandled, false, "f");
        return handleError(error);
    });
}, _HTTPRequest_abort = async function _HTTPRequest_abort(errorReason) {
    __classPrivateFieldSet(this, _HTTPRequest_interceptionHandled, true, "f");
    if (this._interceptionId === undefined) {
        throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.failRequest');
    }
    await __classPrivateFieldGet(this, _HTTPRequest_client, "f")
        .send('Fetch.failRequest', {
        requestId: this._interceptionId,
        errorReason: errorReason || 'Failed',
    })
        .catch(handleError);
};
const errorReasons = {
    aborted: 'Aborted',
    accessdenied: 'AccessDenied',
    addressunreachable: 'AddressUnreachable',
    blockedbyclient: 'BlockedByClient',
    blockedbyresponse: 'BlockedByResponse',
    connectionaborted: 'ConnectionAborted',
    connectionclosed: 'ConnectionClosed',
    connectionfailed: 'ConnectionFailed',
    connectionrefused: 'ConnectionRefused',
    connectionreset: 'ConnectionReset',
    internetdisconnected: 'InternetDisconnected',
    namenotresolved: 'NameNotResolved',
    timedout: 'TimedOut',
    failed: 'Failed',
};
async function handleError(error) {
    if (['Invalid header'].includes(error.originalMessage)) {
        throw error;
    }
    // In certain cases, protocol will return error if the request was
    // already canceled or the page was closed. We should tolerate these
    // errors.
    (0, util_js_1.debugError)(error);
}
//# sourceMappingURL=HTTPRequest.js.map