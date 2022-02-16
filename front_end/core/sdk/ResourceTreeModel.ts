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

import type {DeferredDOMNode, DOMNode} from './DOMModel.js';
import {DOMModel} from './DOMModel.js';
import type {RequestUpdateDroppedEventData} from './NetworkManager.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import type {NetworkRequest} from './NetworkRequest.js';
import {Resource} from './Resource.js';
import {ExecutionContext, RuntimeModel} from './RuntimeModel.js';
import type {Target} from './Target.js';
import {Capability} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {TargetManager} from './TargetManager.js';
import {SecurityOriginManager} from './SecurityOriginManager.js';

// TODO(crbug.com/1253323): Casts to UrlString will be removed from this file when migration to branded types is complete.

export class ResourceTreeModel extends SDKModel<EventTypes> {
  readonly agent: ProtocolProxyApi.PageApi;
  readonly #securityOriginManager: SecurityOriginManager;
  readonly framesInternal: Map<string, ResourceTreeFrame>;
  #cachedResourcesProcessed: boolean;
  #pendingReloadOptions: {
    ignoreCache: (boolean|undefined),
    scriptToEvaluateOnLoad: (string|undefined),
  }|null;
  #reloadSuspensionCount: number;
  isInterstitialShowing: boolean;
  mainFrame: ResourceTreeFrame|null;
  #pendingBackForwardCacheNotUsedEvents: Set<Protocol.Page.BackForwardCacheNotUsedEvent>;

  constructor(target: Target) {
    super(target);

    const networkManager = target.model(NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this.onRequestFinished, this);
      networkManager.addEventListener(NetworkManagerEvents.RequestUpdateDropped, this.onRequestUpdateDropped, this);
    }
    this.agent = target.pageAgent();
    void this.agent.invoke_enable();
    this.#securityOriginManager = (target.model(SecurityOriginManager) as SecurityOriginManager);
    this.#pendingBackForwardCacheNotUsedEvents = new Set<Protocol.Page.BackForwardCacheNotUsedEvent>();
    target.registerPageDispatcher(new PageDispatcher(this));

    this.framesInternal = new Map();
    this.#cachedResourcesProcessed = false;
    this.#pendingReloadOptions = null;
    this.#reloadSuspensionCount = 0;
    this.isInterstitialShowing = false;
    this.mainFrame = null;

    void this.agent.invoke_getResourceTree().then(event => {
      this.processCachedResources(event.getError() ? null : event.frameTree);
    });
  }

  static frameForRequest(request: NetworkRequest): ResourceTreeFrame|null {
    const networkManager = NetworkManager.forRequest(request);
    const resourceTreeModel = networkManager ? networkManager.target().model(ResourceTreeModel) : null;
    if (!resourceTreeModel) {
      return null;
    }
    return request.frameId ? resourceTreeModel.frameForId(request.frameId) : null;
  }

  static frames(): ResourceTreeFrame[] {
    const result = [];
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      result.push(...resourceTreeModel.framesInternal.values());
    }
    return result;
  }

  static resourceForURL(url: string): Resource|null {
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      const mainFrame = resourceTreeModel.mainFrame;
      const result = mainFrame ? mainFrame.resourceForURL(url) : null;
      if (result) {
        return result;
      }
    }
    return null;
  }

  static reloadAllPages(bypassCache?: boolean, scriptToEvaluateOnLoad?: string): void {
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      if (!resourceTreeModel.target().parentTarget()) {
        resourceTreeModel.reloadPage(bypassCache, scriptToEvaluateOnLoad);
      }
    }
  }

  domModel(): DOMModel {
    return this.target().model(DOMModel) as DOMModel;
  }

  private processCachedResources(mainFramePayload: Protocol.Page.FrameResourceTree|null): void {
    // TODO(caseq): the url check below is a mergeable, conservative
    // workaround for a problem caused by us requesting resources from a
    // subtarget frame before it has committed. The proper fix is likely
    // to be too complicated to be safely merged.
    // See https://crbug.com/1081270 for details.
    if (mainFramePayload && mainFramePayload.frame.url !== ':') {
      this.dispatchEventToListeners(Events.WillLoadCachedResources);
      this.addFramesRecursively(null, mainFramePayload);
      this.target().setInspectedURL(mainFramePayload.frame.url);
    }
    this.#cachedResourcesProcessed = true;
    const runtimeModel = this.target().model(RuntimeModel);
    if (runtimeModel) {
      runtimeModel.setExecutionContextComparator(this.executionContextComparator.bind(this));
      runtimeModel.fireExecutionContextOrderChanged();
    }
    this.dispatchEventToListeners(Events.CachedResourcesLoaded, this);
  }

  cachedResourcesLoaded(): boolean {
    return this.#cachedResourcesProcessed;
  }

  private addFrame(frame: ResourceTreeFrame, _aboutToNavigate?: boolean): void {
    this.framesInternal.set(frame.id, frame);
    if (frame.isMainFrame()) {
      this.mainFrame = frame;
    }
    this.dispatchEventToListeners(Events.FrameAdded, frame);
    this.updateSecurityOrigins();
  }

  frameAttached(
      frameId: Protocol.Page.FrameId, parentFrameId: Protocol.Page.FrameId|null,
      stackTrace?: Protocol.Runtime.StackTrace): ResourceTreeFrame|null {
    const sameTargetParentFrame = parentFrameId ? (this.framesInternal.get(parentFrameId) || null) : null;
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this.#cachedResourcesProcessed && sameTargetParentFrame) {
      return null;
    }
    if (this.framesInternal.has(frameId)) {
      return null;
    }

    const frame = new ResourceTreeFrame(this, sameTargetParentFrame, frameId, null, stackTrace || null);
    if (parentFrameId && !sameTargetParentFrame) {
      frame.crossTargetParentFrameId = parentFrameId;
    }
    if (frame.isMainFrame() && this.mainFrame) {
      // Navigation to the new backend process.
      this.frameDetached(this.mainFrame.id, false);
    }
    this.addFrame(frame, true);
    return frame;
  }

  frameNavigated(framePayload: Protocol.Page.Frame, type: Protocol.Page.NavigationType|undefined): void {
    const sameTargetParentFrame =
        framePayload.parentId ? (this.framesInternal.get(framePayload.parentId) || null) : null;
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this.#cachedResourcesProcessed && sameTargetParentFrame) {
      return;
    }
    let frame: (ResourceTreeFrame|null) = this.framesInternal.get(framePayload.id) || null;
    if (!frame) {
      // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
      frame = this.frameAttached(framePayload.id, framePayload.parentId || null);
      console.assert(Boolean(frame));
      if (!frame) {
        return;
      }
    }

    this.dispatchEventToListeners(Events.FrameWillNavigate, frame);
    frame.navigate(framePayload);
    if (type) {
      frame.backForwardCacheDetails.restoredFromCache = type === Protocol.Page.NavigationType.BackForwardCacheRestore;
    }
    this.dispatchEventToListeners(Events.FrameNavigated, frame);

    if (frame.isMainFrame()) {
      this.processPendingBackForwardCacheNotUsedEvents(frame);
      this.dispatchEventToListeners(Events.MainFrameNavigated, frame);
      const networkManager = this.target().model(NetworkManager);
      if (networkManager) {
        networkManager.clearRequests();
      }
    }

    // Fill frame with retained resources (the ones loaded using new loader).
    const resources = frame.resources();
    for (let i = 0; i < resources.length; ++i) {
      this.dispatchEventToListeners(Events.ResourceAdded, resources[i]);
    }

    if (frame.isMainFrame()) {
      this.target().setInspectedURL(frame.url);
    }
    this.updateSecurityOrigins();
  }

  documentOpened(framePayload: Protocol.Page.Frame): void {
    this.frameNavigated(framePayload, undefined);
    const frame = this.framesInternal.get(framePayload.id);
    if (frame && !frame.getResourcesMap().get(framePayload.url)) {
      const frameResource = this.createResourceFromFramePayload(
          framePayload, framePayload.url as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.Document,
          framePayload.mimeType, null, null);
      frameResource.isGenerated = true;
      frame.addResource(frameResource);
    }
  }

  frameDetached(frameId: Protocol.Page.FrameId, isSwap: boolean): void {
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this.#cachedResourcesProcessed) {
      return;
    }

    const frame = this.framesInternal.get(frameId);
    if (!frame) {
      return;
    }

    const sameTargetParentFrame = frame.sameTargetParentFrame();
    if (sameTargetParentFrame) {
      sameTargetParentFrame.removeChildFrame(frame, isSwap);
    } else {
      frame.remove(isSwap);
    }
    this.updateSecurityOrigins();
  }

  private onRequestFinished(event: Common.EventTarget.EventTargetEvent<NetworkRequest>): void {
    if (!this.#cachedResourcesProcessed) {
      return;
    }

    const request = event.data;
    if (request.failed || request.resourceType() === Common.ResourceType.resourceTypes.XHR) {
      return;
    }

    const frame = request.frameId ? this.framesInternal.get(request.frameId) : null;
    if (frame) {
      frame.addRequest(request);
    }
  }

  private onRequestUpdateDropped(event: Common.EventTarget.EventTargetEvent<RequestUpdateDroppedEventData>): void {
    if (!this.#cachedResourcesProcessed) {
      return;
    }

    const data = event.data;
    const frameId = data.frameId;
    if (!frameId) {
      return;
    }
    const frame = this.framesInternal.get(frameId);
    if (!frame) {
      return;
    }

    const url = data.url;
    if (frame.getResourcesMap().get(url)) {
      return;
    }

    const resource = new Resource(
        this, null, url, frame.url as Platform.DevToolsPath.UrlString, frameId, data.loaderId,
        Common.ResourceType.resourceTypes[data.resourceType], data.mimeType, data.lastModified, null);
    frame.addResource(resource);
  }

  frameForId(frameId: Protocol.Page.FrameId): ResourceTreeFrame|null {
    return this.framesInternal.get(frameId) || null;
  }

  forAllResources(callback: (arg0: Resource) => boolean): boolean {
    if (this.mainFrame) {
      return this.mainFrame.callForFrameResources(callback);
    }
    return false;
  }

  frames(): ResourceTreeFrame[] {
    return [...this.framesInternal.values()];
  }

  resourceForURL(url: string): Resource|null {
    // Workers call into this with no #frames available.
    return this.mainFrame ? this.mainFrame.resourceForURL(url) : null;
  }

  private addFramesRecursively(
      sameTargetParentFrame: ResourceTreeFrame|null, frameTreePayload: Protocol.Page.FrameResourceTree): void {
    const framePayload = frameTreePayload.frame;
    const frame = new ResourceTreeFrame(this, sameTargetParentFrame, framePayload.id, framePayload, null);
    if (!sameTargetParentFrame && framePayload.parentId) {
      frame.crossTargetParentFrameId = framePayload.parentId;
    }
    this.addFrame(frame);

    for (const childFrame of frameTreePayload.childFrames || []) {
      this.addFramesRecursively(frame, childFrame);
    }

    for (let i = 0; i < frameTreePayload.resources.length; ++i) {
      const subresource = frameTreePayload.resources[i];
      const resource = this.createResourceFromFramePayload(
          framePayload, subresource.url as Platform.DevToolsPath.UrlString,
          Common.ResourceType.resourceTypes[subresource.type], subresource.mimeType, subresource.lastModified || null,
          subresource.contentSize || null);
      frame.addResource(resource);
    }

    if (!frame.getResourcesMap().get(framePayload.url)) {
      const frameResource = this.createResourceFromFramePayload(
          framePayload, framePayload.url as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.Document,
          framePayload.mimeType, null, null);
      frame.addResource(frameResource);
    }
  }

  private createResourceFromFramePayload(
      frame: Protocol.Page.Frame, url: Platform.DevToolsPath.UrlString, type: Common.ResourceType.ResourceType,
      mimeType: string, lastModifiedTime: number|null, contentSize: number|null): Resource {
    const lastModified = typeof lastModifiedTime === 'number' ? new Date(lastModifiedTime * 1000) : null;
    return new Resource(
        this, null, url, frame.url as Platform.DevToolsPath.UrlString, frame.id, frame.loaderId, type, mimeType,
        lastModified, contentSize);
  }

  suspendReload(): void {
    this.#reloadSuspensionCount++;
  }

  resumeReload(): void {
    this.#reloadSuspensionCount--;
    console.assert(this.#reloadSuspensionCount >= 0, 'Unbalanced call to ResourceTreeModel.resumeReload()');
    if (!this.#reloadSuspensionCount && this.#pendingReloadOptions) {
      const {ignoreCache, scriptToEvaluateOnLoad} = this.#pendingReloadOptions;
      this.reloadPage(ignoreCache, scriptToEvaluateOnLoad);
    }
  }

  reloadPage(ignoreCache?: boolean, scriptToEvaluateOnLoad?: string): void {
    // Only dispatch PageReloadRequested upon first reload request to simplify client logic.
    if (!this.#pendingReloadOptions) {
      this.dispatchEventToListeners(Events.PageReloadRequested, this);
    }
    if (this.#reloadSuspensionCount) {
      this.#pendingReloadOptions = {ignoreCache, scriptToEvaluateOnLoad};
      return;
    }
    this.#pendingReloadOptions = null;
    const networkManager = this.target().model(NetworkManager);
    if (networkManager) {
      networkManager.clearRequests();
    }
    this.dispatchEventToListeners(Events.WillReloadPage);
    void this.agent.invoke_reload({ignoreCache, scriptToEvaluateOnLoad});
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate(url: string): Promise<any> {
    return this.agent.invoke_navigate({url});
  }

  async navigationHistory(): Promise<{
    currentIndex: number,
    entries: Array<Protocol.Page.NavigationEntry>,
  }|null> {
    const response = await this.agent.invoke_getNavigationHistory();
    if (response.getError()) {
      return null;
    }
    return {currentIndex: response.currentIndex, entries: response.entries};
  }

  navigateToHistoryEntry(entry: Protocol.Page.NavigationEntry): void {
    void this.agent.invoke_navigateToHistoryEntry({entryId: entry.id});
  }

  setLifecycleEventsEnabled(enabled: boolean): Promise<Protocol.ProtocolResponseWithError> {
    return this.agent.invoke_setLifecycleEventsEnabled({enabled});
  }

  async fetchAppManifest(): Promise<{
    url: string,
    data: string|null,
    errors: Array<Protocol.Page.AppManifestError>,
  }> {
    const response = await this.agent.invoke_getAppManifest();
    if (response.getError()) {
      return {url: response.url, data: null, errors: []};
    }
    return {url: response.url, data: response.data || null, errors: response.errors};
  }

  async getInstallabilityErrors(): Promise<Protocol.Page.InstallabilityError[]> {
    const response = await this.agent.invoke_getInstallabilityErrors();
    return response.installabilityErrors || [];
  }

  async getManifestIcons(): Promise<{
    primaryIcon: string | null,
  }> {
    const response = await this.agent.invoke_getManifestIcons();
    return {primaryIcon: response.primaryIcon || null};
  }

  async getAppId(): Promise<Protocol.Page.GetAppIdResponse> {
    return this.agent.invoke_getAppId();
  }

  private executionContextComparator(a: ExecutionContext, b: ExecutionContext): number {
    function framePath(frame: ResourceTreeFrame|null): ResourceTreeFrame[] {
      let currentFrame: (ResourceTreeFrame|null) = frame;
      const parents = [];
      while (currentFrame) {
        parents.push(currentFrame);
        currentFrame = currentFrame.sameTargetParentFrame();
      }
      return parents.reverse();
    }

    if (a.target() !== b.target()) {
      return ExecutionContext.comparator(a, b);
    }

    const framesA = a.frameId ? framePath(this.frameForId(a.frameId)) : [];
    const framesB = b.frameId ? framePath(this.frameForId(b.frameId)) : [];
    let frameA;
    let frameB;
    for (let i = 0;; i++) {
      if (!framesA[i] || !framesB[i] || (framesA[i] !== framesB[i])) {
        frameA = framesA[i];
        frameB = framesB[i];
        break;
      }
    }
    if (!frameA && frameB) {
      return -1;
    }

    if (!frameB && frameA) {
      return 1;
    }

    if (frameA && frameB) {
      return frameA.id.localeCompare(frameB.id);
    }

    return ExecutionContext.comparator(a, b);
  }

  private getSecurityOriginData(): SecurityOriginData {
    const securityOrigins = new Set<string>();

    let mainSecurityOrigin: string|null = null;
    let unreachableMainSecurityOrigin: string|null = null;
    for (const frame of this.framesInternal.values()) {
      const origin = frame.securityOrigin;
      if (!origin) {
        continue;
      }

      securityOrigins.add(origin);
      if (frame.isMainFrame()) {
        mainSecurityOrigin = origin;
        if (frame.unreachableUrl()) {
          const unreachableParsed = new Common.ParsedURL.ParsedURL(frame.unreachableUrl());
          unreachableMainSecurityOrigin = unreachableParsed.securityOrigin();
        }
      }
    }
    return {
      securityOrigins: securityOrigins,
      mainSecurityOrigin: mainSecurityOrigin,
      unreachableMainSecurityOrigin: unreachableMainSecurityOrigin,
    };
  }

  private updateSecurityOrigins(): void {
    const data = this.getSecurityOriginData();
    this.#securityOriginManager.setMainSecurityOrigin(
        data.mainSecurityOrigin || '', data.unreachableMainSecurityOrigin || '');
    this.#securityOriginManager.updateSecurityOrigins(data.securityOrigins);
  }

  getMainSecurityOrigin(): string|null {
    const data = this.getSecurityOriginData();
    return data.mainSecurityOrigin || data.unreachableMainSecurityOrigin;
  }

  onBackForwardCacheNotUsed(event: Protocol.Page.BackForwardCacheNotUsedEvent): void {
    if (this.mainFrame && this.mainFrame.id === event.frameId && this.mainFrame.loaderId === event.loaderId) {
      this.mainFrame.setBackForwardCacheDetails(event);
      this.dispatchEventToListeners(Events.BackForwardCacheDetailsUpdated, this.mainFrame);
    } else {
      this.#pendingBackForwardCacheNotUsedEvents.add(event);
    }
  }

  processPendingBackForwardCacheNotUsedEvents(frame: ResourceTreeFrame): void {
    if (!frame.isMainFrame()) {
      return;
    }
    for (const event of this.#pendingBackForwardCacheNotUsedEvents) {
      if (frame.id === event.frameId && frame.loaderId === event.loaderId) {
        frame.setBackForwardCacheDetails(event);
        this.#pendingBackForwardCacheNotUsedEvents.delete(event);
        // No need to dispatch the `BackForwardCacheDetailsUpdated` event here,
        // as this method call is followed by a `MainFrameNavigated` event.
        return;
      }
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FrameAdded = 'FrameAdded',
  FrameNavigated = 'FrameNavigated',
  FrameDetached = 'FrameDetached',
  FrameResized = 'FrameResized',
  FrameWillNavigate = 'FrameWillNavigate',
  MainFrameNavigated = 'MainFrameNavigated',
  ResourceAdded = 'ResourceAdded',
  WillLoadCachedResources = 'WillLoadCachedResources',
  CachedResourcesLoaded = 'CachedResourcesLoaded',
  DOMContentLoaded = 'DOMContentLoaded',
  LifecycleEvent = 'LifecycleEvent',
  Load = 'Load',
  PageReloadRequested = 'PageReloadRequested',
  WillReloadPage = 'WillReloadPage',
  InterstitialShown = 'InterstitialShown',
  InterstitialHidden = 'InterstitialHidden',
  BackForwardCacheDetailsUpdated = 'BackForwardCacheDetailsUpdated',
}

export type EventTypes = {
  [Events.FrameAdded]: ResourceTreeFrame,
  [Events.FrameNavigated]: ResourceTreeFrame,
  [Events.FrameDetached]: {frame: ResourceTreeFrame, isSwap: boolean},
  [Events.FrameResized]: void,
  [Events.FrameWillNavigate]: ResourceTreeFrame,
  [Events.MainFrameNavigated]: ResourceTreeFrame,
  [Events.ResourceAdded]: Resource,
  [Events.WillLoadCachedResources]: void,
  [Events.CachedResourcesLoaded]: ResourceTreeModel,
  [Events.DOMContentLoaded]: number,
  [Events.LifecycleEvent]: {frameId: Protocol.Page.FrameId, name: string},
  [Events.Load]: {resourceTreeModel: ResourceTreeModel, loadTime: number},
  [Events.PageReloadRequested]: ResourceTreeModel,
  [Events.WillReloadPage]: void,
  [Events.InterstitialShown]: void,
  [Events.InterstitialHidden]: void,
  [Events.BackForwardCacheDetailsUpdated]: ResourceTreeFrame,
};

export class ResourceTreeFrame {
  #model: ResourceTreeModel;
  #sameTargetParentFrameInternal: ResourceTreeFrame|null;
  readonly #idInternal: Protocol.Page.FrameId;
  crossTargetParentFrameId: string|null;
  #loaderIdInternal: string;
  #nameInternal: string|null|undefined;
  #urlInternal: string;
  #domainAndRegistryInternal: string;
  #securityOriginInternal: string|null;
  #unreachableUrlInternal: string;
  #adFrameStatusInternal?: Protocol.Page.AdFrameStatus;
  #secureContextType: Protocol.Page.SecureContextType|null;
  #crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType|null;
  #gatedAPIFeatures: Protocol.Page.GatedAPIFeatures[]|null;
  #creationStackTrace: Protocol.Runtime.StackTrace|null;
  #creationStackTraceTarget: Target|null;
  #childFramesInternal: Set<ResourceTreeFrame>;
  resourcesMap: Map<string, Resource>;
  backForwardCacheDetails: {
    restoredFromCache: boolean|undefined,
    explanations: Protocol.Page.BackForwardCacheNotRestoredExplanation[],
    explanationsTree: Protocol.Page.BackForwardCacheNotRestoredExplanationTree|undefined,
  } = {
    restoredFromCache: undefined,
    explanations: [],
    explanationsTree: undefined,
  };

  constructor(
      model: ResourceTreeModel, parentFrame: ResourceTreeFrame|null, frameId: Protocol.Page.FrameId,
      payload: Protocol.Page.Frame|null, creationStackTrace: Protocol.Runtime.StackTrace|null) {
    this.#model = model;
    this.#sameTargetParentFrameInternal = parentFrame;
    this.#idInternal = frameId;
    this.crossTargetParentFrameId = null;

    this.#loaderIdInternal = (payload && payload.loaderId) || '';
    this.#nameInternal = payload && payload.name;
    this.#urlInternal = (payload && payload.url) || '';
    this.#domainAndRegistryInternal = (payload && payload.domainAndRegistry) || '';
    this.#securityOriginInternal = payload && payload.securityOrigin;
    this.#unreachableUrlInternal = (payload && payload.unreachableUrl) || '';
    this.#adFrameStatusInternal = payload?.adFrameStatus;
    this.#secureContextType = payload && payload.secureContextType;
    this.#crossOriginIsolatedContextType = payload && payload.crossOriginIsolatedContextType;
    this.#gatedAPIFeatures = payload && payload.gatedAPIFeatures;

    this.#creationStackTrace = creationStackTrace;
    this.#creationStackTraceTarget = null;

    this.#childFramesInternal = new Set();

    this.resourcesMap = new Map();

    if (this.#sameTargetParentFrameInternal) {
      this.#sameTargetParentFrameInternal.#childFramesInternal.add(this);
    }
  }

  isSecureContext(): boolean {
    return this.#secureContextType !== null && this.#secureContextType.startsWith('Secure');
  }

  getSecureContextType(): Protocol.Page.SecureContextType|null {
    return this.#secureContextType;
  }

  isCrossOriginIsolated(): boolean {
    return this.#crossOriginIsolatedContextType !== null && this.#crossOriginIsolatedContextType.startsWith('Isolated');
  }

  getCrossOriginIsolatedContextType(): Protocol.Page.CrossOriginIsolatedContextType|null {
    return this.#crossOriginIsolatedContextType;
  }

  getGatedAPIFeatures(): Protocol.Page.GatedAPIFeatures[]|null {
    return this.#gatedAPIFeatures;
  }

  getCreationStackTraceData():
      {creationStackTrace: Protocol.Runtime.StackTrace|null, creationStackTraceTarget: Target} {
    return {
      creationStackTrace: this.#creationStackTrace,
      creationStackTraceTarget: this.#creationStackTraceTarget || this.resourceTreeModel().target(),
    };
  }

  navigate(framePayload: Protocol.Page.Frame): void {
    this.#loaderIdInternal = framePayload.loaderId;
    this.#nameInternal = framePayload.name;
    this.#urlInternal = framePayload.url;
    this.#domainAndRegistryInternal = framePayload.domainAndRegistry;
    this.#securityOriginInternal = framePayload.securityOrigin;
    this.#unreachableUrlInternal = framePayload.unreachableUrl || '';
    this.#adFrameStatusInternal = framePayload?.adFrameStatus;
    this.#secureContextType = framePayload.secureContextType;
    this.#crossOriginIsolatedContextType = framePayload.crossOriginIsolatedContextType;
    this.#gatedAPIFeatures = framePayload.gatedAPIFeatures;
    this.backForwardCacheDetails = {
      restoredFromCache: undefined,
      explanations: [],
      explanationsTree: undefined,
    };

    const mainResource = this.resourcesMap.get(this.#urlInternal);
    this.resourcesMap.clear();
    this.removeChildFrames();
    if (mainResource && mainResource.loaderId === this.#loaderIdInternal) {
      this.addResource(mainResource);
    }
  }

  resourceTreeModel(): ResourceTreeModel {
    return this.#model;
  }

  get id(): Protocol.Page.FrameId {
    return this.#idInternal;
  }

  get name(): string {
    return this.#nameInternal || '';
  }

  get url(): string {
    return this.#urlInternal;
  }

  domainAndRegistry(): string {
    return this.#domainAndRegistryInternal;
  }

  get securityOrigin(): string|null {
    return this.#securityOriginInternal;
  }

  unreachableUrl(): string {
    return this.#unreachableUrlInternal;
  }

  get loaderId(): string {
    return this.#loaderIdInternal;
  }

  adFrameType(): Protocol.Page.AdFrameType {
    return this.#adFrameStatusInternal?.adFrameType || Protocol.Page.AdFrameType.None;
  }

  adFrameStatus(): Protocol.Page.AdFrameStatus|undefined {
    return this.#adFrameStatusInternal;
  }

  get childFrames(): ResourceTreeFrame[] {
    return [...this.#childFramesInternal];
  }

  /**
   * Returns the parent frame if both #frames are part of the same process/target.
   */
  sameTargetParentFrame(): ResourceTreeFrame|null {
    return this.#sameTargetParentFrameInternal;
  }

  /**
   * Returns the parent frame if both #frames are part of different processes/targets (child is an OOPIF).
   */
  crossTargetParentFrame(): ResourceTreeFrame|null {
    if (!this.crossTargetParentFrameId) {
      return null;
    }
    const parentTarget = this.#model.target().parentTarget();
    if (!parentTarget) {
      return null;
    }
    const parentModel = parentTarget.model(ResourceTreeModel);
    if (!parentModel) {
      return null;
    }
    // Note that parent #model has already processed cached resources:
    // - when parent target was created, we issued getResourceTree call;
    // - strictly after we issued setAutoAttach call;
    // - both of them were handled in renderer in the same order;
    // - cached resource tree got processed on parent #model;
    // - child target was created as a result of setAutoAttach call.
    return parentModel.framesInternal.get(this.crossTargetParentFrameId) || null;
  }

  /**
   * Returns the parent frame. There is only 1 parent and it's either in the
   * same target or it's cross-target.
   */
  parentFrame(): ResourceTreeFrame|null {
    return this.sameTargetParentFrame() || this.crossTargetParentFrame();
  }

  /**
   * Returns true if this is the main frame of its target. For example, this returns true for the main frame
   * of an out-of-process iframe (OOPIF).
   */
  isMainFrame(): boolean {
    return !this.#sameTargetParentFrameInternal;
  }

  /**
   * Returns true if this is the top frame of the main target, i.e. if this is the top-most frame in the inspected
   * tab.
   */
  isTopFrame(): boolean {
    return !this.#model.target().parentTarget() && !this.#sameTargetParentFrameInternal &&
        !this.crossTargetParentFrameId;
  }

  removeChildFrame(frame: ResourceTreeFrame, isSwap: boolean): void {
    this.#childFramesInternal.delete(frame);
    frame.remove(isSwap);
  }

  private removeChildFrames(): void {
    const frames = this.#childFramesInternal;
    this.#childFramesInternal = new Set();
    for (const frame of frames) {
      frame.remove(false);
    }
  }

  remove(isSwap: boolean): void {
    this.removeChildFrames();
    this.#model.framesInternal.delete(this.id);
    this.#model.dispatchEventToListeners(Events.FrameDetached, {frame: this, isSwap});
  }

  addResource(resource: Resource): void {
    if (this.resourcesMap.get(resource.url) === resource) {
      // Already in the tree, we just got an extra update.
      return;
    }
    this.resourcesMap.set(resource.url, resource);
    this.#model.dispatchEventToListeners(Events.ResourceAdded, resource);
  }

  addRequest(request: NetworkRequest): void {
    let resource = this.resourcesMap.get(request.url());
    if (resource && resource.request === request) {
      // Already in the tree, we just got an extra update.
      return;
    }
    resource = new Resource(
        this.#model, request, request.url(), request.documentURL as Platform.DevToolsPath.UrlString, request.frameId,
        request.loaderId, request.resourceType(), request.mimeType, null, null);
    this.resourcesMap.set(resource.url, resource);
    this.#model.dispatchEventToListeners(Events.ResourceAdded, resource);
  }

  resources(): Resource[] {
    return Array.from(this.resourcesMap.values());
  }

  resourceForURL(url: string): Resource|null {
    const resource = this.resourcesMap.get(url);
    if (resource) {
      return resource;
    }
    for (const frame of this.#childFramesInternal) {
      const resource = frame.resourceForURL(url);
      if (resource) {
        return resource;
      }
    }
    return null;
  }

  callForFrameResources(callback: (arg0: Resource) => boolean): boolean {
    for (const resource of this.resourcesMap.values()) {
      if (callback(resource)) {
        return true;
      }
    }

    for (const frame of this.#childFramesInternal) {
      if (frame.callForFrameResources(callback)) {
        return true;
      }
    }
    return false;
  }

  displayName(): string {
    if (this.isTopFrame()) {
      return i18n.i18n.lockedString('top');
    }
    const subtitle = new Common.ParsedURL.ParsedURL(this.#urlInternal).displayName;
    if (subtitle) {
      if (!this.#nameInternal) {
        return subtitle;
      }
      return this.#nameInternal + ' (' + subtitle + ')';
    }
    return i18n.i18n.lockedString('iframe');
  }

  async getOwnerDeferredDOMNode(): Promise<DeferredDOMNode|null> {
    const parentFrame = this.parentFrame();
    if (!parentFrame) {
      return null;
    }
    return parentFrame.resourceTreeModel().domModel().getOwnerNodeForFrame(this.#idInternal);
  }

  async getOwnerDOMNodeOrDocument(): Promise<DOMNode|null> {
    const deferredNode = await this.getOwnerDeferredDOMNode();
    if (deferredNode) {
      return deferredNode.resolvePromise();
    }
    if (this.isTopFrame()) {
      return this.resourceTreeModel().domModel().requestDocument();
    }
    return null;
  }

  async highlight(): Promise<void> {
    const parentFrame = this.parentFrame();
    const parentTarget = this.resourceTreeModel().target().parentTarget();
    const highlightFrameOwner = async(domModel: DOMModel): Promise<void> => {
      const deferredNode = await domModel.getOwnerNodeForFrame(this.#idInternal);
      if (deferredNode) {
        domModel.overlayModel().highlightInOverlay({deferredNode, selectorList: ''}, 'all', true);
      }
    };

    if (parentFrame) {
      return highlightFrameOwner(parentFrame.resourceTreeModel().domModel());
    }

    // Portals.
    if (parentTarget) {
      const domModel = parentTarget.model(DOMModel);
      if (domModel) {
        return highlightFrameOwner(domModel);
      }
    }

    // For the top frame there is no owner node. Highlight the whole #document instead.
    const document = await this.resourceTreeModel().domModel().requestDocument();
    if (document) {
      this.resourceTreeModel().domModel().overlayModel().highlightInOverlay(
          {node: document, selectorList: ''}, 'all', true);
    }
  }

  async getPermissionsPolicyState(): Promise<Protocol.Page.PermissionsPolicyFeatureState[]|null> {
    const response = await this.resourceTreeModel().target().pageAgent().invoke_getPermissionsPolicyState(
        {frameId: this.#idInternal});
    if (response.getError()) {
      return null;
    }
    return response.states;
  }

  async getOriginTrials(): Promise<Protocol.Page.OriginTrial[]> {
    const response =
        await this.resourceTreeModel().target().pageAgent().invoke_getOriginTrials({frameId: this.#idInternal});
    if (response.getError()) {
      return [];
    }
    return response.originTrials;
  }

  setCreationStackTrace(creationStackTraceData:
                            {creationStackTrace: Protocol.Runtime.StackTrace|null, creationStackTraceTarget: Target}):
      void {
    this.#creationStackTrace = creationStackTraceData.creationStackTrace;
    this.#creationStackTraceTarget = creationStackTraceData.creationStackTraceTarget;
  }

  setBackForwardCacheDetails(event: Protocol.Page.BackForwardCacheNotUsedEvent): void {
    this.backForwardCacheDetails.restoredFromCache = false;
    this.backForwardCacheDetails.explanations = event.notRestoredExplanations;
    this.backForwardCacheDetails.explanationsTree = event.notRestoredExplanationsTree;
  }

  getResourcesMap(): Map<string, Resource> {
    return this.resourcesMap;
  }
}

export class PageDispatcher implements ProtocolProxyApi.PageDispatcher {
  #resourceTreeModel: ResourceTreeModel;
  constructor(resourceTreeModel: ResourceTreeModel) {
    this.#resourceTreeModel = resourceTreeModel;
  }
  backForwardCacheNotUsed(params: Protocol.Page.BackForwardCacheNotUsedEvent): void {
    this.#resourceTreeModel.onBackForwardCacheNotUsed(params);
  }

  domContentEventFired({timestamp}: Protocol.Page.DomContentEventFiredEvent): void {
    this.#resourceTreeModel.dispatchEventToListeners(Events.DOMContentLoaded, timestamp);
  }

  loadEventFired({timestamp}: Protocol.Page.LoadEventFiredEvent): void {
    this.#resourceTreeModel.dispatchEventToListeners(
        Events.Load, {resourceTreeModel: this.#resourceTreeModel, loadTime: timestamp});
  }

  lifecycleEvent({frameId, name}: Protocol.Page.LifecycleEventEvent): void {
    this.#resourceTreeModel.dispatchEventToListeners(Events.LifecycleEvent, {frameId, name});
  }

  frameAttached({frameId, parentFrameId, stack}: Protocol.Page.FrameAttachedEvent): void {
    this.#resourceTreeModel.frameAttached(frameId, parentFrameId, stack);
  }

  frameNavigated({frame, type}: Protocol.Page.FrameNavigatedEvent): void {
    this.#resourceTreeModel.frameNavigated(frame, type);
  }

  documentOpened({frame}: Protocol.Page.DocumentOpenedEvent): void {
    this.#resourceTreeModel.documentOpened(frame);
  }

  frameDetached({frameId, reason}: Protocol.Page.FrameDetachedEvent): void {
    this.#resourceTreeModel.frameDetached(frameId, reason === Protocol.Page.FrameDetachedEventReason.Swap);
  }

  frameStartedLoading({}: Protocol.Page.FrameStartedLoadingEvent): void {
  }

  frameStoppedLoading({}: Protocol.Page.FrameStoppedLoadingEvent): void {
  }

  frameRequestedNavigation({}: Protocol.Page.FrameRequestedNavigationEvent): void {
  }

  frameScheduledNavigation({}: Protocol.Page.FrameScheduledNavigationEvent): void {
  }

  frameClearedScheduledNavigation({}: Protocol.Page.FrameClearedScheduledNavigationEvent): void {
  }

  navigatedWithinDocument({}: Protocol.Page.NavigatedWithinDocumentEvent): void {
  }

  frameResized(): void {
    this.#resourceTreeModel.dispatchEventToListeners(Events.FrameResized);
  }

  javascriptDialogOpening({hasBrowserHandler}: Protocol.Page.JavascriptDialogOpeningEvent): void {
    if (!hasBrowserHandler) {
      void this.#resourceTreeModel.agent.invoke_handleJavaScriptDialog({accept: false});
    }
  }

  javascriptDialogClosed({}: Protocol.Page.JavascriptDialogClosedEvent): void {
  }

  screencastFrame({}: Protocol.Page.ScreencastFrameEvent): void {
  }

  screencastVisibilityChanged({}: Protocol.Page.ScreencastVisibilityChangedEvent): void {
  }

  interstitialShown(): void {
    this.#resourceTreeModel.isInterstitialShowing = true;
    this.#resourceTreeModel.dispatchEventToListeners(Events.InterstitialShown);
  }

  interstitialHidden(): void {
    this.#resourceTreeModel.isInterstitialShowing = false;
    this.#resourceTreeModel.dispatchEventToListeners(Events.InterstitialHidden);
  }

  windowOpen({}: Protocol.Page.WindowOpenEvent): void {
  }

  compilationCacheProduced({}: Protocol.Page.CompilationCacheProducedEvent): void {
  }

  fileChooserOpened({}: Protocol.Page.FileChooserOpenedEvent): void {
  }

  downloadWillBegin({}: Protocol.Page.DownloadWillBeginEvent): void {
  }

  downloadProgress(): void {
  }
}

SDKModel.register(ResourceTreeModel, {capabilities: Capability.DOM, autostart: true, early: true});
export interface SecurityOriginData {
  securityOrigins: Set<string>;
  mainSecurityOrigin: string|null;
  unreachableMainSecurityOrigin: string|null;
}
