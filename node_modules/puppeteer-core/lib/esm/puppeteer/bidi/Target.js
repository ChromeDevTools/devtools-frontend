/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Target, TargetType } from '../api/Target.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { CdpSessionWrapper } from './BrowsingContext.js';
import { BidiPage } from './Page.js';
/**
 * @internal
 */
export class BidiTarget extends Target {
    _browserContext;
    constructor(browserContext) {
        super();
        this._browserContext = browserContext;
    }
    _setBrowserContext(browserContext) {
        this._browserContext = browserContext;
    }
    asPage() {
        throw new UnsupportedOperation();
    }
    browser() {
        return this._browserContext.browser();
    }
    browserContext() {
        return this._browserContext;
    }
    opener() {
        throw new UnsupportedOperation();
    }
    createCDPSession() {
        throw new UnsupportedOperation();
    }
}
/**
 * @internal
 */
export class BiDiBrowserTarget extends Target {
    #browser;
    constructor(browser) {
        super();
        this.#browser = browser;
    }
    url() {
        return '';
    }
    type() {
        return TargetType.BROWSER;
    }
    asPage() {
        throw new UnsupportedOperation();
    }
    browser() {
        return this.#browser;
    }
    browserContext() {
        return this.#browser.defaultBrowserContext();
    }
    opener() {
        throw new UnsupportedOperation();
    }
    createCDPSession() {
        throw new UnsupportedOperation();
    }
}
/**
 * @internal
 */
export class BiDiBrowsingContextTarget extends BidiTarget {
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
        return new CdpSessionWrapper(this._browsingContext, sessionId);
    }
    type() {
        return TargetType.PAGE;
    }
}
/**
 * @internal
 */
export class BiDiPageTarget extends BiDiBrowsingContextTarget {
    #page;
    constructor(browserContext, browsingContext) {
        super(browserContext, browsingContext);
        this.#page = new BidiPage(browsingContext, browserContext, this);
    }
    async page() {
        return this.#page;
    }
    _setBrowserContext(browserContext) {
        super._setBrowserContext(browserContext);
        this.#page._setBrowserContext(browserContext);
    }
}
//# sourceMappingURL=Target.js.map