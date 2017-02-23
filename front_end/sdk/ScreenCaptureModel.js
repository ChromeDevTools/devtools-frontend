// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Protocol.PageDispatcher}
 */
SDK.ScreenCaptureModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.pageAgent();
    /** @type {?function(string, !Protocol.Page.ScreencastFrameMetadata)} */
    this._onScreencastFrame = null;
    /** @type {?function(boolean)} */
    this._onScreencastVisibilityChanged = null;
    target.registerPageDispatcher(this);
  }

  /**
   * @param {string} format
   * @param {number} quality
   * @param {number|undefined} width
   * @param {number|undefined} height
   * @param {number|undefined} everyNthFrame
   * @param {function(string, !Protocol.Page.ScreencastFrameMetadata)} onFrame
   * @param {function(boolean)} onVisibilityChanged
   */
  startScreencast(format, quality, width, height, everyNthFrame, onFrame, onVisibilityChanged) {
    this._onScreencastFrame = onFrame;
    this._onScreencastVisibilityChanged = onVisibilityChanged;
    this._agent.startScreencast(format, quality, width, height, everyNthFrame);
  }

  stopScreencast() {
    this._onScreencastFrame = null;
    this._onScreencastVisibilityChanged = null;
    this._agent.stopScreencast();
  }

  /**
   * @param {string} format
   * @param {number} quality
   * @return {!Promise<?string>}
   */
  captureScreenshot(format, quality) {
    var fulfill;
    var promise = new Promise(callback => fulfill = callback);
    this._agent.captureScreenshot(format, quality, (error, content) => {
      if (error)
        console.error(error);
      fulfill(error ? null : content);
    });
    return promise;
  }

  /**
   * @return {!Promise<?{width: number, height: number}>}
   */
  fetchContentSize() {
    var fulfill;
    var promise = new Promise(callback => fulfill = callback);
    this._agent.getLayoutMetrics((error, layoutViewport, visualViewport, contentSize) => {
      fulfill(error ? null : {width: contentSize.width, height: contentSize.height});
    });
    return promise;
  }

  /**
   * @override
   * @param {string} data
   * @param {!Protocol.Page.ScreencastFrameMetadata} metadata
   * @param {number} sessionId
   */
  screencastFrame(data, metadata, sessionId) {
    this._agent.screencastFrameAck(sessionId);
    if (this._onScreencastFrame)
      this._onScreencastFrame.call(null, data, metadata);
  }

  /**
   * @override
   * @param {boolean} visible
   */
  screencastVisibilityChanged(visible) {
    if (this._onScreencastVisibilityChanged)
      this._onScreencastVisibilityChanged.call(null, visible);
  }

  /**
   * @override
   * @param {number} time
   */
  domContentEventFired(time) {
  }

  /**
   * @override
   * @param {number} time
   */
  loadEventFired(time) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Page.FrameId} parentFrameId
   */
  frameAttached(frameId, parentFrameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.Frame} frame
   */
  frameNavigated(frame) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameDetached(frameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameStartedLoading(frameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameStoppedLoading(frameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   * @param {number} delay
   */
  frameScheduledNavigation(frameId, delay) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameClearedScheduledNavigation(frameId) {
  }

  /**
   * @override
   */
  frameResized() {
  }

  /**
   * @override
   * @param {string} message
   * @param {string} dialogType
   */
  javascriptDialogOpening(message, dialogType) {
  }

  /**
   * @override
   * @param {boolean} result
   */
  javascriptDialogClosed(result) {
  }

  /**
   * @override
   * @param {!Protocol.DOM.RGBA} color
   */
  colorPicked(color) {
  }

  /**
   * @override
   */
  interstitialShown() {
  }

  /**
   * @override
   */
  interstitialHidden() {
  }

  /**
   * @override
   */
  navigationRequested() {
  }
};

SDK.SDKModel.register(SDK.ScreenCaptureModel, SDK.Target.Capability.ScreenCapture);
