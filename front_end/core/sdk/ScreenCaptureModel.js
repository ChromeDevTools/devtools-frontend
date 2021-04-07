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
    const result = await this._agent.invoke_captureScreenshot(
        {format, quality, clip, fromSurface: true, captureBeyondViewport: true});
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
      viewportX: response.cssVisualViewport.pageX,
      viewportY: response.cssVisualViewport.pageY,
      viewportScale: response.cssVisualViewport.scale,
      contentWidth: response.cssContentSize.width,
      contentHeight: response.cssContentSize.height
    };
  }

  /**
   * @param {!Protocol.Page.ScreencastFrameEvent} _
   */
  screencastFrame({data, metadata, sessionId}) {
    this._agent.invoke_screencastFrameAck({sessionId});
    if (this._onScreencastFrame) {
      this._onScreencastFrame.call(null, data, metadata);
    }
  }

  /**
   * @param {!Protocol.Page.ScreencastVisibilityChangedEvent} _
   */
  screencastVisibilityChanged({visible}) {
    if (this._onScreencastVisibilityChanged) {
      this._onScreencastVisibilityChanged.call(null, visible);
    }
  }

  /**
   * @param {!Protocol.Page.DomContentEventFiredEvent} params
   */
  domContentEventFired(params) {
  }

  /**
   * @param {!Protocol.Page.LoadEventFiredEvent} params
   */
  loadEventFired(params) {
  }

  /**
   * @param {!Protocol.Page.LifecycleEventEvent} params
   */
  lifecycleEvent(params) {
  }

  /**
   * @param {!Protocol.Page.NavigatedWithinDocumentEvent} params
   */
  navigatedWithinDocument(params) {
  }

  /**
   * @param {!Protocol.Page.FrameAttachedEvent} params
   */
  frameAttached(params) {
  }

  /**
   * @param {!Protocol.Page.FrameNavigatedEvent} params
   */
  frameNavigated(params) {
  }

  /**
   * @param {!Protocol.Page.DocumentOpenedEvent} params
   */
  documentOpened(params) {
  }

  /**
   * @param {!Protocol.Page.FrameDetachedEvent} params
   */
  frameDetached(params) {
  }

  /**
   * @param {!Protocol.Page.FrameStartedLoadingEvent} params
   */
  frameStartedLoading(params) {
  }

  /**
   * @param {!Protocol.Page.FrameStoppedLoadingEvent} params
   */
  frameStoppedLoading(params) {
  }

  /**
   * @param {!Protocol.Page.FrameRequestedNavigationEvent} params
   */
  frameRequestedNavigation(params) {
  }


  /**
   * @param {!Protocol.Page.FrameScheduledNavigationEvent} params
   */
  frameScheduledNavigation(params) {
  }

  /**
   * @param {!Protocol.Page.FrameClearedScheduledNavigationEvent} params
   */
  frameClearedScheduledNavigation(params) {
  }

  frameResized() {
  }

  /**
   * @param {!Protocol.Page.JavascriptDialogOpeningEvent} params
   */
  javascriptDialogOpening(params) {
  }

  /**
   * @param {!Protocol.Page.JavascriptDialogClosedEvent} params
   */
  javascriptDialogClosed(params) {
  }

  interstitialShown() {
  }

  interstitialHidden() {
  }

  /**
   * @param {!Protocol.Page.WindowOpenEvent} params
   */
  windowOpen(params) {
  }

  /**
   * @param {!Protocol.Page.FileChooserOpenedEvent} params
   */
  fileChooserOpened(params) {
  }

  /**
   * @param {!Protocol.Page.CompilationCacheProducedEvent} params
   */
  compilationCacheProduced(params) {
  }

  /**
   * @param {!Protocol.Page.DownloadWillBeginEvent} params
   */
  downloadWillBegin(params) {
  }

  downloadProgress() {
  }
}

SDKModel.register(ScreenCaptureModel, Capability.ScreenCapture, false);
