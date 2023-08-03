"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBidiHandle = exports.Realm = exports.getSourceUrlComment = exports.SOURCE_URL_REGEX = void 0;
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