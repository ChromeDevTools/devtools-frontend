"use strict";
/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserContext = void 0;
const EventEmitter_js_1 = require("../common/EventEmitter.js");
const util_js_1 = require("../common/util.js");
const disposable_js_1 = require("../util/disposable.js");
/**
 * {@link BrowserContext} represents individual sessions within a
 * {@link Browser | browser}.
 *
 * When a {@link Browser | browser} is launched, it has a single
 * {@link BrowserContext | browser context} by default. Others can be created
 * using {@link Browser.createIncognitoBrowserContext}.
 *
 * {@link BrowserContext} {@link EventEmitter | emits} various events which are
 * documented in the {@link BrowserContextEvent} enum.
 *
 * If a {@link Page | page} opens another {@link Page | page}, e.g. using
 * `window.open`, the popup will belong to the parent {@link Page.browserContext
 * | page's browser context}.
 *
 * @example Creating an incognito {@link BrowserContext | browser context}:
 *
 * ```ts
 * // Create a new incognito browser context
 * const context = await browser.createIncognitoBrowserContext();
 * // Create a new page inside context.
 * const page = await context.newPage();
 * // ... do stuff with page ...
 * await page.goto('https://example.com');
 * // Dispose context once it's no longer needed.
 * await context.close();
 * ```
 *
 * @public
 */
class BrowserContext extends EventEmitter_js_1.EventEmitter {
    /**
     * @internal
     */
    constructor() {
        super();
    }
    /**
     * Whether this {@link BrowserContext | browser context} is closed.
     */
    get closed() {
        return !this.browser().browserContexts().includes(this);
    }
    /**
     * Identifier for this {@link BrowserContext | browser context}.
     */
    get id() {
        return undefined;
    }
    /** @internal */
    [disposable_js_1.disposeSymbol]() {
        return void this.close().catch(util_js_1.debugError);
    }
    /** @internal */
    [disposable_js_1.asyncDisposeSymbol]() {
        return this.close();
    }
}
exports.BrowserContext = BrowserContext;
//# sourceMappingURL=BrowserContext.js.map