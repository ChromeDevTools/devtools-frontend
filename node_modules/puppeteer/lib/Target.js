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
exports.Target = void 0;
const Events_1 = require("./Events");
const Page_1 = require("./Page");
const WebWorker_1 = require("./WebWorker");
class Target {
    constructor(targetInfo, browserContext, sessionFactory, ignoreHTTPSErrors, defaultViewport) {
        this._targetInfo = targetInfo;
        this._browserContext = browserContext;
        this._targetId = targetInfo.targetId;
        this._sessionFactory = sessionFactory;
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._defaultViewport = defaultViewport;
        /** @type {?Promise<!Puppeteer.Page>} */
        this._pagePromise = null;
        /** @type {?Promise<!WebWorker>} */
        this._workerPromise = null;
        this._initializedPromise = new Promise((fulfill) => (this._initializedCallback = fulfill)).then(async (success) => {
            if (!success)
                return false;
            const opener = this.opener();
            if (!opener || !opener._pagePromise || this.type() !== 'page')
                return true;
            const openerPage = await opener._pagePromise;
            if (!openerPage.listenerCount(Events_1.Events.Page.Popup))
                return true;
            const popupPage = await this.page();
            openerPage.emit(Events_1.Events.Page.Popup, popupPage);
            return true;
        });
        this._isClosedPromise = new Promise((fulfill) => (this._closedCallback = fulfill));
        this._isInitialized =
            this._targetInfo.type !== 'page' || this._targetInfo.url !== '';
        if (this._isInitialized)
            this._initializedCallback(true);
    }
    createCDPSession() {
        return this._sessionFactory();
    }
    async page() {
        if ((this._targetInfo.type === 'page' ||
            this._targetInfo.type === 'background_page' ||
            this._targetInfo.type === 'webview') &&
            !this._pagePromise) {
            this._pagePromise = this._sessionFactory().then((client) => Page_1.Page.create(client, this, this._ignoreHTTPSErrors, this._defaultViewport));
        }
        return this._pagePromise;
    }
    async worker() {
        if (this._targetInfo.type !== 'service_worker' &&
            this._targetInfo.type !== 'shared_worker')
            return null;
        if (!this._workerPromise) {
            // TODO(einbinder): Make workers send their console logs.
            this._workerPromise = this._sessionFactory().then((client) => new WebWorker_1.WebWorker(client, this._targetInfo.url, () => { } /* consoleAPICalled */, () => { } /* exceptionThrown */));
        }
        return this._workerPromise;
    }
    url() {
        return this._targetInfo.url;
    }
    type() {
        const type = this._targetInfo.type;
        if (type === 'page' ||
            type === 'background_page' ||
            type === 'service_worker' ||
            type === 'shared_worker' ||
            type === 'browser' ||
            type === 'webview')
            return type;
        return 'other';
    }
    browser() {
        return this._browserContext.browser();
    }
    browserContext() {
        return this._browserContext;
    }
    opener() {
        const { openerId } = this._targetInfo;
        if (!openerId)
            return null;
        return this.browser()._targets.get(openerId);
    }
    _targetInfoChanged(targetInfo) {
        this._targetInfo = targetInfo;
        if (!this._isInitialized &&
            (this._targetInfo.type !== 'page' || this._targetInfo.url !== '')) {
            this._isInitialized = true;
            this._initializedCallback(true);
            return;
        }
    }
}
exports.Target = Target;
