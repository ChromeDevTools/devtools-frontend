// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the #name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {Events as RuntimeModelEvents, RuntimeModel, type ExecutionContext} from './RuntimeModel.js';

import {Capability, Type, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   *@description Service worker running status displayed in the Service Workers view in the Application panel
   */
  running: 'running',
  /**
   *@description Service worker running status displayed in the Service Workers view in the Application panel
   */
  starting: 'starting',
  /**
   *@description Service worker running status displayed in the Service Workers view in the Application panel
   */
  stopped: 'stopped',
  /**
   *@description Service worker running status displayed in the Service Workers view in the Application panel
   */
  stopping: 'stopping',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  activated: 'activated',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  activating: 'activating',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  installed: 'installed',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  installing: 'installing',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  new: 'new',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   */
  redundant: 'redundant',
  /**
   *@description Service worker version status displayed in the Threads view of the Debugging side pane in the Sources panel
   *@example {sw.js} PH1
   *@example {117} PH2
   *@example {activated} PH3
   */
  sSS: '{PH1} #{PH2} ({PH3})',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/ServiceWorkerManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ServiceWorkerManager extends SDKModel<EventTypes> {
  readonly #agent: ProtocolProxyApi.ServiceWorkerApi;
  readonly #registrationsInternal: Map<string, ServiceWorkerRegistration>;
  #enabled: boolean;
  readonly #forceUpdateSetting: Common.Settings.Setting<boolean>;
  serviceWorkerNetworkRequestsPanelStatus: {
    isOpen: boolean,
    openedAt: number,
  };

  constructor(target: Target) {
    super(target);
    target.registerServiceWorkerDispatcher(new ServiceWorkerDispatcher(this));
    this.#agent = target.serviceWorkerAgent();
    this.#registrationsInternal = new Map();
    this.#enabled = false;
    void this.enable();
    this.#forceUpdateSetting = Common.Settings.Settings.instance().createSetting('serviceWorkerUpdateOnReload', false);
    if (this.#forceUpdateSetting.get()) {
      this.forceUpdateSettingChanged();
    }
    this.#forceUpdateSetting.addChangeListener(this.forceUpdateSettingChanged, this);
    new ServiceWorkerContextNamer(target, this);

    /** Status of service worker network requests panel */
    this.serviceWorkerNetworkRequestsPanelStatus = {
      isOpen: false,
      openedAt: 0,
    };
  }

  async enable(): Promise<void> {
    if (this.#enabled) {
      return;
    }
    this.#enabled = true;
    await this.#agent.invoke_enable();
  }

  async disable(): Promise<void> {
    if (!this.#enabled) {
      return;
    }
    this.#enabled = false;
    this.#registrationsInternal.clear();
    await this.#agent.invoke_enable();
  }

  registrations(): Map<string, ServiceWorkerRegistration> {
    return this.#registrationsInternal;
  }

  hasRegistrationForURLs(urls: string[]): boolean {
    for (const registration of this.#registrationsInternal.values()) {
      if (urls.filter(url => url && url.startsWith(registration.scopeURL)).length === urls.length) {
        return true;
      }
    }
    return false;
  }

  findVersion(versionId: string): ServiceWorkerVersion|null {
    for (const registration of this.registrations().values()) {
      const version = registration.versions.get(versionId);
      if (version) {
        return version;
      }
    }
    return null;
  }

  deleteRegistration(registrationId: string): void {
    const registration = this.#registrationsInternal.get(registrationId);
    if (!registration) {
      return;
    }
    if (registration.isRedundant()) {
      this.#registrationsInternal.delete(registrationId);
      this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      return;
    }
    registration.deleting = true;
    for (const version of registration.versions.values()) {
      void this.stopWorker(version.id);
    }
    void this.unregister(registration.scopeURL);
  }

  async updateRegistration(registrationId: string): Promise<void> {
    const registration = this.#registrationsInternal.get(registrationId);
    if (!registration) {
      return;
    }
    await this.#agent.invoke_updateRegistration({scopeURL: registration.scopeURL});
  }

  async deliverPushMessage(registrationId: Protocol.ServiceWorker.RegistrationID, data: string): Promise<void> {
    const registration = this.#registrationsInternal.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this.#agent.invoke_deliverPushMessage({origin, registrationId, data});
  }

  async dispatchSyncEvent(registrationId: Protocol.ServiceWorker.RegistrationID, tag: string, lastChance: boolean):
      Promise<void> {
    const registration = this.#registrationsInternal.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this.#agent.invoke_dispatchSyncEvent({origin, registrationId, tag, lastChance});
  }

  async dispatchPeriodicSyncEvent(registrationId: Protocol.ServiceWorker.RegistrationID, tag: string): Promise<void> {
    const registration = this.#registrationsInternal.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this.#agent.invoke_dispatchPeriodicSyncEvent({origin, registrationId, tag});
  }

  private async unregister(scopeURL: string): Promise<void> {
    await this.#agent.invoke_unregister({scopeURL});
  }

  async startWorker(scopeURL: string): Promise<void> {
    await this.#agent.invoke_startWorker({scopeURL});
  }

  async skipWaiting(scopeURL: string): Promise<void> {
    await this.#agent.invoke_skipWaiting({scopeURL});
  }

  async stopWorker(versionId: string): Promise<void> {
    await this.#agent.invoke_stopWorker({versionId});
  }

  async inspectWorker(versionId: string): Promise<void> {
    await this.#agent.invoke_inspectWorker({versionId});
  }

  workerRegistrationUpdated(registrations: Protocol.ServiceWorker.ServiceWorkerRegistration[]): void {
    for (const payload of registrations) {
      let registration = this.#registrationsInternal.get(payload.registrationId);
      if (!registration) {
        registration = new ServiceWorkerRegistration(payload);
        this.#registrationsInternal.set(payload.registrationId, registration);
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
        continue;
      }
      registration.update(payload);

      if (registration.shouldBeRemoved()) {
        this.#registrationsInternal.delete(registration.id);
        this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      } else {
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
      }
    }
  }

  workerVersionUpdated(versions: Protocol.ServiceWorker.ServiceWorkerVersion[]): void {
    const registrations = new Set<ServiceWorkerRegistration>();
    for (const payload of versions) {
      const registration = this.#registrationsInternal.get(payload.registrationId);
      if (!registration) {
        continue;
      }
      registration.updateVersion(payload);
      registrations.add(registration);
    }
    for (const registration of registrations) {
      if (registration.shouldBeRemoved()) {
        this.#registrationsInternal.delete(registration.id);
        this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      } else {
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
      }
    }
  }

  workerErrorReported(payload: Protocol.ServiceWorker.ServiceWorkerErrorMessage): void {
    const registration = this.#registrationsInternal.get(payload.registrationId);
    if (!registration) {
      return;
    }
    registration.errors.push(payload);
    this.dispatchEventToListeners(Events.RegistrationErrorAdded, {registration: registration, error: payload});
  }

  forceUpdateOnReloadSetting(): Common.Settings.Setting<boolean> {
    return this.#forceUpdateSetting;
  }

  private forceUpdateSettingChanged(): void {
    const forceUpdateOnPageLoad = this.#forceUpdateSetting.get();
    void this.#agent.invoke_setForceUpdateOnPageLoad({forceUpdateOnPageLoad});
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RegistrationUpdated = 'RegistrationUpdated',
  RegistrationErrorAdded = 'RegistrationErrorAdded',
  RegistrationDeleted = 'RegistrationDeleted',
}

export interface RegistrationErrorAddedEvent {
  registration: ServiceWorkerRegistration;
  error: Protocol.ServiceWorker.ServiceWorkerErrorMessage;
}

export type EventTypes = {
  [Events.RegistrationUpdated]: ServiceWorkerRegistration,
  [Events.RegistrationErrorAdded]: RegistrationErrorAddedEvent,
  [Events.RegistrationDeleted]: ServiceWorkerRegistration,
};

class ServiceWorkerDispatcher implements ProtocolProxyApi.ServiceWorkerDispatcher {
  readonly #manager: ServiceWorkerManager;
  constructor(manager: ServiceWorkerManager) {
    this.#manager = manager;
  }

  workerRegistrationUpdated({registrations}: Protocol.ServiceWorker.WorkerRegistrationUpdatedEvent): void {
    this.#manager.workerRegistrationUpdated(registrations);
  }

  workerVersionUpdated({versions}: Protocol.ServiceWorker.WorkerVersionUpdatedEvent): void {
    this.#manager.workerVersionUpdated(versions);
  }

  workerErrorReported({errorMessage}: Protocol.ServiceWorker.WorkerErrorReportedEvent): void {
    this.#manager.workerErrorReported(errorMessage);
  }
}

/**
 * For every version, we keep a history of ServiceWorkerVersionState. Every time
 * a version is updated we will add a new state at the head of the history chain.
 * This history tells us information such as what the current state is, or when
 * the version becomes installed.
 */
export class ServiceWorkerVersionState {
  runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus;
  status: Protocol.ServiceWorker.ServiceWorkerVersionStatus;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  last_updated_timestamp: number;
  previousState: ServiceWorkerVersionState|null;
  constructor(
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus,
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus, previousState: ServiceWorkerVersionState|null,
      timestamp: number) {
    this.runningStatus = runningStatus;
    this.status = status;
    this.last_updated_timestamp = timestamp;
    this.previousState = previousState;
  }
}

export class ServiceWorkerVersion {
  id!: string;
  scriptURL!: Platform.DevToolsPath.UrlString;
  parsedURL!: Common.ParsedURL.ParsedURL;
  securityOrigin!: string;
  scriptLastModified!: number|undefined;
  scriptResponseTime!: number|undefined;
  controlledClients!: Protocol.Target.TargetID[];
  targetId!: string|null;
  currentState!: ServiceWorkerVersionState;
  registration: ServiceWorkerRegistration;
  constructor(registration: ServiceWorkerRegistration, payload: Protocol.ServiceWorker.ServiceWorkerVersion) {
    this.registration = registration;
    this.update(payload);
  }

  update(payload: Protocol.ServiceWorker.ServiceWorkerVersion): void {
    this.id = payload.versionId;
    this.scriptURL = payload.scriptURL as Platform.DevToolsPath.UrlString;
    const parsedURL = new Common.ParsedURL.ParsedURL(payload.scriptURL);
    this.securityOrigin = parsedURL.securityOrigin();
    this.currentState =
        new ServiceWorkerVersionState(payload.runningStatus, payload.status, this.currentState, Date.now());
    this.scriptLastModified = payload.scriptLastModified;
    this.scriptResponseTime = payload.scriptResponseTime;
    if (payload.controlledClients) {
      this.controlledClients = payload.controlledClients.slice();
    } else {
      this.controlledClients = [];
    }
    this.targetId = payload.targetId || null;
  }

  isStartable(): boolean {
    return !this.registration.isDeleted && this.isActivated() && this.isStopped();
  }

  isStoppedAndRedundant(): boolean {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped &&
        this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;
  }

  isStopped(): boolean {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped;
  }

  isStarting(): boolean {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting;
  }

  isRunning(): boolean {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running;
  }

  isStopping(): boolean {
    return this.runningStatus === Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopping;
  }

  isNew(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.New;
  }

  isInstalling(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing;
  }

  isInstalled(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed;
  }

  isActivating(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating;
  }

  isActivated(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated;
  }

  isRedundant(): boolean {
    return this.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant;
  }

  get status(): Protocol.ServiceWorker.ServiceWorkerVersionStatus {
    return this.currentState.status;
  }

  get runningStatus(): Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus {
    return this.currentState.runningStatus;
  }

  mode(): string {
    if (this.isNew() || this.isInstalling()) {
      return ServiceWorkerVersion.Modes.Installing;
    }
    if (this.isInstalled()) {
      return ServiceWorkerVersion.Modes.Waiting;
    }
    if (this.isActivating() || this.isActivated()) {
      return ServiceWorkerVersion.Modes.Active;
    }
    return ServiceWorkerVersion.Modes.Redundant;
  }
}

export namespace ServiceWorkerVersion {
  export const RunningStatus = {
    [Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running]: i18nLazyString(UIStrings.running),
    [Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting]: i18nLazyString(UIStrings.starting),
    [Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped]: i18nLazyString(UIStrings.stopped),
    [Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopping]: i18nLazyString(UIStrings.stopping),
  };

  export const Status = {
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated]: i18nLazyString(UIStrings.activated),
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating]: i18nLazyString(UIStrings.activating),
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed]: i18nLazyString(UIStrings.installed),
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing]: i18nLazyString(UIStrings.installing),
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.New]: i18nLazyString(UIStrings.new),
    [Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant]: i18nLazyString(UIStrings.redundant),
  };

  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Modes {
    Installing = 'installing',
    Waiting = 'waiting',
    Active = 'active',
    Redundant = 'redundant',
  }
}

