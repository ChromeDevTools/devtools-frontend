"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helper = exports.debugError = void 0;
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Errors_js_1 = require("./Errors.js");
const Debug_js_1 = require("./Debug.js");
const fs = __importStar(require("fs"));
const util_1 = require("util");
const assert_js_1 = require("./assert.js");
const openAsync = util_1.promisify(fs.open);
const writeAsync = util_1.promisify(fs.write);
const closeAsync = util_1.promisify(fs.close);
exports.debugError = Debug_js_1.debug('puppeteer:error');
function getExceptionMessage(exceptionDetails) {
    if (exceptionDetails.exception)
        return (exceptionDetails.exception.description || exceptionDetails.exception.value);
    let message = exceptionDetails.text;
    if (exceptionDetails.stackTrace) {
        for (const callframe of exceptionDetails.stackTrace.callFrames) {
            const location = callframe.url +
                ':' +
                callframe.lineNumber +
                ':' +
                callframe.columnNumber;
            const functionName = callframe.functionName || '<anonymous>';
            message += `\n    at ${functionName} (${location})`;
        }
    }
    return message;
}
function valueFromRemoteObject(remoteObject) {
    assert_js_1.assert(!remoteObject.objectId, 'Cannot extract value when objectId is given');
    if (remoteObject.unserializableValue) {
        if (remoteObject.type === 'bigint' && typeof BigInt !== 'undefined')
            return BigInt(remoteObject.unserializableValue.replace('n', ''));
        switch (remoteObject.unserializableValue) {
            case '-0':
                return -0;
            case 'NaN':
                return NaN;
            case 'Infinity':
                return Infinity;
            case '-Infinity':
                return -Infinity;
            default:
                throw new Error('Unsupported unserializable value: ' +
                    remoteObject.unserializableValue);
        }
    }
    return remoteObject.value;
}
async function releaseObject(client, remoteObject) {
    if (!remoteObject.objectId)
        return;
    await client
        .send('Runtime.releaseObject', { objectId: remoteObject.objectId })
        .catch((error) => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        exports.debugError(error);
    });
}
function addEventListener(emitter, eventName, handler) {
    emitter.on(eventName, handler);
    return { emitter, eventName, handler };
}
function removeEventListeners(listeners) {
    for (const listener of listeners)
        listener.emitter.removeListener(listener.eventName, listener.handler);
    listeners.length = 0;
}
function isString(obj) {
    return typeof obj === 'string' || obj instanceof String;
}
function isNumber(obj) {
    return typeof obj === 'number' || obj instanceof Number;
}
async function waitForEvent(emitter, eventName, predicate, timeout, abortPromise) {
    let eventTimeout, resolveCallback, rejectCallback;
    const promise = new Promise((resolve, reject) => {
        resolveCallback = resolve;
        rejectCallback = reject;
    });
    const listener = addEventListener(emitter, eventName, (event) => {
        if (!predicate(event))
            return;
        resolveCallback(event);
    });
    if (timeout) {
        eventTimeout = setTimeout(() => {
            rejectCallback(new Errors_js_1.TimeoutError('Timeout exceeded while waiting for event'));
        }, timeout);
    }
    function cleanup() {
        removeEventListeners([listener]);
        clearTimeout(eventTimeout);
    }
    const result = await Promise.race([promise, abortPromise]).then((r) => {
        cleanup();
        return r;
    }, (error) => {
        cleanup();
        throw error;
    });
    if (result instanceof Error)
        throw result;
    return result;
}
function evaluationString(fun, ...args) {
    if (isString(fun)) {
        assert_js_1.assert(args.length === 0, 'Cannot evaluate a string with arguments');
        return fun;
    }
    function serializeArgument(arg) {
        if (Object.is(arg, undefined))
            return 'undefined';
        return JSON.stringify(arg);
    }
    return `(${fun})(${args.map(serializeArgument).join(',')})`;
}
async function waitWithTimeout(promise, taskName, timeout) {
    let reject;
    const timeoutError = new Errors_js_1.TimeoutError(`waiting for ${taskName} failed: timeout ${timeout}ms exceeded`);
    const timeoutPromise = new Promise((resolve, x) => (reject = x));
    let timeoutTimer = null;
    if (timeout)
        timeoutTimer = setTimeout(() => reject(timeoutError), timeout);
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
    }
}
async function readProtocolStream(client, handle, path) {
    let eof = false;
    let file;
    if (path)
        file = await openAsync(path, 'w');
    const bufs = [];
    while (!eof) {
        const response = await client.send('IO.read', { handle });
        eof = response.eof;
        const buf = Buffer.from(response.data, response.base64Encoded ? 'base64' : undefined);
        bufs.push(buf);
        if (path)
            await writeAsync(file, buf);
    }
    if (path)
        await closeAsync(file);
    await client.send('IO.close', { handle });
    let resultBuffer = null;
    try {
        resultBuffer = Buffer.concat(bufs);
    }
    finally {
        return resultBuffer;
    }
}
exports.helper = {
    evaluationString,
    readProtocolStream,
    waitWithTimeout,
    waitForEvent,
    isString,
    isNumber,
    addEventListener,
    removeEventListeners,
    valueFromRemoteObject,
    getExceptionMessage,
    releaseObject,
};
