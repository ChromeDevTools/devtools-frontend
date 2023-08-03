"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
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
exports.BiDiPageTarget = exports.BiDiBrowsingContextTarget = exports.BiDiBrowserTarget = exports.BiDiTarget = void 0;
const Target_js_1 = require("../../api/Target.js");
const BrowsingContext_js_1 = require("./BrowsingContext.js");
const Page_js_1 = require("./Page.js");
class BiDiTarget extends Target_js_1.Target {
    _browserContext;
    constructor(browserContext) {
        super();
        this._browserContext = browserContext;
    }
    async worker() {
        return null;
    }
    browser() {
        return this._browserContext.browser();
    }
    browserContext() {
        return this._browserContext;
    }
    opener() {
        throw new Error('Not implemented');
    }
    _setBrowserContext(browserContext) {
        this._browserContext = browserContext;
    }
}
exports.BiDiTarget = BiDiTarget;
/**
 * @internal
 */
class BiDiBrowserTarget extends BiDiTarget {
    url() {
        return '';
    }
    type() {
        return Target_js_1.TargetType.BROWSER;
    }
}
exports.BiDiBrowserTarget = BiDiBrowserTarget;
/**
 * @internal
 */
class BiDiBrowsingContextTarget extends BiDiTarget {
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
        return new BrowsingContext_js_1.CDPSessionWrapper(this._browsingContext, sessionId);
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
        this.#page = new Page_js_1.Page(browsingContext, browserContext);
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