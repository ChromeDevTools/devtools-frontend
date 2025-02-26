// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {OverlayModel} from './OverlayModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export const enum ScreenshotMode {
  FROM_VIEWPORT = 'fromViewport',
  FROM_CLIP = 'fromClip',
  FULLPAGE = 'fullpage',
}

// This structure holds a specific `startScreencast` request's parameters
// and its callbacks so that they can be re-started if needed.
interface ScreencastOperation {
  id: number;
  request: {
    format: Protocol.Page.StartScreencastRequestFormat,
    quality: number,
    maxWidth: number|undefined,
    maxHeight: number|undefined,
    everyNthFrame: number|undefined,
  };
  callbacks: {
    onScreencastFrame: ScreencastFrameCallback,
    onScreencastVisibilityChanged: ScreencastVisibilityChangedCallback,
  };
}

type ScreencastFrameCallback = ((arg0: Protocol.binary, arg1: Protocol.Page.ScreencastFrameMetadata) => void);
type ScreencastVisibilityChangedCallback = ((arg0: boolean) => void);

// Manages concurrent screencast requests by queuing and prioritizing.
//
// When startScreencast is invoked:
//   - If a screencast is currently active, the existing screencast's parameters and callbacks are
//     saved in the #screencastOperations array.
//   - The active screencast is then stopped.
//   - A new screencast is initiated using the parameters and callbacks from the current startScreencast call.
//
// When stopScreencast is invoked:
//   - The currently active screencast is stopped.
//   - The #screencastOperations is checked for interrupted screencast operations.
//   - If any operations are found, the latest one is started
//     using its saved parameters and callbacks.
//
// This ensures that:
//   - Only one screencast is active at a time.
//   - Interrupted screencasts are resumed after the current screencast is stopped.
// This ensures animation previews, which use screencasting, don't disrupt ongoing remote debugging sessions. Without this mechanism, stopping a preview screencast would terminate the debugging screencast, freezing the ScreencastView.
export class ScreenCaptureModel extends SDKModel<void> implements ProtocolProxyApi.PageDispatcher {
  readonly #agent: ProtocolProxyApi.PageApi;
  #nextScreencastOperationId = 1;
  #screencastOperations: ScreencastOperation[] = [];
  constructor(target: Target) {
    super(target);
    this.#agent = target.pageAgent();
    target.registerPageDispatcher(this);
  }

  async startScreencast(
      format: Protocol.Page.StartScreencastRequestFormat, quality: number, maxWidth: number|undefined,
      maxHeight: number|undefined, everyNthFrame: number|undefined, onFrame: ScreencastFrameCallback,
      onVisibilityChanged: ScreencastVisibilityChangedCallback): Promise<number> {
    const currentRequest = this.#screencastOperations.at(-1);
    if (currentRequest) {
      // If there already is a screencast operation in progress, we need to stop it now and handle the
      // incoming request. Once that request is stopped, we'll return back to handling the stopped operation.
      await this.#agent.invoke_stopScreencast();
    }

    const operation = {
      id: this.#nextScreencastOperationId++,
      request: {
        format,
        quality,
        maxWidth,
        maxHeight,
        everyNthFrame,
      },
      callbacks: {
        onScreencastFrame: onFrame,
        onScreencastVisibilityChanged: onVisibilityChanged,
      }
    };
    this.#screencastOperations.push(operation);
    void this.#agent.invoke_startScreencast({format, quality, maxWidth, maxHeight, everyNthFrame});

    return operation.id;
  }

  stopScreencast(id: number): void {
    const operationToStop = this.#screencastOperations.pop();
    if (!operationToStop) {
      throw new Error('There is no screencast operation to stop.');
    }

    if (operationToStop.id !== id) {
      throw new Error('Trying to stop a screencast operation that is not being served right now.');
    }
    void this.#agent.invoke_stopScreencast();

    // The latest operation is concluded, let's return back to the previous request now, if it exists.
    const nextOperation = this.#screencastOperations.at(-1);
    if (nextOperation) {
      void this.#agent.invoke_startScreencast({
        format: nextOperation.request.format,
        quality: nextOperation.request.quality,
        maxWidth: nextOperation.request.maxWidth,
        maxHeight: nextOperation.request.maxHeight,
        everyNthFrame: nextOperation.request.everyNthFrame,
      });
    }
  }

  async captureScreenshot(
      format: Protocol.Page.CaptureScreenshotRequestFormat, quality: number, mode: ScreenshotMode,
      clip?: Protocol.Page.Viewport): Promise<string|null> {
    const properties: Protocol.Page.CaptureScreenshotRequest = {
      format,
      quality,
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

  screencastFrame({data, metadata, sessionId}: Protocol.Page.ScreencastFrameEvent): void {
    void this.#agent.invoke_screencastFrameAck({sessionId});

    const currentRequest = this.#screencastOperations.at(-1);
    if (currentRequest) {
      currentRequest.callbacks.onScreencastFrame.call(null, data, metadata);
    }
  }

  screencastVisibilityChanged({visible}: Protocol.Page.ScreencastVisibilityChangedEvent): void {
    const currentRequest = this.#screencastOperations.at(-1);
    if (currentRequest) {
      currentRequest.callbacks.onScreencastVisibilityChanged.call(null, visible);
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

  frameStartedNavigating(_params: Protocol.Page.FrameStartedNavigatingEvent): void {
  }

  frameSubtreeWillBeDetached(_params: Protocol.Page.FrameSubtreeWillBeDetachedEvent): void {
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

SDKModel.register(ScreenCaptureModel, {capabilities: Capability.SCREEN_CAPTURE, autostart: false});
