"use strict";
/*
 *  Copyright 2024 Google LLC.
 *  Copyright (c) Microsoft Corporation.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationTracker = exports.NavigationResult = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const Deferred_js_1 = require("../../../utils/Deferred.js");
const log_js_1 = require("../../../utils/log.js");
const time_js_1 = require("../../../utils/time.js");
const UrlHelpers_js_1 = require("../../../utils/UrlHelpers.js");
const uuid_js_1 = require("../../../utils/uuid.js");
class NavigationResult {
    eventName;
    message;
    constructor(eventName, message) {
        this.eventName = eventName;
        this.message = message;
    }
}
exports.NavigationResult = NavigationResult;
class NavigationState {
    navigationId = (0, uuid_js_1.uuidv4)();
    #browsingContextId;
    #started = false;
    #finished = new Deferred_js_1.Deferred();
    url;
    loaderId;
    #isInitial;
    #eventManager;
    #navigated = false;
    get finished() {
        return this.#finished;
    }
    constructor(url, browsingContextId, isInitial, eventManager) {
        this.#browsingContextId = browsingContextId;
        this.url = url;
        this.#isInitial = isInitial;
        this.#eventManager = eventManager;
    }
    navigationInfo() {
        return {
            context: this.#browsingContextId,
            navigation: this.navigationId,
            timestamp: (0, time_js_1.getTimestamp)(),
            url: this.url,
        };
    }
    start() {
        if (!this.#isInitial && !this.#started) {
            this.#eventManager.registerEvent({
                type: 'event',
                method: protocol_js_1.ChromiumBidi.BrowsingContext.EventNames.NavigationStarted,
                params: this.navigationInfo(),
            }, this.#browsingContextId);
        }
        this.#started = true;
    }
    #finish(navigationResult) {
        this.#started = true;
        if (!this.#isInitial &&
            !this.#finished.isFinished &&
            navigationResult.eventName !== "browsingContext.load" /* NavigationEventName.Load */) {
            this.#eventManager.registerEvent({
                type: 'event',
                method: navigationResult.eventName,
                params: this.navigationInfo(),
            }, this.#browsingContextId);
        }
        this.#finished.resolve(navigationResult);
    }
    frameNavigated() {
        this.#navigated = true;
    }
    fragmentNavigated() {
        this.#navigated = true;
        this.#finish(new NavigationResult("browsingContext.fragmentNavigated" /* NavigationEventName.FragmentNavigated */));
    }
    load() {
        this.#finish(new NavigationResult("browsingContext.load" /* NavigationEventName.Load */));
    }
    fail(message) {
        this.#finish(new NavigationResult(this.#navigated
            ? "browsingContext.navigationAborted" /* NavigationEventName.NavigationAborted */
            : "browsingContext.navigationFailed" /* NavigationEventName.NavigationFailed */, message));
    }
}
/**
 * Keeps track of navigations. Details: http://go/webdriver:bidi-navigation
 */
