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
var _BrowsingContext_instances, _BrowsingContext_timeoutSettings, _BrowsingContext_id, _BrowsingContext_url, _BrowsingContext_cdpSessionId, _BrowsingContext_puppeteerUtil, _BrowsingContext_evaluate;
import { assert } from '../../util/assert.js';
import { stringifyFunction } from '../../util/Function.js';
import { ProtocolError, TimeoutError } from '../Errors.js';
import { EventEmitter } from '../EventEmitter.js';
import { scriptInjector } from '../ScriptInjector.js';
import { PuppeteerURL, getPageContent, getSourcePuppeteerURLIfAvailable, isString, setPageContent, waitWithTimeout, } from '../util.js';
import { ElementHandle } from './ElementHandle.js';
import { JSHandle } from './JSHandle.js';
import { BidiSerializer } from './Serializer.js';
import { createEvaluationError } from './utils.js';
const SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
const getSourceUrlComment = (url) => {
    return `//# sourceURL=${url}`;
};
/**
 * @internal
 */
const lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
const lifeCycleToReadinessState = new Map([
    ['load', 'complete'],
    ['domcontentloaded', 'interactive'],
]);
/**
 * @internal
 */
export class BrowsingContext extends EventEmitter {
    constructor(connection, timeoutSettings, info) {
        super();
        _BrowsingContext_instances.add(this);
        _BrowsingContext_timeoutSettings.set(this, void 0);
        _BrowsingContext_id.set(this, void 0);
        _BrowsingContext_url.set(this, 'about:blank');
        _BrowsingContext_cdpSessionId.set(this, void 0);
        _BrowsingContext_puppeteerUtil.set(this, void 0);
        this.connection = connection;
        __classPrivateFieldSet(this, _BrowsingContext_timeoutSettings, timeoutSettings, "f");
        __classPrivateFieldSet(this, _BrowsingContext_id, info.context, "f");
    }
    get puppeteerUtil() {
        const promise = Promise.resolve();
        scriptInjector.inject(script => {
            if (__classPrivateFieldGet(this, _BrowsingContext_puppeteerUtil, "f")) {
                void __classPrivateFieldGet(this, _BrowsingContext_puppeteerUtil, "f").then(handle => {
                    void handle.dispose();
                });
            }
            __classPrivateFieldSet(this, _BrowsingContext_puppeteerUtil, promise.then(() => {
                return this.evaluateHandle(script);
            }), "f");
        }, !__classPrivateFieldGet(this, _BrowsingContext_puppeteerUtil, "f"));
        return __classPrivateFieldGet(this, _BrowsingContext_puppeteerUtil, "f");
    }
    get url() {
        return __classPrivateFieldGet(this, _BrowsingContext_url, "f");
    }
    get id() {
        return __classPrivateFieldGet(this, _BrowsingContext_id, "f");
    }
    get cdpSessionId() {
        return __classPrivateFieldGet(this, _BrowsingContext_cdpSessionId, "f");
    }
    async goto(url, options = {}) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        try {
            const { result } = await waitWithTimeout(this.connection.send('browsingContext.navigate', {
                url: url,
                context: __classPrivateFieldGet(this, _BrowsingContext_id, "f"),
                wait: readinessState,
            }), 'Navigation', timeout);
            __classPrivateFieldSet(this, _BrowsingContext_url, result.url, "f");
            return result.navigation;
        }
        catch (error) {
            if (error instanceof ProtocolError) {
                error.message += ` at ${url}`;
            }
            else if (error instanceof TimeoutError) {
                error.message = 'Navigation timeout of ' + timeout + ' ms exceeded';
            }
            throw error;
        }
    }
    async reload(options = {}) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        await waitWithTimeout(this.connection.send('browsingContext.reload', {
            context: __classPrivateFieldGet(this, _BrowsingContext_id, "f"),
            wait: readinessState,
        }), 'Navigation', timeout);
    }
    async evaluateHandle(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _BrowsingContext_instances, "m", _BrowsingContext_evaluate).call(this, false, pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _BrowsingContext_instances, "m", _BrowsingContext_evaluate).call(this, true, pageFunction, ...args);
    }
    async setContent(html, options) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const waitUntilEvent = lifeCycleToSubscribedEvent.get(getWaitUntilSingle(waitUntil));
        await Promise.all([
            setPageContent(this, html),
            waitWithTimeout(new Promise(resolve => {
                this.once(waitUntilEvent, () => {
                    resolve();
                });
            }), waitUntilEvent, timeout),
        ]);
    }
    async content() {
        return await this.evaluate(getPageContent);
    }
    async sendCDPCommand(method, params = {}) {
        if (!__classPrivateFieldGet(this, _BrowsingContext_cdpSessionId, "f")) {
            const session = await this.connection.send('cdp.getSession', {
                context: __classPrivateFieldGet(this, _BrowsingContext_id, "f"),
            });
            const sessionId = session.result.cdpSession;
            __classPrivateFieldSet(this, _BrowsingContext_cdpSessionId, sessionId, "f");
        }
        const result = await this.connection.send('cdp.sendCommand', {
            cdpMethod: method,
            cdpParams: params,
            cdpSession: __classPrivateFieldGet(this, _BrowsingContext_cdpSessionId, "f"),
        });
        return result.result;
    }
    dispose() {
        this.removeAllListeners();
        this.connection.unregisterBrowsingContexts(__classPrivateFieldGet(this, _BrowsingContext_id, "f"));
    }
    title() {
        return this.evaluate(() => {
            return document.title;
        });
    }
}
_BrowsingContext_timeoutSettings = new WeakMap(), _BrowsingContext_id = new WeakMap(), _BrowsingContext_url = new WeakMap(), _BrowsingContext_cdpSessionId = new WeakMap(), _BrowsingContext_puppeteerUtil = new WeakMap(), _BrowsingContext_instances = new WeakSet(), _BrowsingContext_evaluate = async function _BrowsingContext_evaluate(returnByValue, pageFunction, ...args) {
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
            target: { context: __classPrivateFieldGet(this, _BrowsingContext_id, "f") },
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
            target: { context: __classPrivateFieldGet(this, _BrowsingContext_id, "f") },
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
        : getBidiHandle(this, result.result);
};
/**
 * @internal
 */
export function getBidiHandle(context, result) {
    if (result.type === 'node' || result.type === 'window') {
        return new ElementHandle(context, result);
    }
    return new JSHandle(context, result);
}
/**
 * @internal
 */
export function getWaitUntilSingle(event) {
    if (Array.isArray(event) && event.length > 1) {
        throw new Error('BiDi support only single `waitUntil` argument');
    }
    const waitUntilSingle = Array.isArray(event)
        ? event.find(lifecycle => {
            return lifecycle === 'domcontentloaded' || lifecycle === 'load';
        })
        : event;
    if (waitUntilSingle === 'networkidle0' ||
        waitUntilSingle === 'networkidle2') {
        throw new Error(`BiDi does not support 'waitUntil' ${waitUntilSingle}`);
    }
    assert(waitUntilSingle, `Invalid waitUntil option ${waitUntilSingle}`);
    return waitUntilSingle;
}
//# sourceMappingURL=BrowsingContext.js.map