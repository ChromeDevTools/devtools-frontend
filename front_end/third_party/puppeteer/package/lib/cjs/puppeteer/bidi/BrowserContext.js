"use strict";
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiBrowserContext = void 0;
const BrowserContext_js_1 = require("../api/BrowserContext.js");
const Errors_js_1 = require("../common/Errors.js");
/**
 * @internal
 */
class BidiBrowserContext extends BrowserContext_js_1.BrowserContext {
    #browser;
    #connection;
    #defaultViewport;
    #isDefault = false;
    constructor(browser, options) {
        super();
        this.#browser = browser;
        this.#connection = this.#browser.connection;
        this.#defaultViewport = options.defaultViewport;
        this.#isDefault = options.isDefault;
    }
    targets() {
        return this.#browser.targets().filter(target => {
            return target.browserContext() === this;
        });
    }
    waitForTarget(predicate, options = {}) {
        return this.#browser.waitForTarget(target => {
            return target.browserContext() === this && predicate(target);
        }, options);
    }
    get connection() {
        return this.#connection;
    }
    async newPage() {
        const { result } = await this.#connection.send('browsingContext.create', {
            type: "tab" /* Bidi.BrowsingContext.CreateType.Tab */,
        });
        const target = this.#browser._getTargetById(result.context);
        // TODO: once BiDi has some concept matching BrowserContext, the newly
        // created contexts should get automatically assigned to the right
        // BrowserContext. For now, we assume that only explicitly created pages go
        // to the current BrowserContext. Otherwise, the contexts get assigned to
        // the default BrowserContext by the Browser.
        target._setBrowserContext(this);
        const page = await target.page();
        if (!page) {
            throw new Error('Page is not found');
        }
        if (this.#defaultViewport) {
            try {
                await page.setViewport(this.#defaultViewport);
            }
            catch {
                // No support for setViewport in Firefox.
            }
        }
        return page;
    }
    async close() {
        if (this.#isDefault) {
            throw new Error('Default context cannot be closed!');
        }
        await this.#browser._closeContext(this);
    }
    browser() {
        return this.#browser;
    }
    async pages() {
        const results = await Promise.all([...this.targets()].map(t => {
            return t.page();
        }));
        return results.filter((p) => {
            return p !== null;
        });
    }
    isIncognito() {
        return !this.#isDefault;
    }
    overridePermissions() {
        throw new Errors_js_1.UnsupportedOperation();
    }
    clearPermissionOverrides() {
        throw new Errors_js_1.UnsupportedOperation();
    }
}
exports.BidiBrowserContext = BidiBrowserContext;
//# sourceMappingURL=BrowserContext.js.map