export class ServiceWorkerRegistration {
  #fingerprintInternal!: symbol;
  id!: Protocol.ServiceWorker.RegistrationID;
  scopeURL!: Platform.DevToolsPath.UrlString;
  securityOrigin!: Platform.DevToolsPath.UrlString;
  isDeleted!: boolean;
  versions: Map<string, ServiceWorkerVersion>;
  deleting: boolean;
  errors: Protocol.ServiceWorker.ServiceWorkerErrorMessage[];

  constructor(payload: Protocol.ServiceWorker.ServiceWorkerRegistration) {
    this.update(payload);
    this.versions = new Map();
    this.deleting = false;
    this.errors = [];
  }

  update(payload: Protocol.ServiceWorker.ServiceWorkerRegistration): void {
    this.#fingerprintInternal = Symbol('fingerprint');
    this.id = payload.registrationId;
    this.scopeURL = payload.scopeURL as Platform.DevToolsPath.UrlString;
    const parsedURL = new Common.ParsedURL.ParsedURL(payload.scopeURL);
    this.securityOrigin = parsedURL.securityOrigin();
    this.isDeleted = payload.isDeleted;
  }

  fingerprint(): symbol {
    return this.#fingerprintInternal;
  }

  versionsByMode(): Map<string, ServiceWorkerVersion> {
    const result = new Map<string, ServiceWorkerVersion>();
    for (const version of this.versions.values()) {
      result.set(version.mode(), version);
    }
    return result;
  }

