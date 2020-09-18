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

import * as Common from '../common/common.js';

import {DeferredDOMNode, DOMModel, DOMNode} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {Events as NetworkManagerEvents, NetworkManager, RequestUpdateDroppedEventData} from './NetworkManager.js';  // eslint-disable-line no-unused-vars
import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {Resource} from './Resource.js';
import {ExecutionContext, RuntimeModel} from './RuntimeModel.js';
import {Capability, SDKModel, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars
import {SecurityOriginManager} from './SecurityOriginManager.js';

export class ResourceTreeModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);

    const networkManager = target.model(NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._onRequestFinished, this);
      networkManager.addEventListener(NetworkManagerEvents.RequestUpdateDropped, this._onRequestUpdateDropped, this);
    }
    this._agent = target.pageAgent();
    this._agent.invoke_enable();
    this._securityOriginManager = target.model(SecurityOriginManager);

    target.registerPageDispatcher(new PageDispatcher(this));

    /** @type {!Map<string, !ResourceTreeFrame>} */
    this._frames = new Map();
    this._cachedResourcesProcessed = false;
    /** @type {?{ignoreCache:(boolean|undefined), scriptToEvaluateOnLoad: (string|undefined)}}} */
    this._pendingReloadOptions = null;
    this._reloadSuspensionCount = 0;
    this._isInterstitialShowing = false;
    /** @type {?ResourceTreeFrame} */
    this.mainFrame = null;

    this._agent.invoke_getResourceTree().then(event => {
      this._processCachedResources(event.getError() ? null : event.frameTree);
    });
  }

  /**
   * @param {!NetworkRequest} request
   * @return {?ResourceTreeFrame}
   */
  static frameForRequest(request) {
    const networkManager = NetworkManager.forRequest(request);
    const resourceTreeModel = networkManager ? networkManager.target().model(ResourceTreeModel) : null;
    if (!resourceTreeModel) {
      return null;
    }
    return resourceTreeModel.frameForId(request.frameId);
  }

  /**
   * @return {!Array.<!ResourceTreeFrame>}
   */
  static frames() {
    const result = [];
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      result.push(...resourceTreeModel._frames.values());
    }
    return result;
  }

  /**
   * @param {string} url
   * @return {?Resource}
   */
  static resourceForURL(url) {
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      const mainFrame = resourceTreeModel.mainFrame;
      const result = mainFrame ? mainFrame.resourceForURL(url) : null;
      if (result) {
        return result;
      }
    }
    return null;
  }

  /**
   * @param {boolean=} bypassCache
   * @param {string=} scriptToEvaluateOnLoad
   */
  static reloadAllPages(bypassCache, scriptToEvaluateOnLoad) {
    for (const resourceTreeModel of TargetManager.instance().models(ResourceTreeModel)) {
      if (!resourceTreeModel.target().parentTarget()) {
        resourceTreeModel.reloadPage(bypassCache, scriptToEvaluateOnLoad);
      }
    }
  }

  /**
   * @return {!DOMModel}
   */
  domModel() {
    return /** @type {!DOMModel} */ (this.target().model(DOMModel));
  }

  /**
   * @param {?Protocol.Page.FrameResourceTree} mainFramePayload
   */
  _processCachedResources(mainFramePayload) {
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

  /**
   * @return {boolean}
   */
  cachedResourcesLoaded() {
    return this._cachedResourcesProcessed;
  }

  /**
   * @return {boolean}
   */
  isInterstitialShowing() {
    return this._isInterstitialShowing;
  }

  /**
   * @param {!ResourceTreeFrame} frame
   * @param {boolean=} aboutToNavigate
   */
  _addFrame(frame, aboutToNavigate) {
    this._frames.set(frame.id, frame);
    if (frame.isMainFrame()) {
      this.mainFrame = frame;
    }
    this.dispatchEventToListeners(Events.FrameAdded, frame);
    this._updateSecurityOrigins();
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   * @param {?Protocol.Page.FrameId} parentFrameId
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   * @return {?ResourceTreeFrame}
   */
  _frameAttached(frameId, parentFrameId, stackTrace) {
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
      this._frameDetached(this.mainFrame.id);
    }
    this._addFrame(frame, true);
    return frame;
  }

  /**
   * @param {!Protocol.Page.Frame} framePayload
   */
  _frameNavigated(framePayload) {
    const sameTargetParentFrame = framePayload.parentId ? (this._frames.get(framePayload.parentId) || null) : null;
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed && sameTargetParentFrame) {
      return;
    }
    let frame = this._frames.get(framePayload.id) || null;
    if (!frame) {
      // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
      frame = this._frameAttached(framePayload.id, framePayload.parentId || '');
      console.assert(!!frame);
      if (!frame) {
        return;
      }
    }

    this.dispatchEventToListeners(Events.FrameWillNavigate, frame);
    frame._navigate(framePayload);
    this.dispatchEventToListeners(Events.FrameNavigated, frame);

    if (frame.isMainFrame()) {
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

  /**
   * @param {!Protocol.Page.FrameId} frameId
   */
  _frameDetached(frameId) {
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
      sameTargetParentFrame._removeChildFrame(frame);
    } else {
      frame._remove();
    }
    this._updateSecurityOrigins();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestFinished(event) {
    if (!this._cachedResourcesProcessed) {
      return;
    }

    const request = /** @type {!NetworkRequest} */ (event.data);
    if (request.failed || request.resourceType() === Common.ResourceType.resourceTypes.XHR) {
      return;
    }

    const frame = this._frames.get(request.frameId);
    if (frame) {
      frame._addRequest(request);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestUpdateDropped(event) {
    if (!this._cachedResourcesProcessed) {
      return;
    }

    const data = /** @type {!RequestUpdateDroppedEventData} */ (event.data);
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

  /**
   * @param {!Protocol.Page.FrameId} frameId
   * @return {?ResourceTreeFrame}
   */
  frameForId(frameId) {
    return this._frames.get(frameId) || null;
  }

  /**
   * @param {function(!Resource):boolean} callback
   * @return {boolean}
   */
  forAllResources(callback) {
    if (this.mainFrame) {
      return this.mainFrame._callForFrameResources(callback);
    }
    return false;
  }

  /**
   * @return {!Array<!ResourceTreeFrame>}
   */
  frames() {
    return [...this._frames.values()];
  }

  /**
   * @param {string} url
   * @return {?Resource}
   */
  resourceForURL(url) {
    // Workers call into this with no frames available.
    return this.mainFrame ? this.mainFrame.resourceForURL(url) : null;
  }

  /**
   * @param {?ResourceTreeFrame} sameTargetParentFrame
   * @param {!Protocol.Page.FrameResourceTree} frameTreePayload
   */
  _addFramesRecursively(sameTargetParentFrame, frameTreePayload) {
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

  /**
   * @param {!Protocol.Page.Frame} frame
   * @param {string} url
   * @param {!Common.ResourceType.ResourceType} type
   * @param {string} mimeType
   * @param {?number} lastModifiedTime
   * @param {?number} contentSize
   * @return {!Resource}
   */
  _createResourceFromFramePayload(frame, url, type, mimeType, lastModifiedTime, contentSize) {
    const lastModified = typeof lastModifiedTime === 'number' ? new Date(lastModifiedTime * 1000) : null;
    return new Resource(
        this, null, url, frame.url, frame.id, frame.loaderId, type, mimeType, lastModified, contentSize);
  }

  suspendReload() {
    this._reloadSuspensionCount++;
  }

  resumeReload() {
    this._reloadSuspensionCount--;
    console.assert(this._reloadSuspensionCount >= 0, 'Unbalanced call to ResourceTreeModel.resumeReload()');
    if (!this._reloadSuspensionCount && this._pendingReloadOptions) {
      const {ignoreCache, scriptToEvaluateOnLoad} = this._pendingReloadOptions;
      this.reloadPage(ignoreCache, scriptToEvaluateOnLoad);
    }
  }

  /**
   * @param {boolean=} ignoreCache
   * @param {string=} scriptToEvaluateOnLoad
   */
  reloadPage(ignoreCache, scriptToEvaluateOnLoad) {
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

  /**
   * @param {string} url
   * @return {!Promise<?>}
   */
  navigate(url) {
    return this._agent.invoke_navigate({url});
  }

  /**
   * @return {!Promise<?{currentIndex: number, entries: !Array<!Protocol.Page.NavigationEntry>}>}
   */
  async navigationHistory() {
    const response = await this._agent.invoke_getNavigationHistory();
    if (response.getError()) {
      return null;
    }
    return {currentIndex: response.currentIndex, entries: response.entries};
  }

  /**
   * @param {!Protocol.Page.NavigationEntry} entry
   */
  navigateToHistoryEntry(entry) {
    this._agent.invoke_navigateToHistoryEntry({entryId: entry.id});
  }

  /**
   * @return {!Promise<{url: string, data: ?string, errors: !Array<!Protocol.Page.AppManifestError>}>}
   */
  async fetchAppManifest() {
    const response = await this._agent.invoke_getAppManifest();
    if (response.getError()) {
      return {url: response.url, data: null, errors: []};
    }
    return {url: response.url, data: response.data || null, errors: response.errors};
  }

  /**
   * @return {!Promise<!Array<!Protocol.Page.InstallabilityError>>}
   */
  async getInstallabilityErrors() {
    const response = await this._agent.invoke_getInstallabilityErrors();
    return response.installabilityErrors || [];
  }

  /**
   * @return {!Promise<{primaryIcon: ?string}>}
   */
  async getManifestIcons() {
    const response = await this._agent.invoke_getManifestIcons();
    return {primaryIcon: response.primaryIcon || null};
  }

  /**
   * @param {!ExecutionContext} a
   * @param {!ExecutionContext} b
   * @return {number}
   */
  _executionContextComparator(a, b) {
    /**
     * @param {?ResourceTreeFrame} frame
     * @return {!Array<!ResourceTreeFrame>}
     */
    function framePath(frame) {
      let currentFrame = frame;
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

  /**
   * @return {!SecurityOriginData}
   */
  _getSecurityOriginData() {
    /** @type {!Set<string>} */
    const securityOrigins = new Set();

    let mainSecurityOrigin = null;
    let unreachableMainSecurityOrigin = null;
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
      unreachableMainSecurityOrigin: unreachableMainSecurityOrigin
    };
  }

  _updateSecurityOrigins() {
    const data = this._getSecurityOriginData();
    this._securityOriginManager.setMainSecurityOrigin(
        data.mainSecurityOrigin || '', data.unreachableMainSecurityOrigin || '');
    this._securityOriginManager.updateSecurityOrigins(data.securityOrigins);
  }

  /**
   * @return {?string}
   */
  getMainSecurityOrigin() {
    const data = this._getSecurityOriginData();
    return data.mainSecurityOrigin || data.unreachableMainSecurityOrigin;
  }
}

/** @enum {symbol} */
export const Events = {
  FrameAdded: Symbol('FrameAdded'),
  FrameNavigated: Symbol('FrameNavigated'),
  FrameDetached: Symbol('FrameDetached'),
  FrameResized: Symbol('FrameResized'),
  FrameWillNavigate: Symbol('FrameWillNavigate'),
  MainFrameNavigated: Symbol('MainFrameNavigated'),
  ResourceAdded: Symbol('ResourceAdded'),
  WillLoadCachedResources: Symbol('WillLoadCachedResources'),
  CachedResourcesLoaded: Symbol('CachedResourcesLoaded'),
  DOMContentLoaded: Symbol('DOMContentLoaded'),
  LifecycleEvent: Symbol('LifecycleEvent'),
  Load: Symbol('Load'),
  PageReloadRequested: Symbol('PageReloadRequested'),
  WillReloadPage: Symbol('WillReloadPage'),
  InterstitialShown: Symbol('InterstitialShown'),
  InterstitialHidden: Symbol('InterstitialHidden')
};

export class ResourceTreeFrame {
  /**
   * @param {!ResourceTreeModel} model
   * @param {?ResourceTreeFrame} parentFrame
   * @param {!Protocol.Page.FrameId} frameId
   * @param {?Protocol.Page.Frame} payload
   * @param {?Protocol.Runtime.StackTrace} creationStackTrace
   */
  constructor(model, parentFrame, frameId, payload, creationStackTrace) {
    this._model = model;
    this._sameTargetParentFrame = parentFrame;
    this._id = frameId;
    /** @type {?Protocol.Page.FrameId} */
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

    this._creationStackTrace = creationStackTrace;

    /**
     * @type {!Set.<!ResourceTreeFrame>}
     */
    this._childFrames = new Set();

    /**
     * @type {!Map<string, !Resource>}
     */
    this._resourcesMap = new Map();

    if (this._sameTargetParentFrame) {
      this._sameTargetParentFrame._childFrames.add(this);
    }
  }

  /**
   * @returns {boolean}
   */
  isSecureContext() {
    return !!this._secureContextType && this._secureContextType.startsWith('Secure');
  }

  /**
   * @returns {?Protocol.Page.SecureContextType}
   */
  getSecureContextType() {
    return this._secureContextType;
  }

  /**
   * @returns {boolean}
   */
  isCrossOriginIsolated() {
    return !!this._crossOriginIsolatedContextType && this._crossOriginIsolatedContextType.startsWith('Isolated');
  }

  /**
   * @returns {?Protocol.Page.CrossOriginIsolatedContextType}
   */
  getCrossOriginIsolatedContextType() {
    return this._crossOriginIsolatedContextType;
  }

  /**
   * @param {!Protocol.Page.Frame} framePayload
   */
  _navigate(framePayload) {
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

    const mainResource = this._resourcesMap.get(this._url);
    this._resourcesMap.clear();
    this._removeChildFrames();
    if (mainResource && mainResource.loaderId === this._loaderId) {
      this.addResource(mainResource);
    }
  }

  /**
   * @return {!ResourceTreeModel}
   */
  resourceTreeModel() {
    return this._model;
  }

  /**
   * @return {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  get name() {
    return this._name || '';
  }

  /**
   * @return {string}
   */
  get url() {
    return this._url;
  }

  /**
   * @return {string}
   */
  domainAndRegistry() {
    return this._domainAndRegistry;
  }

  /**
   * @return {?string}
   */
  get securityOrigin() {
    return this._securityOrigin;
  }

  /**
   * @return {string}
   */
  unreachableUrl() {
    return this._unreachableUrl;
  }

  /**
   * @return {string}
   */
  get loaderId() {
    return this._loaderId;
  }

  /**
   * @return {!Protocol.Page.AdFrameType}
   */
  adFrameType() {
    return this._adFrameType;
  }

  /**
   * @return {!Array.<!ResourceTreeFrame>}
   */
  get childFrames() {
    return [...this._childFrames];
  }

  /**
   * Returns the parent frame if both frames are part of the same process/target.
   * @return {?ResourceTreeFrame}
   */
  sameTargetParentFrame() {
    return this._sameTargetParentFrame;
  }

  /**
   * Returns the parent frame if both frames are part of different processes/targets (child is an OOPIF).
   * @return {?ResourceTreeFrame}
   */
  crossTargetParentFrame() {
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
   * @return {?ResourceTreeFrame}
   */
  parentFrame() {
    return this.sameTargetParentFrame() || this.crossTargetParentFrame();
  }

  /**
   * @param {function(!Protocol.Runtime.CallFrame):boolean} searchFn
   * @return {?Protocol.Runtime.CallFrame}
   */
  findCreationCallFrame(searchFn) {
    let stackTrace = this._creationStackTrace;
    while (stackTrace) {
      const foundEntry = stackTrace.callFrames.find(searchFn);
      if (foundEntry) {
        return foundEntry;
      }
      stackTrace = stackTrace.parent || null;
    }
    return null;
  }

  /**
   * Returns true if this is the main frame of its target. For example, this returns true for the main frame
   * of an out-of-process iframe (OOPIF).
   * @return {boolean}
   */
  isMainFrame() {
    return !this._sameTargetParentFrame;
  }

  /**
   * Returns true if this is the top frame of the main target, i.e. if this is the top-most frame in the inspected
   * tab.
   * @return {boolean}
   */
  isTopFrame() {
    return !this._model.target().parentTarget() && !this._sameTargetParentFrame && !this._crossTargetParentFrameId;
  }

  /**
   * @param {!ResourceTreeFrame} frame
   */
  _removeChildFrame(frame) {
    this._childFrames.delete(frame);
    frame._remove();
  }

  _removeChildFrames() {
    const frames = this._childFrames;
    this._childFrames = new Set();
    for (const frame of frames) {
      frame._remove();
    }
  }

  _remove() {
    this._removeChildFrames();
    this._model._frames.delete(this.id);
    this._model.dispatchEventToListeners(Events.FrameDetached, this);
  }

  /**
   * @param {!Resource} resource
   */
  addResource(resource) {
    if (this._resourcesMap.get(resource.url) === resource) {
      // Already in the tree, we just got an extra update.
      return;
    }
    this._resourcesMap.set(resource.url, resource);
    this._model.dispatchEventToListeners(Events.ResourceAdded, resource);
  }

  /**
   * @param {!NetworkRequest} request
   */
  _addRequest(request) {
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

  /**
   * @return {!Array.<!Resource>}
   */
  resources() {
    return Array.from(this._resourcesMap.values());
  }

  /**
   * @param {string} url
   * @return {?Resource}
   */
  resourceForURL(url) {
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

  /**
   * @param {function(!Resource):boolean} callback
   * @return {boolean}
   */
  _callForFrameResources(callback) {
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

  /**
   * @return {string}
   */
  displayName() {
    if (this.isTopFrame()) {
      return Common.UIString.UIString('top');
    }
    const subtitle = new Common.ParsedURL.ParsedURL(this._url).displayName;
    if (subtitle) {
      if (!this._name) {
        return subtitle;
      }
      return this._name + ' (' + subtitle + ')';
    }
    return Common.UIString.UIString('<iframe>');
  }

  /**
   * @returns {!Promise<?DeferredDOMNode>}
   */
  async getOwnerDeferredDOMNode() {
    const parentFrame = this.parentFrame();
    if (!parentFrame) {
      return null;
    }
    return parentFrame.resourceTreeModel().domModel().getOwnerNodeForFrame(this._id);
  }

  /**
   * @returns {!Promise<?DOMNode>}
   */
  async getOwnerDOMNodeOrDocument() {
    const deferredNode = await this.getOwnerDeferredDOMNode();
    if (deferredNode) {
      return deferredNode.resolvePromise();
    }
    if (this.isTopFrame()) {
      return this.resourceTreeModel().domModel().requestDocument();
    }
    return null;
  }

  /**
   * @returns {!Promise<void>}
   */
  async highlight() {
    const parentFrame = this.parentFrame();
    const parentTarget = this.resourceTreeModel().target().parentTarget();
    /**
     * @param {!DOMModel} domModel
     */
    const highlightFrameOwner = async domModel => {
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
}

/**
 * @implements {ProtocolProxyApi.PageDispatcher}
 */
export class PageDispatcher {
  /**
   * @param {!ResourceTreeModel} resourceTreeModel
   */
  constructor(resourceTreeModel) {
    this._resourceTreeModel = resourceTreeModel;
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  /**
   * @override
   * @param {!Protocol.Page.DomContentEventFiredEvent} event
   */
  domContentEventFired({timestamp}) {
    this._resourceTreeModel.dispatchEventToListeners(Events.DOMContentLoaded, timestamp);
  }

  /**
   * @override
   * @param {!Protocol.Page.LoadEventFiredEvent} event
   */
  loadEventFired({timestamp}) {
    this._resourceTreeModel.dispatchEventToListeners(
        Events.Load, {resourceTreeModel: this._resourceTreeModel, loadTime: timestamp});
  }

  /**
   * @override
   * @param {!Protocol.Page.LifecycleEventEvent} event
   */
  lifecycleEvent({frameId, loaderId, name, timestamp}) {
    this._resourceTreeModel.dispatchEventToListeners(Events.LifecycleEvent, {frameId, name});
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameAttachedEvent} event
   */
  frameAttached({frameId, parentFrameId, stack}) {
    this._resourceTreeModel._frameAttached(frameId, parentFrameId, stack);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameNavigatedEvent} event
   */
  frameNavigated({frame}) {
    this._resourceTreeModel._frameNavigated(frame);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameDetachedEvent} event
   */
  frameDetached({frameId}) {
    this._resourceTreeModel._frameDetached(frameId);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameStartedLoadingEvent} event
   */
  frameStartedLoading({frameId}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameStoppedLoadingEvent} event
   */
  frameStoppedLoading({frameId}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameRequestedNavigationEvent} event
   */
  frameRequestedNavigation({frameId}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameScheduledNavigationEvent} event
   */
  frameScheduledNavigation({frameId, delay}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameClearedScheduledNavigationEvent} event
   */
  frameClearedScheduledNavigation({frameId}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.NavigatedWithinDocumentEvent} event
   */
  navigatedWithinDocument({frameId, url}) {
  }

  /**
   * @override
   */
  frameResized() {
    this._resourceTreeModel.dispatchEventToListeners(Events.FrameResized, null);
  }

  /**
   * @override
   * @param {!Protocol.Page.JavascriptDialogOpeningEvent} event
   */
  javascriptDialogOpening({url, message, type, hasBrowserHandler, defaultPrompt}) {
    if (!hasBrowserHandler) {
      this._resourceTreeModel._agent.invoke_handleJavaScriptDialog({accept: false});
    }
  }

  /**
   * @override
   * @param {!Protocol.Page.JavascriptDialogClosedEvent} event
   */
  javascriptDialogClosed({result, userInput}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.ScreencastFrameEvent} event
   */
  screencastFrame({data, metadata, sessionId}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.ScreencastVisibilityChangedEvent} event
   */
  screencastVisibilityChanged({visible}) {
  }

  /**
   * @override
   */
  interstitialShown() {
    this._resourceTreeModel._isInterstitialShowing = true;
    this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialShown);
  }

  /**
   * @override
   */
  interstitialHidden() {
    this._resourceTreeModel._isInterstitialShowing = false;
    this._resourceTreeModel.dispatchEventToListeners(Events.InterstitialHidden);
  }

  /**
   * @override
   * @param {!Protocol.Page.WindowOpenEvent} event
   */
  windowOpen({url, windowName, windowFeatures, userGesture}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.CompilationCacheProducedEvent} event
   */
  compilationCacheProduced({url, data}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FileChooserOpenedEvent} event
   */
  fileChooserOpened({mode}) {
  }

  /**
   * @override
   * @param {!Protocol.Page.DownloadWillBeginEvent} event
   */
  downloadWillBegin({frameId, url}) {
  }

  /**
   * @override
   */
  downloadProgress() {
  }
}

SDKModel.register(ResourceTreeModel, Capability.DOM, true);

/**
 * @typedef {{
  *      securityOrigins: !Set<string>,
  *      mainSecurityOrigin: ?string,
  *      unreachableMainSecurityOrigin: ?string
  * }}
  */
// @ts-ignore typedef
export let SecurityOriginData;
