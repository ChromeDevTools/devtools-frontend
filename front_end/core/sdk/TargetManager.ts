// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';
import {Type as TargetType} from './Target.js';
import {Target} from './Target.js';
import type {SDKModel} from './SDKModel.js';
import * as Root from '../root/root.js';
import * as Host from '../host/host.js';

let targetManagerInstance: TargetManager|undefined;

export class TargetManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private targetsInternal: Set<Target>;
  private readonly observers: Set<Observer>;
  private modelListeners: Platform.MapUtilities.Multimap<string|symbol|number, {
    modelClass: new(arg1: Target) => SDKModel,
    thisObject: (Object|undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: Common.EventTarget.EventListener<any, any>,
  }>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly modelObservers: Platform.MapUtilities.Multimap<new(arg1: Target) => SDKModel, SDKModelObserver<any>>;
  private isSuspended: boolean;
  private browserTargetInternal: Target|null;

  private constructor() {
    super();
    this.targetsInternal = new Set();
    this.observers = new Set();
    this.modelListeners = new Platform.MapUtilities.Multimap();
    this.modelObservers = new Platform.MapUtilities.Multimap();
    this.isSuspended = false;
    this.browserTargetInternal = null;
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
    this.dispatchEventToListeners(Events.InspectedURLChanged, target);
  }

  onNameChange(target: Target): void {
    this.dispatchEventToListeners(Events.NameChanged, target);
  }

  async suspendAllTargets(reason?: string): Promise<void> {
    if (this.isSuspended) {
      return;
    }
    this.isSuspended = true;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const suspendPromises = Array.from(this.targetsInternal.values(), target => target.suspend(reason));
    await Promise.all(suspendPromises);
  }

  async resumeAllTargets(): Promise<void> {
    if (!this.isSuspended) {
      return;
    }
    this.isSuspended = false;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const resumePromises = Array.from(this.targetsInternal.values(), target => target.resume());
    await Promise.all(resumePromises);
  }

  allTargetsSuspended(): boolean {
    return this.isSuspended;
  }

  models<T extends SDKModel>(modelClass: new(arg1: Target) => T): T[] {
    const result = [];
    for (const target of this.targetsInternal) {
      const model = target.model(modelClass);
      if (model) {
        result.push(model);
      }
    }
    return result;
  }

  inspectedURL(): string {
    const mainTarget = this.mainTarget();
    return mainTarget ? mainTarget.inspectedURL() : '';
  }

  observeModels<T extends SDKModel>(modelClass: new(arg1: Target) => T, observer: SDKModelObserver<T>): void {
    const models = this.models(modelClass);
    this.modelObservers.set(modelClass, observer);
    for (const model of models) {
      observer.modelAdded(model);
    }
  }

  unobserveModels<T extends SDKModel>(modelClass: new(arg1: Target) => SDKModel, observer: SDKModelObserver<T>): void {
    this.modelObservers.delete(modelClass, observer);
  }

  modelAdded(target: Target, modelClass: new(arg1: Target) => SDKModel, model: SDKModel): void {
    for (const observer of this.modelObservers.get(modelClass).values()) {
      observer.modelAdded(model);
    }
  }

  private modelRemoved(target: Target, modelClass: new(arg1: Target) => SDKModel, model: SDKModel): void {
    for (const observer of this.modelObservers.get(modelClass).values()) {
      observer.modelRemoved(model);
    }
  }

  addModelListener<Events, T extends Common.EventTarget.EventType<Events>>(
      modelClass: new(arg1: Target) => SDKModel<Events>, eventType: T,
      listener: Common.EventTarget.EventListener<Events, T>, thisObject?: Object): void {
    for (const model of this.models(modelClass)) {
      model.addEventListener(eventType, listener, thisObject);
    }
    this.modelListeners.set(eventType, {modelClass: modelClass, thisObject: thisObject, listener: listener});
  }

  removeModelListener<Events, T extends Common.EventTarget.EventType<Events>>(
      modelClass: new(arg1: Target) => SDKModel<Events>, eventType: T,
      listener: Common.EventTarget.EventListener<Events, T>, thisObject?: Object): void {
    if (!this.modelListeners.has(eventType)) {
      return;
    }

    for (const model of this.models(modelClass)) {
      model.removeEventListener(eventType, listener, thisObject);
    }

    for (const info of this.modelListeners.get(eventType)) {
      if (info.modelClass === modelClass && info.listener === listener && info.thisObject === thisObject) {
        this.modelListeners.delete(eventType, info);
      }
    }
  }

  observeTargets(targetObserver: Observer): void {
    if (this.observers.has(targetObserver)) {
      throw new Error('Observer can only be registered once');
    }
    for (const target of this.targetsInternal) {
      targetObserver.targetAdded(target);
    }
    this.observers.add(targetObserver);
  }

  unobserveTargets(targetObserver: Observer): void {
    this.observers.delete(targetObserver);
  }

  createTarget(
      id: Protocol.Target.TargetID|'main', name: string, type: TargetType, parentTarget: Target|null,
      sessionId?: string, waitForDebuggerInPage?: boolean, connection?: ProtocolClient.InspectorBackend.Connection,
      targetInfo?: Protocol.Target.TargetInfo): Target {
    const target = new Target(
        this, id, name, type, parentTarget, sessionId || '', this.isSuspended, connection || null, targetInfo);
    if (waitForDebuggerInPage) {
      target.pageAgent().invoke_waitForDebugger();
    }
    target.createModels(new Set(this.modelObservers.keysArray()));
    this.targetsInternal.add(target);

    // Iterate over a copy. observers might be modified during iteration.
    for (const observer of [...this.observers]) {
      observer.targetAdded(target);
    }

    for (const [modelClass, model] of target.models().entries()) {
      this.modelAdded(target, modelClass, model);
    }

    for (const key of this.modelListeners.keysArray()) {
      for (const info of this.modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.addEventListener(key, info.listener, info.thisObject);
        }
      }
    }

    return target;
  }

  removeTarget(target: Target): void {
    if (!this.targetsInternal.has(target)) {
      return;
    }

    this.targetsInternal.delete(target);
    for (const modelClass of target.models().keys()) {
      const model = (target.models().get(modelClass) as SDKModel);
      this.modelRemoved(target, modelClass, model);
    }

    // Iterate over a copy. observers might be modified during iteration.
    for (const observer of [...this.observers]) {
      observer.targetRemoved(target);
    }

    for (const key of this.modelListeners.keysArray()) {
      for (const info of this.modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.removeEventListener(key, info.listener, info.thisObject);
        }
      }
    }
  }

  targets(): Target[] {
    return [...this.targetsInternal];
  }

  targetById(id: string): Target|null {
    // TODO(dgozman): add a map id -> target.
    return this.targets().find(target => target.id() === id) || null;
  }

  mainTarget(): Target|null {
    return this.targetsInternal.size ? this.targetsInternal.values().next().value : null;
  }

  browserTarget(): Target|null {
    return this.browserTargetInternal;
  }

  async maybeAttachInitialTarget(): Promise<boolean> {
    if (!Boolean(Root.Runtime.Runtime.queryParam('browserConnection'))) {
      return false;
    }
    if (!this.browserTargetInternal) {
      this.browserTargetInternal = new Target(
          this, /* id*/ 'main', /* name*/ 'browser', TargetType.Browser, /* parentTarget*/ null,
          /* sessionId */ '', /* suspended*/ false, /* connection*/ null, /* targetInfo*/ undefined);
      this.browserTargetInternal.createModels(new Set(this.modelObservers.keysArray()));
    }
    const targetId =
        await Host.InspectorFrontendHost.InspectorFrontendHostInstance.initialTargetId() as Protocol.Target.TargetID;
    // Do not await for Target.autoAttachRelated to return, as it goes throguh the renderer and we don't want to block early
    // at front-end initialization if a renderer is stuck. The rest of target discovery and auto-attach process should happen
    // asynchronously upon Target.attachedToTarget.
    this.browserTargetInternal.targetAgent().invoke_autoAttachRelated({
      targetId,
      waitForDebuggerOnStart: true,
    });
    return true;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  AvailableTargetsChanged = 'AvailableTargetsChanged',
  InspectedURLChanged = 'InspectedURLChanged',
  NameChanged = 'NameChanged',
  SuspendStateChanged = 'SuspendStateChanged',
}

export type EventTypes = {
  [Events.AvailableTargetsChanged]: Protocol.Target.TargetInfo[],
  [Events.InspectedURLChanged]: Target,
  [Events.NameChanged]: Target,
  [Events.SuspendStateChanged]: void,
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
