"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiDiPageTarget = exports.BiDiBrowsingContextTarget = exports.BiDiBrowserTarget = exports.BidiTarget = void 0;
const Target_js_1 = require("../api/Target.js");
const Errors_js_1 = require("../common/Errors.js");
const BrowsingContext_js_1 = require("./BrowsingContext.js");
const Page_js_1 = require("./Page.js");
/**
 * @internal
 */
class BidiTarget extends Target_js_1.Target {
    _browserContext;
    constructor(browserContext) {
        super();
        this._browserContext = browserContext;
    }
    _setBrowserContext(browserContext) {
        this._browserContext = browserContext;
    }
    asPage() {
        throw new Errors_js_1.UnsupportedOperation();
    }
    browser() {
        return this._browserContext.browser();
    }
    browserContext() {
        return this._browserContext;
    }
    opener() {
        throw new Errors_js_1.UnsupportedOperation();
    }
    createCDPSession() {
        throw new Errors_js_1.UnsupportedOperation();
    }
}
exports.BidiTarget = BidiTarget;
/**
 * @internal
 */
class BiDiBrowserTarget extends Target_js_1.Target {
    #browser;
    constructor(browser) {
        super();
        this.#browser = browser;
    }
    url() {
        return '';
    }
    type() {
        return Target_js_1.TargetType.BROWSER;
    }
    asPage() {
        throw new Errors_js_1.UnsupportedOperation();
    }
    browser() {
        return this.#browser;
    }
    browserContext() {
        return this.#browser.defaultBrowserContext();
    }
    opener() {
        throw new Errors_js_1.UnsupportedOperation();
    }
    createCDPSession() {
        throw new Errors_js_1.UnsupportedOperation();
    }
}
exports.BiDiBrowserTarget = BiDiBrowserTarget;
/**
 * @internal
 */
class BiDiBrowsingContextTarget extends BidiTarget {
    _browsingContext;
    constructor(browserContext, browsingContext) {
        super(browserContext);
        this._browsingContext = browsingContext;
    }
    url() {
        return this._browsingContext.url;
    }
    async createCDPSession() {
        const { sessionId } = await this._browsingContext.cdpSession.send('Target.attachToTarget', {
            targetId: this._browsingContext.id,
            flatten: true,
        });
        return new BrowsingContext_js_1.CdpSessionWrapper(this._browsingContext, sessionId);
    }
    type() {
        return Target_js_1.TargetType.PAGE;
    }
}
exports.BiDiBrowsingContextTarget = BiDiBrowsingContextTarget;
/**
 * @internal
 */
class BiDiPageTarget extends BiDiBrowsingContextTarget {
    #page;
    constructor(browserContext, browsingContext) {
        super(browserContext, browsingContext);
        this.#page = new Page_js_1.BidiPage(browsingContext, browserContext, this);
    }
    async page() {
        return this.#page;
    }
    _setBrowserContext(browserContext) {
        super._setBrowserContext(browserContext);
        this.#page._setBrowserContext(browserContext);
    }
}
exports.BiDiPageTarget = BiDiPageTarget;
//# sourceMappingURL=Target.js.map