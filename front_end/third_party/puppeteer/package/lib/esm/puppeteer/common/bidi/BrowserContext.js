/**
 * Copyright 2022 Google Inc. All rights reserved.
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
var _BrowserContext_instances, _BrowserContext_browser, _BrowserContext_connection, _BrowserContext_defaultViewport, _BrowserContext_pages, _BrowserContext_onContextDestroyedBind, _BrowserContext_init, _BrowserContext_isDefault, _BrowserContext_getTree, _BrowserContext_onContextDestroyed;
import { BrowserContext as BrowserContextBase } from '../../api/BrowserContext.js';
import { Deferred } from '../../util/Deferred.js';
import { Page } from './Page.js';
import { debugError } from './utils.js';
/**
 * @internal
 */
export class BrowserContext extends BrowserContextBase {
    constructor(browser, options) {
        super();
        _BrowserContext_instances.add(this);
        _BrowserContext_browser.set(this, void 0);
        _BrowserContext_connection.set(this, void 0);
        _BrowserContext_defaultViewport.set(this, void 0);
        _BrowserContext_pages.set(this, new Map());
        _BrowserContext_onContextDestroyedBind.set(this, __classPrivateFieldGet(this, _BrowserContext_instances, "m", _BrowserContext_onContextDestroyed).bind(this));
        _BrowserContext_init.set(this, Deferred.create());
        _BrowserContext_isDefault.set(this, false);
        __classPrivateFieldSet(this, _BrowserContext_browser, browser, "f");
        __classPrivateFieldSet(this, _BrowserContext_connection, __classPrivateFieldGet(this, _BrowserContext_browser, "f").connection, "f");
        __classPrivateFieldSet(this, _BrowserContext_defaultViewport, options.defaultViewport, "f");
        __classPrivateFieldGet(this, _BrowserContext_connection, "f").on('browsingContext.contextDestroyed', __classPrivateFieldGet(this, _BrowserContext_onContextDestroyedBind, "f"));
        __classPrivateFieldSet(this, _BrowserContext_isDefault, options.isDefault, "f");
        __classPrivateFieldGet(this, _BrowserContext_instances, "m", _BrowserContext_getTree).call(this).catch(debugError);
    }
    get connection() {
        return __classPrivateFieldGet(this, _BrowserContext_connection, "f");
    }
    async newPage() {
        await __classPrivateFieldGet(this, _BrowserContext_init, "f").valueOrThrow();
        const { result } = await __classPrivateFieldGet(this, _BrowserContext_connection, "f").send('browsingContext.create', {
            type: 'tab',
        });
        const page = new Page(this, {
            context: result.context,
            children: [],
        });
        if (__classPrivateFieldGet(this, _BrowserContext_defaultViewport, "f")) {
            try {
                await page.setViewport(__classPrivateFieldGet(this, _BrowserContext_defaultViewport, "f"));
            }
            catch {
                // No support for setViewport in Firefox.
            }
        }
        __classPrivateFieldGet(this, _BrowserContext_pages, "f").set(result.context, page);
        return page;
    }
    async close() {
        await __classPrivateFieldGet(this, _BrowserContext_init, "f").valueOrThrow();
        if (__classPrivateFieldGet(this, _BrowserContext_isDefault, "f")) {
            throw new Error('Default context cannot be closed!');
        }
        for (const page of __classPrivateFieldGet(this, _BrowserContext_pages, "f").values()) {
            await page?.close().catch(error => {
                debugError(error);
            });
        }
        __classPrivateFieldGet(this, _BrowserContext_pages, "f").clear();
    }
    browser() {
        return __classPrivateFieldGet(this, _BrowserContext_browser, "f");
    }
    async pages() {
        await __classPrivateFieldGet(this, _BrowserContext_init, "f").valueOrThrow();
        return [...__classPrivateFieldGet(this, _BrowserContext_pages, "f").values()];
    }
}
_BrowserContext_browser = new WeakMap(), _BrowserContext_connection = new WeakMap(), _BrowserContext_defaultViewport = new WeakMap(), _BrowserContext_pages = new WeakMap(), _BrowserContext_onContextDestroyedBind = new WeakMap(), _BrowserContext_init = new WeakMap(), _BrowserContext_isDefault = new WeakMap(), _BrowserContext_instances = new WeakSet(), _BrowserContext_getTree = async function _BrowserContext_getTree() {
    if (!__classPrivateFieldGet(this, _BrowserContext_isDefault, "f")) {
        __classPrivateFieldGet(this, _BrowserContext_init, "f").resolve();
        return;
    }
    try {
        const { result } = await __classPrivateFieldGet(this, _BrowserContext_connection, "f").send('browsingContext.getTree', {});
        for (const context of result.contexts) {
            const page = new Page(this, context);
            __classPrivateFieldGet(this, _BrowserContext_pages, "f").set(context.context, page);
        }
        __classPrivateFieldGet(this, _BrowserContext_init, "f").resolve();
    }
    catch (err) {
        __classPrivateFieldGet(this, _BrowserContext_init, "f").reject(err);
    }
}, _BrowserContext_onContextDestroyed = async function _BrowserContext_onContextDestroyed(event) {
    const page = __classPrivateFieldGet(this, _BrowserContext_pages, "f").get(event.context);
    await page?.close().catch(error => {
        debugError(error);
    });
    __classPrivateFieldGet(this, _BrowserContext_pages, "f").delete(event.context);
};
//# sourceMappingURL=BrowserContext.js.map