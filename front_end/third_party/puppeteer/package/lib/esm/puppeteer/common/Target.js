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
var _Target_browserContext, _Target_session, _Target_targetInfo, _Target_targetManager, _Target_sessionFactory, _PageTarget_defaultViewport, _PageTarget_screenshotTaskQueue, _PageTarget_ignoreHTTPSErrors, _WorkerTarget_workerPromise;
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
 * Target represents a
 * {@link https://chromedevtools.github.io/devtools-protocol/tot/Target/ | CDP target}.
 * In CDP a target is something that can be debugged such a frame, a page or a
 * worker.
 *
 * @public
 */
export class Target {
    /**
     * @internal
     */
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory) {
        _Target_browserContext.set(this, void 0);
        _Target_session.set(this, void 0);
        _Target_targetInfo.set(this, void 0);
        _Target_targetManager.set(this, void 0);
        _Target_sessionFactory.set(this, void 0);
        /**
         * @internal
         */
        this._initializedDeferred = Deferred.create();
        /**
         * @internal
         */
        this._isClosedDeferred = Deferred.create();
        __classPrivateFieldSet(this, _Target_session, session, "f");
        __classPrivateFieldSet(this, _Target_targetManager, targetManager, "f");
        __classPrivateFieldSet(this, _Target_targetInfo, targetInfo, "f");
        __classPrivateFieldSet(this, _Target_browserContext, browserContext, "f");
        this._targetId = targetInfo.targetId;
        __classPrivateFieldSet(this, _Target_sessionFactory, sessionFactory, "f");
        this._initialize();
    }
    /**
     * @internal
     */
    _session() {
        return __classPrivateFieldGet(this, _Target_session, "f");
    }
    /**
     * @internal
     */
    _sessionFactory() {
        return __classPrivateFieldGet(this, _Target_sessionFactory, "f");
    }
    /**
     * Creates a Chrome Devtools Protocol session attached to the target.
     */
    createCDPSession() {
        return __classPrivateFieldGet(this, _Target_sessionFactory, "f").call(this, false);
    }
    /**
     * @internal
     */
    _targetManager() {
        return __classPrivateFieldGet(this, _Target_targetManager, "f");
    }
    /**
     * @internal
     */
    _getTargetInfo() {
        return __classPrivateFieldGet(this, _Target_targetInfo, "f");
    }
    /**
     * If the target is not of type `"service_worker"` or `"shared_worker"`, returns `null`.
     */
    async worker() {
        return null;
    }
    url() {
        return __classPrivateFieldGet(this, _Target_targetInfo, "f").url;
    }
    /**
     * Identifies what kind of target this is.
     *
     * @remarks
     *
     * See {@link https://developer.chrome.com/extensions/background_pages | docs} for more info about background pages.
     */
    type() {
        const type = __classPrivateFieldGet(this, _Target_targetInfo, "f").type;
        if (type === 'page' ||
            type === 'background_page' ||
            type === 'service_worker' ||
            type === 'shared_worker' ||
            type === 'browser' ||
            type === 'webview') {
            return type;
        }
        return 'other';
    }
    /**
     * Get the browser the target belongs to.
     */
    browser() {
        return __classPrivateFieldGet(this, _Target_browserContext, "f").browser();
    }
    /**
     * Get the browser context the target belongs to.
     */
    browserContext() {
        return __classPrivateFieldGet(this, _Target_browserContext, "f");
    }
    /**
     * Get the target that opened this target. Top-level targets return `null`.
     */
    opener() {
        const { openerId } = __classPrivateFieldGet(this, _Target_targetInfo, "f");
        if (!openerId) {
            return;
        }
        return this.browser()._targets.get(openerId);
    }
    /**
     * @internal
     */
    _targetInfoChanged(targetInfo) {
        __classPrivateFieldSet(this, _Target_targetInfo, targetInfo, "f");
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
    /**
     * If the target is not of type `"page"`, `"webview"` or `"background_page"`,
     * returns `null`.
     */
    async page() {
        return null;
    }
}
_Target_browserContext = new WeakMap(), _Target_session = new WeakMap(), _Target_targetInfo = new WeakMap(), _Target_targetManager = new WeakMap(), _Target_sessionFactory = new WeakMap();
/**
 * @internal
 */
export class PageTarget extends Target {
    /**
     * @internal
     */
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue) {
        super(targetInfo, session, browserContext, targetManager, sessionFactory);
        _PageTarget_defaultViewport.set(this, void 0);
        _PageTarget_screenshotTaskQueue.set(this, void 0);
        _PageTarget_ignoreHTTPSErrors.set(this, void 0);
        __classPrivateFieldSet(this, _PageTarget_ignoreHTTPSErrors, ignoreHTTPSErrors, "f");
        __classPrivateFieldSet(this, _PageTarget_defaultViewport, defaultViewport ?? undefined, "f");
        __classPrivateFieldSet(this, _PageTarget_screenshotTaskQueue, screenshotTaskQueue, "f");
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
                return CDPPage._create(client, this, __classPrivateFieldGet(this, _PageTarget_ignoreHTTPSErrors, "f"), __classPrivateFieldGet(this, _PageTarget_defaultViewport, "f") ?? null, __classPrivateFieldGet(this, _PageTarget_screenshotTaskQueue, "f"));
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
_PageTarget_defaultViewport = new WeakMap(), _PageTarget_screenshotTaskQueue = new WeakMap(), _PageTarget_ignoreHTTPSErrors = new WeakMap();
/**
 * @internal
 */
export class WorkerTarget extends Target {
    constructor() {
        super(...arguments);
        _WorkerTarget_workerPromise.set(this, void 0);
    }
    async worker() {
        if (!__classPrivateFieldGet(this, _WorkerTarget_workerPromise, "f")) {
            const session = this._session();
            // TODO(einbinder): Make workers send their console logs.
            __classPrivateFieldSet(this, _WorkerTarget_workerPromise, (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                return new WebWorker(client, this._getTargetInfo().url, () => { } /* consoleAPICalled */, () => { } /* exceptionThrown */);
            }), "f");
        }
        return __classPrivateFieldGet(this, _WorkerTarget_workerPromise, "f");
    }
}
_WorkerTarget_workerPromise = new WeakMap();
/**
 * @internal
 */
export class OtherTarget extends Target {
}
//# sourceMappingURL=Target.js.map