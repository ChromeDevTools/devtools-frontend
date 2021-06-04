// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';
import type {TargetManager} from './TargetManager.js';
import {SDKModel} from './SDKModel.js';

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
            Capability.Input | Capability.Inspector | Capability.Audits | Capability.WebAuthn | Capability.IO |
            Capability.Media;
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
            Capability.JS | Capability.Log | Capability.Network | Capability.Target | Capability.IO | Capability.Media;
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
    this._targetManager.onInspectedURLChange(this);
    if (!this._name) {
      this._targetManager.onNameChange(this);
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
export enum Type {
  Frame = 'frame',
  ServiceWorker = 'service-worker',
  Worker = 'worker',
  Node = 'node',
  Browser = 'browser',
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
  Media = 1 << 18,
  None = 0,
}
