"use strict";
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        function next() {
            while (env.stack.length) {
                var rec = env.stack.pop();
                try {
                    var result = rec.dispose && rec.dispose.call(rec.value);
                    if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                catch (e) {
                    fail(e);
                }
            }
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiWorkerRealm = exports.BidiFrameRealm = exports.BidiRealm = void 0;
const Realm_js_1 = require("../api/Realm.js");
const AriaQueryHandler_js_1 = require("../cdp/AriaQueryHandler.js");
const LazyArg_js_1 = require("../common/LazyArg.js");
const ScriptInjector_js_1 = require("../common/ScriptInjector.js");
const util_js_1 = require("../common/util.js");
const AsyncIterableUtil_js_1 = require("../util/AsyncIterableUtil.js");
const Function_js_1 = require("../util/Function.js");
const Deserializer_js_1 = require("./Deserializer.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
const ExposedFunction_js_1 = require("./ExposedFunction.js");
const JSHandle_js_1 = require("./JSHandle.js");
const Serializer_js_1 = require("./Serializer.js");
const util_js_2 = require("./util.js");
/**
 * @internal
 */
class BidiRealm extends Realm_js_1.Realm {
    realm;
    constructor(realm, timeoutSettings) {
        super(timeoutSettings);
        this.realm = realm;
    }
    initialize() {
        this.realm.on('destroyed', ({ reason }) => {
            this.taskManager.terminateAll(new Error(reason));
        });
        this.realm.on('updated', () => {
            this.internalPuppeteerUtil = undefined;
            void this.taskManager.rerunAll();
        });
    }
    internalPuppeteerUtil;
    get puppeteerUtil() {
        const promise = Promise.resolve();
        ScriptInjector_js_1.scriptInjector.inject(script => {
            if (this.internalPuppeteerUtil) {
                void this.internalPuppeteerUtil.then(handle => {
                    void handle.dispose();
                });
            }
            this.internalPuppeteerUtil = promise.then(() => {
                return this.evaluateHandle(script);
            });
        }, !this.internalPuppeteerUtil);
        return this.internalPuppeteerUtil;
    }
    async evaluateHandle(pageFunction, ...args) {
        return await this.#evaluate(false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return await this.#evaluate(true, pageFunction, ...args);
    }
    async #evaluate(returnByValue, pageFunction, ...args) {
        const sourceUrlComment = (0, util_js_1.getSourceUrlComment)((0, util_js_1.getSourcePuppeteerURLIfAvailable)(pageFunction)?.toString() ??
            util_js_1.PuppeteerURL.INTERNAL_URL);
        let responsePromise;
        const resultOwnership = returnByValue
            ? "none" /* Bidi.Script.ResultOwnership.None */
            : "root" /* Bidi.Script.ResultOwnership.Root */;
        const serializationOptions = returnByValue
            ? {}
            : {
                maxObjectDepth: 0,
                maxDomDepth: 0,
            };
        if ((0, util_js_1.isString)(pageFunction)) {
            const expression = util_js_1.SOURCE_URL_REGEX.test(pageFunction)
                ? pageFunction
                : `${pageFunction}\n${sourceUrlComment}\n`;
            responsePromise = this.realm.evaluate(expression, true, {
                resultOwnership,
                userActivation: true,
                serializationOptions,
            });
        }
        else {
            let functionDeclaration = (0, Function_js_1.stringifyFunction)(pageFunction);
            functionDeclaration = util_js_1.SOURCE_URL_REGEX.test(functionDeclaration)
                ? functionDeclaration
                : `${functionDeclaration}\n${sourceUrlComment}\n`;
            responsePromise = this.realm.callFunction(functionDeclaration, 
            /* awaitPromise= */ true, {
                arguments: args.length
                    ? await Promise.all(args.map(arg => {
                        return this.serialize(arg);
                    }))
                    : [],
                resultOwnership,
                userActivation: true,
                serializationOptions,
            });
        }
        const result = await responsePromise;
        if ('type' in result && result.type === 'exception') {
            throw (0, util_js_2.createEvaluationError)(result.exceptionDetails);
        }
        return returnByValue
            ? Deserializer_js_1.BidiDeserializer.deserialize(result.result)
            : this.createHandle(result.result);
    }
    createHandle(result) {
        if ((result.type === 'node' || result.type === 'window') &&
            this instanceof BidiFrameRealm) {
            return ElementHandle_js_1.BidiElementHandle.from(result, this);
        }
        return JSHandle_js_1.BidiJSHandle.from(result, this);
    }
    async serialize(arg) {
        if (arg instanceof LazyArg_js_1.LazyArg) {
            arg = await arg.get(this);
        }
        if (arg instanceof JSHandle_js_1.BidiJSHandle || arg instanceof ElementHandle_js_1.BidiElementHandle) {
            if (arg.realm !== this) {
                if (!(arg.realm instanceof BidiFrameRealm) ||
                    !(this instanceof BidiFrameRealm)) {
                    throw new Error("Trying to evaluate JSHandle from different global types. Usually this means you're using a handle from a worker in a page or vice versa.");
                }
                if (arg.realm.environment !== this.environment) {
                    throw new Error("Trying to evaluate JSHandle from different frames. Usually this means you're using a handle from a page on a different page.");
                }
            }
            if (arg.disposed) {
                throw new Error('JSHandle is disposed!');
            }
            return arg.remoteValue();
        }
        return Serializer_js_1.BidiSerializer.serialize(arg);
    }
    async destroyHandles(handles) {
        const handleIds = handles
            .map(({ id }) => {
            return id;
        })
            .filter((id) => {
            return id !== undefined;
        });
        if (handleIds.length === 0) {
            return;
        }
        await this.realm.disown(handleIds).catch(error => {
            // Exceptions might happen in case of a page been navigated or closed.
            // Swallow these since they are harmless and we don't leak anything in this case.
            (0, util_js_1.debugError)(error);
        });
    }
    async adoptHandle(handle) {
        return (await this.evaluateHandle(node => {
            return node;
        }, handle));
    }
    async transferHandle(handle) {
        if (handle.realm === this) {
            return handle;
        }
        const transferredHandle = this.adoptHandle(handle);
        await handle.dispose();
        return await transferredHandle;
    }
}
exports.BidiRealm = BidiRealm;
/**
 * @internal
 */
class BidiFrameRealm extends BidiRealm {
    static from(realm, frame) {
        const frameRealm = new BidiFrameRealm(realm, frame);
        frameRealm.#initialize();
        return frameRealm;
    }
    #frame;
    constructor(realm, frame) {
        super(realm, frame.timeoutSettings);
        this.#frame = frame;
    }
    #initialize() {
        super.initialize();
        // This should run first.
        this.realm.on('updated', () => {
            this.environment.clearDocumentHandle();
            this.#bindingsInstalled = false;
        });
    }
    #bindingsInstalled = false;
    get puppeteerUtil() {
        let promise = Promise.resolve();
        if (!this.#bindingsInstalled) {
            promise = Promise.all([
                ExposedFunction_js_1.ExposeableFunction.from(this.environment, '__ariaQuerySelector', AriaQueryHandler_js_1.ARIAQueryHandler.queryOne, !!this.sandbox),
                ExposedFunction_js_1.ExposeableFunction.from(this.environment, '__ariaQuerySelectorAll', async (element, selector) => {
                    const results = AriaQueryHandler_js_1.ARIAQueryHandler.queryAll(element, selector);
                    return await element.realm.evaluateHandle((...elements) => {
                        return elements;
                    }, ...(await AsyncIterableUtil_js_1.AsyncIterableUtil.collect(results)));
                }, !!this.sandbox),
            ]);
            this.#bindingsInstalled = true;
        }
        return promise.then(() => {
            return super.puppeteerUtil;
        });
    }
    get sandbox() {
        return this.realm.sandbox;
    }
    get environment() {
        return this.#frame;
    }
    async adoptBackendNode(backendNodeId) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const { object } = await this.#frame.client.send('DOM.resolveNode', {
                backendNodeId,
                executionContextId: await this.realm.resolveExecutionContextId(),
            });
            const handle = __addDisposableResource(env_1, ElementHandle_js_1.BidiElementHandle.from({
                handle: object.objectId,
                type: 'node',
            }, this), false);
            // We need the sharedId, so we perform the following to obtain it.
            return await handle.evaluateHandle(element => {
                return element;
            });
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
}
exports.BidiFrameRealm = BidiFrameRealm;
/**
 * @internal
 */
class BidiWorkerRealm extends BidiRealm {
    static from(realm, worker) {
        const workerRealm = new BidiWorkerRealm(realm, worker);
        workerRealm.initialize();
        return workerRealm;
    }
    #worker;
    constructor(realm, frame) {
        super(realm, frame.timeoutSettings);
        this.#worker = frame;
    }
    get environment() {
        return this.#worker;
    }
    async adoptBackendNode() {
        throw new Error('Cannot adopt DOM nodes into a worker.');
    }
}
exports.BidiWorkerRealm = BidiWorkerRealm;
//# sourceMappingURL=Realm.js.map