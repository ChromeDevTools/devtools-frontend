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
 *     * Neither the name of Google Inc. nor the names of its
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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import type {ExecutionContext} from './RuntimeModel.js';
import {Events as RuntimeModelEvents, RuntimeModel} from './RuntimeModel.js';  // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel, TargetManager, Type} from './SDKModel.js';  // eslint-disable-line no-unused-vars

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

export class ServiceWorkerManager extends SDKModel {
  _lastAnonymousTargetId: number;
  _agent: ProtocolProxyApi.ServiceWorkerApi;
  _registrations: Map<string, ServiceWorkerRegistration>;
  _enabled: boolean;
  _forceUpdateSetting: Common.Settings.Setting<boolean>;
  serviceWorkerNetworkRequestsPanelStatus: {
    isOpen: boolean,
    openedAt: number,
  };

  constructor(target: Target) {
    super(target);
    target.registerServiceWorkerDispatcher(new ServiceWorkerDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.serviceWorkerAgent();
    this._registrations = new Map();
    this._enabled = false;
    this.enable();
    this._forceUpdateSetting = Common.Settings.Settings.instance().createSetting('serviceWorkerUpdateOnReload', false);
    if (this._forceUpdateSetting.get()) {
      this._forceUpdateSettingChanged();
    }
    this._forceUpdateSetting.addChangeListener(this._forceUpdateSettingChanged, this);
    new ServiceWorkerContextNamer(target, this);

    /** Status of service worker network requests panel */
    this.serviceWorkerNetworkRequestsPanelStatus = {
      isOpen: false,
      openedAt: 0,
    };
  }

  async enable(): Promise<void> {
    if (this._enabled) {
      return;
    }
    this._enabled = true;
    await this._agent.invoke_enable();
  }

  async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }
    this._enabled = false;
    this._registrations.clear();
    await this._agent.invoke_enable();
  }

  registrations(): Map<string, ServiceWorkerRegistration> {
    return this._registrations;
  }

  hasRegistrationForURLs(urls: string[]): boolean {
    for (const registration of this._registrations.values()) {
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
    const registration = this._registrations.get(registrationId);
    if (!registration) {
      return;
    }
    if (registration._isRedundant()) {
      this._registrations.delete(registrationId);
      this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      return;
    }
    registration._deleting = true;
    for (const version of registration.versions.values()) {
      this.stopWorker(version.id);
    }
    this._unregister(registration.scopeURL);
  }

  async updateRegistration(registrationId: string): Promise<void> {
    const registration = this._registrations.get(registrationId);
    if (!registration) {
      return;
    }
    await this._agent.invoke_updateRegistration({scopeURL: registration.scopeURL});
  }

  async deliverPushMessage(registrationId: string, data: string): Promise<void> {
    const registration = this._registrations.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this._agent.invoke_deliverPushMessage({origin, registrationId, data});
  }

  async dispatchSyncEvent(registrationId: string, tag: string, lastChance: boolean): Promise<void> {
    const registration = this._registrations.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this._agent.invoke_dispatchSyncEvent({origin, registrationId, tag, lastChance});
  }

  async dispatchPeriodicSyncEvent(registrationId: string, tag: string): Promise<void> {
    const registration = this._registrations.get(registrationId);
    if (!registration) {
      return;
    }
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(registration.scopeURL);
    await this._agent.invoke_dispatchPeriodicSyncEvent({origin, registrationId, tag});
  }

  async _unregister(scopeURL: string): Promise<void> {
    await this._agent.invoke_unregister({scopeURL});
  }

  async startWorker(scopeURL: string): Promise<void> {
    await this._agent.invoke_startWorker({scopeURL});
  }

  async skipWaiting(scopeURL: string): Promise<void> {
    await this._agent.invoke_skipWaiting({scopeURL});
  }

  async stopWorker(versionId: string): Promise<void> {
    await this._agent.invoke_stopWorker({versionId});
  }

  async inspectWorker(versionId: string): Promise<void> {
    await this._agent.invoke_inspectWorker({versionId});
  }

  _workerRegistrationUpdated(registrations: Protocol.ServiceWorker.ServiceWorkerRegistration[]): void {
    for (const payload of registrations) {
      let registration = this._registrations.get(payload.registrationId);
      if (!registration) {
        registration = new ServiceWorkerRegistration(payload);
        this._registrations.set(payload.registrationId, registration);
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
        continue;
      }
      registration._update(payload);

      if (registration._shouldBeRemoved()) {
        this._registrations.delete(registration.id);
        this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      } else {
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
      }
    }
  }

  _workerVersionUpdated(versions: Protocol.ServiceWorker.ServiceWorkerVersion[]): void {
    const registrations = new Set<ServiceWorkerRegistration>();
    for (const payload of versions) {
      const registration = this._registrations.get(payload.registrationId);
      if (!registration) {
        continue;
      }
      registration._updateVersion(payload);
      registrations.add(registration);
    }
    for (const registration of registrations) {
      if (registration._shouldBeRemoved()) {
        this._registrations.delete(registration.id);
        this.dispatchEventToListeners(Events.RegistrationDeleted, registration);
      } else {
        this.dispatchEventToListeners(Events.RegistrationUpdated, registration);
      }
    }
  }

  _workerErrorReported(payload: Protocol.ServiceWorker.ServiceWorkerErrorMessage): void {
    const registration = this._registrations.get(payload.registrationId);
    if (!registration) {
      return;
    }
    registration.errors.push(payload);
    this.dispatchEventToListeners(Events.RegistrationErrorAdded, {registration: registration, error: payload});
  }

  forceUpdateOnReloadSetting(): Common.Settings.Setting<boolean> {
    return this._forceUpdateSetting;
  }

  _forceUpdateSettingChanged(): void {
    const forceUpdateOnPageLoad = this._forceUpdateSetting.get();
    this._agent.invoke_setForceUpdateOnPageLoad({forceUpdateOnPageLoad});
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RegistrationUpdated = 'RegistrationUpdated',
  RegistrationErrorAdded = 'RegistrationErrorAdded',
  RegistrationDeleted = 'RegistrationDeleted',
}


class ServiceWorkerDispatcher implements ProtocolProxyApi.ServiceWorkerDispatcher {
  _manager: ServiceWorkerManager;
  constructor(manager: ServiceWorkerManager) {
    this._manager = manager;
  }

  workerRegistrationUpdated({registrations}: Protocol.ServiceWorker.WorkerRegistrationUpdatedEvent): void {
    this._manager._workerRegistrationUpdated(registrations);
  }

  workerVersionUpdated({versions}: Protocol.ServiceWorker.WorkerVersionUpdatedEvent): void {
    this._manager._workerVersionUpdated(versions);
  }

  workerErrorReported({errorMessage}: Protocol.ServiceWorker.WorkerErrorReportedEvent): void {
    this._manager._workerErrorReported(errorMessage);
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
  scriptURL!: string;
  parsedURL!: Common.ParsedURL.ParsedURL;
  securityOrigin!: string;
  scriptLastModified!: number|undefined;
  scriptResponseTime!: number|undefined;
  controlledClients!: string[];
  targetId!: string|null;
  currentState!: ServiceWorkerVersionState;
  registration: ServiceWorkerRegistration;
  constructor(registration: ServiceWorkerRegistration, payload: Protocol.ServiceWorker.ServiceWorkerVersion) {
    this.registration = registration;
    this._update(payload);
  }

  _update(payload: Protocol.ServiceWorker.ServiceWorkerVersion): void {
    this.id = payload.versionId;
    this.scriptURL = payload.scriptURL;
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
  _fingerprint!: symbol;
  id!: string;
  scopeURL!: string;
  securityOrigin!: string;
  isDeleted!: boolean;
  versions: Map<string, ServiceWorkerVersion>;
  _deleting: boolean;
  errors: Protocol.ServiceWorker.ServiceWorkerErrorMessage[];

  constructor(payload: Protocol.ServiceWorker.ServiceWorkerRegistration) {
    this._update(payload);
    this.versions = new Map();
    this._deleting = false;
    this.errors = [];
  }

  _update(payload: Protocol.ServiceWorker.ServiceWorkerRegistration): void {
    this._fingerprint = Symbol('fingerprint');
    this.id = payload.registrationId;
    this.scopeURL = payload.scopeURL;
    const parsedURL = new Common.ParsedURL.ParsedURL(payload.scopeURL);
    this.securityOrigin = parsedURL.securityOrigin();
    this.isDeleted = payload.isDeleted;
  }

  fingerprint(): symbol {
    return this._fingerprint;
  }

  versionsByMode(): Map<string, ServiceWorkerVersion> {
    const result = new Map<string, ServiceWorkerVersion>();
    for (const version of this.versions.values()) {
      result.set(version.mode(), version);
    }
    return result;
  }

  _updateVersion(payload: Protocol.ServiceWorker.ServiceWorkerVersion): ServiceWorkerVersion {
    this._fingerprint = Symbol('fingerprint');
    let version = this.versions.get(payload.versionId);
    if (!version) {
      version = new ServiceWorkerVersion(this, payload);
      this.versions.set(payload.versionId, version);
      return version;
    }
    version._update(payload);
    return version;
  }

  _isRedundant(): boolean {
    for (const version of this.versions.values()) {
      if (!version.isStoppedAndRedundant()) {
        return false;
      }
    }
    return true;
  }

  _shouldBeRemoved(): boolean {
    return this._isRedundant() && (!this.errors.length || this._deleting);
  }

  canBeRemoved(): boolean {
    return this.isDeleted || this._deleting;
  }

  clearErrors(): void {
    this._fingerprint = Symbol('fingerprint');
    this.errors = [];
  }
}

class ServiceWorkerContextNamer {
  _target: Target;
  _serviceWorkerManager: ServiceWorkerManager;
  _versionByTargetId: Map<string, ServiceWorkerVersion>;

  constructor(target: Target, serviceWorkerManager: ServiceWorkerManager) {
    this._target = target;
    this._serviceWorkerManager = serviceWorkerManager;
    this._versionByTargetId = new Map();
    serviceWorkerManager.addEventListener(Events.RegistrationUpdated, this._registrationsUpdated, this);
    serviceWorkerManager.addEventListener(Events.RegistrationDeleted, this._registrationsUpdated, this);
    TargetManager.instance().addModelListener(
        RuntimeModel, RuntimeModelEvents.ExecutionContextCreated, this._executionContextCreated, this);
  }

  _registrationsUpdated(_event: Common.EventTarget.EventTargetEvent): void {
    this._versionByTargetId.clear();
    const registrations = this._serviceWorkerManager.registrations().values();
    for (const registration of registrations) {
      for (const version of registration.versions.values()) {
        if (version.targetId) {
          this._versionByTargetId.set(version.targetId, version);
        }
      }
    }
    this._updateAllContextLabels();
  }

  _executionContextCreated(event: Common.EventTarget.EventTargetEvent): void {
    const executionContext = (event.data as ExecutionContext);
    const serviceWorkerTargetId = this._serviceWorkerTargetId(executionContext.target());
    if (!serviceWorkerTargetId) {
      return;
    }
    this._updateContextLabel(executionContext, this._versionByTargetId.get(serviceWorkerTargetId) || null);
  }

  _serviceWorkerTargetId(target: Target): string|null {
    if (target.parentTarget() !== this._target || target.type() !== Type.ServiceWorker) {
      return null;
    }
    return target.id();
  }

  _updateAllContextLabels(): void {
    for (const target of TargetManager.instance().targets()) {
      const serviceWorkerTargetId = this._serviceWorkerTargetId(target);
      if (!serviceWorkerTargetId) {
        continue;
      }
      const version = this._versionByTargetId.get(serviceWorkerTargetId) || null;
      const runtimeModel = target.model(RuntimeModel);
      const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
      for (const context of executionContexts) {
        this._updateContextLabel(context, version);
      }
    }
  }

  _updateContextLabel(context: ExecutionContext, version: ServiceWorkerVersion|null): void {
    if (!version) {
      context.setLabel('');
      return;
    }
    const parsedUrl = Common.ParsedURL.ParsedURL.fromString(context.origin);
    const label = parsedUrl ? parsedUrl.lastPathComponentWithFragment() : context.name;
    const localizedStatus = ServiceWorkerVersion.Status[version.status];
    context.setLabel(i18nString(UIStrings.sSS, {PH1: label, PH2: version.id, PH3: localizedStatus}));
  }
}

SDKModel.register(ServiceWorkerManager, {capabilities: Capability.ServiceWorker, autostart: true});
