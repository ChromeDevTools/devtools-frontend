// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import {SDKModel} from './SDKModel.js';
import type {TargetManager} from './TargetManager.js';

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
    const needsNodeJSPatching = type === Type.NODE;
    super(needsNodeJSPatching, parentTarget, sessionId, connection);
    this.#targetManagerInternal = targetManager;
    this.#nameInternal = name;
    this.#inspectedURLInternal = Platform.DevToolsPath.EmptyUrlString;
    this.#inspectedURLName = '';
    this.#capabilitiesMask = 0;
    switch (type) {
      case Type.FRAME:
        this.#capabilitiesMask = Capability.BROWSER | Capability.STORAGE | Capability.DOM | Capability.JS |
            Capability.LOG | Capability.NETWORK | Capability.TARGET | Capability.TRACING | Capability.EMULATION |
            Capability.INPUT | Capability.INSPECTOR | Capability.AUDITS | Capability.WEB_AUTHN | Capability.IO |
            Capability.MEDIA | Capability.EVENT_BREAKPOINTS;
        if (parentTarget?.type() !== Type.FRAME) {
          // This matches backend exposing certain capabilities only for the main frame.
          this.#capabilitiesMask |=
              Capability.DEVICE_EMULATION | Capability.SCREEN_CAPTURE | Capability.SECURITY | Capability.SERVICE_WORKER;
          if (Common.ParsedURL.schemeIs(targetInfo?.url as Platform.DevToolsPath.UrlString, 'chrome-extension:')) {
            this.#capabilitiesMask &= ~Capability.SECURITY;
          }

          // TODO(dgozman): we report service workers for the whole frame tree on the main frame,
          // while we should be able to only cover the subtree corresponding to the target.
        }
        break;
      case Type.ServiceWorker:
        this.#capabilitiesMask = Capability.JS | Capability.LOG | Capability.NETWORK | Capability.TARGET |
            Capability.INSPECTOR | Capability.IO | Capability.EVENT_BREAKPOINTS;
        if (parentTarget?.type() !== Type.FRAME) {
          this.#capabilitiesMask |= Capability.BROWSER;
        }
        break;
      case Type.SHARED_WORKER:
        this.#capabilitiesMask = Capability.JS | Capability.LOG | Capability.NETWORK | Capability.TARGET |
            Capability.IO | Capability.MEDIA | Capability.INSPECTOR | Capability.EVENT_BREAKPOINTS;
        break;
      case Type.SHARED_STORAGE_WORKLET:
        this.#capabilitiesMask = Capability.JS | Capability.LOG | Capability.INSPECTOR | Capability.EVENT_BREAKPOINTS;
        break;
      case Type.Worker:
        this.#capabilitiesMask = Capability.JS | Capability.LOG | Capability.NETWORK | Capability.TARGET |
            Capability.IO | Capability.MEDIA | Capability.EMULATION | Capability.EVENT_BREAKPOINTS;
        break;
      case Type.WORKLET:
        this.#capabilitiesMask = Capability.JS | Capability.LOG | Capability.EVENT_BREAKPOINTS | Capability.NETWORK;
        break;
      case Type.NODE:
        this.#capabilitiesMask = Capability.JS;
        break;
      case Type.AUCTION_WORKLET:
        this.#capabilitiesMask = Capability.JS | Capability.EVENT_BREAKPOINTS;
        break;
      case Type.BROWSER:
        this.#capabilitiesMask = Capability.TARGET | Capability.IO;
        break;
      case Type.TAB:
        this.#capabilitiesMask = Capability.TARGET | Capability.TRACING;
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

  override markAsNodeJSForTest(): void {
    super.markAsNodeJSForTest();
    this.#typeInternal = Type.NODE;
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

  outermostTarget(): Target|null {
    let lastTarget: Target|null = null;
    let currentTarget: Target|null = this;
    do {
      if (currentTarget.type() !== Type.TAB && currentTarget.type() !== Type.BROWSER) {
        lastTarget = currentTarget;
      }
      currentTarget = currentTarget.parentTarget();
    } while (currentTarget);

    return lastTarget;
  }

  override dispose(reason: string): void {
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
          this.#targetManagerInternal.modelAdded(this, modelClass, model, this.#targetManagerInternal.isInScope(this));
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

export enum Type {
  FRAME = 'frame',
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  ServiceWorker = 'service-worker',
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  Worker = 'worker',
  SHARED_WORKER = 'shared-worker',
  SHARED_STORAGE_WORKLET = 'shared-storage-worklet',
  NODE = 'node',
  BROWSER = 'browser',
  AUCTION_WORKLET = 'auction-worklet',
  WORKLET = 'worklet',
  TAB = 'tab',
}

export const enum Capability {
  BROWSER = 1 << 0,
  DOM = 1 << 1,
  JS = 1 << 2,
  LOG = 1 << 3,
  NETWORK = 1 << 4,
  TARGET = 1 << 5,
  SCREEN_CAPTURE = 1 << 6,
  TRACING = 1 << 7,
  EMULATION = 1 << 8,
  SECURITY = 1 << 9,
  INPUT = 1 << 10,
  INSPECTOR = 1 << 11,
  DEVICE_EMULATION = 1 << 12,
  STORAGE = 1 << 13,
  SERVICE_WORKER = 1 << 14,
  AUDITS = 1 << 15,
  WEB_AUTHN = 1 << 16,
  IO = 1 << 17,
  MEDIA = 1 << 18,
  EVENT_BREAKPOINTS = 1 << 19,
  NONE = 0,
}
