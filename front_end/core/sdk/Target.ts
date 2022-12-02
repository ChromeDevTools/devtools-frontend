// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';
import {type TargetManager} from './TargetManager.js';
import {SDKModel} from './SDKModel.js';

export class Target extends ProtocolClient.InspectorBackend.TargetBase {
  readonly #targetManagerInternal: TargetManager;
  #nameInternal: string;
  #inspectedURLInternal: Platform.DevToolsPath.UrlString;
  #inspectedURLName: string;
  readonly #capabilitiesMask: number;
  #typeInternal: Type;
  readonly #parentTargetInternal: Target|null;
  #idInternal: Protocol.Target.TargetID|'main';
  #modelByConstructor: Map<new(arg1: Target) => SDKModel, SDKModel>;
  #isSuspended: boolean;
  #targetInfoInternal: Protocol.Target.TargetInfo|undefined;
  #creatingModels?: boolean;

  constructor(
      targetManager: TargetManager, id: Protocol.Target.TargetID|'main', name: string, type: Type,
      parentTarget: Target|null, sessionId: string, suspended: boolean,
      connection: ProtocolClient.InspectorBackend.Connection|null, targetInfo?: Protocol.Target.TargetInfo) {
    const needsNodeJSPatching = type === Type.Node;
    super(needsNodeJSPatching, parentTarget, sessionId, connection);
    this.#targetManagerInternal = targetManager;
    this.#nameInternal = name;
    this.#inspectedURLInternal = Platform.DevToolsPath.EmptyUrlString;
    this.#inspectedURLName = '';
    this.#capabilitiesMask = 0;
    switch (type) {
      case Type.Frame:
        this.#capabilitiesMask = Capability.Browser | Capability.Storage | Capability.DOM | Capability.JS |
            Capability.Log | Capability.Network | Capability.Target | Capability.Tracing | Capability.Emulation |
            Capability.Input | Capability.Inspector | Capability.Audits | Capability.WebAuthn | Capability.IO |
            Capability.Media;
        if (parentTarget?.type() !== Type.Frame) {
          // This matches backend exposing certain capabilities only for the main frame.
          this.#capabilitiesMask |=
              Capability.DeviceEmulation | Capability.ScreenCapture | Capability.Security | Capability.ServiceWorker;
          // TODO(dgozman): we report service workers for the whole frame tree on the main frame,
          // while we should be able to only cover the subtree corresponding to the target.
        }
        break;
      case Type.ServiceWorker:
        this.#capabilitiesMask = Capability.JS | Capability.Log | Capability.Network | Capability.Target |
            Capability.Inspector | Capability.IO;
        if (parentTarget?.type() !== Type.Frame) {
          this.#capabilitiesMask |= Capability.Browser;
        }
        break;
      case Type.SharedWorker:
        this.#capabilitiesMask = Capability.JS | Capability.Log | Capability.Network | Capability.Target |
            Capability.IO | Capability.Media | Capability.Inspector;
        break;
      case Type.Worker:
        this.#capabilitiesMask = Capability.JS | Capability.Log | Capability.Network | Capability.Target |
            Capability.IO | Capability.Media | Capability.Emulation;
        break;
      case Type.Node:
        this.#capabilitiesMask = Capability.JS;
        break;
      case Type.AuctionWorklet:
        this.#capabilitiesMask = Capability.JS | Capability.EventBreakpoints;
        break;
      case Type.Browser:
        this.#capabilitiesMask = Capability.Target | Capability.IO;
        break;
      case Type.Tab:
        this.#capabilitiesMask = Capability.Target;
        break;
    }
    this.#typeInternal = type;
    this.#parentTargetInternal = parentTarget;
    this.#idInternal = id;
    /* } */
    this.#modelByConstructor = new Map();
    this.#isSuspended = suspended;
    this.#targetInfoInternal = targetInfo;
  }

  createModels(required: Set<new(arg1: Target) => SDKModel>): void {
    this.#creatingModels = true;
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
    this.#creatingModels = false;
  }

  id(): Protocol.Target.TargetID|'main' {
    return this.#idInternal;
  }

