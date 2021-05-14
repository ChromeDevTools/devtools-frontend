// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';

export interface RegistrationInfo {
  capabilities: number;
  autostart: boolean;
  early?: boolean;
}

const registeredModels = new Map<new (arg1: Target) => SDKModel, RegistrationInfo>();

export class SDKModel extends Common.ObjectWrapper.ObjectWrapper {
  _target: Target;

  constructor(target: Target) {
    super();
    this._target = target;
  }

  target(): Target {
    return this._target;
  }

  /**
   * Override this method to perform tasks that are required to suspend the
   * model and that still need other models in an unsuspended state.
   */
  async preSuspendModel(_reason?: string): Promise<void> {
  }

  async suspendModel(_reason?: string): Promise<void> {
  }

  async resumeModel(): Promise<void> {
  }

  /**
   * Override this method to perform tasks that are required to after resuming
   * the model and that require all models already in an unsuspended state.
   */
  async postResumeModel(): Promise<void> {
  }

  dispose(): void {
  }

  static register(modelClass: new(arg1: Target) => SDKModel, registrationInfo: RegistrationInfo): void {
    if (registrationInfo.early && !registrationInfo.autostart) {
      throw new Error(`Error registering model ${modelClass.name}: early models must be autostarted.`);
    }
    registeredModels.set(modelClass, registrationInfo);
  }

  static get registeredModels(): typeof registeredModels {
    return registeredModels;
  }
}

export class Target extends ProtocolClient.InspectorBackend.TargetBase {
  _targetManager: TargetManager;
  _name: string;
  _inspectedURL: string;
  _inspectedURLName: string;
  _capabilitiesMask: number;
  _type: Type;
  _parentTarget: Target|null;
  _id: string;
  _modelByConstructor: Map<new(arg1: Target) => SDKModel, SDKModel>;
  _isSuspended: boolean;
  _targetInfo: Protocol.Target.TargetInfo|undefined;
  _creatingModels?: boolean;

  constructor(
      targetManager: TargetManager, id: string, name: string, type: Type, parentTarget: Target|null, sessionId: string,
      suspended: boolean, connection: ProtocolClient.InspectorBackend.Connection|null,
      targetInfo?: Protocol.Target.TargetInfo) {
    const needsNodeJSPatching = type === Type.Node;
    super(needsNodeJSPatching, parentTarget, sessionId, connection);
    this._targetManager = targetManager;
    this._name = name;
    this._inspectedURL = '';
    this._inspectedURLName = '';
    this._capabilitiesMask = 0;
    switch (type) {
      case Type.Frame:
        this._capabilitiesMask = Capability.Browser | Capability.Storage | Capability.DOM | Capability.JS |
            Capability.Log | Capability.Network | Capability.Target | Capability.Tracing | Capability.Emulation |
            Capability.Input | Capability.Inspector | Capability.Audits | Capability.WebAuthn | Capability.IO;
        if (!parentTarget) {
          // This matches backend exposing certain capabilities only for the main frame.
          this._capabilitiesMask |=
              Capability.DeviceEmulation | Capability.ScreenCapture | Capability.Security | Capability.ServiceWorker;
          // TODO(dgozman): we report service workers for the whole frame tree on the main frame,
          // while we should be able to only cover the subtree corresponding to the target.
        }
        break;
      case Type.ServiceWorker:
        this._capabilitiesMask = Capability.JS | Capability.Log | Capability.Network | Capability.Target |
            Capability.Inspector | Capability.IO;
        if (!parentTarget) {
          this._capabilitiesMask |= Capability.Browser;
        }
        break;
      case Type.Worker:
        this._capabilitiesMask =
            Capability.JS | Capability.Log | Capability.Network | Capability.Target | Capability.IO;
        break;
      case Type.Node:
        this._capabilitiesMask = Capability.JS;
        break;
      case Type.Browser:
        this._capabilitiesMask = Capability.Target | Capability.IO;
        break;
    }
    this._type = type;
    this._parentTarget = parentTarget;
    this._id = id;
    /* } */
    this._modelByConstructor = new Map();
    this._isSuspended = suspended;
    this._targetInfo = targetInfo;
  }