  updateVersion(payload: Protocol.ServiceWorker.ServiceWorkerVersion): ServiceWorkerVersion {
    this.#fingerprintInternal = Symbol('fingerprint');
    let version = this.versions.get(payload.versionId);
    if (!version) {
      version = new ServiceWorkerVersion(this, payload);
      this.versions.set(payload.versionId, version);
      return version;
    }
    version.update(payload);
    return version;
  }

  isRedundant(): boolean {
    for (const version of this.versions.values()) {
      if (!version.isStoppedAndRedundant()) {
        return false;
      }
    }
    return true;
  }

  shouldBeRemoved(): boolean {
    return this.isRedundant() && (!this.errors.length || this.deleting);
  }

  canBeRemoved(): boolean {
    return this.isDeleted || this.deleting;
  }

  clearErrors(): void {
    this.#fingerprintInternal = Symbol('fingerprint');
    this.errors = [];
  }
}

class ServiceWorkerContextNamer {
  readonly #target: Target;
  readonly #serviceWorkerManager: ServiceWorkerManager;
  readonly #versionByTargetId: Map<string, ServiceWorkerVersion>;

  constructor(target: Target, serviceWorkerManager: ServiceWorkerManager) {
    this.#target = target;
    this.#serviceWorkerManager = serviceWorkerManager;
    this.#versionByTargetId = new Map();
    serviceWorkerManager.addEventListener(Events.RegistrationUpdated, this.registrationsUpdated, this);
    serviceWorkerManager.addEventListener(Events.RegistrationDeleted, this.registrationsUpdated, this);
    TargetManager.instance().addModelListener(
        RuntimeModel, RuntimeModelEvents.ExecutionContextCreated, this.executionContextCreated, this);
  }

