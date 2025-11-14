// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { InspectorFrontendHostInstance } from './InspectorFrontendHost.js';
export var ErrorType;
(function (ErrorType) {
    ErrorType["HTTP_RESPONSE_UNAVAILABLE"] = "HTTP_RESPONSE_UNAVAILABLE";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["ABORT"] = "ABORT";
})(ErrorType || (ErrorType = {}));
export class DispatchHttpRequestError extends Error {
    type;
    constructor(type, options) {
        super(undefined, options);
        this.type = type;
    }
}
export async function makeHttpRequest(request, options) {
    const signal = options?.signal;
    if (signal?.aborted) {
        throw new DispatchHttpRequestError(ErrorType.ABORT);
    }
    const response = await new Promise((resolve, reject) => {
        const onAbort = () => {
            reject(new DispatchHttpRequestError(ErrorType.ABORT));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        InspectorFrontendHostInstance.dispatchHttpRequest(request, result => {
            signal?.removeEventListener('abort', onAbort);
            resolve(result);
        });
    });
    debugLog({ request, response });
    if (response.statusCode === 404) {
        throw new DispatchHttpRequestError(ErrorType.NOT_FOUND);
    }
    if ('response' in response && response.statusCode === 200) {
        try {
            return JSON.parse(response.response);
        }
        catch (err) {
            throw new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE, { cause: err });
        }
    }
    throw new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE);
}
function isDebugMode() {
    return Boolean(localStorage.getItem('debugDispatchHttpRequestEnabled'));
}
function debugLog(...log) {
    if (!isDebugMode()) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log('debugLog', ...log);
}
function setDebugDispatchHttpRequestEnabled(enabled) {
    if (enabled) {
        localStorage.setItem('debugDispatchHttpRequestEnabled', 'true');
    }
    else {
        localStorage.removeItem('debugDispatchHttpRequestEnabled');
    }
}
// @ts-expect-error
globalThis.setDebugDispatchHttpRequestEnabled = setDebugDispatchHttpRequestEnabled;
//# sourceMappingURL=DispatchHttpRequestClient.js.map