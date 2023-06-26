"use strict";
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
var _Realm_instances, _Realm_frame, _Realm_id, _Realm_sandbox, _Realm_evaluate;
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
    constructor(connection, id, sandbox) {
        super();
        _Realm_instances.add(this);
        _Realm_frame.set(this, void 0);
        _Realm_id.set(this, void 0);
        _Realm_sandbox.set(this, void 0);
        this.connection = connection;
        __classPrivateFieldSet(this, _Realm_id, id, "f");
        __classPrivateFieldSet(this, _Realm_sandbox, sandbox, "f");
    }
    get target() {
        return {
            context: __classPrivateFieldGet(this, _Realm_id, "f"),
            sandbox: __classPrivateFieldGet(this, _Realm_sandbox, "f"),
        };
    }
    setFrame(frame) {
        __classPrivateFieldSet(this, _Realm_frame, frame, "f");
    }
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
        return __classPrivateFieldGet(this, _Realm_instances, "m", _Realm_evaluate).call(this, false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Realm_instances, "m", _Realm_evaluate).call(this, true, pageFunction, ...args);
    }
}
exports.Realm = Realm;
_Realm_frame = new WeakMap(), _Realm_id = new WeakMap(), _Realm_sandbox = new WeakMap(), _Realm_instances = new WeakSet(), _Realm_evaluate = async function _Realm_evaluate(returnByValue, pageFunction, ...args) {
    const sourceUrlComment = (0, exports.getSourceUrlComment)((0, util_js_1.getSourcePuppeteerURLIfAvailable)(pageFunction)?.toString() ??
        util_js_1.PuppeteerURL.INTERNAL_URL);
    let responsePromise;
    const resultOwnership = returnByValue ? 'none' : 'root';
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
        : getBidiHandle(this, result.result, __classPrivateFieldGet(this, _Realm_frame, "f"));
};
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