  private registrationsUpdated(): void {
    this.#versionByTargetId.clear();
    const registrations = this.#serviceWorkerManager.registrations().values();
    for (const registration of registrations) {
      for (const version of registration.versions.values()) {
        if (version.targetId) {
          this.#versionByTargetId.set(version.targetId, version);
        }
      }
    }
    this.updateAllContextLabels();
  }

  private executionContextCreated(event: Common.EventTarget.EventTargetEvent<ExecutionContext>): void {
    const executionContext = event.data;
    const serviceWorkerTargetId = this.serviceWorkerTargetId(executionContext.target());
    if (!serviceWorkerTargetId) {
      return;
    }
    this.updateContextLabel(executionContext, this.#versionByTargetId.get(serviceWorkerTargetId) || null);
  }

  private serviceWorkerTargetId(target: Target): string|null {
    if (target.parentTarget() !== this.#target || target.type() !== Type.ServiceWorker) {
      return null;
    }
    return target.id();
  }

  private updateAllContextLabels(): void {
    for (const target of TargetManager.instance().targets()) {
      const serviceWorkerTargetId = this.serviceWorkerTargetId(target);
      if (!serviceWorkerTargetId) {
        continue;
      }
      const version = this.#versionByTargetId.get(serviceWorkerTargetId) || null;
      const runtimeModel = target.model(RuntimeModel);
      const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
      for (const context of executionContexts) {
        this.updateContextLabel(context, version);
      }
    }
  }

  private updateContextLabel(context: ExecutionContext, version: ServiceWorkerVersion|null): void {
    if (!version) {
      context.setLabel('');
      return;
    }
    const parsedUrl = Common.ParsedURL.ParsedURL.fromString(context.origin);
    const label = parsedUrl ? parsedUrl.lastPathComponentWithFragment() : context.name;
    const localizedStatus = ServiceWorkerVersion.Status[version.status];
    context.setLabel(i18nString(UIStrings.sSS, {PH1: label, PH2: version.id, PH3: localizedStatus()}));
  }
}

SDKModel.register(ServiceWorkerManager, {capabilities: Capability.ServiceWorker, autostart: true});
