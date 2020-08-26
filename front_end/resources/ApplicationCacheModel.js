/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';

export class ApplicationCacheModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);

    target.registerApplicationCacheDispatcher(new ApplicationCacheDispatcher(this));
    this._agent = target.applicationCacheAgent();
    this._agent.invoke_enable();

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);

    /** @type {!Map<!Protocol.Page.FrameId, number>} */
    this._statuses = new Map();
    /** @type {!Map<!Protocol.Page.FrameId, string>} */
    this._manifestURLsByFrame = new Map();

    this._mainFrameNavigated();
    this._onLine = true;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _frameNavigated(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);
    if (frame.isMainFrame()) {
      this._mainFrameNavigated();
      return;
    }

    const frameId = frame.id;
    const manifestURL = await this._agent.invoke_getManifestForFrame({frameId});
    if (manifestURL !== null && !manifestURL) {
      this._frameManifestRemoved(frameId);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _frameDetached(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);
    this._frameManifestRemoved(frame.id);
  }

  reset() {
    this._statuses.clear();
    this._manifestURLsByFrame.clear();
    this.dispatchEventToListeners(Events.FrameManifestsReset);
  }

  async _mainFrameNavigated() {
    const framesWithManifests = await this._agent.invoke_getFramesWithManifests();
    if (framesWithManifests.getError()) {
      return;
    }
    for (const frame of framesWithManifests.frameIds) {
      this._frameManifestUpdated(frame.frameId, frame.manifestURL, frame.status);
    }
  }

  /**
   * @param {string} frameId
   * @param {string} manifestURL
   * @param {number} status
   */
  _frameManifestUpdated(frameId, manifestURL, status) {
    if (status === UNCACHED) {
      this._frameManifestRemoved(frameId);
      return;
    }

    if (!manifestURL) {
      return;
    }

    const recordedManifestURL = this._manifestURLsByFrame.get(frameId);
    if (recordedManifestURL && manifestURL !== recordedManifestURL) {
      this._frameManifestRemoved(frameId);
    }

    const statusChanged = this._statuses.get(frameId) !== status;
    this._statuses.set(frameId, status);

    if (!this._manifestURLsByFrame.has(frameId)) {
      this._manifestURLsByFrame.set(frameId, manifestURL);
      this.dispatchEventToListeners(Events.FrameManifestAdded, frameId);
    }

    if (statusChanged) {
      this.dispatchEventToListeners(Events.FrameManifestStatusUpdated, frameId);
    }
  }

  /**
   * @param {string} frameId
   */
  _frameManifestRemoved(frameId) {
    const removed = this._manifestURLsByFrame.delete(frameId);
    this._statuses.delete(frameId);
    if (removed) {
      this.dispatchEventToListeners(Events.FrameManifestRemoved, frameId);
    }
  }

  /**
   * @param {string} frameId
   * @return {string}
   */
  frameManifestURL(frameId) {
    return this._manifestURLsByFrame.get(frameId) || '';
  }

  /**
   * @param {string} frameId
   * @return {number}
   */
  frameManifestStatus(frameId) {
    return this._statuses.get(frameId) || UNCACHED;
  }

  /**
   * @return {boolean}
   */
  get onLine() {
    return this._onLine;
  }

  /**
   * @param {string} frameId
   * @param {string} manifestURL
   * @param {number} status
   */
  _statusUpdated(frameId, manifestURL, status) {
    this._frameManifestUpdated(frameId, manifestURL, status);
  }

  /**
   * @param {string} frameId
   * @return {!Promise<?Protocol.ApplicationCache.ApplicationCache>}
   */
  async requestApplicationCache(frameId) {
    const response = await this._agent.invoke_getApplicationCacheForFrame({frameId});
    if (response.getError()) {
      return null;
    }
    return response.applicationCache;
  }

  /**
   * @param {boolean} isNowOnline
   */
  _networkStateUpdated(isNowOnline) {
    this._onLine = isNowOnline;
    this.dispatchEventToListeners(Events.NetworkStateChanged, isNowOnline);
  }
}

SDK.SDKModel.SDKModel.register(ApplicationCacheModel, SDK.SDKModel.Capability.DOM, false);

/** @enum {symbol} */
export const Events = {
  FrameManifestStatusUpdated: Symbol('FrameManifestStatusUpdated'),
  FrameManifestAdded: Symbol('FrameManifestAdded'),
  FrameManifestRemoved: Symbol('FrameManifestRemoved'),
  FrameManifestsReset: Symbol('FrameManifestsReset'),
  NetworkStateChanged: Symbol('NetworkStateChanged')
};

/**
 * @implements {ProtocolProxyApi.ApplicationCacheDispatcher}
 */
export class ApplicationCacheDispatcher {
  /**
   * @param {!ApplicationCacheModel} applicationCacheModel
   */
  constructor(applicationCacheModel) {
    this._applicationCacheModel = applicationCacheModel;
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  /**
   * @override
   * @param {!Protocol.ApplicationCache.ApplicationCacheStatusUpdatedEvent} event
   */
  applicationCacheStatusUpdated({frameId, manifestURL, status}) {
    this._applicationCacheModel._statusUpdated(frameId, manifestURL, status);
  }

  /**
   * @override
   * @param {!Protocol.ApplicationCache.NetworkStateUpdatedEvent} event
   */
  networkStateUpdated({isNowOnline}) {
    this._applicationCacheModel._networkStateUpdated(isNowOnline);
  }
}

export const UNCACHED = 0;
export const IDLE = 1;
export const CHECKING = 2;
export const DOWNLOADING = 3;
export const UPDATEREADY = 4;
export const OBSOLETE = 5;