class NavigationTracker {
    #eventManager;
    #logger;
    #loaderIdToNavigationsMap = new Map();
    #browsingContextId;
    #currentNavigation;
    // When a new navigation is started via `BrowsingContext.navigate` with `wait` set to
    // `None`, the command result should have `navigation` value, but mapper does not have
    // it yet. This value will be set to `navigationId` after next .
    #pendingNavigation;
    // Flags if the initial navigation to `about:blank` is in progress.
    #isInitialNavigation = true;
    navigation = {
        withinDocument: new Deferred_js_1.Deferred(),
    };
    constructor(url, browsingContextId, eventManager, logger) {
        this.#browsingContextId = browsingContextId;
        this.#eventManager = eventManager;
        this.#logger = logger;
        this.#isInitialNavigation = true;
        this.#currentNavigation = new NavigationState(url, browsingContextId, (0, UrlHelpers_js_1.urlMatchesAboutBlank)(url), this.#eventManager);
    }
    /**
     * Returns current started ongoing navigation. It can be either a started pending
     * navigation, or one is already navigated.
     */
    get currentNavigationId() {
        if (this.#pendingNavigation?.loaderId !== undefined) {
            return this.#pendingNavigation.navigationId;
        }
        return this.#currentNavigation.navigationId;
    }
    /**
     * Flags if the current navigation relates to the initial to `about:blank` navigation.
     */
    get isInitialNavigation() {
        return this.#isInitialNavigation;
    }
    /**
     * Url of the last navigated navigation.
     */
    get url() {
        return this.#currentNavigation.url;
    }
    /**
     * Creates a pending navigation e.g. when navigation command is called. Required to
     * provide navigation id before the actual navigation is started. It will be used when
     * navigation started. Can be aborted, failed, fragment navigated, or became a current
     * navigation.
     */
    createPendingNavigation(url, canBeInitialNavigation = false) {
        this.#logger?.(log_js_1.LogType.debug, 'createCommandNavigation');
        this.#isInitialNavigation =
            canBeInitialNavigation &&
                this.#isInitialNavigation &&
                (0, UrlHelpers_js_1.urlMatchesAboutBlank)(url);
        this.#pendingNavigation?.fail('navigation canceled by concurrent navigation');
        const navigation = new NavigationState(url, this.#browsingContextId, this.#isInitialNavigation, this.#eventManager);
        this.#pendingNavigation = navigation;
        return navigation;
    }
    dispose() {
        this.#pendingNavigation?.fail('navigation canceled by context disposal');
        this.#currentNavigation.fail('navigation canceled by context disposal');
    }
    // Update the current url.
    onTargetInfoChanged(url) {
        this.#logger?.(log_js_1.LogType.debug, `onTargetInfoChanged ${url}`);
        this.#currentNavigation.url = url;
    }
    #getNavigationForFrameNavigated(url, loaderId) {
        if (this.#loaderIdToNavigationsMap.has(loaderId)) {
            return this.#loaderIdToNavigationsMap.get(loaderId);
        }
        if (this.#pendingNavigation !== undefined &&
            this.#pendingNavigation?.loaderId === undefined) {
            // This can be a pending navigation to `about:blank` created by a command. Use the
            // pending navigation in this case.
            return this.#pendingNavigation;
        }
        // Create a new pending navigation.
        return this.createPendingNavigation(url, true);
    }
    /**
     * @param {string} unreachableUrl indicated the navigation is actually failed.
     */
    frameNavigated(url, loaderId, unreachableUrl) {
        this.#logger?.(log_js_1.LogType.debug, `frameNavigated ${url}`);
        if (unreachableUrl !== undefined &&
            !this.#loaderIdToNavigationsMap.has(loaderId)) {
            // The navigation failed before started. Get or create pending navigation and fail
            // it.
            const navigation = this.#pendingNavigation ??
                this.createPendingNavigation(unreachableUrl, true);
            navigation.url = unreachableUrl;
            navigation.start();
            navigation.fail('the requested url is unreachable');
            return;
        }
        const navigation = this.#getNavigationForFrameNavigated(url, loaderId);
        navigation.frameNavigated();
        if (navigation !== this.#currentNavigation) {
            this.#currentNavigation.fail('navigation canceled by concurrent navigation');
        }
        navigation.url = url;
        navigation.loaderId = loaderId;
        this.#loaderIdToNavigationsMap.set(loaderId, navigation);
        navigation.start();
        this.#currentNavigation = navigation;
        if (this.#pendingNavigation === navigation) {
            this.#pendingNavigation = undefined;
        }
    }
    navigatedWithinDocument(url, navigationType) {
        this.#logger?.(log_js_1.LogType.debug, `navigatedWithinDocument ${url}, ${navigationType}`);
        // Current navigation URL should be updated.
        this.#currentNavigation.url = url;
        if (navigationType !== 'fragment') {
            // TODO: check for other navigation types, like `javascript`.
            return;
        }
        // There is no way to guaranteed match pending navigation with finished fragment
        // navigations. So assume any pending navigation without loader id is the fragment
        // one.
        const fragmentNavigation = this.#pendingNavigation !== undefined &&
            this.#pendingNavigation.loaderId === undefined
            ? this.#pendingNavigation
            : new NavigationState(url, this.#browsingContextId, false, this.#eventManager);
        // Finish ongoing navigation.
        fragmentNavigation.fragmentNavigated();
        if (fragmentNavigation === this.#pendingNavigation) {
            this.#pendingNavigation = undefined;
        }
    }
    frameRequestedNavigation(url) {
        this.#logger?.(log_js_1.LogType.debug, `Page.frameRequestedNavigation ${url}`);
        // The page is about to navigate to the url.
        this.createPendingNavigation(url, true);
    }
    /**
     * Required to mark navigation as fully complete.
     * TODO: navigation should be complete when it became the current one on
     * `Page.frameNavigated` or on navigating command finished with a new loader Id.
     */
    loadPageEvent(loaderId) {
        this.#logger?.(log_js_1.LogType.debug, 'loadPageEvent');
        // Even if it was an initial navigation, it is finished.
        this.#isInitialNavigation = false;
        this.#loaderIdToNavigationsMap.get(loaderId)?.load();
    }
    /**
     * Fail navigation due to navigation command failed.
     */
    failNavigation(navigation, errorText) {
        this.#logger?.(log_js_1.LogType.debug, 'failCommandNavigation');
        navigation.fail(errorText);
    }
    /**
     * Updates the navigation's `loaderId` and sets it as current one, if it is a
     * cross-document navigation.
     */
    navigationCommandFinished(navigation, loaderId) {
        this.#logger?.(log_js_1.LogType.debug, `finishCommandNavigation ${navigation.navigationId}, ${loaderId}`);
        if (loaderId !== undefined) {
            navigation.loaderId = loaderId;
            this.#loaderIdToNavigationsMap.set(loaderId, navigation);
        }
        if (loaderId === undefined || this.#currentNavigation === navigation) {
            // If the command's navigation is same-document or is already the current one,
            // nothing to do.
            return;
        }
        this.#currentNavigation.fail('navigation canceled by concurrent navigation');
        navigation.start();
        this.#currentNavigation = navigation;
        if (this.#pendingNavigation === navigation) {
            this.#pendingNavigation = undefined;
        }
    }
    /**
     * Emulated event, tight to `Network.requestWillBeSent`.
     */
    frameStartedNavigating(url, loaderId) {
        this.#logger?.(log_js_1.LogType.debug, `frameStartedNavigating ${url}, ${loaderId}`);
        if (this.#loaderIdToNavigationsMap.has(loaderId)) {
            // The `frameStartedNavigating` is tight to the `Network.requestWillBeSent` event
            // which can be emitted several times, e.g. in case of redirection. Nothing to do in
            // such a case.
            return;
        }
        const pendingNavigation = this.#pendingNavigation ?? this.createPendingNavigation(url, true);
        pendingNavigation.url = url;
        pendingNavigation.start();
        pendingNavigation.loaderId = loaderId;
        this.#loaderIdToNavigationsMap.set(loaderId, pendingNavigation);
    }
    /**
     * In case of `beforeunload` handler, the pending navigation should be marked as started
     * for consistency, as the `browsingContext.navigationStarted` should be emitted before
     * user prompt.
     */
    beforeunload() {
        this.#logger?.(log_js_1.LogType.debug, `beforeunload`);
        if (this.#pendingNavigation === undefined) {
            this.#logger?.(log_js_1.LogType.debugError, `Unexpectedly no pending navigation on beforeunload`);
            return;
        }
        this.#pendingNavigation.start();
    }
    /**
     * If there is a navigation with the loaderId equals to the network request id, it means
     * that the navigation failed.
     */
    networkLoadingFailed(loaderId, errorText) {
        this.#loaderIdToNavigationsMap.get(loaderId)?.fail(errorText);
    }
}
exports.NavigationTracker = NavigationTracker;
//# sourceMappingURL=NavigationTracker.js.map