  createModels(required: Set<new(arg1: Target) => SDKModel>): void {
    this._creatingModels = true;
    const registeredModels = Array.from(SDKModel.registeredModels.entries());
    // Create early models.
    for (const [modelClass, info] of registeredModels) {
      if (info.early) {
        this.model(modelClass);
      }
    }
    // Create autostart and required models.
    for (const [modelClass, info] of registeredModels) {
      if (info.autostart || required.has(modelClass)) {
        this.model(modelClass);
      }
    }
    this._creatingModels = false;
  }

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name || this._inspectedURLName;
  }

  type(): Type {
    return this._type;
  }

  markAsNodeJSForTest(): void {
    super.markAsNodeJSForTest();
    this._type = Type.Node;
  }

  targetManager(): TargetManager {
    return this._targetManager;
  }

  hasAllCapabilities(capabilitiesMask: number): boolean {
    // TODO(dgozman): get rid of this method, once we never observe targets with
    // capability mask.
    return (this._capabilitiesMask & capabilitiesMask) === capabilitiesMask;
  }

  decorateLabel(label: string): string {
    return (this._type === Type.Worker || this._type === Type.ServiceWorker) ? '\u2699 ' + label : label;
  }

  parentTarget(): Target|null {
    return this._parentTarget;
  }

  dispose(reason: string): void {
    super.dispose(reason);
    this._targetManager.removeTarget(this);
    for (const model of this._modelByConstructor.values()) {
      model.dispose();
    }
  }

  model<T extends SDKModel>(modelClass: new(arg1: Target) => T): T|null {
    if (!this._modelByConstructor.get(modelClass)) {
      const info = SDKModel.registeredModels.get(modelClass);
      if (info === undefined) {
        throw 'Model class is not registered @' + new Error().stack;
      }
      if ((this._capabilitiesMask & info.capabilities) === info.capabilities) {
        const model = new modelClass(this);
        this._modelByConstructor.set(modelClass, model);
        if (!this._creatingModels) {
          this._targetManager.modelAdded(this, modelClass, model);
        }
      }
    }
    return (this._modelByConstructor.get(modelClass) as T) || null;
  }

  models(): Map<new(arg1: Target) => SDKModel, SDKModel> {
    return this._modelByConstructor;
  }

  inspectedURL(): string {
    return this._inspectedURL;
  }

  setInspectedURL(inspectedURL: string): void {
    this._inspectedURL = inspectedURL;
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(inspectedURL);
    this._inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this._id;
    if (!this.parentTarget()) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(inspectedURL || '');
    }
    this._targetManager.dispatchEventToListeners(Events.InspectedURLChanged, this);
    if (!this._name) {
      this._targetManager.dispatchEventToListeners(Events.NameChanged, this);
    }
  }

  async suspend(reason?: string): Promise<void> {
    if (this._isSuspended) {
      return;
    }
    this._isSuspended = true;

    await Promise.all(Array.from(this.models().values(), m => m.preSuspendModel(reason)));
    await Promise.all(Array.from(this.models().values(), m => m.suspendModel(reason)));
  }

  async resume(): Promise<void> {
    if (!this._isSuspended) {
      return;
    }
    this._isSuspended = false;

    await Promise.all(Array.from(this.models().values(), m => m.resumeModel()));
    await Promise.all(Array.from(this.models().values(), m => m.postResumeModel()));
  }

  suspended(): boolean {
    return this._isSuspended;
  }

  updateTargetInfo(targetInfo: Protocol.Target.TargetInfo): void {
    this._targetInfo = targetInfo;
  }

  targetInfo(): Protocol.Target.TargetInfo|undefined {
    return this._targetInfo;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Capability {
  Browser = 1 << 0,
  DOM = 1 << 1,
  JS = 1 << 2,
  Log = 1 << 3,
  Network = 1 << 4,
  Target = 1 << 5,
  ScreenCapture = 1 << 6,
  Tracing = 1 << 7,
  Emulation = 1 << 8,
  Security = 1 << 9,
  Input = 1 << 10,
  Inspector = 1 << 11,
  DeviceEmulation = 1 << 12,
  Storage = 1 << 13,
  ServiceWorker = 1 << 14,
  Audits = 1 << 15,
  WebAuthn = 1 << 16,
  IO = 1 << 17,
  None = 0,
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  Frame = 'frame',
  ServiceWorker = 'service-worker',
  Worker = 'worker',
  Node = 'node',
  Browser = 'browser',
}

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
      id: string, name: string, type: Type, parentTarget: Target|null, sessionId?: string,
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
