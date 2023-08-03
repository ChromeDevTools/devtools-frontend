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
import { Target, TargetType } from '../api/Target.js';
import { Deferred } from '../util/Deferred.js';
import { CDPPage } from './Page.js';
import { debugError } from './util.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export var InitializationStatus;
(function (InitializationStatus) {
    InitializationStatus["SUCCESS"] = "success";
    InitializationStatus["ABORTED"] = "aborted";
})(InitializationStatus || (InitializationStatus = {}));
/**
 * @internal
 */
export class CDPTarget extends Target {
    #browserContext;
    #session;
    #targetInfo;
    #targetManager;
    #sessionFactory;
    /**
     * @internal
     */
    _initializedDeferred = Deferred.create();
    /**
     * @internal
     */
    _isClosedDeferred = Deferred.create();
    /**
     * @internal
     */
    _targetId;
    /**
     * To initialize the target for use, call initialize.
     *
     * @internal
     */
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory) {
        super();
        this.#session = session;
        this.#targetManager = targetManager;
        this.#targetInfo = targetInfo;
        this.#browserContext = browserContext;
        this._targetId = targetInfo.targetId;
        this.#sessionFactory = sessionFactory;
    }
    /**
     * @internal
     */
    _session() {
        return this.#session;
    }
    /**
     * @internal
     */
    _sessionFactory() {
        if (!this.#sessionFactory) {
            throw new Error('sessionFactory is not initialized');
        }
        return this.#sessionFactory;
    }
    createCDPSession() {
        if (!this.#sessionFactory) {
            throw new Error('sessionFactory is not initialized');
        }
        return this.#sessionFactory(false);
    }
    url() {
        return this.#targetInfo.url;
    }
    type() {
        const type = this.#targetInfo.type;
        switch (type) {
            case 'page':
                return TargetType.PAGE;
            case 'background_page':
                return TargetType.BACKGROUND_PAGE;
            case 'service_worker':
                return TargetType.SERVICE_WORKER;
            case 'shared_worker':
                return TargetType.SHARED_WORKER;
            case 'browser':
                return TargetType.BROWSER;
            case 'webview':
                return TargetType.WEBVIEW;
            default:
                return TargetType.OTHER;
        }
    }
    /**
     * @internal
     */
    _targetManager() {
        if (!this.#targetManager) {
            throw new Error('targetManager is not initialized');
        }
        return this.#targetManager;
    }
    /**
     * @internal
     */
    _getTargetInfo() {
        return this.#targetInfo;
    }
    browser() {
        if (!this.#browserContext) {
            throw new Error('browserContext is not initialised');
        }
        return this.#browserContext.browser();
    }
    browserContext() {
        if (!this.#browserContext) {
            throw new Error('browserContext is not initialised');
        }
        return this.#browserContext;
    }
    opener() {
        const { openerId } = this.#targetInfo;
        if (!openerId) {
            return;
        }
        return this.browser()._targets.get(openerId);
    }
    /**
     * @internal
     */
    _targetInfoChanged(targetInfo) {
        this.#targetInfo = targetInfo;
        this._checkIfInitialized();
    }
    /**
     * @internal
     */
    _initialize() {
        this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
    }
    /**
     * @internal
     */
    _checkIfInitialized() {
        if (!this._initializedDeferred.resolved()) {
            this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
        }
    }
}
/**
 * @internal
 */
export class PageTarget extends CDPTarget {
    #defaultViewport;
    pagePromise;
    #screenshotTaskQueue;
    #ignoreHTTPSErrors;
    /**
     * @internal
     */
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue) {
        super(targetInfo, session, browserContext, targetManager, sessionFactory);
        this.#ignoreHTTPSErrors = ignoreHTTPSErrors;
        this.#defaultViewport = defaultViewport ?? undefined;
        this.#screenshotTaskQueue = screenshotTaskQueue;
    }
    _initialize() {
        this._initializedDeferred
            .valueOrThrow()
            .then(async (result) => {
            if (result === InitializationStatus.ABORTED) {
                return;
            }
            const opener = this.opener();
            if (!(opener instanceof PageTarget)) {
                return;
            }
            if (!opener || !opener.pagePromise || this.type() !== 'page') {
                return true;
            }
            const openerPage = await opener.pagePromise;
            if (!openerPage.listenerCount("popup" /* PageEmittedEvents.Popup */)) {
                return true;
            }
            const popupPage = await this.page();
            openerPage.emit("popup" /* PageEmittedEvents.Popup */, popupPage);
            return true;
        })
            .catch(debugError);
        this._checkIfInitialized();
    }
    async page() {
        if (!this.pagePromise) {
            const session = this._session();
            this.pagePromise = (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                return CDPPage._create(client, this, this.#ignoreHTTPSErrors, this.#defaultViewport ?? null, this.#screenshotTaskQueue);
            });
        }
        return (await this.pagePromise) ?? null;
    }
    _checkIfInitialized() {
        if (this._initializedDeferred.resolved()) {
            return;
        }
        if (this._getTargetInfo().url !== '') {
            this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
        }
    }
}
/**
 * @internal
 */
export class WorkerTarget extends CDPTarget {
    #workerPromise;
    async worker() {
        if (!this.#workerPromise) {
            const session = this._session();
            // TODO(einbinder): Make workers send their console logs.
            this.#workerPromise = (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                return new WebWorker(client, this._getTargetInfo().url, () => { } /* consoleAPICalled */, () => { } /* exceptionThrown */);
            });
        }
        return this.#workerPromise;
    }
}
/**
 * @internal
 */
export class OtherTarget extends CDPTarget {
}
//# sourceMappingURL=Target.js.map