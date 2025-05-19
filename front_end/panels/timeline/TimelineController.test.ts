// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import type * as Trace from '../../models/trace/trace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler
} from '../../testing/MockConnection.js';
import {defaultTraceEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describeWithMockConnection('TimelineController', () => {
  it('calls the callback methods on the client in the expected order', async function() {
    // The test needs at least 0.5s to have progress events be sent. Set a higher timeout to avoid flakiness.
    if (this.timeout() !== 0) {
      this.timeout(5_000);
    }
    const stubs = {
      recordingProgress: sinon.stub(),
      loadingStarted: sinon.stub(),
      processingStarted: sinon.stub(),
      loadingProgress: sinon.stub(),
      loadingComplete: sinon.stub().callsFake(function(
          _collectedEvents: Trace.Types.Events.Event[],
      ) {}),
    };
    const client: Timeline.TimelineController.Client = {
      recordingProgress(usage) {
        stubs.recordingProgress(usage);
      },
      loadingStarted() {
        stubs.loadingStarted();
      },
      processingStarted() {
        stubs.processingStarted();
      },
      loadingProgress() {
        stubs.loadingProgress();
      },
      async loadingComplete(collectedEvents) {
        stubs.loadingComplete(collectedEvents);
      },
      loadingCompleteForTest() {},
    };

    LiveMetrics.LiveMetrics.instance({forceNew: true});

    const primaryPage = createTarget();
    if (!primaryPage) {
      throw new Error('Could not find primary page');
    }
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!rootTarget) {
      throw new Error('Could not find root target');
    }

    const controller = new Timeline.TimelineController.TimelineController(rootTarget, primaryPage, client);
    setMockConnectionResponseHandler('Target.setAutoAttach', () => ({}));
    setMockConnectionResponseHandler('DOM.enable', () => ({}));
    setMockConnectionResponseHandler('CSS.enable', () => ({}));
    setMockConnectionResponseHandler('Debugger.enable', () => ({}));
    setMockConnectionResponseHandler('Overlay.enable', () => ({}));
    setMockConnectionResponseHandler('Overlay.setShowViewportSizeOnResize', () => ({}));
    setMockConnectionResponseHandler('Animation.enable', () => ({}));
    setMockConnectionResponseHandler('DOM.disable', () => ({}));
    setMockConnectionResponseHandler('CSS.disable', () => ({}));
    setMockConnectionResponseHandler('Debugger.disable', () => ({}));
    setMockConnectionResponseHandler('Debugger.setAsyncCallStackDepth', () => ({}));
    setMockConnectionResponseHandler('Overlay.disable', () => ({}));
    setMockConnectionResponseHandler('Animation.disable', () => ({}));
    setMockConnectionResponseHandler('Tracing.start', () => ({}));
    setMockConnectionResponseHandler('Runtime.evaluate', () => ({}));
    setMockConnectionResponseHandler('Runtime.addBinding', () => ({}));
    setMockConnectionResponseHandler('Page.addScriptToEvaluateOnNewDocument', () => ({}));
    setMockConnectionResponseHandler('Tracing.end', () => {
      dispatchEvent(rootTarget, 'Tracing.tracingComplete', {dataLossOccurred: false});
      return {};
    });
    await controller.startRecording({});
    dispatchEvent(rootTarget, 'Tracing.dataCollected', {value: [defaultTraceEvent]});
    dispatchEvent(rootTarget, 'Tracing.bufferUsage', {percentFull: .5});
    await controller.stopRecording();
    sinon.assert.callCount(stubs.processingStarted, 1);
    sinon.assert.callCount(stubs.recordingProgress, 1);
    sinon.assert.callCount(stubs.loadingStarted, 1);
    sinon.assert.callCount(stubs.loadingProgress, 1);
    sinon.assert.callCount(stubs.loadingComplete, 1);
    const [collectedEvents] = stubs.loadingComplete.getCall(0).args as [Trace.Types.Events.Event[]];
    // Ensure we collected events during tracing.
    assert.lengthOf(collectedEvents, 1);
  });
});
