/**
 * Copyright 2023 Google Inc. All rights reserved.
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
var _Context_instances, _Context_connection, _Context_url, _Context_evaluate;
import { assert } from '../../util/assert.js';
import { stringifyFunction } from '../../util/Function.js';
import { ProtocolError, TimeoutError } from '../Errors.js';
import { EventEmitter } from '../EventEmitter.js';
import { TimeoutSettings } from '../TimeoutSettings.js';
import { isString, setPageContent, waitWithTimeout } from '../util.js';
import { ElementHandle } from './ElementHandle.js';
import { JSHandle } from './JSHandle.js';
import { BidiSerializer } from './Serializer.js';
/**
 * @internal
 */
const lifeCycleToReadinessState = new Map([
    ['load', 'complete'],
    ['domcontentloaded', 'interactive'],
]);
/**
 * @internal
 */
const lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
export class Context extends EventEmitter {
    constructor(connection, result) {
        super();
        _Context_instances.add(this);
        _Context_connection.set(this, void 0);
        _Context_url.set(this, void 0);
        this._timeoutSettings = new TimeoutSettings();
        __classPrivateFieldSet(this, _Context_connection, connection, "f");
        this._contextId = result.context;
        __classPrivateFieldSet(this, _Context_url, result.url, "f");
    }
    get connection() {
        return __classPrivateFieldGet(this, _Context_connection, "f");
    }
    get id() {
        return this._contextId;
    }
    async evaluateHandle(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Context_instances, "m", _Context_evaluate).call(this, false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Context_instances, "m", _Context_evaluate).call(this, true, pageFunction, ...args);
    }
    async goto(url, options = {}) {
        const { waitUntil = 'load', timeout = this._timeoutSettings.navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        try {
            const response = await waitWithTimeout(this.connection.send('browsingContext.navigate', {
                url: url,
                context: this.id,
                wait: readinessState,
            }), 'Navigation', timeout);
            __classPrivateFieldSet(this, _Context_url, response.result.url, "f");
            return null;
        }
        catch (error) {
            if (error instanceof ProtocolError) {
                error.message += ` at ${url}`;
            }
            else if (error instanceof TimeoutError) {
                error.message = 'Navigation timeout of ' + timeout + ' ms exceeded';
            }
            throw error;
        }
    }
    url() {
        return __classPrivateFieldGet(this, _Context_url, "f");
    }
    async setContent(html, options = {}) {
        const { waitUntil = 'load', timeout = this._timeoutSettings.navigationTimeout(), } = options;
        const waitUntilCommand = lifeCycleToSubscribedEvent.get(getWaitUntilSingle(waitUntil));
        await Promise.all([
            setPageContent(this, html),
            waitWithTimeout(new Promise(resolve => {
                this.once(waitUntilCommand, () => {
                    resolve();
                });
            }), waitUntilCommand, timeout),
        ]);
    }
}
_Context_connection = new WeakMap(), _Context_url = new WeakMap(), _Context_instances = new WeakSet(), _Context_evaluate = async function _Context_evaluate(returnByValue, pageFunction, ...args) {
    let responsePromise;
    const resultOwnership = returnByValue ? 'none' : 'root';
    if (isString(pageFunction)) {
        responsePromise = __classPrivateFieldGet(this, _Context_connection, "f").send('script.evaluate', {
            expression: pageFunction,
            target: { context: this._contextId },
            resultOwnership,
            awaitPromise: true,
        });
    }
    else {
        responsePromise = __classPrivateFieldGet(this, _Context_connection, "f").send('script.callFunction', {
            functionDeclaration: stringifyFunction(pageFunction),
            arguments: await Promise.all(args.map(arg => {
                return BidiSerializer.serialize(arg, this);
            })),
            target: { context: this._contextId },
            resultOwnership,
            awaitPromise: true,
        });
    }
    const { result } = await responsePromise;
    if ('type' in result && result.type === 'exception') {
        throw new Error(result.exceptionDetails.text);
    }
    return returnByValue
        ? BidiSerializer.deserialize(result.result)
        : getBidiHandle(this, result.result);
};
/**
 * @internal
 */
function getWaitUntilSingle(event) {
    if (Array.isArray(event) && event.length > 1) {
        throw new Error('BiDi support only single `waitUntil` argument');
    }
    const waitUntilSingle = Array.isArray(event)
        ? event.find(lifecycle => {
            return lifecycle === 'domcontentloaded' || lifecycle === 'load';
        })
        : event;
    if (waitUntilSingle === 'networkidle0' ||
        waitUntilSingle === 'networkidle2') {
        throw new Error(`BiDi does not support 'waitUntil' ${waitUntilSingle}`);
    }
    assert(waitUntilSingle, `Invalid waitUntil option ${waitUntilSingle}`);
    return waitUntilSingle;
}
/**
 * @internal
 */
export function getBidiHandle(context, result) {
    if (result.type === 'node' || result.type === 'window') {
        return new ElementHandle(context, result);
    }
    return new JSHandle(context, result);
}
//# sourceMappingURL=Context.js.map