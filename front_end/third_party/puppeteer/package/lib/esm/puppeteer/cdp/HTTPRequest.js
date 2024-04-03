import { headersArray, HTTPRequest, InterceptResolutionAction, STATUS_TEXTS, handleError, } from '../api/HTTPRequest.js';
import { debugError, isString } from '../common/util.js';
import { assert } from '../util/assert.js';
/**
 * @internal
 */
export class CdpHTTPRequest extends HTTPRequest {
    id;
    #client;
    #isNavigationRequest;
    #allowInterception;
    #interceptionHandled = false;
    #url;
    #resourceType;
    #method;
    #hasPostData = false;
    #postData;
    #headers = {};
    #frame;
    #continueRequestOverrides;
    #responseForRequest = null;
    #abortErrorReason = null;
    #interceptResolutionState = {
        action: InterceptResolutionAction.None,
    };
    #interceptHandlers;
    #initiator;
    get client() {
        return this.#client;
    }
    constructor(client, frame, interceptionId, allowInterception, data, redirectChain) {
        super();
        this.#client = client;
        this.id = data.requestId;
        this.#isNavigationRequest =
            data.requestId === data.loaderId && data.type === 'Document';
        this._interceptionId = interceptionId;
        this.#allowInterception = allowInterception;
        this.#url = data.request.url;
        this.#resourceType = (data.type || 'other').toLowerCase();
        this.#method = data.request.method;
        this.#postData = data.request.postData;
        this.#hasPostData = data.request.hasPostData ?? false;
        this.#frame = frame;
        this._redirectChain = redirectChain;
        this.#continueRequestOverrides = {};
        this.#interceptHandlers = [];
        this.#initiator = data.initiator;
        for (const [key, value] of Object.entries(data.request.headers)) {
            this.#headers[key.toLowerCase()] = value;
        }
    }
    url() {
        return this.#url;
    }
    continueRequestOverrides() {
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        return this.#continueRequestOverrides;
    }
    responseForRequest() {
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        return this.#responseForRequest;
    }
    abortErrorReason() {
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        return this.#abortErrorReason;
    }
    interceptResolutionState() {
        if (!this.#allowInterception) {
            return { action: InterceptResolutionAction.Disabled };
        }
        if (this.#interceptionHandled) {
            return { action: InterceptResolutionAction.AlreadyHandled };
        }
        return { ...this.#interceptResolutionState };
    }
    isInterceptResolutionHandled() {
        return this.#interceptionHandled;
    }
    enqueueInterceptAction(pendingHandler) {
        this.#interceptHandlers.push(pendingHandler);
    }
    async finalizeInterceptions() {
        await this.#interceptHandlers.reduce((promiseChain, interceptAction) => {
            return promiseChain.then(interceptAction);
        }, Promise.resolve());
        const { action } = this.interceptResolutionState();
        switch (action) {
            case 'abort':
                return await this.#abort(this.#abortErrorReason);
            case 'respond':
                if (this.#responseForRequest === null) {
                    throw new Error('Response is missing for the interception');
                }
                return await this.#respond(this.#responseForRequest);
            case 'continue':
                return await this.#continue(this.#continueRequestOverrides);
        }
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
    hasPostData() {
        return this.#hasPostData;
    }
    async fetchPostData() {
        try {
            const result = await this.#client.send('Network.getRequestPostData', {
                requestId: this.id,
            });
            return result.postData;
        }
        catch (err) {
            debugError(err);
            return;
        }
    }
    headers() {
        return this.#headers;
    }
    response() {
        return this._response;
    }
    frame() {
        return this.#frame;
    }
    isNavigationRequest() {
        return this.#isNavigationRequest;
    }
    initiator() {
        return this.#initiator;
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
        if (this.#url.startsWith('data:')) {
            return;
        }
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        assert(!this.#interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return await this.#continue(overrides);
        }
        this.#continueRequestOverrides = overrides;
        if (this.#interceptResolutionState.priority === undefined ||
            priority > this.#interceptResolutionState.priority) {
            this.#interceptResolutionState = {
                action: InterceptResolutionAction.Continue,
                priority,
            };
            return;
        }
        if (priority === this.#interceptResolutionState.priority) {
            if (this.#interceptResolutionState.action === 'abort' ||
                this.#interceptResolutionState.action === 'respond') {
                return;
            }
            this.#interceptResolutionState.action =
                InterceptResolutionAction.Continue;
        }
        return;
    }
    async #continue(overrides = {}) {
        const { url, method, postData, headers } = overrides;
        this.#interceptionHandled = true;
        const postDataBinaryBase64 = postData
            ? Buffer.from(postData).toString('base64')
            : undefined;
        if (this._interceptionId === undefined) {
            throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.continueRequest');
        }
        await this.#client
            .send('Fetch.continueRequest', {
            requestId: this._interceptionId,
            url,
            method,
            postData: postDataBinaryBase64,
            headers: headers ? headersArray(headers) : undefined,
        })
            .catch(error => {
            this.#interceptionHandled = false;
            return handleError(error);
        });
    }
    async respond(response, priority) {
        // Mocking responses for dataURL requests is not currently supported.
        if (this.#url.startsWith('data:')) {
            return;
        }
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        assert(!this.#interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return await this.#respond(response);
        }
        this.#responseForRequest = response;
        if (this.#interceptResolutionState.priority === undefined ||
            priority > this.#interceptResolutionState.priority) {
            this.#interceptResolutionState = {
                action: InterceptResolutionAction.Respond,
                priority,
            };
            return;
        }
        if (priority === this.#interceptResolutionState.priority) {
            if (this.#interceptResolutionState.action === 'abort') {
                return;
            }
            this.#interceptResolutionState.action = InterceptResolutionAction.Respond;
        }
    }
    async #respond(response) {
        this.#interceptionHandled = true;
        const responseBody = response.body && isString(response.body)
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
        await this.#client
            .send('Fetch.fulfillRequest', {
            requestId: this._interceptionId,
            responseCode: status,
            responsePhrase: STATUS_TEXTS[status],
            responseHeaders: headersArray(responseHeaders),
            body: responseBody ? responseBody.toString('base64') : undefined,
        })
            .catch(error => {
            this.#interceptionHandled = false;
            return handleError(error);
        });
    }
    async abort(errorCode = 'failed', priority) {
        // Request interception is not supported for data: urls.
        if (this.#url.startsWith('data:')) {
            return;
        }
        const errorReason = errorReasons[errorCode];
        assert(errorReason, 'Unknown error code: ' + errorCode);
        assert(this.#allowInterception, 'Request Interception is not enabled!');
        assert(!this.#interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return await this.#abort(errorReason);
        }
        this.#abortErrorReason = errorReason;
        if (this.#interceptResolutionState.priority === undefined ||
            priority >= this.#interceptResolutionState.priority) {
            this.#interceptResolutionState = {
                action: InterceptResolutionAction.Abort,
                priority,
            };
            return;
        }
    }
    async #abort(errorReason) {
        this.#interceptionHandled = true;
        if (this._interceptionId === undefined) {
            throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.failRequest');
        }
        await this.#client
            .send('Fetch.failRequest', {
            requestId: this._interceptionId,
            errorReason: errorReason || 'Failed',
        })
            .catch(handleError);
    }
}
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
//# sourceMappingURL=HTTPRequest.js.map