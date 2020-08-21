// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {OverlayModel} from './OverlayModel.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {ProtocolProxyApi.PageDispatcher}
 */
export class ScreenCaptureModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.pageAgent();
    /** @type {?function(!Protocol.binary, !Protocol.Page.ScreencastFrameMetadata):void} */
    this._onScreencastFrame = null;
    /** @type {?function(boolean):void} */
    this._onScreencastVisibilityChanged = null;
    target.registerPageDispatcher(this);
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  /**
   * @param {!Protocol.Page.StartScreencastRequestFormat} format
   * @param {number} quality
   * @param {number|undefined} maxWidth
   * @param {number|undefined} maxHeight
   * @param {number|undefined} everyNthFrame
   * @param {function(!Protocol.binary, !Protocol.Page.ScreencastFrameMetadata): void} onFrame
   * @param {function(boolean): void} onVisibilityChanged
   */
  startScreencast(format, quality, maxWidth, maxHeight, everyNthFrame, onFrame, onVisibilityChanged) {
    this._onScreencastFrame = onFrame;
    this._onScreencastVisibilityChanged = onVisibilityChanged;
    this._agent.invoke_startScreencast({format, quality, maxWidth, maxHeight, everyNthFrame});
  }

  stopScreencast() {
    this._onScreencastFrame = null;
    this._onScreencastVisibilityChanged = null;
    this._agent.invoke_stopScreencast();
  }

  /**
   * @param {!Protocol.Page.CaptureScreenshotRequestFormat} format
   * @param {number} quality
   * @param {!Protocol.Page.Viewport=} clip
   * @return {!Promise<?Protocol.binary>}
   */
  async captureScreenshot(format, quality, clip) {
    await OverlayModel.muteHighlight();
    const result = await this._agent.invoke_captureScreenshot({format, quality, clip, fromSurface: true});
    await OverlayModel.unmuteHighlight();
    return result.data;
  }

  /**
   * @return {!Promise<?{viewportX: number, viewportY: number, viewportScale: number, contentWidth: number, contentHeight: number}>}
   */
  async fetchLayoutMetrics() {
    const response = await this._agent.invoke_getLayoutMetrics();
    if (response.getError()) {
      return null;
    }
    return {
      viewportX: response.visualViewport.pageX,
      viewportY: response.visualViewport.pageY,
      viewportScale: response.visualViewport.scale,
      contentWidth: response.contentSize.width,
      contentHeight: response.contentSize.height
    };
  }

  /**
   * @override
   * @param {!Protocol.Page.ScreencastFrameEvent} _
   */
  screencastFrame({data, metadata, sessionId}) {
    this._agent.invoke_screencastFrameAck({sessionId});
    if (this._onScreencastFrame) {
      this._onScreencastFrame.call(null, data, metadata);
    }
  }

  /**
   * @override
   * @param {!Protocol.Page.ScreencastVisibilityChangedEvent} _
   */
  screencastVisibilityChanged({visible}) {
    if (this._onScreencastVisibilityChanged) {
      this._onScreencastVisibilityChanged.call(null, visible);
    }
  }

  /**
   * @override
   * @param {!Protocol.Page.DomContentEventFiredEvent} params
   */
  domContentEventFired(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.LoadEventFiredEvent} params
   */
  loadEventFired(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.LifecycleEventEvent} params
   */
  lifecycleEvent(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.NavigatedWithinDocumentEvent} params
   */
  navigatedWithinDocument(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameAttachedEvent} params
   */
  frameAttached(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameNavigatedEvent} params
   */
  frameNavigated(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameDetachedEvent} params
   */
  frameDetached(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameStartedLoadingEvent} params
   */
  frameStartedLoading(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameStoppedLoadingEvent} params
   */
  frameStoppedLoading(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameRequestedNavigationEvent} params
   */
  frameRequestedNavigation(params) {
  }


  /**
   * @override
   * @param {!Protocol.Page.FrameScheduledNavigationEvent} params
   */
  frameScheduledNavigation(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameClearedScheduledNavigationEvent} params
   */
  frameClearedScheduledNavigation(params) {
  }

  /**
   * @override
   */
  frameResized() {
  }

  /**
   * @override
   * @param {!Protocol.Page.JavascriptDialogOpeningEvent} params
   */
  javascriptDialogOpening(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.JavascriptDialogClosedEvent} params
   */
  javascriptDialogClosed(params) {
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
   * @param {!Protocol.Page.WindowOpenEvent} params
   */
  windowOpen(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FileChooserOpenedEvent} params
   */
  fileChooserOpened(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.CompilationCacheProducedEvent} params
   */
  compilationCacheProduced(params) {
  }

  /**
   * @override
   * @param {!Protocol.Page.DownloadWillBeginEvent} params
   */
  downloadWillBegin(params) {
  }

  /**
   * @override
   */
  downloadProgress() {
  }
}

SDKModel.register(ScreenCaptureModel, Capability.ScreenCapture, false);
