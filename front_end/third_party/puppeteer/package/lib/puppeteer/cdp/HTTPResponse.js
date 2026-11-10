import { HTTPResponse } from '../api/HTTPResponse.js';
import { ProtocolError } from '../common/Errors.js';
import { SecurityDetails } from '../common/SecurityDetails.js';
import { Deferred } from '../util/Deferred.js';
import { stringToTypedArray } from '../util/encoding.js';
import { normalizeHeaderValue } from '../util/httpUtils.js';
import { createResponseBodyStream } from './ResponseBodyStream.js';
/**
 * @internal
 */
export class CdpHTTPResponse extends HTTPResponse {
    #request;
    #contentPromise = null;
    #bodyLoadedDeferred = Deferred.create();
    #remoteAddress;
    #status;
    #statusText;
    #fromDiskCache;
    #fromServiceWorker;
    #headers = {};
    #securityDetails;
    #timing;
    #encodedDataLength = 0;
    constructor(request, responsePayload, extraInfo) {
        super();
        this.#request = request;
        this.#remoteAddress = {
            ip: responsePayload.remoteIPAddress,
            port: responsePayload.remotePort,
        };
        this.#statusText =
            this.#parseStatusTextFromExtraInfo(extraInfo) ||
                responsePayload.statusText;
        this.#fromDiskCache = !!responsePayload.fromDiskCache;
        this.#fromServiceWorker = !!responsePayload.fromServiceWorker;
        this.#status = extraInfo ? extraInfo.statusCode : responsePayload.status;
        const headers = extraInfo ? extraInfo.headers : responsePayload.headers;
        for (const [key, value] of Object.entries(headers)) {
            const headerName = key.toLowerCase();
            // See https://www.rfc-editor.org/rfc/rfc9110.html#name-field-order for
            // the set-cookie exception.
            this.#headers[headerName] = normalizeHeaderValue(headerName, value);
        }
        this.#securityDetails = responsePayload.securityDetails
            ? new SecurityDetails(responsePayload.securityDetails)
            : null;
        this.#timing = responsePayload.timing || null;
        this._setEncodedDataLength(responsePayload.encodedDataLength);
    }
    #parseStatusTextFromExtraInfo(extraInfo) {
        if (!extraInfo || !extraInfo.headersText) {
            return;
        }
        const firstLine = extraInfo.headersText.split('\r', 1)[0];
        if (!firstLine || firstLine.length > 1_000) {
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
    }
    _setEncodedDataLength(encodedDataLength) {
        // Chromium reports -1 when no data was transferred over the network (e.g.
        // data: or file: URLs) or when the size is unknown (e.g. synchronous XHRs
        // to data: URLs). Keep the last known value in that case, defaulting to 0.
        if (encodedDataLength >= 0) {
            this.#encodedDataLength = encodedDataLength;
        }
    }
    _resolveBody(err) {
        if (err) {
            return this.#bodyLoadedDeferred.reject(err);
        }
        return this.#bodyLoadedDeferred.resolve();
    }
    remoteAddress() {
        return this.#remoteAddress;
    }
    url() {
        return this.#request.url();
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
    securityDetails() {
        return this.#securityDetails;
    }
    timing() {
        return this.#timing;
    }
    encodedDataLength() {
        return this.#encodedDataLength;
    }
    content() {
        if (!this.#contentPromise) {
            this.#contentPromise = this.#bodyLoadedDeferred
                .valueOrThrow()
                .then(async () => {
                try {
                    // Use CDPSession from corresponding request to retrieve body, as it's client
                    // might have been updated (e.g. for an adopted OOPIF).
                    const response = await this.#request.client.send('Network.getResponseBody', {
                        requestId: this.#request.id,
                    });
                    return stringToTypedArray(response.body, response.base64Encoded);
                }
                catch (error) {
                    if (error instanceof ProtocolError &&
                        error.originalMessage ===
                            'No resource with given identifier found') {
                        throw new ProtocolError('Could not load response body for this request. This might happen if the request is a preflight request.');
                    }
                    throw error;
                }
            });
        }
        return this.#contentPromise;
    }
    async stream() {
        if (this.#bodyLoadedDeferred.finished()) {
            return await this.#contentStream();
        }
        try {
            // Use the request's client, as it might have been updated for an adopted
            // OOPIF.
            return await createResponseBodyStream(this.#request.client, this.#request.id);
        }
        catch (error) {
            if (error instanceof ProtocolError &&
                error.originalMessage.includes('already finished loading')) {
                return await this.#contentStream();
            }
            throw error;
        }
    }
    async #contentStream() {
        const content = await this.content();
        return new ReadableStream({
            start(controller) {
                controller.enqueue(content);
                controller.close();
            },
        });
    }
    request() {
        return this.#request;
    }
    fromCache() {
        return this.#fromDiskCache || this.#request._fromMemoryCache;
    }
    fromServiceWorker() {
        return this.#fromServiceWorker;
    }
    frame() {
        return this.#request.frame();
    }
}
//# sourceMappingURL=HTTPResponse.js.map