  name(): string {
    return this.#nameInternal || this.#inspectedURLName;
  }

  setName(name: string): void {
    if (this.#nameInternal === name) {
      return;
    }
    this.#nameInternal = name;
    this.#targetManagerInternal.onNameChange(this);
  }

  type(): Type {
    return this.#typeInternal;
  }

  markAsNodeJSForTest(): void {
    super.markAsNodeJSForTest();
    this.#typeInternal = Type.Node;
  }

  targetManager(): TargetManager {
    return this.#targetManagerInternal;
  }

  hasAllCapabilities(capabilitiesMask: number): boolean {
    // TODO(dgozman): get rid of this method, once we never observe targets with
    // capability mask.
    return (this.#capabilitiesMask & capabilitiesMask) === capabilitiesMask;
  }

  decorateLabel(label: string): string {
    return (this.#typeInternal === Type.Worker || this.#typeInternal === Type.ServiceWorker) ? '\u2699 ' + label :
                                                                                               label;
  }

  parentTarget(): Target|null {
    return this.#parentTargetInternal;
  }

  dispose(reason: string): void {
    super.dispose(reason);
    this.#targetManagerInternal.removeTarget(this);
    for (const model of this.#modelByConstructor.values()) {
      model.dispose();
    }
  }

  model<T extends SDKModel>(modelClass: new(arg1: Target) => T): T|null {
    if (!this.#modelByConstructor.get(modelClass)) {
      const info = SDKModel.registeredModels.get(modelClass);
      if (info === undefined) {
        throw 'Model class is not registered @' + new Error().stack;
      }
      if ((this.#capabilitiesMask & info.capabilities) === info.capabilities) {
        const model = new modelClass(this);
        this.#modelByConstructor.set(modelClass, model);
        if (!this.#creatingModels) {
          this.#targetManagerInternal.modelAdded(this, modelClass, model);
        }
      }
    }
    return (this.#modelByConstructor.get(modelClass) as T) || null;
  }

  models(): Map<new(arg1: Target) => SDKModel, SDKModel> {
    return this.#modelByConstructor;
  }

  inspectedURL(): Platform.DevToolsPath.UrlString {
    return this.#inspectedURLInternal;
  }

  setInspectedURL(inspectedURL: Platform.DevToolsPath.UrlString): void {
    this.#inspectedURLInternal = inspectedURL;
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(inspectedURL);
    this.#inspectedURLName = parsedURL ? parsedURL.lastPathComponentWithFragment() : '#' + this.#idInternal;
    if (this.parentTarget()?.type() !== Type.Frame) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(
          inspectedURL || Platform.DevToolsPath.EmptyUrlString);
    }
    this.#targetManagerInternal.onInspectedURLChange(this);
    if (!this.#nameInternal) {
      this.#targetManagerInternal.onNameChange(this);
    }
  }

  async suspend(reason?: string): Promise<void> {
    if (this.#isSuspended) {
      return;
    }
    this.#isSuspended = true;

    await Promise.all(Array.from(this.models().values(), m => m.preSuspendModel(reason)));
    await Promise.all(Array.from(this.models().values(), m => m.suspendModel(reason)));
  }

  async resume(): Promise<void> {
    if (!this.#isSuspended) {
      return;
    }
    this.#isSuspended = false;

    await Promise.all(Array.from(this.models().values(), m => m.resumeModel()));
    await Promise.all(Array.from(this.models().values(), m => m.postResumeModel()));
  }

  suspended(): boolean {
    return this.#isSuspended;
  }

  updateTargetInfo(targetInfo: Protocol.Target.TargetInfo): void {
    this.#targetInfoInternal = targetInfo;
  }

  targetInfo(): Protocol.Target.TargetInfo|undefined {
    return this.#targetInfoInternal;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  Frame = 'frame',
  ServiceWorker = 'service-worker',
  Worker = 'worker',
  SharedWorker = 'shared-worker',
  Node = 'node',
  Browser = 'browser',
  AuctionWorklet = 'auction-worklet',
  Tab = 'tab',
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
  EventBreakpoints = 1 << 19,
  None = 0,
}
