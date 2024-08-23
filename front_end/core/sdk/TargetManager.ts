// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import {assertNotNullOrUndefined} from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Root from '../root/root.js';

import {SDKModel} from './SDKModel.js';
import {Target, Type as TargetType} from './Target.js';

let targetManagerInstance: TargetManager|undefined;
type ModelClass<T = SDKModel> = new (arg1: Target) => T;

export class TargetManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #targetsInternal: Set<Target>;
  readonly #observers: Set<Observer>;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  #modelListeners: Platform.MapUtilities.Multimap<string|symbol|number, {
    modelClass: ModelClass,
    thisObject: Object|undefined,
    listener: Common.EventTarget.EventListener<any, any>,
    wrappedListener: Common.EventTarget.EventListener<any, any>,
  }>;
  readonly #modelObservers: Platform.MapUtilities.Multimap<ModelClass, SDKModelObserver<any>>;
  #scopedObservers: WeakSet<Observer|SDKModelObserver<any>>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  #isSuspended: boolean;
  #browserTargetInternal: Target|null;
  #scopeTarget: Target|null;
  #defaultScopeSet: boolean;
  readonly #scopeChangeListeners: Set<() => void>;

  private constructor() {
    super();
    this.#targetsInternal = new Set();
    this.#observers = new Set();
    this.#modelListeners = new Platform.MapUtilities.Multimap();
    this.#modelObservers = new Platform.MapUtilities.Multimap();
    this.#isSuspended = false;
    this.#browserTargetInternal = null;
    this.#scopeTarget = null;
    this.#scopedObservers = new WeakSet();
    this.#defaultScopeSet = false;
    this.#scopeChangeListeners = new Set();
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): TargetManager {
    if (!targetManagerInstance || forceNew) {
      targetManagerInstance = new TargetManager();
    }

    return targetManagerInstance;
  }

  static removeInstance(): void {
    targetManagerInstance = undefined;
  }

  onInspectedURLChange(target: Target): void {
    if (target !== this.#scopeTarget) {
      return;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(
        target.inspectedURL() || Platform.DevToolsPath.EmptyUrlString);
    this.dispatchEventToListeners(Events.INSPECTED_URL_CHANGED, target);
  }

  onNameChange(target: Target): void {
    this.dispatchEventToListeners(Events.NAME_CHANGED, target);
  }

  async suspendAllTargets(reason?: string): Promise<void> {
    if (this.#isSuspended) {
      return;
    }
    this.#isSuspended = true;
    this.dispatchEventToListeners(Events.SUSPEND_STATE_CHANGED);
    const suspendPromises = Array.from(this.#targetsInternal.values(), target => target.suspend(reason));
    await Promise.all(suspendPromises);
  }

  async resumeAllTargets(): Promise<void> {
    if (!this.#isSuspended) {
      return;
    }
    this.#isSuspended = false;
    this.dispatchEventToListeners(Events.SUSPEND_STATE_CHANGED);
    const resumePromises = Array.from(this.#targetsInternal.values(), target => target.resume());
    await Promise.all(resumePromises);
  }

  allTargetsSuspended(): boolean {
    return this.#isSuspended;
  }

  models<T extends SDKModel>(modelClass: ModelClass<T>, opts?: {scoped: boolean}): T[] {
    const result = [];
    for (const target of this.#targetsInternal) {
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

  inspectedURL(): string {
    const mainTarget = this.primaryPageTarget();
    return mainTarget ? mainTarget.inspectedURL() : '';
  }

  observeModels<T extends SDKModel>(modelClass: ModelClass<T>, observer: SDKModelObserver<T>, opts?: {scoped: boolean}):
      void {
    const models = this.models(modelClass, opts);
    this.#modelObservers.set(modelClass, observer);
    if (opts?.scoped) {
      this.#scopedObservers.add(observer);
    }
    for (const model of models) {
      observer.modelAdded(model);
    }
  }

  unobserveModels<T extends SDKModel>(modelClass: ModelClass<T>, observer: SDKModelObserver<T>): void {
    this.#modelObservers.delete(modelClass, observer);
    this.#scopedObservers.delete(observer);
  }

  modelAdded(target: Target, modelClass: ModelClass, model: SDKModel, inScope: boolean): void {
    for (const observer of this.#modelObservers.get(modelClass).values()) {
      if (!this.#scopedObservers.has(observer) || inScope) {
        observer.modelAdded(model);
      }
    }
  }

  private modelRemoved(target: Target, modelClass: ModelClass, model: SDKModel, inScope: boolean): void {
    for (const observer of this.#modelObservers.get(modelClass).values()) {
      if (!this.#scopedObservers.has(observer) || inScope) {
        observer.modelRemoved(model);
      }
    }
  }

  addModelListener<Events, T extends keyof Events>(
      modelClass: ModelClass<SDKModel<Events>>, eventType: T, listener: Common.EventTarget.EventListener<Events, T>,
      thisObject?: Object, opts?: {scoped: boolean}): void {
    const wrappedListener = (event: Common.EventTarget.EventTargetEvent<Events[T], Events>): void => {
      if (!opts?.scoped || this.isInScope(event)) {
        listener.call(thisObject, event);
      }
    };
    for (const model of this.models(modelClass)) {
      model.addEventListener(eventType, wrappedListener);
    }
    this.#modelListeners.set(eventType, {modelClass, thisObject, listener, wrappedListener});
  }

  removeModelListener<Events, T extends keyof Events>(
      modelClass: ModelClass<SDKModel<Events>>, eventType: T, listener: Common.EventTarget.EventListener<Events, T>,
      thisObject?: Object): void {
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

  observeTargets(targetObserver: Observer, opts?: {scoped: boolean}): void {
    if (this.#observers.has(targetObserver)) {
      throw new Error('Observer can only be registered once');
    }
    if (opts?.scoped) {
      this.#scopedObservers.add(targetObserver);
    }
    for (const target of this.#targetsInternal) {
      if (!opts?.scoped || this.isInScope(target)) {
        targetObserver.targetAdded(target);
      }
    }
    this.#observers.add(targetObserver);
  }

  unobserveTargets(targetObserver: Observer): void {
    this.#observers.delete(targetObserver);
    this.#scopedObservers.delete(targetObserver);
  }

  createTarget(
      id: Protocol.Target.TargetID|'main', name: string, type: TargetType, parentTarget: Target|null,
      sessionId?: string, waitForDebuggerInPage?: boolean, connection?: ProtocolClient.InspectorBackend.Connection,
      targetInfo?: Protocol.Target.TargetInfo): Target {
    const target = new Target(
        this, id, name, type, parentTarget, sessionId || '', this.#isSuspended, connection || null, targetInfo);
    if (waitForDebuggerInPage) {
      void target.pageAgent().invoke_waitForDebugger();
    }
    target.createModels(new Set(this.#modelObservers.keysArray()));
    this.#targetsInternal.add(target);

    const inScope = this.isInScope(target);
    // Iterate over a copy. #observers might be modified during iteration.
    for (const observer of [...this.#observers]) {
      if (!this.#scopedObservers.has(observer) || inScope) {
        observer.targetAdded(target);
      }
    }

    for (const [modelClass, model] of target.models().entries()) {
      this.modelAdded(target, modelClass, model, inScope);
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

  removeTarget(target: Target): void {
    if (!this.#targetsInternal.has(target)) {
      return;
    }

    const inScope = this.isInScope(target);
    this.#targetsInternal.delete(target);
    for (const modelClass of target.models().keys()) {
      const model = target.models().get(modelClass);
      assertNotNullOrUndefined(model);
      this.modelRemoved(target, modelClass, model, inScope);
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

  targets(): Target[] {
    return [...this.#targetsInternal];
  }

  targetById(id: string): Target|null {
    // TODO(dgozman): add a map #id -> #target.
    return this.targets().find(target => target.id() === id) || null;
  }

  rootTarget(): Target|null {
    return this.#targetsInternal.size ? this.#targetsInternal.values().next().value : null;
  }

  primaryPageTarget(): Target|null {
    let target = this.rootTarget();
    if (target?.type() === TargetType.TAB) {
      target =
          this.targets().find(
              t => t.parentTarget() === target && t.type() === TargetType.FRAME && !t.targetInfo()?.subtype?.length) ||
          null;
    }
    return target;
  }

  browserTarget(): Target|null {
    return this.#browserTargetInternal;
  }

  async maybeAttachInitialTarget(): Promise<boolean> {
    if (!Boolean(Root.Runtime.Runtime.queryParam('browserConnection'))) {
      return false;
    }
    if (!this.#browserTargetInternal) {
      this.#browserTargetInternal = new Target(
          this, /* #id*/ 'main', /* #name*/ 'browser', TargetType.BROWSER, /* #parentTarget*/ null,
          /* #sessionId */ '', /* suspended*/ false, /* #connection*/ null, /* targetInfo*/ undefined);
      this.#browserTargetInternal.createModels(new Set(this.#modelObservers.keysArray()));
    }
    const targetId =
        await Host.InspectorFrontendHost.InspectorFrontendHostInstance.initialTargetId() as Protocol.Target.TargetID;
    // Do not await for Target.autoAttachRelated to return, as it goes throguh the renderer and we don't want to block early
    // at front-end initialization if a renderer is stuck. The rest of #target discovery and auto-attach process should happen
    // asynchronously upon Target.attachedToTarget.
    void this.#browserTargetInternal.targetAgent().invoke_autoAttachRelated({
      targetId,
      waitForDebuggerOnStart: true,
    });
    return true;
  }

  clearAllTargetsForTest(): void {
    this.#targetsInternal.clear();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isInScope(arg: SDKModel|Target|Common.EventTarget.EventTargetEvent<any, any>|null): boolean {
    if (!arg) {
      return false;
    }
    if (isSDKModelEvent(arg)) {
      arg = arg.source as SDKModel;
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
  setScopeTarget(scopeTarget: Target|null): void {
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
    if (scopeTarget && scopeTarget.inspectedURL()) {
      this.onInspectedURLChange(scopeTarget);
    }
  }

  addScopeChangeListener(listener: () => void): void {
    this.#scopeChangeListeners.add(listener);
  }

  removeScopeChangeListener(listener: () => void): void {
    this.#scopeChangeListeners.delete(listener);
  }

  scopeTarget(): Target|null {
    return this.#scopeTarget;
  }
}

export const enum Events {
  AVAILABLE_TARGETS_CHANGED = 'AvailableTargetsChanged',
  INSPECTED_URL_CHANGED = 'InspectedURLChanged',
  NAME_CHANGED = 'NameChanged',
  SUSPEND_STATE_CHANGED = 'SuspendStateChanged',
}

export type EventTypes = {
  [Events.AVAILABLE_TARGETS_CHANGED]: Protocol.Target.TargetInfo[],
  [Events.INSPECTED_URL_CHANGED]: Target,
  [Events.NAME_CHANGED]: Target,
  [Events.SUSPEND_STATE_CHANGED]: void,
};

export class Observer {
  targetAdded(_target: Target): void {
  }
  targetRemoved(_target: Target): void {
  }
}

export class SDKModelObserver<T> {
  modelAdded(_model: T): void {
  }
  modelRemoved(_model: T): void {
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSDKModelEvent(arg: Object): arg is Common.EventTarget.EventTargetEvent<any, any> {
  return 'source' in arg && arg.source instanceof SDKModel;
}
