import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { stringifyFunction } from '../../util/Function.js';
import { EventEmitter } from '../EventEmitter.js';
import { scriptInjector } from '../ScriptInjector.js';
import { PuppeteerURL, debugError, getSourcePuppeteerURLIfAvailable, isString, } from '../util.js';
import { ElementHandle } from './ElementHandle.js';
import { JSHandle } from './JSHandle.js';
import { BidiSerializer } from './Serializer.js';
import { createEvaluationError } from './utils.js';
export const SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
export const getSourceUrlComment = (url) => {
    return `//# sourceURL=${url}`;
};
export class Realm extends EventEmitter {
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
                debugError(error);
            }
        });
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
        return this.#evaluate(false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return this.#evaluate(true, pageFunction, ...args);
    }
    async #evaluate(returnByValue, pageFunction, ...args) {
        const sourceUrlComment = getSourceUrlComment(getSourcePuppeteerURLIfAvailable(pageFunction)?.toString() ??
            PuppeteerURL.INTERNAL_URL);
        let responsePromise;
        const resultOwnership = returnByValue
            ? "none" /* Bidi.Script.ResultOwnership.None */
            : "root" /* Bidi.Script.ResultOwnership.Root */;
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
                userActivation: true,
            });
        }
        const { result } = await responsePromise;
        if ('type' in result && result.type === 'exception') {
            throw createEvaluationError(result.exceptionDetails);
        }
        return returnByValue
            ? BidiSerializer.deserialize(result.result)
            : getBidiHandle(this, result.result, this.#frame);
    }
}
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