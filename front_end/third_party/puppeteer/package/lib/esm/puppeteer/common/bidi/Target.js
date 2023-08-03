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
import { Target, TargetType } from '../../api/Target.js';
import { CDPSessionWrapper } from './BrowsingContext.js';
import { Page } from './Page.js';
export class BiDiTarget extends Target {
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
/**
 * @internal
 */
export class BiDiBrowserTarget extends BiDiTarget {
    url() {
        return '';
    }
    type() {
        return TargetType.BROWSER;
    }
}
/**
 * @internal
 */
export class BiDiBrowsingContextTarget extends BiDiTarget {
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
        return new CDPSessionWrapper(this._browsingContext, sessionId);
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
        this.#page = new Page(browsingContext, browserContext);
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