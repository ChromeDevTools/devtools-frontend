// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';
import type {Type as TargetType} from './Target.js';
import {Target} from './Target.js';
import type {SDKModel} from './SDKModel.js';

let targetManagerInstance: TargetManager|undefined;

export class TargetManager extends Common.ObjectWrapper.ObjectWrapper {
  _targets: Set<Target>;
  _observers: Set<Observer>;
  _modelListeners: Platform.MapUtilities.Multimap<string|symbol, {
    modelClass: new(arg1: Target) => SDKModel,
    thisObject: (Object|undefined),
    listener: (arg0: Common.EventTarget.EventTargetEvent) => void,
  }>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _modelObservers: Platform.MapUtilities.Multimap<new(arg1: Target) => SDKModel, SDKModelObserver<any>>;
  _isSuspended: boolean;

  private constructor() {
    super();
    this._targets = new Set();
    this._observers = new Set();
    this._modelListeners = new Platform.MapUtilities.Multimap();
    this._modelObservers = new Platform.MapUtilities.Multimap();
    this._isSuspended = false;
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
    if (this._isSuspended) {
      return;
    }
    this._isSuspended = true;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const suspendPromises = Array.from(this._targets.values(), target => target.suspend(reason));
    await Promise.all(suspendPromises);
  }

  async resumeAllTargets(): Promise<void> {
    if (!this._isSuspended) {
      return;
    }
    this._isSuspended = false;
    this.dispatchEventToListeners(Events.SuspendStateChanged);
    const resumePromises = Array.from(this._targets.values(), target => target.resume());
    await Promise.all(resumePromises);
  }

  allTargetsSuspended(): boolean {
    return this._isSuspended;
  }

  models<T extends SDKModel>(modelClass: new(arg1: Target) => T): T[] {
    const result = [];
    for (const target of this._targets) {
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
    this._modelObservers.set(modelClass, observer);
    for (const model of models) {
      observer.modelAdded(model);
    }
  }

  unobserveModels<T extends SDKModel>(modelClass: new(arg1: Target) => SDKModel, observer: SDKModelObserver<T>): void {
    this._modelObservers.delete(modelClass, observer);
  }

  modelAdded(target: Target, modelClass: new(arg1: Target) => SDKModel, model: SDKModel): void {
    for (const observer of this._modelObservers.get(modelClass).values()) {
      observer.modelAdded(model);
    }
  }

  _modelRemoved(target: Target, modelClass: new(arg1: Target) => SDKModel, model: SDKModel): void {
    for (const observer of this._modelObservers.get(modelClass).values()) {
      observer.modelRemoved(model);
    }
  }

  addModelListener(
      modelClass: new(arg1: Target) => SDKModel, eventType: string|symbol,
      listener: (arg0: Common.EventTarget.EventTargetEvent) => void, thisObject?: Object): void {
    for (const model of this.models(modelClass)) {
      model.addEventListener(eventType, listener, thisObject);
    }
    this._modelListeners.set(eventType, {modelClass: modelClass, thisObject: thisObject, listener: listener});
  }

  removeModelListener(
      modelClass: new(arg1: Target) => SDKModel, eventType: string|symbol,
      listener: (arg0: Common.EventTarget.EventTargetEvent) => void, thisObject?: Object): void {
    if (!this._modelListeners.has(eventType)) {
      return;
    }

    for (const model of this.models(modelClass)) {
      model.removeEventListener(eventType, listener, thisObject);
    }

    for (const info of this._modelListeners.get(eventType)) {
      if (info.modelClass === modelClass && info.listener === listener && info.thisObject === thisObject) {
        this._modelListeners.delete(eventType, info);
      }
    }
  }

  observeTargets(targetObserver: Observer): void {
    if (this._observers.has(targetObserver)) {
      throw new Error('Observer can only be registered once');
    }
    for (const target of this._targets) {
      targetObserver.targetAdded(target);
    }
    this._observers.add(targetObserver);
  }

  unobserveTargets(targetObserver: Observer): void {
    this._observers.delete(targetObserver);
  }

  createTarget(
      id: string, name: string, type: TargetType, parentTarget: Target|null, sessionId?: string,
      waitForDebuggerInPage?: boolean, connection?: ProtocolClient.InspectorBackend.Connection,
      targetInfo?: Protocol.Target.TargetInfo): Target {
    const target = new Target(
        this, id, name, type, parentTarget, sessionId || '', this._isSuspended, connection || null, targetInfo);
    if (waitForDebuggerInPage) {
      // @ts-ignore TODO(1063322): Find out where pageAgent() is set on Target/TargetBase.
      target.pageAgent().waitForDebugger();
    }
    target.createModels(new Set(this._modelObservers.keysArray()));
    this._targets.add(target);

    // Iterate over a copy. _observers might be modified during iteration.
    for (const observer of [...this._observers]) {
      observer.targetAdded(target);
    }

    for (const modelClass of target.models().keys()) {
      const model = (target.models().get(modelClass) as SDKModel);
      this.modelAdded(target, modelClass, model);
    }

    for (const key of this._modelListeners.keysArray()) {
      for (const info of this._modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.addEventListener(key, info.listener, info.thisObject);
        }
      }
    }

    return target;
  }

  removeTarget(target: Target): void {
    if (!this._targets.has(target)) {
      return;
    }

    this._targets.delete(target);
    for (const modelClass of target.models().keys()) {
      const model = (target.models().get(modelClass) as SDKModel);
      this._modelRemoved(target, modelClass, model);
    }

    // Iterate over a copy. _observers might be modified during iteration.
    for (const observer of [...this._observers]) {
      observer.targetRemoved(target);
    }

    for (const key of this._modelListeners.keysArray()) {
      for (const info of this._modelListeners.get(key)) {
        const model = target.model(info.modelClass);
        if (model) {
          model.removeEventListener(key, info.listener, info.thisObject);
        }
      }
    }
  }

  targets(): Target[] {
    return [...this._targets];
  }

  targetById(id: string): Target|null {
    // TODO(dgozman): add a map id -> target.
    return this.targets().find(target => target.id() === id) || null;
  }

  mainTarget(): Target|null {
    return this._targets.size ? this._targets.values().next().value : null;
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
