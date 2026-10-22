import { headersArray, HTTPRequest, InterceptResolutionAction, STATUS_TEXTS, handleError, } from '../api/HTTPRequest.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { mergeUint8Arrays, stringToBase64, stringToTypedArray, } from '../util/encoding.js';
/**
 * @internal
 */
export class CdpHTTPRequest extends HTTPRequest {
    id;
    #client;
    #fetchClient;
    #isNavigationRequest;
    #url;
    #resourceType;
    #method;
    #hasPostData = false;
    #postData;
    #postDataBytes;
    #hasCompletePostData = false;
    #headers = {};
    #frame;
    #initiator;
    #logger;
    #resolution = null;
    get client() {
        return this.#client;
    }
    set client(newClient) {
        this.#client = newClient;
    }
    /**
     * @internal
     */
    get _fetchClient() {
        return this.#fetchClient;
    }
    set _fetchClient(fetchClient) {
        this.#fetchClient = fetchClient;
    }
    constructor(client, frame, interceptionId, allowInterception, data, redirectChain, logger, fetchClient = client) {
        super();
        this.#logger = logger;
        this.#client = client;
        this.#fetchClient = fetchClient;
        this.id = data.requestId;
        this.#isNavigationRequest =
            data.requestId === data.loaderId && data.type === 'Document';
        this._interceptionId = interceptionId;
        this.#url = data.request.url + (data.request.urlFragment ?? '');
        this.#resourceType = (data.type || 'other').toLowerCase();
        this.#method = data.request.method;
        if (data.request.postDataEntries &&
            data.request.postDataEntries.length > 0) {
            this.#hasCompletePostData = data.request.postDataEntries.every(entry => {
                return !!entry.bytes;
            });
            this.#postDataBytes = mergeUint8Arrays(data.request.postDataEntries
                .map(entry => {
                return entry.bytes ? stringToTypedArray(entry.bytes, true) : null;
            })
                .filter(entry => {
                return entry !== null;
            }));
            this.#postData = new TextDecoder().decode(this.#postDataBytes);
        }
        else {
            this.#postData = data.request.postData;
        }
        this.#hasPostData = data.request.hasPostData ?? false;
        this.#frame = frame;
        this._redirectChain = redirectChain;
        this.#initiator = data.initiator;
        this.interception.enabled = allowInterception;
        this.updateHeaders(data.request.headers);
    }
    updateHeaders(headers) {
        for (const [key, value] of Object.entries(headers)) {
            this.#headers[key.toLowerCase()] = value;
        }
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
    hasPostData() {
        return this.#hasPostData;
    }
    async fetchPostData() {
        const content = await this.content();
        if (content === undefined) {
            return undefined;
        }
        return new TextDecoder().decode(content);
    }
    async content() {
        if (this._interceptionId !== undefined &&
            this.interception.enabled &&
            !this.isInterceptResolutionHandled() &&
            this.#hasCompletePostData) {
            // Chrome may wait for the paused request to continue before returning data.
            return this.#postDataBytes;
        }
        try {
            const result = await this.#client.send('Network.getRequestPostData', {
                requestId: this.id,
            });
            return stringToTypedArray(result.postData, result.base64Encoded);
        }
        catch (err) {
            this.#logger?.(DEBUG_PREFIXES.error)?.(err);
            return;
        }
    }
    headers() {
        // Callers should not be allowed to mutate internal structure.
        return structuredClone(this.#headers);
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
    canBeIntercepted() {
        return !this.url().startsWith('data:') && !this._fromMemoryCache;
    }
    /**
     * @internal
     */
    async _continue(overrides = {}) {
        const { url, method, postData, headers } = overrides;
        this.interception.handled = true;
        this.#resolution = { action: InterceptResolutionAction.Continue, overrides };
        const postDataBinaryBase64 = postData
            ? stringToBase64(postData)
            : undefined;
        if (this._interceptionId === undefined) {
            throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.continueRequest');
        }
        await this.#fetchClient
            .send('Fetch.continueRequest', {
            requestId: this._interceptionId,
            url,
            method,
            postData: postDataBinaryBase64,
            headers: headers ? headersArray(headers) : undefined,
        })
            .catch(error => {
            this.interception.handled = false;
            return handleError(error, this.#logger);
        });
    }
    async _respond(response) {
        this.interception.handled = true;
        this.#resolution = { action: InterceptResolutionAction.Respond, response };
        let parsedBody;
        if (response.body) {
            parsedBody = HTTPRequest.getResponse(response.body);
        }
        const responseHeaders = {};
        if (response.headers) {
            for (const [header, value] of Object.entries(response.headers)) {
                if (value === undefined) {
                    continue;
                }
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
        if (parsedBody?.contentLength && !('content-length' in responseHeaders)) {
            responseHeaders['content-length'] = String(parsedBody.contentLength);
        }
        const status = response.status || 200;
        if (this._interceptionId === undefined) {
            throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.fulfillRequest');
        }
        await this.#fetchClient
            .send('Fetch.fulfillRequest', {
            requestId: this._interceptionId,
            responseCode: status,
            responsePhrase: STATUS_TEXTS[status],
            responseHeaders: headersArray(responseHeaders),
            body: parsedBody?.base64,
        })
            .catch(error => {
            this.interception.handled = false;
            return handleError(error, this.#logger);
        });
    }
    async _abort(errorReason) {
        this.interception.handled = true;
        this.#resolution = { action: InterceptResolutionAction.Abort, errorReason };
        if (this._interceptionId === undefined) {
            throw new Error('HTTPRequest is missing _interceptionId needed for Fetch.failRequest');
        }
        await this.#fetchClient
            .send('Fetch.failRequest', {
            requestId: this._interceptionId,
            errorReason: errorReason || 'Failed',
        })
            .catch(error => {
            return handleError(error, this.#logger);
        });
    }
    /**
     * The overrides sent with `Fetch.continueRequest`, or an empty object if
     * the request was not continued.
     *
     * @internal
     */
    get _continueOverrides() {
        return this.#resolution?.action === InterceptResolutionAction.Continue
            ? this.#resolution.overrides
            : {};
    }
    /**
     * Re-sends the resolution the user already chose to the current
     * `_interceptionId`. Used when Chrome restarts a request under a new
     * interception id.
     *
     * @internal
     */
    async _replayInterception() {
        switch (this.#resolution?.action) {
            case InterceptResolutionAction.Continue:
                return await this._continue(this.#resolution.overrides);
            case InterceptResolutionAction.Respond:
                return await this._respond(this.#resolution.response);
            case InterceptResolutionAction.Abort:
                return await this._abort(this.#resolution.errorReason);
        }
    }
}
//# sourceMappingURL=HTTPRequest.js.map