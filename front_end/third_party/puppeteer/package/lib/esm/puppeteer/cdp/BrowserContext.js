/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        function next() {
            while (env.stack.length) {
                var rec = env.stack.pop();
                try {
                    var result = rec.dispose && rec.dispose.call(rec.value);
                    if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                catch (e) {
                    fail(e);
                }
            }
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { WEB_PERMISSION_TO_PROTOCOL_PERMISSION, } from '../api/Browser.js';
import { BrowserContext } from '../api/BrowserContext.js';
import { assert } from '../util/assert.js';
/**
 * @internal
 */
export class CdpBrowserContext extends BrowserContext {
    #connection;
    #browser;
    #id;
    constructor(connection, browser, contextId) {
        super();
        this.#connection = connection;
        this.#browser = browser;
        this.#id = contextId;
    }
    get id() {
        return this.#id;
    }
    targets() {
        return this.#browser.targets().filter(target => {
            return target.browserContext() === this;
        });
    }
    async pages() {
        const pages = await Promise.all(this.targets()
            .filter(target => {
            return (target.type() === 'page' ||
                (target.type() === 'other' &&
                    this.#browser._getIsPageTargetCallback()?.(target)));
        })
            .map(target => {
            return target.page();
        }));
        return pages.filter((page) => {
            return !!page;
        });
    }
    isIncognito() {
        return !!this.#id;
    }
    async overridePermissions(origin, permissions) {
        const protocolPermissions = permissions.map(permission => {
            const protocolPermission = WEB_PERMISSION_TO_PROTOCOL_PERMISSION.get(permission);
            if (!protocolPermission) {
                throw new Error('Unknown permission: ' + permission);
            }
            return protocolPermission;
        });
        await this.#connection.send('Browser.grantPermissions', {
            origin,
            browserContextId: this.#id || undefined,
            permissions: protocolPermissions,
        });
    }
    async clearPermissionOverrides() {
        await this.#connection.send('Browser.resetPermissions', {
            browserContextId: this.#id || undefined,
        });
    }
    async newPage() {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const _guard = __addDisposableResource(env_1, await this.waitForScreenshotOperations(), false);
            return await this.#browser._createPageInContext(this.#id);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    browser() {
        return this.#browser;
    }
    async close() {
        assert(this.#id, 'Non-incognito profiles cannot be closed!');
        await this.#browser._disposeContext(this.#id);
    }
}
//# sourceMappingURL=BrowserContext.js.map