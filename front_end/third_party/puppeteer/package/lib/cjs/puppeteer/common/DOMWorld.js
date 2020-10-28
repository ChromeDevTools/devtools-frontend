"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMWorld = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const LifecycleWatcher_js_1 = require("./LifecycleWatcher.js");
const Errors_js_1 = require("./Errors.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
const environment_js_1 = require("../environment.js");
/**
 * @internal
 */
class DOMWorld {
    constructor(frameManager, frame, timeoutSettings) {
        this._documentPromise = null;
        this._contextPromise = null;
        this._contextResolveCallback = null;
        this._detached = false;
        /**
         * internal
         */
        this._waitTasks = new Set();
        this._frameManager = frameManager;
        this._frame = frame;
        this._timeoutSettings = timeoutSettings;
        this._setContext(null);
    }
    frame() {
        return this._frame;
    }
    _setContext(context) {
        if (context) {
            this._contextResolveCallback.call(null, context);
            this._contextResolveCallback = null;
            for (const waitTask of this._waitTasks)
                waitTask.rerun();
        }
        else {
            this._documentPromise = null;
            this._contextPromise = new Promise((fulfill) => {
                this._contextResolveCallback = fulfill;
            });
        }
    }
    _hasContext() {
        return !this._contextResolveCallback;
    }
    _detach() {
        this._detached = true;
        for (const waitTask of this._waitTasks)
            waitTask.terminate(new Error('waitForFunction failed: frame got detached.'));
    }
    executionContext() {
        if (this._detached)
            throw new Error(`Execution Context is not available in detached frame "${this._frame.url()}" (are you trying to evaluate?)`);
        return this._contextPromise;
    }
    async evaluateHandle(pageFunction, ...args) {
        const context = await this.executionContext();
        return context.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        const context = await this.executionContext();
        return context.evaluate(pageFunction, ...args);
    }
    async $(selector) {
        const document = await this._document();
        const value = await document.$(selector);
        return value;
    }
    async _document() {
        if (this._documentPromise)
            return this._documentPromise;
        this._documentPromise = this.executionContext().then(async (context) => {
            const document = await context.evaluateHandle('document');
            return document.asElement();
        });
        return this._documentPromise;
    }
    async $x(expression) {
        const document = await this._document();
        const value = await document.$x(expression);
        return value;
    }
    async $eval(selector, pageFunction, ...args) {
        const document = await this._document();
        return document.$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        const document = await this._document();
        const value = await document.$$eval(selector, pageFunction, ...args);
        return value;
    }
    async $$(selector) {
        const document = await this._document();
        const value = await document.$$(selector);
        return value;
    }
    async content() {
        return await this.evaluate(() => {
            let retVal = '';
            if (document.doctype)
                retVal = new XMLSerializer().serializeToString(document.doctype);
            if (document.documentElement)
                retVal += document.documentElement.outerHTML;
            return retVal;
        });
    }
    async setContent(html, options = {}) {
        const { waitUntil = ['load'], timeout = this._timeoutSettings.navigationTimeout(), } = options;
        // We rely upon the fact that document.open() will reset frame lifecycle with "init"
        // lifecycle event. @see https://crrev.com/608658
        await this.evaluate((html) => {
            document.open();
            document.write(html);
            document.close();
        }, html);
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager, this._frame, waitUntil, timeout);
        const error = await Promise.race([
            watcher.timeoutOrTerminationPromise(),
            watcher.lifecyclePromise(),
        ]);
        watcher.dispose();
        if (error)
            throw error;
    }
    /**
     * Adds a script tag into the current context.
     *
     * @remarks
     *
     * You can pass a URL, filepath or string of contents. Note that when running Puppeteer
     * in a browser environment you cannot pass a filepath and should use either
     * `url` or `content`.
     */
    async addScriptTag(options) {
        const { url = null, path = null, content = null, type = '' } = options;
        if (url !== null) {
            try {
                const context = await this.executionContext();
                return (await context.evaluateHandle(addScriptUrl, url, type)).asElement();
            }
            catch (error) {
                throw new Error(`Loading script from ${url} failed`);
            }
        }
        if (path !== null) {
            if (!environment_js_1.isNode) {
                throw new Error('Cannot pass a filepath to addScriptTag in the browser environment.');
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fs = require('fs');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { promisify } = require('util');
            const readFileAsync = promisify(fs.readFile);
            let contents = await readFileAsync(path, 'utf8');
            contents += '//# sourceURL=' + path.replace(/\n/g, '');
            const context = await this.executionContext();
            return (await context.evaluateHandle(addScriptContent, contents, type)).asElement();
        }
        if (content !== null) {
            const context = await this.executionContext();
            return (await context.evaluateHandle(addScriptContent, content, type)).asElement();
        }
        throw new Error('Provide an object with a `url`, `path` or `content` property');
        async function addScriptUrl(url, type) {
            const script = document.createElement('script');
            script.src = url;
            if (type)
                script.type = type;
            const promise = new Promise((res, rej) => {
                script.onload = res;
                script.onerror = rej;
            });
            document.head.appendChild(script);
            await promise;
            return script;
        }
        function addScriptContent(content, type = 'text/javascript') {
            const script = document.createElement('script');
            script.type = type;
            script.text = content;
            let error = null;
            script.onerror = (e) => (error = e);
            document.head.appendChild(script);
            if (error)
                throw error;
            return script;
        }
    }
    /**
     * Adds a style tag into the current context.
     *
     * @remarks
     *
     * You can pass a URL, filepath or string of contents. Note that when running Puppeteer
     * in a browser environment you cannot pass a filepath and should use either
     * `url` or `content`.
     *
     */
    async addStyleTag(options) {
        const { url = null, path = null, content = null } = options;
        if (url !== null) {
            try {
                const context = await this.executionContext();
                return (await context.evaluateHandle(addStyleUrl, url)).asElement();
            }
            catch (error) {
                throw new Error(`Loading style from ${url} failed`);
            }
        }
        if (path !== null) {
            if (!environment_js_1.isNode) {
                throw new Error('Cannot pass a filepath to addStyleTag in the browser environment.');
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fs = require('fs');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { promisify } = require('util');
            const readFileAsync = promisify(fs.readFile);
            let contents = await readFileAsync(path, 'utf8');
            contents += '/*# sourceURL=' + path.replace(/\n/g, '') + '*/';
            const context = await this.executionContext();
            return (await context.evaluateHandle(addStyleContent, contents)).asElement();
        }
        if (content !== null) {
            const context = await this.executionContext();
            return (await context.evaluateHandle(addStyleContent, content)).asElement();
        }
        throw new Error('Provide an object with a `url`, `path` or `content` property');
        async function addStyleUrl(url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            const promise = new Promise((res, rej) => {
                link.onload = res;
                link.onerror = rej;
            });
            document.head.appendChild(link);
            await promise;
            return link;
        }
        async function addStyleContent(content) {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(content));
            const promise = new Promise((res, rej) => {
                style.onload = res;
                style.onerror = rej;
            });
            document.head.appendChild(style);
            await promise;
            return style;
        }
    }
    async click(selector, options) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        await handle.click(options);
        await handle.dispose();
    }
    async focus(selector) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        await handle.focus();
        await handle.dispose();
    }
    async hover(selector) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        await handle.hover();
        await handle.dispose();
    }
    async select(selector, ...values) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        const result = await handle.select(...values);
        await handle.dispose();
        return result;
    }
    async tap(selector) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        await handle.tap();
        await handle.dispose();
    }
    async type(selector, text, options) {
        const handle = await this.$(selector);
        assert_js_1.assert(handle, 'No node found for selector: ' + selector);
        await handle.type(text, options);
        await handle.dispose();
    }
    waitForSelector(selector, options) {
        return this._waitForSelectorOrXPath(selector, false, options);
    }
    waitForXPath(xpath, options) {
        return this._waitForSelectorOrXPath(xpath, true, options);
    }
    waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = this._timeoutSettings.timeout(), } = options;
        return new WaitTask(this, pageFunction, undefined, 'function', polling, timeout, ...args).promise;
    }
    async title() {
        return this.evaluate(() => document.title);
    }
    async _waitForSelectorOrXPath(selectorOrXPath, isXPath, options = {}) {
        const { visible: waitForVisible = false, hidden: waitForHidden = false, timeout = this._timeoutSettings.timeout(), } = options;
        const polling = waitForVisible || waitForHidden ? 'raf' : 'mutation';
        const title = `${isXPath ? 'XPath' : 'selector'} "${selectorOrXPath}"${waitForHidden ? ' to be hidden' : ''}`;
        const { updatedSelector, queryHandler } = QueryHandler_js_1.getQueryHandlerAndSelector(selectorOrXPath);
        const waitTask = new WaitTask(this, predicate, queryHandler.queryOne, title, polling, timeout, updatedSelector, isXPath, waitForVisible, waitForHidden);
        const handle = await waitTask.promise;
        if (!handle.asElement()) {
            await handle.dispose();
            return null;
        }
        return handle.asElement();
        function predicate(selectorOrXPath, isXPath, waitForVisible, waitForHidden) {
            const node = isXPath
                ? document.evaluate(selectorOrXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
                : predicateQueryHandler
                    ? predicateQueryHandler(document, selectorOrXPath)
                    : document.querySelector(selectorOrXPath);
            if (!node)
                return waitForHidden;
            if (!waitForVisible && !waitForHidden)
                return node;
            const element = node.nodeType === Node.TEXT_NODE
                ? node.parentElement
                : node;
            const style = window.getComputedStyle(element);
            const isVisible = style && style.visibility !== 'hidden' && hasVisibleBoundingBox();
            const success = waitForVisible === isVisible || waitForHidden === !isVisible;
            return success ? node : null;
            function hasVisibleBoundingBox() {
                const rect = element.getBoundingClientRect();
                return !!(rect.top || rect.bottom || rect.width || rect.height);
            }
        }
    }
}
exports.DOMWorld = DOMWorld;
class WaitTask {
    constructor(domWorld, predicateBody, predicateQueryHandlerBody, title, polling, timeout, ...args) {
        this._runCount = 0;
        this._terminated = false;
        if (helper_js_1.helper.isString(polling))
            assert_js_1.assert(polling === 'raf' || polling === 'mutation', 'Unknown polling option: ' + polling);
        else if (helper_js_1.helper.isNumber(polling))
            assert_js_1.assert(polling > 0, 'Cannot poll with non-positive interval: ' + polling);
        else
            throw new Error('Unknown polling options: ' + polling);
        function getPredicateBody(predicateBody, predicateQueryHandlerBody) {
            if (helper_js_1.helper.isString(predicateBody))
                return `return (${predicateBody});`;
            if (predicateQueryHandlerBody) {
                return `
          return (function wrapper(args) {
            const predicateQueryHandler = ${predicateQueryHandlerBody};
            return (${predicateBody})(...args);
          })(args);`;
            }
            return `return (${predicateBody})(...args);`;
        }
        this._domWorld = domWorld;
        this._polling = polling;
        this._timeout = timeout;
        this._predicateBody = getPredicateBody(predicateBody, predicateQueryHandlerBody);
        this._args = args;
        this._runCount = 0;
        domWorld._waitTasks.add(this);
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        // Since page navigation requires us to re-install the pageScript, we should track
        // timeout on our end.
        if (timeout) {
            const timeoutError = new Errors_js_1.TimeoutError(`waiting for ${title} failed: timeout ${timeout}ms exceeded`);
            this._timeoutTimer = setTimeout(() => this.terminate(timeoutError), timeout);
        }
        this.rerun();
    }
    terminate(error) {
        this._terminated = true;
        this._reject(error);
        this._cleanup();
    }
    async rerun() {
        const runCount = ++this._runCount;
        /** @type {?JSHandle} */
        let success = null;
        let error = null;
        try {
            success = await (await this._domWorld.executionContext()).evaluateHandle(waitForPredicatePageFunction, this._predicateBody, this._polling, this._timeout, ...this._args);
        }
        catch (error_) {
            error = error_;
        }
        if (this._terminated || runCount !== this._runCount) {
            if (success)
                await success.dispose();
            return;
        }
        // Ignore timeouts in pageScript - we track timeouts ourselves.
        // If the frame's execution context has already changed, `frame.evaluate` will
        // throw an error - ignore this predicate run altogether.
        if (!error &&
            (await this._domWorld.evaluate((s) => !s, success).catch(() => true))) {
            await success.dispose();
            return;
        }
        // When the page is navigated, the promise is rejected.
        // We will try again in the new execution context.
        if (error && error.message.includes('Execution context was destroyed'))
            return;
        // We could have tried to evaluate in a context which was already
        // destroyed.
        if (error &&
            error.message.includes('Cannot find context with specified id'))
            return;
        if (error)
            this._reject(error);
        else
            this._resolve(success);
        this._cleanup();
    }
    _cleanup() {
        clearTimeout(this._timeoutTimer);
        this._domWorld._waitTasks.delete(this);
    }
}
async function waitForPredicatePageFunction(predicateBody, polling, timeout, ...args) {
    const predicate = new Function('...args', predicateBody);
    let timedOut = false;
    if (timeout)
        setTimeout(() => (timedOut = true), timeout);
    if (polling === 'raf')
        return await pollRaf();
    if (polling === 'mutation')
        return await pollMutation();
    if (typeof polling === 'number')
        return await pollInterval(polling);
    /**
     * @returns {!Promise<*>}
     */
    async function pollMutation() {
        const success = await predicate(...args);
        if (success)
            return Promise.resolve(success);
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        const observer = new MutationObserver(async () => {
            if (timedOut) {
                observer.disconnect();
                fulfill();
            }
            const success = await predicate(...args);
            if (success) {
                observer.disconnect();
                fulfill(success);
            }
        });
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
        });
        return result;
    }
    async function pollRaf() {
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        await onRaf();
        return result;
        async function onRaf() {
            if (timedOut) {
                fulfill();
                return;
            }
            const success = await predicate(...args);
            if (success)
                fulfill(success);
            else
                requestAnimationFrame(onRaf);
        }
    }
    async function pollInterval(pollInterval) {
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        await onTimeout();
        return result;
        async function onTimeout() {
            if (timedOut) {
                fulfill();
                return;
            }
            const success = await predicate(...args);
            if (success)
                fulfill(success);
            else
                setTimeout(onTimeout, pollInterval);
        }
    }
}
