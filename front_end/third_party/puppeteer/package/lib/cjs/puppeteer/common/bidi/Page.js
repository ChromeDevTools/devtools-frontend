"use strict";
/**
 * Copyright 2022 Google Inc. All rights reserved.
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
var _Page_instances, _Page_connection, _Page_evaluate;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBidiHandle = exports.Page = void 0;
const Page_js_1 = require("../../api/Page.js");
const util_js_1 = require("../util.js");
const Serializer_js_1 = require("./Serializer.js");
const JSHandle_js_1 = require("./JSHandle.js");
const Function_js_1 = require("../../util/Function.js");
/**
 * @internal
 */
class Page extends Page_js_1.Page {
    constructor(connection, contextId) {
        super();
        _Page_instances.add(this);
        _Page_connection.set(this, void 0);
        __classPrivateFieldSet(this, _Page_connection, connection, "f");
        this._contextId = contextId;
    }
    async close() {
        await __classPrivateFieldGet(this, _Page_connection, "f").send('browsingContext.close', {
            context: this._contextId,
        });
    }
    get connection() {
        return __classPrivateFieldGet(this, _Page_connection, "f");
    }
    async evaluateHandle(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Page_instances, "m", _Page_evaluate).call(this, false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Page_instances, "m", _Page_evaluate).call(this, true, pageFunction, ...args);
    }
}
exports.Page = Page;
_Page_connection = new WeakMap(), _Page_instances = new WeakSet(), _Page_evaluate = async function _Page_evaluate(returnByValue, pageFunction, ...args) {
    let responsePromise;
    const resultOwnership = returnByValue ? 'none' : 'root';
    if ((0, util_js_1.isString)(pageFunction)) {
        responsePromise = __classPrivateFieldGet(this, _Page_connection, "f").send('script.evaluate', {
            expression: pageFunction,
            target: { context: this._contextId },
            resultOwnership,
            awaitPromise: true,
        });
    }
    else {
        responsePromise = __classPrivateFieldGet(this, _Page_connection, "f").send('script.callFunction', {
            functionDeclaration: (0, Function_js_1.stringifyFunction)(pageFunction),
            arguments: await Promise.all(args.map(arg => {
                return Serializer_js_1.BidiSerializer.serialize(arg, this);
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
        ? Serializer_js_1.BidiSerializer.deserialize(result.result)
        : getBidiHandle(this, result.result);
};
/**
 * @internal
 */
function getBidiHandle(context, result) {
    // TODO: | ElementHandle<Node>
    if ((result.type === 'node' || result.type === 'window') &&
        context._contextId) {
        throw new Error('ElementHandle not implemented');
    }
    return new JSHandle_js_1.JSHandle(context, result);
}
exports.getBidiHandle = getBidiHandle;
//# sourceMappingURL=Page.js.map