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
exports.getBidiHandle = exports.Realm = exports.getSourceUrlComment = exports.SOURCE_URL_REGEX = void 0;
const Bidi = __importStar(require("chromium-bidi/lib/cjs/protocol/protocol.js"));
const Function_js_1 = require("../../util/Function.js");
const EventEmitter_js_1 = require("../EventEmitter.js");
const ScriptInjector_js_1 = require("../ScriptInjector.js");
const util_js_1 = require("../util.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
const JSHandle_js_1 = require("./JSHandle.js");
const Serializer_js_1 = require("./Serializer.js");
const utils_js_1 = require("./utils.js");
exports.SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
const getSourceUrlComment = (url) => {
    return `//# sourceURL=${url}`;
};
exports.getSourceUrlComment = getSourceUrlComment;
class Realm extends EventEmitter_js_1.EventEmitter {
    connection;
    #frame;
    #id;
    #sandbox;
    constructor(connection, id, sandbox) {
        super();
        this.connection = connection;
        this.#id = id;
        this.#sandbox = sandbox;
    }
    get target() {
        return {
            context: this.#id,
            sandbox: this.#sandbox,
        };
    }
    setFrame(frame) {
        this.#frame = frame;
        // TODO(jrandolf): We should try to find a less brute-force way of doing
        // this.
        this.connection.on(Bidi.ChromiumBidi.Script.EventNames.RealmDestroyed, async () => {
            const promise = this.internalPuppeteerUtil;
            this.internalPuppeteerUtil = undefined;
            try {
                const util = await promise;
                await util?.dispose();
            }
            catch (error) {
                (0, util_js_1.debugError)(error);
            }
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
        return this.#evaluate(false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return this.#evaluate(true, pageFunction, ...args);
    }
    async #evaluate(returnByValue, pageFunction, ...args) {
        const sourceUrlComment = (0, exports.getSourceUrlComment)((0, util_js_1.getSourcePuppeteerURLIfAvailable)(pageFunction)?.toString() ??
            util_js_1.PuppeteerURL.INTERNAL_URL);
        let responsePromise;
        const resultOwnership = returnByValue
            ? "none" /* Bidi.Script.ResultOwnership.None */
            : "root" /* Bidi.Script.ResultOwnership.Root */;
        if ((0, util_js_1.isString)(pageFunction)) {
            const expression = exports.SOURCE_URL_REGEX.test(pageFunction)
                ? pageFunction
                : `${pageFunction}\n${sourceUrlComment}\n`;
            responsePromise = this.connection.send('script.evaluate', {
                expression,
                target: this.target,
                resultOwnership,
                awaitPromise: true,
                userActivation: true,
            });
        }
        else {
            let functionDeclaration = (0, Function_js_1.stringifyFunction)(pageFunction);
            functionDeclaration = exports.SOURCE_URL_REGEX.test(functionDeclaration)
                ? functionDeclaration
                : `${functionDeclaration}\n${sourceUrlComment}\n`;
            responsePromise = this.connection.send('script.callFunction', {
                functionDeclaration,
                arguments: await Promise.all(args.map(arg => {
                    return Serializer_js_1.BidiSerializer.serialize(arg, this);
                })),
                target: this.target,
                resultOwnership,
                awaitPromise: true,
                userActivation: true,
            });
        }
        const { result } = await responsePromise;
        if ('type' in result && result.type === 'exception') {
            throw (0, utils_js_1.createEvaluationError)(result.exceptionDetails);
        }
        return returnByValue
            ? Serializer_js_1.BidiSerializer.deserialize(result.result)
            : getBidiHandle(this, result.result, this.#frame);
    }
}
exports.Realm = Realm;
/**
 * @internal
 */
function getBidiHandle(realmOrContext, result, frame) {
    if (result.type === 'node' || result.type === 'window') {
        return new ElementHandle_js_1.ElementHandle(realmOrContext, result, frame);
    }
    return new JSHandle_js_1.JSHandle(realmOrContext, result);
}
exports.getBidiHandle = getBidiHandle;
//# sourceMappingURL=Realm.js.map