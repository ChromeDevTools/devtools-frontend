// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {OverlayModel} from './OverlayModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

export const enum ScreenshotMode {
  FROM_VIEWPORT = 'fromViewport',
  FROM_CLIP = 'fromClip',
  FULLPAGE = 'fullpage',
}
export class ScreenCaptureModel extends SDKModel<void> implements ProtocolProxyApi.PageDispatcher {
  readonly #agent: ProtocolProxyApi.PageApi;
  #onScreencastFrame: ((arg0: Protocol.binary, arg1: Protocol.Page.ScreencastFrameMetadata) => void)|null;
  #onScreencastVisibilityChanged: ((arg0: boolean) => void)|null;
  constructor(target: Target) {
    super(target);
    this.#agent = target.pageAgent();
    this.#onScreencastFrame = null;
    this.#onScreencastVisibilityChanged = null;
    target.registerPageDispatcher(this);
  }

  startScreencast(
      format: Protocol.Page.StartScreencastRequestFormat, quality: number, maxWidth: number|undefined,
      maxHeight: number|undefined, everyNthFrame: number|undefined,
      onFrame: (arg0: Protocol.binary, arg1: Protocol.Page.ScreencastFrameMetadata) => void,
      onVisibilityChanged: (arg0: boolean) => void): void {
    this.#onScreencastFrame = onFrame;
    this.#onScreencastVisibilityChanged = onVisibilityChanged;
    void this.#agent.invoke_startScreencast({format, quality, maxWidth, maxHeight, everyNthFrame});
  }

  stopScreencast(): void {
    this.#onScreencastFrame = null;
    this.#onScreencastVisibilityChanged = null;
    void this.#agent.invoke_stopScreencast();
  }

  async captureScreenshot(
      format: Protocol.Page.CaptureScreenshotRequestFormat, quality: number, mode: ScreenshotMode,
      clip?: Protocol.Page.Viewport): Promise<string|null> {
    const properties: Protocol.Page.CaptureScreenshotRequest = {
      format: format,
      quality: quality,
      fromSurface: true,
    };
    switch (mode) {
      case ScreenshotMode.FROM_CLIP:
        properties.captureBeyondViewport = true;
        properties.clip = clip;
        break;
      case ScreenshotMode.FULLPAGE:
        properties.captureBeyondViewport = true;
        break;
      case ScreenshotMode.FROM_VIEWPORT:
        properties.captureBeyondViewport = false;
        break;
      default:
        throw new Error('Unexpected or unspecified screnshotMode');
    }

    await OverlayModel.muteHighlight();
    const result = await this.#agent.invoke_captureScreenshot(properties);
    await OverlayModel.unmuteHighlight();
    return result.data;
  }

  async fetchLayoutMetrics(): Promise<{
    viewportX: number,
    viewportY: number,
    viewportScale: number,
    contentWidth: number,
    contentHeight: number,
  }|null> {
    const response = await this.#agent.invoke_getLayoutMetrics();
    if (response.getError()) {
      return null;
    }
    return {
      viewportX: response.cssVisualViewport.pageX,
      viewportY: response.cssVisualViewport.pageY,
      viewportScale: response.cssVisualViewport.scale,
      contentWidth: response.cssContentSize.width,
      contentHeight: response.cssContentSize.height,
    };
  }

  screencastFrame({data, metadata, sessionId}: Protocol.Page.ScreencastFrameEvent): void {
    void this.#agent.invoke_screencastFrameAck({sessionId});
    if (this.#onScreencastFrame) {
      this.#onScreencastFrame.call(null, data, metadata);
    }
  }

  screencastVisibilityChanged({visible}: Protocol.Page.ScreencastVisibilityChangedEvent): void {
    if (this.#onScreencastVisibilityChanged) {
      this.#onScreencastVisibilityChanged.call(null, visible);
    }
  }

  backForwardCacheNotUsed(_params: Protocol.Page.BackForwardCacheNotUsedEvent): void {
  }

  domContentEventFired(_params: Protocol.Page.DomContentEventFiredEvent): void {
  }

  loadEventFired(_params: Protocol.Page.LoadEventFiredEvent): void {
  }

  lifecycleEvent(_params: Protocol.Page.LifecycleEventEvent): void {
  }

  navigatedWithinDocument(_params: Protocol.Page.NavigatedWithinDocumentEvent): void {
  }

  frameAttached(_params: Protocol.Page.FrameAttachedEvent): void {
  }

  frameNavigated(_params: Protocol.Page.FrameNavigatedEvent): void {
  }

  documentOpened(_params: Protocol.Page.DocumentOpenedEvent): void {
  }

  frameDetached(_params: Protocol.Page.FrameDetachedEvent): void {
  }

  frameStartedLoading(_params: Protocol.Page.FrameStartedLoadingEvent): void {
  }

  frameStoppedLoading(_params: Protocol.Page.FrameStoppedLoadingEvent): void {
  }

  frameRequestedNavigation(_params: Protocol.Page.FrameRequestedNavigationEvent): void {
  }

  frameScheduledNavigation(_params: Protocol.Page.FrameScheduledNavigationEvent): void {
  }

  frameClearedScheduledNavigation(_params: Protocol.Page.FrameClearedScheduledNavigationEvent): void {
  }

  frameResized(): void {
  }

  javascriptDialogOpening(_params: Protocol.Page.JavascriptDialogOpeningEvent): void {
  }

  javascriptDialogClosed(_params: Protocol.Page.JavascriptDialogClosedEvent): void {
  }

  interstitialShown(): void {
  }

  interstitialHidden(): void {
  }

  windowOpen(_params: Protocol.Page.WindowOpenEvent): void {
  }

  fileChooserOpened(_params: Protocol.Page.FileChooserOpenedEvent): void {
  }

  compilationCacheProduced(_params: Protocol.Page.CompilationCacheProducedEvent): void {
  }

  downloadWillBegin(_params: Protocol.Page.DownloadWillBeginEvent): void {
  }

  downloadProgress(): void {
  }

  prefetchStatusUpdated(_params: Protocol.Preload.PrefetchStatusUpdatedEvent): void {
  }

  prerenderStatusUpdated(_params: Protocol.Preload.PrerenderStatusUpdatedEvent): void {
  }
}

SDKModel.register(ScreenCaptureModel, {capabilities: Capability.ScreenCapture, autostart: false});
