import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { scriptInjector } from '../common/ScriptInjector.js';
import { PuppeteerURL, SOURCE_URL_REGEX, getSourcePuppeteerURLIfAvailable, getSourceUrlComment, isString, } from '../common/util.js';
import { disposeSymbol } from '../util/disposable.js';
import { stringifyFunction } from '../util/Function.js';
import { BidiDeserializer } from './Deserializer.js';
import { BidiElementHandle } from './ElementHandle.js';
import { BidiJSHandle } from './JSHandle.js';
import { BidiSerializer } from './Serializer.js';
import { createEvaluationError } from './util.js';
/**
 * @internal
 */
export class BidiRealm extends EventEmitter {
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
        return await this.#evaluate(false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return await this.#evaluate(true, pageFunction, ...args);
    }
    async #evaluate(returnByValue, pageFunction, ...args) {
        const sourceUrlComment = getSourceUrlComment(getSourcePuppeteerURLIfAvailable(pageFunction)?.toString() ??
            PuppeteerURL.INTERNAL_URL);
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
        if (isString(pageFunction)) {
            const expression = SOURCE_URL_REGEX.test(pageFunction)
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
            let functionDeclaration = stringifyFunction(pageFunction);
            functionDeclaration = SOURCE_URL_REGEX.test(functionDeclaration)
                ? functionDeclaration
                : `${functionDeclaration}\n${sourceUrlComment}\n`;
            responsePromise = this.connection.send('script.callFunction', {
                functionDeclaration,
                arguments: args.length
                    ? await Promise.all(args.map(arg => {
                        return BidiSerializer.serialize(sandbox, arg);
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
            throw createEvaluationError(result.exceptionDetails);
        }
        return returnByValue
            ? BidiDeserializer.deserialize(result.result)
            : createBidiHandle(sandbox, result.result);
    }
    [disposeSymbol]() {
        this.connection.off(Bidi.ChromiumBidi.Script.EventNames.RealmCreated, this.handleRealmCreated);
        this.connection.off(Bidi.ChromiumBidi.Script.EventNames.RealmDestroyed, this.handleRealmDestroyed);
    }
}
/**
 * @internal
 */
export function createBidiHandle(sandbox, result) {
    if (result.type === 'node' || result.type === 'window') {
        return new BidiElementHandle(sandbox, result);
    }
    return new BidiJSHandle(sandbox, result);
}
//# sourceMappingURL=Realm.js.map