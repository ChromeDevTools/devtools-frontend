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

import type {DeferredDOMNode, DOMNode} from './DOMModel.js';
import {DOMModel} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import type {RequestUpdateDroppedEventData} from './NetworkManager.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';  // eslint-disable-line no-unused-vars
import type {NetworkRequest} from './NetworkRequest.js'; // eslint-disable-line no-unused-vars
import {Resource} from './Resource.js';
import {ExecutionContext, RuntimeModel} from './RuntimeModel.js';
import type {Target} from './SDKModel.js';
import {Capability, SDKModel, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars
import {SecurityOriginManager} from './SecurityOriginManager.js';

export class ResourceTreeModel extends SDKModel {
  _agent: ProtocolProxyApi.PageApi;
  _securityOriginManager: SecurityOriginManager;
  _frames: Map<string, ResourceTreeFrame>;
  _cachedResourcesProcessed: boolean;
  _pendingReloadOptions: {
    ignoreCache: (boolean|undefined),
    scriptToEvaluateOnLoad: (string|undefined),
  }|null;
  _reloadSuspensionCount: number;
  _isInterstitialShowing: boolean;
  mainFrame: ResourceTreeFrame|null;
  private pendingBackForwardCacheNotUsedEvents: Set<Protocol.Page.BackForwardCacheNotUsedEvent>;

  constructor(target: Target) {
    super(target);

    const networkManager = target.model(NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._onRequestFinished, this);
      networkManager.addEventListener(NetworkManagerEvents.RequestUpdateDropped, this._onRequestUpdateDropped, this);
    }
    this._agent = target.pageAgent();
    this._agent.invoke_enable();
    this._securityOriginManager = (target.model(SecurityOriginManager) as SecurityOriginManager);
    this.pendingBackForwardCacheNotUsedEvents = new Set<Protocol.Page.BackForwardCacheNotUsedEvent>();
    target.registerPageDispatcher(new PageDispatcher(this));

    this._frames = new Map();
    this._cachedResourcesProcessed = false;
    this._pendingReloadOptions = null;
    this._reloadSuspensionCount = 0;
    this._isInterstitialShowing = false;
    this.mainFrame = null;

    this._agent.invoke_getResourceTree().then(event => {
      this._processCachedResources(event.getError() ? null : event.frameTree);
    });
  }

  static frameForRequest(request: NetworkRequest): ResourceTreeFrame|null {
    const networkManager = NetworkManager.forRequest(request);
    const resourceTreeModel = networkManager ? networkManager.target().model(ResourceTreeModel) : null;
    if (!resourceTreeModel) {
      return null;
    }
    return resourceTreeModel.frameForId(request.frameId);
  }

  static frames(): ResourceTreeFrame[] {
    const result = [];
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      result.push(...resourceTreeModel._frames.values());
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

  _processCachedResources(mainFramePayload: Protocol.Page.FrameResourceTree|null): void {
    // TODO(caseq): the url check below is a mergeable, conservative
    // workaround for a problem caused by us requesting resources from a
    // subtarget frame before it has committed. The proper fix is likely
    // to be too complicated to be safely merged.
    // See https://crbug.com/1081270 for details.
    if (mainFramePayload && mainFramePayload.frame.url !== ':') {
      this.dispatchEventToListeners(Events.WillLoadCachedResources);
      this._addFramesRecursively(null, mainFramePayload);
      this.target().setInspectedURL(mainFramePayload.frame.url);
    }
    this._cachedResourcesProcessed = true;
    const runtimeModel = this.target().model(RuntimeModel);
    if (runtimeModel) {
      runtimeModel.setExecutionContextComparator(this._executionContextComparator.bind(this));
      runtimeModel.fireExecutionContextOrderChanged();
    }
    this.dispatchEventToListeners(Events.CachedResourcesLoaded, this);
  }

  cachedResourcesLoaded(): boolean {
    return this._cachedResourcesProcessed;
  }

  isInterstitialShowing(): boolean {
    return this._isInterstitialShowing;
  }

  _addFrame(frame: ResourceTreeFrame, _aboutToNavigate?: boolean): void {
    this._frames.set(frame.id, frame);
    if (frame.isMainFrame()) {
      this.mainFrame = frame;
    }
    this.dispatchEventToListeners(Events.FrameAdded, frame);
    this._updateSecurityOrigins();
  }

  _frameAttached(frameId: string, parentFrameId: string|null, stackTrace?: Protocol.Runtime.StackTrace):
      ResourceTreeFrame|null {
    const sameTargetParentFrame = parentFrameId ? (this._frames.get(parentFrameId) || null) : null;
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed && sameTargetParentFrame) {
      return null;
    }
    if (this._frames.has(frameId)) {
      return null;
    }

    const frame = new ResourceTreeFrame(this, sameTargetParentFrame, frameId, null, stackTrace || null);
    if (parentFrameId && !sameTargetParentFrame) {
      frame._crossTargetParentFrameId = parentFrameId;
    }
    if (frame.isMainFrame() && this.mainFrame) {
      // Navigation to the new backend process.
      this._frameDetached(this.mainFrame.id, false);
    }
    this._addFrame(frame, true);
    return frame;
  }

  _frameNavigated(framePayload: Protocol.Page.Frame, type: Protocol.Page.NavigationType|undefined): void {
    const sameTargetParentFrame = framePayload.parentId ? (this._frames.get(framePayload.parentId) || null) : null;
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed && sameTargetParentFrame) {
      return;
    }
    let frame: (ResourceTreeFrame|null) = this._frames.get(framePayload.id) || null;
    if (!frame) {
      // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
      frame = this._frameAttached(framePayload.id, framePayload.parentId || '');
      console.assert(Boolean(frame));
      if (!frame) {
        return;
      }
    }
    if (type) {
      frame.backForwardCacheDetails.restoredFromCache = type === Protocol.Page.NavigationType.BackForwardCacheRestore;
    }

    this.dispatchEventToListeners(Events.FrameWillNavigate, frame);
    frame._navigate(framePayload);
    this.dispatchEventToListeners(Events.FrameNavigated, frame);

    if (frame.isMainFrame()) {
      this.processPendingBackForwardCacheNotUsedEvents(frame);
      this.dispatchEventToListeners(Events.MainFrameNavigated, frame);
    }

    // Fill frame with retained resources (the ones loaded using new loader).
    const resources = frame.resources();
    for (let i = 0; i < resources.length; ++i) {
      this.dispatchEventToListeners(Events.ResourceAdded, resources[i]);
    }

    if (frame.isMainFrame()) {
      this.target().setInspectedURL(frame.url);
    }
    this._updateSecurityOrigins();
  }

  _documentOpened(framePayload: Protocol.Page.Frame): void {
    this._frameNavigated(framePayload, undefined);
    const frame = this._frames.get(framePayload.id);
    if (frame && !frame._resourcesMap.get(framePayload.url)) {
      const frameResource = this._createResourceFromFramePayload(
          framePayload, framePayload.url, Common.ResourceType.resourceTypes.Document, framePayload.mimeType, null,
          null);
      frameResource.isGenerated = true;
      frame.addResource(frameResource);
    }
  }

  _frameDetached(frameId: string, isSwap: boolean): void {
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed) {
      return;
    }

    const frame = this._frames.get(frameId);
    if (!frame) {
      return;
    }

    const sameTargetParentFrame = frame.sameTargetParentFrame();
    if (sameTargetParentFrame) {
      sameTargetParentFrame._removeChildFrame(frame, isSwap);
    } else {
      frame._remove(isSwap);
    }
    this._updateSecurityOrigins();
  }

  _onRequestFinished(event: Common.EventTarget.EventTargetEvent): void {
    if (!this._cachedResourcesProcessed) {
      return;
    }

    const request = (event.data as NetworkRequest);
    if (request.failed || request.resourceType() === Common.ResourceType.resourceTypes.XHR) {
      return;
    }

    const frame = this._frames.get(request.frameId);
    if (frame) {
      frame._addRequest(request);
    }
  }

  _onRequestUpdateDropped(event: Common.EventTarget.EventTargetEvent): void {
    if (!this._cachedResourcesProcessed) {
      return;
    }

    const data = (event.data as RequestUpdateDroppedEventData);
    const frameId = data.frameId;
    const frame = this._frames.get(frameId);
    if (!frame) {
      return;
    }

    const url = data.url;
    if (frame._resourcesMap.get(url)) {
      return;
    }

    const resource = new Resource(
        this, null, url, frame.url, frameId, data.loaderId, Common.ResourceType.resourceTypes[data.resourceType],
        data.mimeType, data.lastModified, null);
    frame.addResource(resource);
  }

  frameForId(frameId: string): ResourceTreeFrame|null {
    return this._frames.get(frameId) || null;
  }

  forAllResources(callback: (arg0: Resource) => boolean): boolean {
    if (this.mainFrame) {
      return this.mainFrame._callForFrameResources(callback);
    }
    return false;
  }

  frames(): ResourceTreeFrame[] {
    return [...this._frames.values()];
  }

  resourceForURL(url: string): Resource|null {
    // Workers call into this with no frames available.
    return this.mainFrame ? this.mainFrame.resourceForURL(url) : null;
  }

  _addFramesRecursively(
      sameTargetParentFrame: ResourceTreeFrame|null, frameTreePayload: Protocol.Page.FrameResourceTree): void {
    const framePayload = frameTreePayload.frame;
    const frame = new ResourceTreeFrame(this, sameTargetParentFrame, framePayload.id, framePayload, null);
    if (!sameTargetParentFrame && framePayload.parentId) {
      frame._crossTargetParentFrameId = framePayload.parentId;
    }
    this._addFrame(frame);

    for (const childFrame of frameTreePayload.childFrames || []) {
      this._addFramesRecursively(frame, childFrame);
    }

    for (let i = 0; i < frameTreePayload.resources.length; ++i) {
      const subresource = frameTreePayload.resources[i];
      const resource = this._createResourceFromFramePayload(
          framePayload, subresource.url, Common.ResourceType.resourceTypes[subresource.type], subresource.mimeType,
          subresource.lastModified || null, subresource.contentSize || null);
      frame.addResource(resource);
    }

    if (!frame._resourcesMap.get(framePayload.url)) {
      const frameResource = this._createResourceFromFramePayload(
          framePayload, framePayload.url, Common.ResourceType.resourceTypes.Document, framePayload.mimeType, null,
          null);
      frame.addResource(frameResource);
    }
  }

  _createResourceFromFramePayload(
      frame: Protocol.Page.Frame, url: string, type: Common.ResourceType.ResourceType, mimeType: string,
      lastModifiedTime: number|null, contentSize: number|null): Resource {
    const lastModified = typeof lastModifiedTime === 'number' ? new Date(lastModifiedTime * 1000) : null;
    return new Resource(
        this, null, url, frame.url, frame.id, frame.loaderId, type, mimeType, lastModified, contentSize);
  }

  suspendReload(): void {
    this._reloadSuspensionCount++;
  }

  resumeReload(): void {
    this._reloadSuspensionCount--;
    console.assert(this._reloadSuspensionCount >= 0, 'Unbalanced call to ResourceTreeModel.resumeReload()');
    if (!this._reloadSuspensionCount && this._pendingReloadOptions) {
      const {ignoreCache, scriptToEvaluateOnLoad} = this._pendingReloadOptions;
      this.reloadPage(ignoreCache, scriptToEvaluateOnLoad);
    }
  }

  reloadPage(ignoreCache?: boolean, scriptToEvaluateOnLoad?: string): void {
    // Only dispatch PageReloadRequested upon first reload request to simplify client logic.
    if (!this._pendingReloadOptions) {
      this.dispatchEventToListeners(Events.PageReloadRequested, this);
    }
    if (this._reloadSuspensionCount) {
      this._pendingReloadOptions = {ignoreCache, scriptToEvaluateOnLoad};
      return;
    }
    this._pendingReloadOptions = null;
    this.dispatchEventToListeners(Events.WillReloadPage);
    this._agent.invoke_reload({ignoreCache, scriptToEvaluateOnLoad});
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate(url: string): Promise<any> {
    return this._agent.invoke_navigate({url});
  }

  async navigationHistory(): Promise<{
    currentIndex: number,
    entries: Array<Protocol.Page.NavigationEntry>,
  }|null> {
    const response = await this._agent.invoke_getNavigationHistory();
    if (response.getError()) {
      return null;
    }
    return {currentIndex: response.currentIndex, entries: response.entries};
  }

  navigateToHistoryEntry(entry: Protocol.Page.NavigationEntry): void {
    this._agent.invoke_navigateToHistoryEntry({entryId: entry.id});
  }

  setLifecycleEventsEnabled(enabled: boolean): Promise<Protocol.ProtocolResponseWithError> {
    return this._agent.invoke_setLifecycleEventsEnabled({enabled});
  }

  async fetchAppManifest(): Promise<{
    url: string,
    data: string|null,
    errors: Array<Protocol.Page.AppManifestError>,
  }> {
    const response = await this._agent.invoke_getAppManifest();
    if (response.getError()) {
      return {url: response.url, data: null, errors: []};
    }
    return {url: response.url, data: response.data || null, errors: response.errors};
  }

  async getInstallabilityErrors(): Promise<Protocol.Page.InstallabilityError[]> {
    const response = await this._agent.invoke_getInstallabilityErrors();
    return response.installabilityErrors || [];
  }

  async getManifestIcons(): Promise<{
    primaryIcon: string | null,
  }> {
    const response = await this._agent.invoke_getManifestIcons();
    return {primaryIcon: response.primaryIcon || null};
  }

  _executionContextComparator(a: ExecutionContext, b: ExecutionContext): number {
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

  _getSecurityOriginData(): SecurityOriginData {
    const securityOrigins = new Set<string>();

    let mainSecurityOrigin: string|null = null;
    let unreachableMainSecurityOrigin: string|null = null;
    for (const frame of this._frames.values()) {
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

  _updateSecurityOrigins(): void {
    const data = this._getSecurityOriginData();
    this._securityOriginManager.setMainSecurityOrigin(
        data.mainSecurityOrigin || '', data.unreachableMainSecurityOrigin || '');
    this._securityOriginManager.updateSecurityOrigins(data.securityOrigins);
  }

  getMainSecurityOrigin(): string|null {
    const data = this._getSecurityOriginData();
    return data.mainSecurityOrigin || data.unreachableMainSecurityOrigin;
  }

  onBackForwardCacheNotUsed(event: Protocol.Page.BackForwardCacheNotUsedEvent): void {
    if (this.mainFrame && this.mainFrame.id === event.frameId && this.mainFrame.loaderId === event.loaderId) {
      this.mainFrame.backForwardCacheDetails.restoredFromCache = false;
      this.dispatchEventToListeners(Events.BackForwardCacheDetailsUpdated, this.mainFrame);
    } else {
      this.pendingBackForwardCacheNotUsedEvents.add(event);
    }
  }

  processPendingBackForwardCacheNotUsedEvents(frame: ResourceTreeFrame): void {
    if (!frame.isMainFrame()) {
      return;
    }
    for (const event of this.pendingBackForwardCacheNotUsedEvents) {
      if (frame.id === event.frameId && frame.loaderId === event.loaderId) {
        frame.backForwardCacheDetails.restoredFromCache = false;
        this.pendingBackForwardCacheNotUsedEvents.delete(event);
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


export class ResourceTreeFrame {
  _model: ResourceTreeModel;
  _sameTargetParentFrame: ResourceTreeFrame|null;
  _id: string;
  _crossTargetParentFrameId: string|null;
  _loaderId: string;
  _name: string|null|undefined;
  _url: string;
  _domainAndRegistry: string;
  _securityOrigin: string|null;
  _mimeType: string|null;
  _unreachableUrl: string;
  _adFrameType: Protocol.Page.AdFrameType;
  _secureContextType: Protocol.Page.SecureContextType|null;
  _crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType|null;
  _gatedAPIFeatures: Protocol.Page.GatedAPIFeatures[]|null;
  private creationStackTrace: Protocol.Runtime.StackTrace|null;
  private creationStackTraceTarget: Target|null;
  _childFrames: Set<ResourceTreeFrame>;
  _resourcesMap: Map<string, Resource>;
  backForwardCacheDetails: {restoredFromCache: boolean|undefined} = {restoredFromCache: undefined};

  constructor(
      model: ResourceTreeModel, parentFrame: ResourceTreeFrame|null, frameId: string, payload: Protocol.Page.Frame|null,
      creationStackTrace: Protocol.Runtime.StackTrace|null) {
    this._model = model;
    this._sameTargetParentFrame = parentFrame;
    this._id = frameId;
    this._crossTargetParentFrameId = null;

    this._loaderId = (payload && payload.loaderId) || '';
    this._name = payload && payload.name;
    this._url = (payload && payload.url) || '';
    this._domainAndRegistry = (payload && payload.domainAndRegistry) || '';
    this._securityOrigin = payload && payload.securityOrigin;
    this._mimeType = payload && payload.mimeType;
    this._unreachableUrl = (payload && payload.unreachableUrl) || '';
    this._adFrameType = (payload && payload.adFrameType) || Protocol.Page.AdFrameType.None;
    this._secureContextType = payload && payload.secureContextType;
    this._crossOriginIsolatedContextType = payload && payload.crossOriginIsolatedContextType;
    this._gatedAPIFeatures = payload && payload.gatedAPIFeatures;

    this.creationStackTrace = creationStackTrace;
    this.creationStackTraceTarget = null;

    this._childFrames = new Set();

    this._resourcesMap = new Map();

    if (this._sameTargetParentFrame) {
      this._sameTargetParentFrame._childFrames.add(this);
    }
  }

  isSecureContext(): boolean {
    return this._secureContextType !== null && this._secureContextType.startsWith('Secure');
  }

  getSecureContextType(): Protocol.Page.SecureContextType|null {
    return this._secureContextType;
  }

  isCrossOriginIsolated(): boolean {
    return this._crossOriginIsolatedContextType !== null && this._crossOriginIsolatedContextType.startsWith('Isolated');
  }

  getCrossOriginIsolatedContextType(): Protocol.Page.CrossOriginIsolatedContextType|null {
    return this._crossOriginIsolatedContextType;
  }

  getGatedAPIFeatures(): Protocol.Page.GatedAPIFeatures[]|null {
    return this._gatedAPIFeatures;
  }

  getCreationStackTraceData():
      {creationStackTrace: Protocol.Runtime.StackTrace|null, creationStackTraceTarget: Target} {
    return {
      creationStackTrace: this.creationStackTrace,
      creationStackTraceTarget: this.creationStackTraceTarget || this.resourceTreeModel().target(),
    };
  }

  _navigate(framePayload: Protocol.Page.Frame): void {
    this._loaderId = framePayload.loaderId;
    this._name = framePayload.name;
    this._url = framePayload.url;
    this._domainAndRegistry = framePayload.domainAndRegistry;
    this._securityOrigin = framePayload.securityOrigin;
    this._mimeType = framePayload.mimeType;
    this._unreachableUrl = framePayload.unreachableUrl || '';
    this._adFrameType = framePayload.adFrameType || Protocol.Page.AdFrameType.None;
    this._secureContextType = framePayload.secureContextType;
    this._crossOriginIsolatedContextType = framePayload.crossOriginIsolatedContextType;
    this._gatedAPIFeatures = framePayload.gatedAPIFeatures;

    const mainResource = this._resourcesMap.get(this._url);
    this._resourcesMap.clear();
    this._removeChildFrames();
    if (mainResource && mainResource.loaderId === this._loaderId) {
      this.addResource(mainResource);
    }
  }

  resourceTreeModel(): ResourceTreeModel {
    return this._model;
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name || '';
  }

  get url(): string {
    return this._url;
  }

  domainAndRegistry(): string {
    return this._domainAndRegistry;
  }

  get securityOrigin(): string|null {
    return this._securityOrigin;
  }

  unreachableUrl(): string {
    return this._unreachableUrl;
  }

  get loaderId(): string {
    return this._loaderId;
  }

  adFrameType(): Protocol.Page.AdFrameType {
    return this._adFrameType;
  }

  get childFrames(): ResourceTreeFrame[] {
    return [...this._childFrames];
  }

  /**
   * Returns the parent frame if both frames are part of the same process/target.
   */
  sameTargetParentFrame(): ResourceTreeFrame|null {
    return this._sameTargetParentFrame;
  }

  /**
   * Returns the parent frame if both frames are part of different processes/targets (child is an OOPIF).
   */
  crossTargetParentFrame(): ResourceTreeFrame|null {
    if (!this._crossTargetParentFrameId) {
      return null;
    }
    const parentTarget = this._model.target().parentTarget();
    if (!parentTarget) {
      return null;
    }
    const parentModel = parentTarget.model(ResourceTreeModel);
    if (!parentModel) {
      return null;
    }
    // Note that parent model has already processed cached resources:
    // - when parent target was created, we issued getResourceTree call;
    // - strictly after we issued setAutoAttach call;
    // - both of them were handled in renderer in the same order;
    // - cached resource tree got processed on parent model;
    // - child target was created as a result of setAutoAttach call.
    return parentModel._frames.get(this._crossTargetParentFrameId) || null;
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
    return !this._sameTargetParentFrame;
  }

  /**
   * Returns true if this is the top frame of the main target, i.e. if this is the top-most frame in the inspected
   * tab.
   */
  isTopFrame(): boolean {
    return !this._model.target().parentTarget() && !this._sameTargetParentFrame && !this._crossTargetParentFrameId;
  }

  _removeChildFrame(frame: ResourceTreeFrame, isSwap: boolean): void {
    this._childFrames.delete(frame);
    frame._remove(isSwap);
  }

  _removeChildFrames(): void {
    const frames = this._childFrames;
    this._childFrames = new Set();
    for (const frame of frames) {
      frame._remove(false);
    }
  }

  _remove(isSwap: boolean): void {
    this._removeChildFrames();
    this._model._frames.delete(this.id);
    this._model.dispatchEventToListeners(Events.FrameDetached, {frame: this, isSwap});
  }

  addResource(resource: Resource): void {
    if (this._resourcesMap.get(resource.url) === resource) {
      // Already in the tree, we just got an extra update.
      return;
    }
    this._resourcesMap.set(resource.url, resource);
    this._model.dispatchEventToListeners(Events.ResourceAdded, resource);
  }

  _addRequest(request: NetworkRequest): void {
    let resource = this._resourcesMap.get(request.url());
    if (resource && resource.request === request) {
      // Already in the tree, we just got an extra update.
      return;
    }
    resource = new Resource(
        this._model, request, request.url(), request.documentURL, request.frameId, request.loaderId,
        request.resourceType(), request.mimeType, null, null);
    this._resourcesMap.set(resource.url, resource);
    this._model.dispatchEventToListeners(Events.ResourceAdded, resource);
  }

  resources(): Resource[] {
    return Array.from(this._resourcesMap.values());
  }

  resourceForURL(url: string): Resource|null {
    const resource = this._resourcesMap.get(url);
    if (resource) {
      return resource;
    }
    for (const frame of this._childFrames) {
      const resource = frame.resourceForURL(url);
      if (resource) {
        return resource;
      }
    }
    return null;
  }

  _callForFrameResources(callback: (arg0: Resource) => boolean): boolean {
    for (const resource of this._resourcesMap.values()) {
      if (callback(resource)) {
        return true;
      }
    }

    for (const frame of this._childFrames) {
      if (frame._callForFrameResources(callback)) {
        return true;
      }
    }
    return false;
  }

  displayName(): string {
    if (this.isTopFrame()) {
      return i18n.i18n.lockedString('top');
    }
    const subtitle = new Common.ParsedURL.ParsedURL(this._url).displayName;
    if (subtitle) {
      if (!this._name) {
        return subtitle;
      }
      return this._name + ' (' + subtitle + ')';
    }
    return i18n.i18n.lockedString('iframe');
  }

  async getOwnerDeferredDOMNode(): Promise<DeferredDOMNode|null> {
    const parentFrame = this.parentFrame();
    if (!parentFrame) {
      return null;
    }
    return parentFrame.resourceTreeModel().domModel().getOwnerNodeForFrame(this._id);
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
      const deferredNode = await domModel.getOwnerNodeForFrame(this._id);
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

    // For the top frame there is no owner node. Highlight the whole document instead.
    const document = await this.resourceTreeModel().domModel().requestDocument();
    if (document) {
      this.resourceTreeModel().domModel().overlayModel().highlightInOverlay(
          {node: document, selectorList: ''}, 'all', true);
    }
  }

  async getPermissionsPolicyState(): Promise<Protocol.Page.PermissionsPolicyFeatureState[]|null> {
    const response =
        await this.resourceTreeModel().target().pageAgent().invoke_getPermissionsPolicyState({frameId: this._id});
    if (response.getError()) {
      return null;
    }
    return response.states;
  }

  setCreationStackTrace(creationStackTraceData:
                            {creationStackTrace: Protocol.Runtime.StackTrace|null, creationStackTraceTarget: Target}):
      void {
    this.creationStackTrace = creationStackTraceData.creationStackTrace;
    this.creationStackTraceTarget = creationStackTraceData.creationStackTraceTarget;
  }
}

export class PageDispatcher implements ProtocolProxyApi.PageDispatcher {
  _resourceTreeModel: ResourceTreeModel;
  constructor(resourceTreeModel: ResourceTreeModel) {
    this._resourceTreeModel = resourceTreeModel;
  }
  backForwardCacheNotUsed(params: Protocol.Page.BackForwardCacheNotUsedEvent): void {
    this._resourceTreeModel.onBackForwardCacheNotUsed(params);
  }

  domContentEventFired({timestamp}: Protocol.Page.DomContentEventFiredEvent): void {
    this._resourceTreeModel.dispatchEventToListeners(Events.DOMContentLoaded, timestamp);
  }

  loadEventFired({timestamp}: Protocol.Page.LoadEventFiredEvent): void {
    this._resourceTreeModel.dispatchEventToListeners(
        Events.Load, {resourceTreeModel: this._resourceTreeModel, loadTime: timestamp});
  }

  lifecycleEvent({frameId, name}: Protocol.Page.LifecycleEventEvent): void {
    this._resourceTreeModel.dispatchEventToListeners(Events.LifecycleEvent, {frameId, name});
  }

  frameAttached({frameId, parentFrameId, stack}: Protocol.Page.FrameAttachedEvent): void {
    this._resourceTreeModel._frameAttached(frameId, parentFrameId, stack);
  }

  frameNavigated({frame, type}: Protocol.Page.FrameNavigatedEvent): void {
    this._resourceTreeModel._frameNavigated(frame, type);
  }

  documentOpened({frame}: Protocol.Page.DocumentOpenedEvent): void {
    this._resourceTreeModel._documentOpened(frame);
  }

  frameDetached({frameId, reason}: Protocol.Page.FrameDetachedEvent): void {
    this._resourceTreeModel._frameDetached(frameId, reason === Protocol.Page.FrameDetachedEventReason.Swap);
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
    this._resourceTreeModel.dispatchEventToListeners(Events.FrameResized, null);
  }

  javascriptDialogOpening({hasBrowserHandler}: Protocol.Page.JavascriptDialogOpeningEvent): void {
    if (!hasBrowserHandler) {
      this._resourceTreeModel._agent.invoke_handleJavaScriptDialog({accept: false});
    }
  }

  javascriptDialogClosed({}: Protocol.Page.JavascriptDialogClosedEvent): void {
  }

  screencastFrame({}: Protocol.Page.ScreencastFrameEvent): void {
  }

  screencastVisibilityChanged({}: Protocol.Page.ScreencastVisibilityChangedEvent): void {
  }

  interstitialShown(): void {
    this._resourceTreeModel._isInterstitialShowing = true;
    this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialShown);
  }

  interstitialHidden(): void {
    this._resourceTreeModel._isInterstitialShowing = false;
    this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialHidden);
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
