"use strict";
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
exports.createBidiHandle = exports.BidiRealm = void 0;
const Bidi = __importStar(require("chromium-bidi/lib/cjs/protocol/protocol.js"));
const EventEmitter_js_1 = require("../common/EventEmitter.js");
const ScriptInjector_js_1 = require("../common/ScriptInjector.js");
const util_js_1 = require("../common/util.js");
const disposable_js_1 = require("../util/disposable.js");
const Function_js_1 = require("../util/Function.js");
const Deserializer_js_1 = require("./Deserializer.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
const JSHandle_js_1 = require("./JSHandle.js");
const Serializer_js_1 = require("./Serializer.js");
const util_js_2 = require("./util.js");
/**
 * @internal
 */
class BidiRealm extends EventEmitter_js_1.EventEmitter {
    connection;
    #id;
    #sandbox;
    constructor(connection) {
        super();
        this.connection = connection;
    }
    get target() {
        return {
            context: this.#sandbox.environment._id,
            sandbox: this.#sandbox.name,
        };
    }
    handleRealmDestroyed = async (params) => {
        if (params.realm === this.#id) {
            // Note: The Realm is destroyed, so in theory the handle should be as
            // well.
            this.internalPuppeteerUtil = undefined;
            this.#sandbox.environment.clearDocumentHandle();
        }
    };
    handleRealmCreated = (params) => {
        if (params.type === 'window' &&
            params.context === this.#sandbox.environment._id &&
            params.sandbox === this.#sandbox.name) {
            this.#id = params.realm;
            void this.#sandbox.taskManager.rerunAll();
        }
    };
    setSandbox(sandbox) {
        this.#sandbox = sandbox;
        this.connection.on(Bidi.ChromiumBidi.Script.EventNames.RealmCreated, this.handleRealmCreated);
        this.connection.on(Bidi.ChromiumBidi.Script.EventNames.RealmDestroyed, this.handleRealmDestroyed);
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
        const sandbox = this.#sandbox;
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
            responsePromise = this.connection.send('script.evaluate', {
                expression,
                target: this.target,
                resultOwnership,
                awaitPromise: true,
                userActivation: true,
                serializationOptions,
            });
        }
        else {
            let functionDeclaration = (0, Function_js_1.stringifyFunction)(pageFunction);
            functionDeclaration = util_js_1.SOURCE_URL_REGEX.test(functionDeclaration)
                ? functionDeclaration
                : `${functionDeclaration}\n${sourceUrlComment}\n`;
            responsePromise = this.connection.send('script.callFunction', {
                functionDeclaration,
                arguments: args.length
                    ? await Promise.all(args.map(arg => {
                        return Serializer_js_1.BidiSerializer.serialize(sandbox, arg);
                    }))
                    : [],
                target: this.target,
                resultOwnership,
                awaitPromise: true,
                userActivation: true,
                serializationOptions,
            });
        }
        const { result } = await responsePromise;
        if ('type' in result && result.type === 'exception') {
            throw (0, util_js_2.createEvaluationError)(result.exceptionDetails);
        }
        return returnByValue
            ? Deserializer_js_1.BidiDeserializer.deserialize(result.result)
            : createBidiHandle(sandbox, result.result);
    }
    [disposable_js_1.disposeSymbol]() {
        this.connection.off(Bidi.ChromiumBidi.Script.EventNames.RealmCreated, this.handleRealmCreated);
        this.connection.off(Bidi.ChromiumBidi.Script.EventNames.RealmDestroyed, this.handleRealmDestroyed);
    }
}
exports.BidiRealm = BidiRealm;
/**
 * @internal
 */
function createBidiHandle(sandbox, result) {
    if (result.type === 'node' || result.type === 'window') {
        return new ElementHandle_js_1.BidiElementHandle(sandbox, result);
    }
    return new JSHandle_js_1.BidiJSHandle(sandbox, result);
}
exports.createBidiHandle = createBidiHandle;
//# sourceMappingURL=Realm.js.map