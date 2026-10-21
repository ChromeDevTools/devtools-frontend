/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { URLPattern } from '../../third_party/urlpattern-polyfill/urlpattern-polyfill.js';
import { CDPSessionEvent } from '../api/CDPSession.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { assertSupportedUrlRestrictions } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { DisposableStack } from '../util/disposable.js';
import { CdpCDPSession } from './CdpSession.js';
import { InitializationStatus } from './Target.js';
function isPageTargetBecomingPrimary(target, newTargetInfo) {
    return Boolean(target._subtype()) && !newTargetInfo.subtype;
}
/**
 * TargetManager encapsulates all interactions with CDP targets and is
 * responsible for coordinating the configuration of targets with the rest of
 * Puppeteer. Code outside of this class should not subscribe `Target.*` events
 * and only use the TargetManager events.
 *
 * TargetManager uses the CDP's auto-attach mechanism to intercept
 * new targets and allow the rest of Puppeteer to configure listeners while
 * the target is paused.
 *
 * @internal
 */
export class TargetManager extends EventEmitter {
    #connection;
    /**
     * Keeps track of the following events: 'Target.targetCreated',
     * 'Target.targetDestroyed', 'Target.targetInfoChanged'.
     *
     * A target becomes discovered when 'Target.targetCreated' is received.
     * A target is removed from this map once 'Target.targetDestroyed' is
     * received.
     *
     * `targetFilterCallback` has no effect on this map.
     */
    #discoveredTargetsByTargetId = new Map();
    /**
     * A target is added to this map once TargetManager has created
     * a Target and attached at least once to it.
     */
    #attachedTargetsByTargetId = new Map();
    /**
     * Tracks which sessions attach to which target.
     */
    #attachedTargetsBySessionId = new Map();
    /**
     * If a target was filtered out by `targetFilterCallback`, we still receive
     * events about it from CDP, but we don't forward them to the rest of Puppeteer.
     */
    #ignoredTargets = new Set();
    #targetFilterCallback;
    #targetFactory;
    #subscriptions = new DisposableStack();
    #attachmentSubscriptions = new WeakMap();
    #initializeDeferred = Deferred.create();
    #waitForInitiallyDiscoveredTargets = true;
    #discoveryFilter = [{}];
    // IDs of tab targets detected while running the initial Target.setAutoAttach
    // request. These are the targets whose initialization we want to await for
    // before resolving puppeteer.connect() or launch() to avoid flakiness.
    // Whenever a sub-target whose parent is a tab target is attached, we remove
    // the tab target from this list. Once the list is empty, we resolve the
    // initializeDeferred.
    #targetsIdsForInit = new Set();
    // This is false until the connection-level Target.setAutoAttach request is
    // done. It indicates whethere we are running the initial auto-attach step or
    // if we are handling targets after that.
    #initialAttachDone = false;
    #blocklist = [];
    #allowlist = [];
    /**
     * All live sessions that network conditions are applied to, including
     * sessions that are not exposed via a target's `_session()` (e.g. workers,
     * manually attached targets and kept service worker sessions). Used to
     * re-apply network conditions at runtime.
     */
    #networkConditionsSessions = new Map();
    #logger;
    constructor(connection, targetFactory, targetFilterCallback, waitForInitiallyDiscoveredTargets = true, blocklist, allowlist, logger) {
        super(undefined, logger);
        if (blocklist?.length && allowlist?.length) {
            throw new Error('Cannot specify both blockList and allowList');
        }
        this.#connection = connection;
        this.#targetFilterCallback = targetFilterCallback;
        this.#targetFactory = targetFactory;
        this.#waitForInitiallyDiscoveredTargets = waitForInitiallyDiscoveredTargets;
        this.#logger = logger;
        this.#blocklist = this.#mapPatterns(blocklist);
        this.#allowlist = this.#mapPatterns(allowlist);
        const connectionEmitter = this.#subscriptions.use(new EventEmitter(this.#connection));
        connectionEmitter.on('Target.targetCreated', this.#onTargetCreated);
        connectionEmitter.on('Target.targetDestroyed', this.#onTargetDestroyed);
        connectionEmitter.on('Target.targetInfoChanged', this.#onTargetInfoChanged);
        connectionEmitter.on(CDPSessionEvent.SessionDetached, this.#onSessionDetached);
        this.#setupAttachmentListeners(this.#connection);
    }
    async initialize() {
        await this.#connection.send('Target.setDiscoverTargets', {
            discover: true,
            filter: this.#discoveryFilter,
        });
        await this.#connection.send('Target.setAutoAttach', {
            waitForDebuggerOnStart: true,
            flatten: true,
            autoAttach: true,
            filter: [
                {
                    type: 'page',
                    exclude: true,
                },
                ...this.#discoveryFilter,
            ],
        });
        this.#initialAttachDone = true;
        this.#finishInitializationIfReady();
        await this.#initializeDeferred.valueOrThrow();
    }
    addToIgnoreTarget(targetId) {
        this.#ignoredTargets.add(targetId);
    }
    getChildTargets(target) {
        return target._childTargets();
    }
    dispose() {
        this.#subscriptions.dispose();
        this.#removeAttachmentListeners(this.#connection);
    }
    getAvailableTargets() {
        return this.#attachedTargetsByTargetId;
    }
    getDiscoveredTargetInfos() {
        return this.#discoveredTargetsByTargetId;
    }
    #setupAttachmentListeners(session) {
        assert(!this.#attachmentSubscriptions.has(session));
        const subscriptions = new DisposableStack();
        const sessionEmitter = subscriptions.use(new EventEmitter(session));
        sessionEmitter.on('Target.attachedToTarget', event => {
            void this.#onAttachedToTarget(session, event);
        });
        sessionEmitter.on('Target.detachedFromTarget', event => {
            return this.#onDetachedFromTarget(session, event);
        });
        this.#attachmentSubscriptions.set(session, subscriptions);
    }
    #removeAttachmentListeners(session) {
        const subscriptions = this.#attachmentSubscriptions.get(session);
        if (subscriptions) {
            subscriptions.dispose();
            this.#attachmentSubscriptions.delete(session);
        }
    }
    #silentDetach = async (session, parentSession) => {
        await session.send('Runtime.runIfWaitingForDebugger').catch(error => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(error);
        });
        // We don't use `session.detach()` because that dispatches all commands on
        // the connection instead of the parent session.
        await parentSession
            .send('Target.detachFromTarget', {
            sessionId: session.id(),
        })
            .catch(error => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(error);
        });
    };
    #getParentTarget = (parentSession) => {
        return parentSession instanceof CdpCDPSession
            ? parentSession.target()
            : null;
    };
    #onSessionDetached = (session) => {
        this.#removeAttachmentListeners(session);
        this.#networkConditionsSessions.delete(session);
    };
    #onTargetCreated = async (event) => {
        this.#discoveredTargetsByTargetId.set(event.targetInfo.targetId, event.targetInfo);
        this.emit("targetDiscovered" /* TargetManagerEvent.TargetDiscovered */, event.targetInfo);
        // The connection is already attached to the browser target implicitly,
        // therefore, no new CDPSession is created and we have special handling
        // here.
        if (event.targetInfo.type === 'browser' && event.targetInfo.attached) {
            if (this.#attachedTargetsByTargetId.has(event.targetInfo.targetId)) {
                return;
            }
            const target = this.#targetFactory(event.targetInfo, undefined);
            target._initialize();
            this.#attachedTargetsByTargetId.set(event.targetInfo.targetId, target);
        }
    };
    #onTargetDestroyed = (event) => {
        const targetInfo = this.#discoveredTargetsByTargetId.get(event.targetId);
        this.#discoveredTargetsByTargetId.delete(event.targetId);
        this.#finishInitializationIfReady(event.targetId);
        if (targetInfo?.type === 'service_worker') {
            // Special case for service workers: report TargetGone event when
            // the worker is destroyed.
            const target = this.#attachedTargetsByTargetId.get(event.targetId);
            if (target) {
                this.emit("targetGone" /* TargetManagerEvent.TargetGone */, target);
                this.#attachedTargetsByTargetId.delete(event.targetId);
            }
        }
    };
    #onTargetInfoChanged = (event) => {
        this.#discoveredTargetsByTargetId.set(event.targetInfo.targetId, event.targetInfo);
        if (this.#ignoredTargets.has(event.targetInfo.targetId) ||
            !event.targetInfo.attached) {
            return;
        }
        const target = this.#attachedTargetsByTargetId.get(event.targetInfo.targetId);
        if (!target) {
            return;
        }
        const previousURL = target.url();
        const wasInitialized = target._initializedDeferred.value() === InitializationStatus.SUCCESS;
        if (isPageTargetBecomingPrimary(target, event.targetInfo)) {
            const session = target._session();
            assert(session, 'Target that is being activated is missing a CDPSession.');
            session.parentSession()?.emit(CDPSessionEvent.Swapped, session);
        }
        target._targetInfoChanged(event.targetInfo);
        if (wasInitialized && previousURL !== target.url()) {
            this.emit("targetChanged" /* TargetManagerEvent.TargetChanged */, {
                target,
                wasInitialized,
                previousURL,
            });
        }
    };
    #onAttachedToTarget = async (parentSession, event) => {
        const targetInfo = event.targetInfo;
        const session = this.#connection._session(event.sessionId);
        if (!session) {
            throw new Error(`Session ${event.sessionId} was not created.`);
        }
        if (!this.#connection.isAutoAttached(targetInfo.targetId)) {
            this.#networkConditionsSessions.set(session, targetInfo);
            await this.#maybeSetupNetworkConditions(session, targetInfo);
            return;
        }
        // If we connect to a browser that is already open,
        // immediately detach from any tab that is on the blocklist.
        if (!this.#initialAttachDone && !this.isUrlAllowed(targetInfo.url)) {
            await this.#silentDetach(session, parentSession);
            return;
        }
        // Special case for service workers: being attached to service workers will
        // prevent them from ever being destroyed. Therefore, when no
        // blocklist/allowlist is configured, we silently detach from service
        // workers unless the connection was manually created via `page.worker()`.
        // To determine this, we use
        // `this.#connection.isAutoAttached(targetInfo.targetId)`. In the future, we
        // should determine if a target is auto-attached or not with the help of
        // CDP.
        //
        // When a blocklist/allowlist is configured, we stay attached to every
        // service worker instead: network conditions are reset when the session
        // that set them detaches, so staying attached is what keeps the rules
        // enforced for requests the worker issues, including the ones it forwards
        // on behalf of controlled pages. Kept sessions are not released when rules
        // are cleared, so the browser never idle-terminates these service workers
        // once rules have been configured.
        if (targetInfo.type === 'service_worker') {
            if (this.#hasNetworkRules()) {
                this.#networkConditionsSessions.set(session, targetInfo);
                // The rules are applied before the worker is resumed so that requests
                // made during `install` are covered as well:
                // #maybeSetupNetworkConditions dispatches its commands synchronously,
                // so they are on the wire ahead of Runtime.runIfWaitingForDebugger.
                // They are only acknowledged once the worker runs, though, so they
                // are awaited after resuming it.
                const networkConditionsSetUp = this.#maybeSetupNetworkConditions(session, targetInfo);
                await session.send('Runtime.runIfWaitingForDebugger').catch(error => {
                    this.#logger?.(DEBUG_PREFIXES.error)?.(error);
                });
                await networkConditionsSetUp;
                // An already exposed WorkerTarget (created on the silent-detach path)
                // proceeds to #attachServiceWorkerTarget() even when its script URL is
                // now disallowed, so the target receives the kept session.
                if ((!this.isUrlAllowed(targetInfo.url) &&
                    !this.#attachedTargetsByTargetId.has(targetInfo.targetId)) ||
                    this.#ignoredTargets.has(targetInfo.targetId) ||
                    !this.#discoveredTargetsByTargetId.has(targetInfo.targetId)) {
                    return;
                }
                this.#attachServiceWorkerTarget(targetInfo, session, parentSession);
                return;
            }
            await this.#silentDetach(session, parentSession);
            if (this.#attachedTargetsByTargetId.has(targetInfo.targetId) ||
                this.#ignoredTargets.has(targetInfo.targetId) ||
                !this.#discoveredTargetsByTargetId.has(targetInfo.targetId)) {
                return;
            }
            const target = this.#targetFactory(targetInfo);
            target._initialize();
            this.#attachedTargetsByTargetId.set(targetInfo.targetId, target);
            this.emit("targetAvailable" /* TargetManagerEvent.TargetAvailable */, target);
            return;
        }
        let target = this.#attachedTargetsByTargetId.get(targetInfo.targetId);
        const isExistingTarget = target !== undefined;
        if (!target) {
            target = this.#targetFactory(targetInfo, session, parentSession instanceof CdpCDPSession ? parentSession : undefined);
        }
        const parentTarget = this.#getParentTarget(parentSession);
        if (this.#targetFilterCallback && !this.#targetFilterCallback(target)) {
            this.#ignoredTargets.add(targetInfo.targetId);
            if (parentTarget?.type() === 'tab') {
                this.#finishInitializationIfReady(parentTarget._targetId);
            }
            await this.#silentDetach(session, parentSession);
            return;
        }
        if (this.#waitForInitiallyDiscoveredTargets &&
            event.targetInfo.type === 'tab' &&
            !this.#initialAttachDone) {
            this.#targetsIdsForInit.add(event.targetInfo.targetId);
        }
        this.#setupAttachmentListeners(session);
        if (isExistingTarget) {
            session.setTarget(target);
            this.#attachedTargetsBySessionId.set(session.id(), target);
        }
        else {
            target._initialize();
            this.#attachedTargetsByTargetId.set(targetInfo.targetId, target);
            this.#attachedTargetsBySessionId.set(session.id(), target);
        }
        parentTarget?._addChildTarget(target);
        parentSession.emit(CDPSessionEvent.Ready, session);
        if (!isExistingTarget) {
            this.emit("targetAvailable" /* TargetManagerEvent.TargetAvailable */, target);
        }
        if (parentTarget?.type() === 'tab') {
            this.#finishInitializationIfReady(parentTarget._targetId);
        }
        this.#networkConditionsSessions.set(session, targetInfo);
        // The browser might be shutting down here, so we
        // ignore potential errors.
        await Promise.all([
            session.send('Target.setAutoAttach', {
                waitForDebuggerOnStart: true,
                flatten: true,
                autoAttach: true,
                filter: this.#discoveryFilter,
            }),
            this.#maybeSetupNetworkConditions(session, targetInfo),
            session.send('Runtime.runIfWaitingForDebugger'),
        ]).catch(error => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(error);
        });
    };
    /**
     * Registers a service worker session that is kept open (see the
     * blocklist/allowlist handling in {@link TargetManager.#onAttachedToTarget})
     * so that the session is visible to the manager's bookkeeping and
     * `WorkerTarget.worker()` reuses it instead of opening a second one.
     */
    #attachServiceWorkerTarget(targetInfo, session, parentSession) {
        let target = this.#attachedTargetsByTargetId.get(targetInfo.targetId);
        const isExistingTarget = target !== undefined;
        if (!target) {
            target = this.#targetFactory(targetInfo, session, parentSession instanceof CdpCDPSession ? parentSession : undefined);
        }
        this.#setupAttachmentListeners(session);
        if (isExistingTarget) {
            target._setSession(session);
        }
        else {
            target._initialize();
            this.#attachedTargetsByTargetId.set(targetInfo.targetId, target);
        }
        this.#attachedTargetsBySessionId.set(session.id(), target);
        this.#getParentTarget(parentSession)?._addChildTarget(target);
        if (!isExistingTarget) {
            this.emit("targetAvailable" /* TargetManagerEvent.TargetAvailable */, target);
        }
    }
    #finishInitializationIfReady(targetId) {
        if (targetId !== undefined) {
            this.#targetsIdsForInit.delete(targetId);
        }
        // If we are still initializing it might be that we have not learned about
        // some targets yet.
        if (!this.#initialAttachDone) {
            return;
        }
        if (this.#targetsIdsForInit.size === 0) {
            this.#initializeDeferred.resolve();
        }
    }
    #onDetachedFromTarget = (parentSession, event) => {
        const target = this.#attachedTargetsBySessionId.get(event.sessionId);
        this.#attachedTargetsBySessionId.delete(event.sessionId);
        if (!target) {
            return;
        }
        if (parentSession instanceof CdpCDPSession) {
            parentSession.target()._removeChildTarget(target);
        }
        this.#attachedTargetsByTargetId.delete(target._targetId);
        this.emit("targetGone" /* TargetManagerEvent.TargetGone */, target);
    };
    #hasNetworkRules() {
        return this.#blocklist.length > 0 || this.#allowlist.length > 0;
    }
    /**
     * Helper to validate URL against blocklist patterns
     */
    isUrlAllowed = (url) => {
        if (!this.#hasNetworkRules()) {
            return true;
        }
        // Always allow internal or setup pages
        if (!url || url === 'about:blank') {
            return true;
        }
        for (const item of this.#blocklist) {
            if (item.pattern.test(url)) {
                return false;
            }
        }
        if (this.#allowlist.length > 0) {
            for (const item of this.#allowlist) {
                if (item.pattern.test(url)) {
                    return true;
                }
            }
            return false;
        }
        return true;
    };
    async setNetworkConditions(conditions) {
        const blocklist = conditions?.blocklist ?? [];
        const allowlist = conditions?.allowlist ?? [];
        assertSupportedUrlRestrictions({
            blocklist: conditions?.blocklist,
            allowlist: conditions?.allowlist,
        });
        const wasActive = this.#hasNetworkRules();
        // Map both lists before assigning so that an invalid pattern does not
        // leave the manager in a partially updated state.
        const newBlocklist = this.#mapPatterns(blocklist);
        const newAllowlist = this.#mapPatterns(allowlist);
        this.#blocklist = newBlocklist;
        this.#allowlist = newAllowlist;
        const isActive = this.#hasNetworkRules();
        if (isActive && !wasActive) {
            await this.#attachToServiceWorkers();
        }
        if (isActive || wasActive) {
            await this.#reapplyNetworkConditions(wasActive && !isActive);
        }
    }
    async #reapplyNetworkConditions(forceClear) {
        const promises = [];
        // Iterate over all tracked sessions rather than `target._session()`, as
        // the latter is undefined for workers and targets that were not
        // auto-attached.
        for (const [session, targetInfo] of this.#networkConditionsSessions) {
            if (session.detached) {
                this.#networkConditionsSessions.delete(session);
                continue;
            }
            promises.push(this.#maybeSetupNetworkConditions(session, targetInfo, forceClear).catch(error => {
                this.#logger?.(DEBUG_PREFIXES.error)?.(error);
            }));
        }
        await Promise.all(promises);
    }
    async #attachToServiceWorkers() {
        const trackedTargetIds = new Set();
        for (const [session, targetInfo] of this.#networkConditionsSessions) {
            if (!session.detached) {
                trackedTargetIds.add(targetInfo.targetId);
            }
        }
        const promises = [];
        for (const targetInfo of this.#discoveredTargetsByTargetId.values()) {
            if (targetInfo.type !== 'service_worker' ||
                trackedTargetIds.has(targetInfo.targetId) ||
                this.#ignoredTargets.has(targetInfo.targetId)) {
                continue;
            }
            promises.push(this.#connection._createSession(targetInfo, true).catch(error => {
                this.#logger?.(DEBUG_PREFIXES.error)?.(error);
            }));
        }
        await Promise.all(promises);
    }
    #mapPatterns(rules) {
        const result = [];
        for (const rule of rules ?? []) {
            result.push({ pattern: new URLPattern(rule), rule });
        }
        return result;
    }
    /**
     * Issues the `Network.*` commands that enforce the blocklist/allowlist on
     * `session`. The commands are sent synchronously (before this function
     * returns), so callers can rely on them being dispatched ahead of any command
     * they send afterwards. The returned promise settles once the commands are
     * acknowledged; for worker targets that only happens once the worker is
     * running, so it must not be awaited before `Runtime.runIfWaitingForDebugger`.
     */
    #maybeSetupNetworkConditions = (session, targetInfo, forceClear) => {
        if (!this.#hasNetworkRules() && !forceClear) {
            return Promise.resolve();
        }
        const matchedNetworkConditions = [];
        for (const item of this.#blocklist) {
            matchedNetworkConditions.push({
                urlPattern: item.rule,
                offline: true,
                latency: 0,
                downloadThroughput: -1,
                uploadThroughput: -1,
            });
        }
        if (this.#allowlist.length > 0) {
            for (const item of this.#allowlist) {
                matchedNetworkConditions.push({
                    urlPattern: item.rule,
                    offline: false,
                    latency: 0,
                    downloadThroughput: -1,
                    uploadThroughput: -1,
                });
            }
            matchedNetworkConditions.push({
                urlPattern: '',
                offline: true,
                latency: 0,
                downloadThroughput: -1,
                uploadThroughput: -1,
            });
        }
        const needsNetwork = targetInfo.type === 'worker' ||
            targetInfo.type === 'service_worker' ||
            targetInfo.type === 'shared_worker';
        const promises = [];
        if (needsNetwork) {
            promises.push(session.send('Network.enable'));
        }
        // When clearing network conditions (lists are empty), we must explicitly pass
        // `offline: false` to force CDP to clear any previously set global offline state.
        // When an allowlist is active, we must pass `undefined` to prevent globally
        // overriding the allowlist's catch-all offline rule. When a blocklist is
        // active, we pass `true`.
        let offline = undefined;
        if (this.#blocklist.length === 0 && this.#allowlist.length === 0) {
            offline = false;
        }
        else if (this.#blocklist.length > 0) {
            offline = true;
        }
        promises.push(session.send('Network.emulateNetworkConditionsByRule', {
            offline,
            matchedNetworkConditions,
        }));
        return Promise.all(promises).catch(error => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(error);
        });
    };
}
//# sourceMappingURL=TargetManager.js.map