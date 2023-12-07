"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORK_IDLE_TIME = exports.waitForHTTP = exports.getSourceUrlComment = exports.SOURCE_URL_REGEX = exports.UTILITY_WORLD_NAME = exports.timeout = exports.validateDialogType = exports.getPageContent = exports.getReadableFromProtocolStream = exports.getReadableAsBuffer = exports.importFSPromises = exports.pageBindingInitString = exports.addPageBinding = exports.evaluationString = exports.isDate = exports.isRegExp = exports.isPlainObject = exports.isNumber = exports.isString = exports.valueFromRemoteObject = exports.getSourcePuppeteerURLIfAvailable = exports.withSourcePuppeteerURLIfNone = exports.PuppeteerURL = exports.createClientError = exports.createEvaluationError = exports.DEFAULT_VIEWPORT = exports.debugError = void 0;
const rxjs_js_1 = require("../../third_party/rxjs/rxjs.js");
const environment_js_1 = require("../environment.js");
const assert_js_1 = require("../util/assert.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Debug_js_1 = require("./Debug.js");
const Errors_js_1 = require("./Errors.js");
/**
 * @internal
 */
exports.debugError = (0, Debug_js_1.debug)('puppeteer:error');
/**
 * @internal
 */
exports.DEFAULT_VIEWPORT = Object.freeze({ width: 800, height: 600 });
/**
 * @internal
 */
function createEvaluationError(details) {
    let name;
    let message;
    if (!details.exception) {
        name = 'Error';
        message = details.text;
    }
    else if ((details.exception.type !== 'object' ||
        details.exception.subtype !== 'error') &&
        !details.exception.objectId) {
        return valueFromRemoteObject(details.exception);
    }
    else {
        const detail = getErrorDetails(details);
        name = detail.name;
        message = detail.message;
    }
    const messageHeight = message.split('\n').length;
    const error = new Error(message);
    error.name = name;
    const stackLines = error.stack.split('\n');
    const messageLines = stackLines.splice(0, messageHeight);
    // The first line is this function which we ignore.
    stackLines.shift();
    if (details.stackTrace && stackLines.length < Error.stackTraceLimit) {
        for (const frame of details.stackTrace.callFrames.reverse()) {
            if (PuppeteerURL.isPuppeteerURL(frame.url) &&
                frame.url !== PuppeteerURL.INTERNAL_URL) {
                const url = PuppeteerURL.parse(frame.url);
                stackLines.unshift(`    at ${frame.functionName || url.functionName} (${url.functionName} at ${url.siteString}, <anonymous>:${frame.lineNumber}:${frame.columnNumber})`);
            }
            else {
                stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
            }
            if (stackLines.length >= Error.stackTraceLimit) {
                break;
            }
        }
    }
    error.stack = [...messageLines, ...stackLines].join('\n');
    return error;
}
exports.createEvaluationError = createEvaluationError;
/**
 * @internal
 */
function createClientError(details) {
    let name;
    let message;
    if (!details.exception) {
        name = 'Error';
        message = details.text;
    }
    else if ((details.exception.type !== 'object' ||
        details.exception.subtype !== 'error') &&
        !details.exception.objectId) {
        return valueFromRemoteObject(details.exception);
    }
    else {
        const detail = getErrorDetails(details);
        name = detail.name;
        message = detail.message;
    }
    const error = new Error(message);
    error.name = name;
    const messageHeight = error.message.split('\n').length;
    const messageLines = error.stack.split('\n').splice(0, messageHeight);
    const stackLines = [];
    if (details.stackTrace) {
        for (const frame of details.stackTrace.callFrames) {
            // Note we need to add `1` because the values are 0-indexed.
            stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`);
            if (stackLines.length >= Error.stackTraceLimit) {
                break;
            }
        }
    }
    error.stack = [...messageLines, ...stackLines].join('\n');
    return error;
}
exports.createClientError = createClientError;
const getErrorDetails = (details) => {
    let name = '';
    let message;
    const lines = details.exception?.description?.split('\n    at ') ?? [];
    const size = Math.min(details.stackTrace?.callFrames.length ?? 0, lines.length - 1);
    lines.splice(-size, size);
    if (details.exception?.className) {
        name = details.exception.className;
    }
    message = lines.join('\n');
    if (name && message.startsWith(`${name}: `)) {
        message = message.slice(name.length + 2);
    }
    return { message, name };
};
/**
 * @internal
 */
const SOURCE_URL = Symbol('Source URL for Puppeteer evaluation scripts');
/**
 * @internal
 */
class PuppeteerURL {
    static INTERNAL_URL = 'pptr:internal';
    static fromCallSite(functionName, site) {
        const url = new PuppeteerURL();
        url.#functionName = functionName;
        url.#siteString = site.toString();
        return url;
    }
    static parse = (url) => {
        url = url.slice('pptr:'.length);
        const [functionName = '', siteString = ''] = url.split(';');
        const puppeteerUrl = new PuppeteerURL();
        puppeteerUrl.#functionName = functionName;
        puppeteerUrl.#siteString = decodeURIComponent(siteString);
        return puppeteerUrl;
    };
    static isPuppeteerURL = (url) => {
        return url.startsWith('pptr:');
    };
    #functionName;
    #siteString;
    get functionName() {
        return this.#functionName;
    }
    get siteString() {
        return this.#siteString;
    }
    toString() {
        return `pptr:${[
            this.#functionName,
            encodeURIComponent(this.#siteString),
        ].join(';')}`;
    }
}
exports.PuppeteerURL = PuppeteerURL;
/**
 * @internal
 */
const withSourcePuppeteerURLIfNone = (functionName, object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object;
    }
    const original = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => {
        // First element is the function.
        // Second element is the caller of this function.
        // Third element is the caller of the caller of this function
        // which is precisely what we want.
        return stack[2];
    };
    const site = new Error().stack;
    Error.prepareStackTrace = original;
    return Object.assign(object, {
        [SOURCE_URL]: PuppeteerURL.fromCallSite(functionName, site),
    });
};
exports.withSourcePuppeteerURLIfNone = withSourcePuppeteerURLIfNone;
/**
 * @internal
 */
const getSourcePuppeteerURLIfAvailable = (object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object[SOURCE_URL];
    }
    return undefined;
};
exports.getSourcePuppeteerURLIfAvailable = getSourcePuppeteerURLIfAvailable;
/**
 * @internal
 */
function valueFromRemoteObject(remoteObject) {
    (0, assert_js_1.assert)(!remoteObject.objectId, 'Cannot extract value when objectId is given');
    if (remoteObject.unserializableValue) {
        if (remoteObject.type === 'bigint') {
            return BigInt(remoteObject.unserializableValue.replace('n', ''));
        }
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
exports.valueFromRemoteObject = valueFromRemoteObject;
/**
 * @internal
 */
const isString = (obj) => {
    return typeof obj === 'string' || obj instanceof String;
};
exports.isString = isString;
/**
 * @internal
 */
const isNumber = (obj) => {
    return typeof obj === 'number' || obj instanceof Number;
};
exports.isNumber = isNumber;
/**
 * @internal
 */
const isPlainObject = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Object;
};
exports.isPlainObject = isPlainObject;
/**
 * @internal
 */
const isRegExp = (obj) => {
    return typeof obj === 'object' && obj?.constructor === RegExp;
};
exports.isRegExp = isRegExp;
/**
 * @internal
 */
const isDate = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Date;
};
exports.isDate = isDate;
/**
 * @internal
 */
function evaluationString(fun, ...args) {
    if ((0, exports.isString)(fun)) {
        (0, assert_js_1.assert)(args.length === 0, 'Cannot evaluate a string with arguments');
        return fun;
    }
    function serializeArgument(arg) {
        if (Object.is(arg, undefined)) {
            return 'undefined';
        }
        return JSON.stringify(arg);
    }
    return `(${fun})(${args.map(serializeArgument).join(',')})`;
}
exports.evaluationString = evaluationString;
/**
 * @internal
 */
function addPageBinding(type, name) {
    // This is the CDP binding.
    // @ts-expect-error: In a different context.
    const callCdp = globalThis[name];
    // We replace the CDP binding with a Puppeteer binding.
    Object.assign(globalThis, {
        [name](...args) {
            // This is the Puppeteer binding.
            // @ts-expect-error: In a different context.
            const callPuppeteer = globalThis[name];
            callPuppeteer.args ??= new Map();
            callPuppeteer.callbacks ??= new Map();
            const seq = (callPuppeteer.lastSeq ?? 0) + 1;
            callPuppeteer.lastSeq = seq;
            callPuppeteer.args.set(seq, args);
            callCdp(JSON.stringify({
                type,
                name,
                seq,
                args,
                isTrivial: !args.some(value => {
                    return value instanceof Node;
                }),
            }));
            return new Promise((resolve, reject) => {
                callPuppeteer.callbacks.set(seq, {
                    resolve(value) {
                        callPuppeteer.args.delete(seq);
                        resolve(value);
                    },
                    reject(value) {
                        callPuppeteer.args.delete(seq);
                        reject(value);
                    },
                });
            });
        },
    });
}
exports.addPageBinding = addPageBinding;
/**
 * @internal
 */
function pageBindingInitString(type, name) {
    return evaluationString(addPageBinding, type, name);
}
exports.pageBindingInitString = pageBindingInitString;
/**
 * @internal
 */
let fs = null;
/**
 * @internal
 */
async function importFSPromises() {
    if (!fs) {
        try {
            fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Cannot write to a path outside of a Node-like environment.');
            }
            throw error;
        }
    }
    return fs;
}
exports.importFSPromises = importFSPromises;
/**
 * @internal
 */
async function getReadableAsBuffer(readable, path) {
    const buffers = [];
    if (path) {
        const fs = await importFSPromises();
        const fileHandle = await fs.open(path, 'w+');
        try {
            for await (const chunk of readable) {
                buffers.push(chunk);
                await fileHandle.writeFile(chunk);
            }
        }
        finally {
            await fileHandle.close();
        }
    }
    else {
        for await (const chunk of readable) {
            buffers.push(chunk);
        }
    }
    try {
        return Buffer.concat(buffers);
    }
    catch (error) {
        return null;
    }
}
exports.getReadableAsBuffer = getReadableAsBuffer;
/**
 * @internal
 */
async function getReadableFromProtocolStream(client, handle) {
    // TODO: Once Node 18 becomes the lowest supported version, we can migrate to
    // ReadableStream.
    if (!environment_js_1.isNode) {
        throw new Error('Cannot create a stream outside of Node.js environment.');
    }
    const { Readable } = await Promise.resolve().then(() => __importStar(require('stream')));
    let eof = false;
    return new Readable({
        async read(size) {
            if (eof) {
                return;
            }
            try {
                const response = await client.send('IO.read', { handle, size });
                this.push(response.data, response.base64Encoded ? 'base64' : undefined);
                if (response.eof) {
                    eof = true;
                    await client.send('IO.close', { handle });
                    this.push(null);
                }
            }
            catch (error) {
                if ((0, ErrorLike_js_1.isErrorLike)(error)) {
                    this.destroy(error);
                    return;
                }
                throw error;
            }
        },
    });
}
exports.getReadableFromProtocolStream = getReadableFromProtocolStream;
/**
 * @internal
 */
function getPageContent() {
    let content = '';
    for (const node of document.childNodes) {
        switch (node) {
            case document.documentElement:
                content += document.documentElement.outerHTML;
                break;
            default:
                content += new XMLSerializer().serializeToString(node);
                break;
        }
    }
    return content;
}
exports.getPageContent = getPageContent;
/**
 * @internal
 */
function validateDialogType(type) {
    let dialogType = null;
    const validDialogTypes = new Set([
        'alert',
        'confirm',
        'prompt',
        'beforeunload',
    ]);
    if (validDialogTypes.has(type)) {
        dialogType = type;
    }
    (0, assert_js_1.assert)(dialogType, `Unknown javascript dialog type: ${type}`);
    return dialogType;
}
exports.validateDialogType = validateDialogType;
/**
 * @internal
 */
function timeout(ms) {
    return ms === 0
        ? rxjs_js_1.NEVER
        : (0, rxjs_js_1.timer)(ms).pipe((0, rxjs_js_1.map)(() => {
            throw new Errors_js_1.TimeoutError(`Timed out after waiting ${ms}ms`);
        }));
}
exports.timeout = timeout;
/**
 * @internal
 */
exports.UTILITY_WORLD_NAME = '__puppeteer_utility_world__';
/**
 * @internal
 */
exports.SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
/**
 * @internal
 */
function getSourceUrlComment(url) {
    return `//# sourceURL=${url}`;
}
exports.getSourceUrlComment = getSourceUrlComment;
/**
 * @internal
 */
async function waitForHTTP(networkManager, eventName, urlOrPredicate, 
/** Time after the function will timeout */
ms, cancelation) {
    return await (0, rxjs_js_1.firstValueFrom)((0, rxjs_js_1.fromEvent)(networkManager, eventName).pipe((0, rxjs_js_1.filterAsync)(async (http) => {
        if ((0, exports.isString)(urlOrPredicate)) {
            return urlOrPredicate === http.url();
        }
        if (typeof urlOrPredicate === 'function') {
            return !!(await urlOrPredicate(http));
        }
        return false;
    }), (0, rxjs_js_1.raceWith)(timeout(ms), (0, rxjs_js_1.from)(cancelation.valueOrThrow()))));
}
exports.waitForHTTP = waitForHTTP;
/**
 * @internal
 */
exports.NETWORK_IDLE_TIME = 500;
//# sourceMappingURL=util.js.map