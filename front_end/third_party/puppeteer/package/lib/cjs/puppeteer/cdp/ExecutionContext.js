"use strict";
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCdpHandle = exports.ExecutionContext = void 0;
const LazyArg_js_1 = require("../common/LazyArg.js");
const ScriptInjector_js_1 = require("../common/ScriptInjector.js");
const util_js_1 = require("../common/util.js");
const AsyncIterableUtil_js_1 = require("../util/AsyncIterableUtil.js");
const Function_js_1 = require("../util/Function.js");
const AriaQueryHandler_js_1 = require("./AriaQueryHandler.js");
const Binding_js_1 = require("./Binding.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
const JSHandle_js_1 = require("./JSHandle.js");
const utils_js_1 = require("./utils.js");
/**
 * @internal
 */
class ExecutionContext {
    _client;
    _world;
    _contextId;
    _contextName;
    constructor(client, contextPayload, world) {
        this._client = client;
        this._world = world;
        this._contextId = contextPayload.id;
        if (contextPayload.name) {
            this._contextName = contextPayload.name;
        }
    }
    #bindingsInstalled = false;
    #puppeteerUtil;
    get puppeteerUtil() {
        let promise = Promise.resolve();
        if (!this.#bindingsInstalled) {
            promise = Promise.all([
                this.#installGlobalBinding(new Binding_js_1.Binding('__ariaQuerySelector', AriaQueryHandler_js_1.ARIAQueryHandler.queryOne)),
                this.#installGlobalBinding(new Binding_js_1.Binding('__ariaQuerySelectorAll', (async (element, selector) => {
                    const results = AriaQueryHandler_js_1.ARIAQueryHandler.queryAll(element, selector);
                    return await element.realm.evaluateHandle((...elements) => {
                        return elements;
                    }, ...(await AsyncIterableUtil_js_1.AsyncIterableUtil.collect(results)));
                }))),
            ]);
            this.#bindingsInstalled = true;
        }
        ScriptInjector_js_1.scriptInjector.inject(script => {
            if (this.#puppeteerUtil) {
                void this.#puppeteerUtil.then(handle => {
                    void handle.dispose();
                });
            }
            this.#puppeteerUtil = promise.then(() => {
                return this.evaluateHandle(script);
            });
        }, !this.#puppeteerUtil);
        return this.#puppeteerUtil;
    }
    async #installGlobalBinding(binding) {
        try {
            if (this._world) {
                this._world._bindings.set(binding.name, binding);
                await this._world._addBindingToContext(this, binding.name);
            }
        }
        catch {
            // If the binding cannot be added, then either the browser doesn't support
            // bindings (e.g. Firefox) or the context is broken. Either breakage is
            // okay, so we ignore the error.
        }
    }
    /**
     * Evaluates the given function.
     *
     * @example
     *
     * ```ts
     * const executionContext = await page.mainFrame().executionContext();
     * const result = await executionContext.evaluate(() => Promise.resolve(8 * 7))* ;
     * console.log(result); // prints "56"
     * ```
     *
     * @example
     * A string can also be passed in instead of a function:
     *
     * ```ts
     * console.log(await executionContext.evaluate('1 + 2')); // prints "3"
     * ```
     *
     * @example
     * Handles can also be passed as `args`. They resolve to their referenced object:
     *
     * ```ts
     * const oneHandle = await executionContext.evaluateHandle(() => 1);
     * const twoHandle = await executionContext.evaluateHandle(() => 2);
     * const result = await executionContext.evaluate(
     *   (a, b) => a + b,
     *   oneHandle,
     *   twoHandle
     * );
     * await oneHandle.dispose();
     * await twoHandle.dispose();
     * console.log(result); // prints '3'.
     * ```
     *
     * @param pageFunction - The function to evaluate.
     * @param args - Additional arguments to pass into the function.
     * @returns The result of evaluating the function. If the result is an object,
     * a vanilla object containing the serializable properties of the result is
     * returned.
     */
    async evaluate(pageFunction, ...args) {
        return await this.#evaluate(true, pageFunction, ...args);
    }
    /**
     * Evaluates the given function.
     *
     * Unlike {@link ExecutionContext.evaluate | evaluate}, this method returns a
     * handle to the result of the function.
     *
     * This method may be better suited if the object cannot be serialized (e.g.
     * `Map`) and requires further manipulation.
     *
     * @example
     *
     * ```ts
     * const context = await page.mainFrame().executionContext();
     * const handle: JSHandle<typeof globalThis> = await context.evaluateHandle(
     *   () => Promise.resolve(self)
     * );
     * ```
     *
     * @example
     * A string can also be passed in instead of a function.
     *
     * ```ts
     * const handle: JSHandle<number> = await context.evaluateHandle('1 + 2');
     * ```
     *
     * @example
     * Handles can also be passed as `args`. They resolve to their referenced object:
     *
     * ```ts
     * const bodyHandle: ElementHandle<HTMLBodyElement> =
     *   await context.evaluateHandle(() => {
     *     return document.body;
     *   });
     * const stringHandle: JSHandle<string> = await context.evaluateHandle(
     *   body => body.innerHTML,
     *   body
     * );
     * console.log(await stringHandle.jsonValue()); // prints body's innerHTML
     * // Always dispose your garbage! :)
     * await bodyHandle.dispose();
     * await stringHandle.dispose();
     * ```
     *
     * @param pageFunction - The function to evaluate.
     * @param args - Additional arguments to pass into the function.
     * @returns A {@link JSHandle | handle} to the result of evaluating the
     * function. If the result is a `Node`, then this will return an
     * {@link ElementHandle | element handle}.
     */
    async evaluateHandle(pageFunction, ...args) {
        return await this.#evaluate(false, pageFunction, ...args);
    }
    async #evaluate(returnByValue, pageFunction, ...args) {
        const sourceUrlComment = (0, util_js_1.getSourceUrlComment)((0, util_js_1.getSourcePuppeteerURLIfAvailable)(pageFunction)?.toString() ??
            util_js_1.PuppeteerURL.INTERNAL_URL);
        if ((0, util_js_1.isString)(pageFunction)) {
            const contextId = this._contextId;
            const expression = pageFunction;
            const expressionWithSourceUrl = util_js_1.SOURCE_URL_REGEX.test(expression)
                ? expression
                : `${expression}\n${sourceUrlComment}\n`;
            const { exceptionDetails, result: remoteObject } = await this._client
                .send('Runtime.evaluate', {
                expression: expressionWithSourceUrl,
                contextId,
                returnByValue,
                awaitPromise: true,
                userGesture: true,
            })
                .catch(rewriteError);
            if (exceptionDetails) {
                throw (0, utils_js_1.createEvaluationError)(exceptionDetails);
            }
            return returnByValue
                ? (0, utils_js_1.valueFromRemoteObject)(remoteObject)
                : createCdpHandle(this._world, remoteObject);
        }
        const functionDeclaration = (0, Function_js_1.stringifyFunction)(pageFunction);
        const functionDeclarationWithSourceUrl = util_js_1.SOURCE_URL_REGEX.test(functionDeclaration)
            ? functionDeclaration
            : `${functionDeclaration}\n${sourceUrlComment}\n`;
        let callFunctionOnPromise;
        try {
            callFunctionOnPromise = this._client.send('Runtime.callFunctionOn', {
                functionDeclaration: functionDeclarationWithSourceUrl,
                executionContextId: this._contextId,
                arguments: args.length
                    ? await Promise.all(args.map(convertArgument.bind(this)))
                    : [],
                returnByValue,
                awaitPromise: true,
                userGesture: true,
            });
        }
        catch (error) {
            if (error instanceof TypeError &&
                error.message.startsWith('Converting circular structure to JSON')) {
                error.message += ' Recursive objects are not allowed.';
            }
            throw error;
        }
        const { exceptionDetails, result: remoteObject } = await callFunctionOnPromise.catch(rewriteError);
        if (exceptionDetails) {
            throw (0, utils_js_1.createEvaluationError)(exceptionDetails);
        }
        return returnByValue
            ? (0, utils_js_1.valueFromRemoteObject)(remoteObject)
            : createCdpHandle(this._world, remoteObject);
        async function convertArgument(arg) {
            if (arg instanceof LazyArg_js_1.LazyArg) {
                arg = await arg.get(this);
            }
            if (typeof arg === 'bigint') {
                // eslint-disable-line valid-typeof
                return { unserializableValue: `${arg.toString()}n` };
            }
            if (Object.is(arg, -0)) {
                return { unserializableValue: '-0' };
            }
            if (Object.is(arg, Infinity)) {
                return { unserializableValue: 'Infinity' };
            }
            if (Object.is(arg, -Infinity)) {
                return { unserializableValue: '-Infinity' };
            }
            if (Object.is(arg, NaN)) {
                return { unserializableValue: 'NaN' };
            }
            const objectHandle = arg && (arg instanceof JSHandle_js_1.CdpJSHandle || arg instanceof ElementHandle_js_1.CdpElementHandle)
                ? arg
                : null;
            if (objectHandle) {
                if (objectHandle.realm !== this._world) {
                    throw new Error('JSHandles can be evaluated only in the context they were created!');
                }
                if (objectHandle.disposed) {
                    throw new Error('JSHandle is disposed!');
                }
                if (objectHandle.remoteObject().unserializableValue) {
                    return {
                        unserializableValue: objectHandle.remoteObject().unserializableValue,
                    };
                }
                if (!objectHandle.remoteObject().objectId) {
                    return { value: objectHandle.remoteObject().value };
                }
                return { objectId: objectHandle.remoteObject().objectId };
            }
            return { value: arg };
        }
    }
}
exports.ExecutionContext = ExecutionContext;
const rewriteError = (error) => {
    if (error.message.includes('Object reference chain is too long')) {
        return { result: { type: 'undefined' } };
    }
    if (error.message.includes("Object couldn't be returned by value")) {
        return { result: { type: 'undefined' } };
    }
    if (error.message.endsWith('Cannot find context with specified id') ||
        error.message.endsWith('Inspected target navigated or closed')) {
        throw new Error('Execution context was destroyed, most likely because of a navigation.');
    }
    throw error;
};
/**
 * @internal
 */
function createCdpHandle(realm, remoteObject) {
    if (remoteObject.subtype === 'node') {
        return new ElementHandle_js_1.CdpElementHandle(realm, remoteObject);
    }
    return new JSHandle_js_1.CdpJSHandle(realm, remoteObject);
}
exports.createCdpHandle = createCdpHandle;
//# sourceMappingURL=ExecutionContext.js.map