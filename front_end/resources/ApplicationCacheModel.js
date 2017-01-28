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

/**
 * @unrestricted
 */
Resources.ApplicationCacheModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    target.registerApplicationCacheDispatcher(new Resources.ApplicationCacheDispatcher(this));
    this._agent = target.applicationCacheAgent();
    this._agent.enable();

    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);

    this._statuses = {};
    this._manifestURLsByFrame = {};

    this._mainFrameNavigated();
    this._onLine = true;
  }

  /**
   * @param {!SDK.Target} target
   * @return {?Resources.ApplicationCacheModel}
   */
  static fromTarget(target) {
    return target.model(Resources.ApplicationCacheModel);
  }

  _frameNavigated(event) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    if (frame.isMainFrame()) {
      this._mainFrameNavigated();
      return;
    }

    this._agent.getManifestForFrame(frame.id, this._manifestForFrameLoaded.bind(this, frame.id));
  }

  /**
   * @param {!Common.Event} event
   */
  _frameDetached(event) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    this._frameManifestRemoved(frame.id);
  }

  reset() {
    this._statuses = {};
    this._manifestURLsByFrame = {};
    this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestsReset);
  }

  _mainFrameNavigated() {
    this._agent.getFramesWithManifests(this._framesWithManifestsLoaded.bind(this));
  }

  /**
   * @param {string} frameId
   * @param {?Protocol.Error} error
   * @param {string} manifestURL
   */
  _manifestForFrameLoaded(frameId, error, manifestURL) {
    if (error) {
      console.error(error);
      return;
    }

    if (!manifestURL)
      this._frameManifestRemoved(frameId);
  }

  /**
   * @param {?Protocol.Error} error
   * @param {!Array.<!Protocol.ApplicationCache.FrameWithManifest>} framesWithManifests
   */
  _framesWithManifestsLoaded(error, framesWithManifests) {
    if (error) {
      console.error(error);
      return;
    }

    for (var i = 0; i < framesWithManifests.length; ++i) {
      this._frameManifestUpdated(
          framesWithManifests[i].frameId, framesWithManifests[i].manifestURL, framesWithManifests[i].status);
    }
  }

  /**
   * @param {string} frameId
   * @param {string} manifestURL
   * @param {number} status
   */
  _frameManifestUpdated(frameId, manifestURL, status) {
    if (status === applicationCache.UNCACHED) {
      this._frameManifestRemoved(frameId);
      return;
    }

    if (!manifestURL)
      return;

    if (this._manifestURLsByFrame[frameId] && manifestURL !== this._manifestURLsByFrame[frameId])
      this._frameManifestRemoved(frameId);

    var statusChanged = this._statuses[frameId] !== status;
    this._statuses[frameId] = status;

    if (!this._manifestURLsByFrame[frameId]) {
      this._manifestURLsByFrame[frameId] = manifestURL;
      this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestAdded, frameId);
    }

    if (statusChanged)
      this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestStatusUpdated, frameId);
  }

  /**
   * @param {string} frameId
   */
  _frameManifestRemoved(frameId) {
    if (!this._manifestURLsByFrame[frameId])
      return;

    delete this._manifestURLsByFrame[frameId];
    delete this._statuses[frameId];

    this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.FrameManifestRemoved, frameId);
  }

  /**
   * @param {string} frameId
   * @return {string}
   */
  frameManifestURL(frameId) {
    return this._manifestURLsByFrame[frameId] || '';
  }

  /**
   * @param {string} frameId
   * @return {number}
   */
  frameManifestStatus(frameId) {
    return this._statuses[frameId] || applicationCache.UNCACHED;
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
   * @param {function(?Protocol.ApplicationCache.ApplicationCache)} callback
   */
  requestApplicationCache(frameId, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.ApplicationCache.ApplicationCache} applicationCache
     */
    function callbackWrapper(error, applicationCache) {
      if (error) {
        console.error(error);
        callback(null);
        return;
      }

      callback(applicationCache);
    }

    this._agent.getApplicationCacheForFrame(frameId, callbackWrapper);
  }

  /**
   * @param {boolean} isNowOnline
   */
  _networkStateUpdated(isNowOnline) {
    this._onLine = isNowOnline;
    this.dispatchEventToListeners(Resources.ApplicationCacheModel.Events.NetworkStateChanged, isNowOnline);
  }
};

SDK.SDKModel.register(Resources.ApplicationCacheModel, SDK.Target.Capability.DOM);

/** @enum {symbol} */
Resources.ApplicationCacheModel.Events = {
  FrameManifestStatusUpdated: Symbol('FrameManifestStatusUpdated'),
  FrameManifestAdded: Symbol('FrameManifestAdded'),
  FrameManifestRemoved: Symbol('FrameManifestRemoved'),
  FrameManifestsReset: Symbol('FrameManifestsReset'),
  NetworkStateChanged: Symbol('NetworkStateChanged')
};

/**
 * @implements {Protocol.ApplicationCacheDispatcher}
 * @unrestricted
 */
Resources.ApplicationCacheDispatcher = class {
  constructor(applicationCacheModel) {
    this._applicationCacheModel = applicationCacheModel;
  }

  /**
   * @override
   * @param {string} frameId
   * @param {string} manifestURL
   * @param {number} status
   */
  applicationCacheStatusUpdated(frameId, manifestURL, status) {
    this._applicationCacheModel._statusUpdated(frameId, manifestURL, status);
  }

  /**
   * @override
   * @param {boolean} isNowOnline
   */
  networkStateUpdated(isNowOnline) {
    this._applicationCacheModel._networkStateUpdated(isNowOnline);
  }
};
