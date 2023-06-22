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
import { stringifyFunction } from '../../util/Function.js';
import { EventEmitter } from '../EventEmitter.js';
import { scriptInjector } from '../ScriptInjector.js';
import { PuppeteerURL, getSourcePuppeteerURLIfAvailable, isString, } from '../util.js';
import { ElementHandle } from './ElementHandle.js';
import { JSHandle } from './JSHandle.js';
import { BidiSerializer } from './Serializer.js';
import { createEvaluationError } from './utils.js';
export const SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
export const getSourceUrlComment = (url) => {
    return `//# sourceURL=${url}`;
};
export class Realm extends EventEmitter {
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
        scriptInjector.inject(script => {
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
_Realm_frame = new WeakMap(), _Realm_id = new WeakMap(), _Realm_sandbox = new WeakMap(), _Realm_instances = new WeakSet(), _Realm_evaluate = async function _Realm_evaluate(returnByValue, pageFunction, ...args) {
    const sourceUrlComment = getSourceUrlComment(getSourcePuppeteerURLIfAvailable(pageFunction)?.toString() ??
        PuppeteerURL.INTERNAL_URL);
    let responsePromise;
    const resultOwnership = returnByValue ? 'none' : 'root';
    if (isString(pageFunction)) {
        const expression = SOURCE_URL_REGEX.test(pageFunction)
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
        let functionDeclaration = stringifyFunction(pageFunction);
        functionDeclaration = SOURCE_URL_REGEX.test(functionDeclaration)
            ? functionDeclaration
            : `${functionDeclaration}\n${sourceUrlComment}\n`;
        responsePromise = this.connection.send('script.callFunction', {
            functionDeclaration,
            arguments: await Promise.all(args.map(arg => {
                return BidiSerializer.serialize(arg, this);
            })),
            target: this.target,
            resultOwnership,
            awaitPromise: true,
        });
    }
    const { result } = await responsePromise;
    if ('type' in result && result.type === 'exception') {
        throw createEvaluationError(result.exceptionDetails);
    }
    return returnByValue
        ? BidiSerializer.deserialize(result.result)
        : getBidiHandle(this, result.result, __classPrivateFieldGet(this, _Realm_frame, "f"));
};
/**
 * @internal
 */
export function getBidiHandle(realmOrContext, result, frame) {
    if (result.type === 'node' || result.type === 'window') {
        return new ElementHandle(realmOrContext, result, frame);
    }
    return new JSHandle(realmOrContext, result);
}
//# sourceMappingURL=Realm.js.map