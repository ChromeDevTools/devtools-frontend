// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import { assertNotNullOrUndefined } from '../platform/platform.js';
import * as Root from '../root/root.js';
import { SDKModel } from './SDKModel.js';
import { Target, Type as TargetType } from './Target.js';
let targetManagerInstance;
export class TargetManager extends Common.ObjectWrapper.ObjectWrapper {
    #targets;
    #observers;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    #modelListeners;
    #modelObservers;
    #scopedObservers;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    #isSuspended;
    #browserTarget;
    #scopeTarget;
    #defaultScopeSet;
    #scopeChangeListeners;
    constructor() {
        super();
        this.#targets = new Set();
        this.#observers = new Set();
        this.#modelListeners = new Platform.MapUtilities.Multimap();
        this.#modelObservers = new Platform.MapUtilities.Multimap();
        this.#isSuspended = false;
        this.#browserTarget = null;
        this.#scopeTarget = null;
        this.#scopedObservers = new WeakSet();
        this.#defaultScopeSet = false;
        this.#scopeChangeListeners = new Set();
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!targetManagerInstance || forceNew) {
            targetManagerInstance = new TargetManager();
        }
        return targetManagerInstance;
    }
    static removeInstance() {
        targetManagerInstance = undefined;
    }
    onInspectedURLChange(target) {
        if (target !== this.#scopeTarget) {
            return;
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(target.inspectedURL() || Platform.DevToolsPath.EmptyUrlString);
        this.dispatchEventToListeners("InspectedURLChanged" /* Events.INSPECTED_URL_CHANGED */, target);
    }
    onNameChange(target) {
        this.dispatchEventToListeners("NameChanged" /* Events.NAME_CHANGED */, target);
    }
    async suspendAllTargets(reason) {
        if (this.#isSuspended) {
            return;
        }
        this.#isSuspended = true;
        this.dispatchEventToListeners("SuspendStateChanged" /* Events.SUSPEND_STATE_CHANGED */);
        const suspendPromises = Array.from(this.#targets.values(), target => target.suspend(reason));
        await Promise.all(suspendPromises);
    }
    async resumeAllTargets() {
        if (!this.#isSuspended) {
            return;
        }
        this.#isSuspended = false;
        this.dispatchEventToListeners("SuspendStateChanged" /* Events.SUSPEND_STATE_CHANGED */);
        const resumePromises = Array.from(this.#targets.values(), target => target.resume());
        await Promise.all(resumePromises);
    }
    allTargetsSuspended() {
        return this.#isSuspended;
    }
    models(modelClass, opts) {
        const result = [];
        for (const target of this.#targets) {
            if (opts?.scoped && !this.isInScope(target)) {
                continue;
            }
            const model = target.model(modelClass);
            if (!model) {
                continue;
            }
            result.push(model);
        }
        return result;
    }
    inspectedURL() {
        const mainTarget = this.primaryPageTarget();
        return mainTarget ? mainTarget.inspectedURL() : '';
    }
    observeModels(modelClass, observer, opts) {
        const models = this.models(modelClass, opts);
        this.#modelObservers.set(modelClass, observer);
        if (opts?.scoped) {
            this.#scopedObservers.add(observer);
        }
        for (const model of models) {
            observer.modelAdded(model);
        }
    }
    unobserveModels(modelClass, observer) {
        this.#modelObservers.delete(modelClass, observer);
        this.#scopedObservers.delete(observer);
    }
    modelAdded(modelClass, model, inScope) {
        for (const observer of this.#modelObservers.get(modelClass).values()) {
            if (!this.#scopedObservers.has(observer) || inScope) {
                observer.modelAdded(model);
            }
        }
    }
    modelRemoved(modelClass, model, inScope) {
        for (const observer of this.#modelObservers.get(modelClass).values()) {
            if (!this.#scopedObservers.has(observer) || inScope) {
                observer.modelRemoved(model);
            }
        }
    }
    addModelListener(modelClass, eventType, listener, thisObject, opts) {
        const wrappedListener = (event) => {
            if (!opts?.scoped || this.isInScope(event)) {
                listener.call(thisObject, event);
            }
        };
        for (const model of this.models(modelClass)) {
            model.addEventListener(eventType, wrappedListener);
        }
        this.#modelListeners.set(eventType, { modelClass, thisObject, listener, wrappedListener });
    }
    removeModelListener(modelClass, eventType, listener, thisObject) {
        if (!this.#modelListeners.has(eventType)) {
            return;
        }
        let wrappedListener = null;
        for (const info of this.#modelListeners.get(eventType)) {
            if (info.modelClass === modelClass && info.listener === listener && info.thisObject === thisObject) {
                wrappedListener = info.wrappedListener;
                this.#modelListeners.delete(eventType, info);
            }
        }
        if (wrappedListener) {
            for (const model of this.models(modelClass)) {
                model.removeEventListener(eventType, wrappedListener);
            }
        }
    }
    observeTargets(targetObserver, opts) {
        if (this.#observers.has(targetObserver)) {
            throw new Error('Observer can only be registered once');
        }
        if (opts?.scoped) {
            this.#scopedObservers.add(targetObserver);
        }
        for (const target of this.#targets) {
            if (!opts?.scoped || this.isInScope(target)) {
                targetObserver.targetAdded(target);
            }
        }
        this.#observers.add(targetObserver);
    }
    unobserveTargets(targetObserver) {
        this.#observers.delete(targetObserver);
        this.#scopedObservers.delete(targetObserver);
    }
    createTarget(id, name, type, parentTarget, sessionId, waitForDebuggerInPage, connection, targetInfo) {
        const target = new Target(this, id, name, type, parentTarget, sessionId || '', this.#isSuspended, connection || null, targetInfo);
        if (waitForDebuggerInPage) {
            void target.pageAgent().invoke_waitForDebugger();
        }
        target.createModels(new Set(this.#modelObservers.keysArray()));
        this.#targets.add(target);
        const inScope = this.isInScope(target);
        // Iterate over a copy. #observers might be modified during iteration.
        for (const observer of [...this.#observers]) {
            if (!this.#scopedObservers.has(observer) || inScope) {
                observer.targetAdded(target);
            }
        }
        for (const [modelClass, model] of target.models().entries()) {
            this.modelAdded(modelClass, model, inScope);
        }
        for (const key of this.#modelListeners.keysArray()) {
            for (const info of this.#modelListeners.get(key)) {
                const model = target.model(info.modelClass);
                if (model) {
                    model.addEventListener(key, info.wrappedListener);
                }
            }
        }
        if ((target === target.outermostTarget() &&
            (target.type() !== TargetType.FRAME || target === this.primaryPageTarget())) &&
            !this.#defaultScopeSet) {
            this.setScopeTarget(target);
        }
        return target;
    }
    removeTarget(target) {
        if (!this.#targets.has(target)) {
            return;
        }
        const inScope = this.isInScope(target);
        this.#targets.delete(target);
        for (const modelClass of target.models().keys()) {
            const model = target.models().get(modelClass);
            assertNotNullOrUndefined(model);
            this.modelRemoved(modelClass, model, inScope);
        }
        // Iterate over a copy. #observers might be modified during iteration.
        for (const observer of [...this.#observers]) {
            if (!this.#scopedObservers.has(observer) || inScope) {
                observer.targetRemoved(target);
            }
        }
        for (const key of this.#modelListeners.keysArray()) {
            for (const info of this.#modelListeners.get(key)) {
                const model = target.model(info.modelClass);
                if (model) {
                    model.removeEventListener(key, info.wrappedListener);
                }
            }
        }
    }
    targets() {
        return [...this.#targets];
    }
    targetById(id) {
        // TODO(dgozman): add a map #id -> #target.
        return this.targets().find(target => target.id() === id) || null;
    }
    rootTarget() {
        if (this.#targets.size === 0) {
            return null;
        }
        return this.#targets.values().next().value ?? null;
    }
    primaryPageTarget() {
        let target = this.rootTarget();
        if (target?.type() === TargetType.TAB) {
            target =
                this.targets().find(t => t.parentTarget() === target && t.type() === TargetType.FRAME && !t.targetInfo()?.subtype?.length) ||
                    null;
        }
        return target;
    }
    browserTarget() {
        return this.#browserTarget;
    }
    async maybeAttachInitialTarget() {
        if (!Boolean(Root.Runtime.Runtime.queryParam('browserConnection'))) {
            return false;
        }
        if (!this.#browserTarget) {
            this.#browserTarget = new Target(this, /* #id*/ 'main', /* #name*/ 'browser', TargetType.BROWSER, /* #parentTarget*/ null, 
            /* #sessionId */ '', /* suspended*/ false, /* #connection*/ null, /* targetInfo*/ undefined);
            this.#browserTarget.createModels(new Set(this.#modelObservers.keysArray()));
        }
        const targetId = await Host.InspectorFrontendHost.InspectorFrontendHostInstance.initialTargetId();
        // Do not await for Target.autoAttachRelated to return, as it goes throguh the renderer and we don't want to block early
        // at front-end initialization if a renderer is stuck. The rest of #target discovery and auto-attach process should happen
        // asynchronously upon Target.attachedToTarget.
        void this.#browserTarget.targetAgent().invoke_autoAttachRelated({
            targetId,
            waitForDebuggerOnStart: true,
        });
        return true;
    }
    clearAllTargetsForTest() {
        this.#targets.clear();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isInScope(arg) {
        if (!arg) {
            return false;
        }
        if (isSDKModelEvent(arg)) {
            arg = arg.source;
        }
        if (arg instanceof SDKModel) {
            arg = arg.target();
        }
        while (arg && arg !== this.#scopeTarget) {
            arg = arg.parentTarget();
        }
        return Boolean(arg) && arg === this.#scopeTarget;
    }
    // Sets a root of a scope substree.
    // TargetManager API invoked with `scoped: true` will behave as if targets
    // outside of the scope subtree don't exist. Concretely this means that
    // target observers, model observers and model listeners won't be invoked for targets outside of the
    // scope tree. This method will invoke targetRemoved and modelRemoved for
    // objects in the previous scope, as if they disappear and then will invoke
    // targetAdded and modelAdded as if they just appeared.
    // Note that scopeTarget could be null, which will effectively prevent scoped
    // observes from getting any events.
    setScopeTarget(scopeTarget) {
        if (scopeTarget === this.#scopeTarget) {
            return;
        }
        for (const target of this.targets()) {
            if (!this.isInScope(target)) {
                continue;
            }
            for (const modelClass of this.#modelObservers.keysArray()) {
                const model = target.models().get(modelClass);
                if (!model) {
                    continue;
                }
                for (const observer of [...this.#modelObservers.get(modelClass)].filter(o => this.#scopedObservers.has(o))) {
                    observer.modelRemoved(model);
                }
            }
            // Iterate over a copy. #observers might be modified during iteration.
            for (const observer of [...this.#observers].filter(o => this.#scopedObservers.has(o))) {
                observer.targetRemoved(target);
            }
        }
        this.#scopeTarget = scopeTarget;
        for (const target of this.targets()) {
            if (!this.isInScope(target)) {
                continue;
            }
            for (const observer of [...this.#observers].filter(o => this.#scopedObservers.has(o))) {
                observer.targetAdded(target);
            }
            for (const [modelClass, model] of target.models().entries()) {
                for (const observer of [...this.#modelObservers.get(modelClass)].filter(o => this.#scopedObservers.has(o))) {
                    observer.modelAdded(model);
                }
            }
        }
        for (const scopeChangeListener of this.#scopeChangeListeners) {
            scopeChangeListener();
        }
        if (scopeTarget?.inspectedURL()) {
            this.onInspectedURLChange(scopeTarget);
        }
    }
    addScopeChangeListener(listener) {
        this.#scopeChangeListeners.add(listener);
    }
    scopeTarget() {
        return this.#scopeTarget;
    }
}
export class Observer {
    targetAdded(_target) {
    }
    targetRemoved(_target) {
    }
}
export class SDKModelObserver {
    modelAdded(_model) {
    }
    modelRemoved(_model) {
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSDKModelEvent(arg) {
    return 'source' in arg && arg.source instanceof SDKModel;
}
//# sourceMappingURL=TargetManager.js.map