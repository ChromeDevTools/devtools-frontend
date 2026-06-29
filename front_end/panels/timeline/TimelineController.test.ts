// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as LiveMetrics from '../../models/live-metrics/live-metrics.js';
import type * as Trace from '../../models/trace/trace.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {defaultTraceEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineController', () => {
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
      recordingStatus() {},
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

    const connection = new MockCDPConnection();
    const primaryPage = createTarget({connection});
    if (!primaryPage) {
      throw new Error('Could not find primary page');
    }
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!rootTarget) {
      throw new Error('Could not find root target');
    }

    const controller = new Timeline.TimelineController.TimelineController(rootTarget, primaryPage, client);
    connection.setSuccessHandler('Target.setAutoAttach', () => ({}));
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('CSS.enable', () => ({}));
    connection.setSuccessHandler('Debugger.enable', () => ({} as Protocol.Debugger.EnableResponse));
    connection.setSuccessHandler('Overlay.enable', () => ({}));
    connection.setSuccessHandler('Overlay.setShowViewportSizeOnResize', () => ({}));
    connection.setSuccessHandler('Animation.enable', () => ({}));
    connection.setSuccessHandler('DOM.disable', () => ({}));
    connection.setSuccessHandler('CSS.disable', () => ({}));
    connection.setSuccessHandler('Debugger.disable', () => ({}));
    connection.setSuccessHandler('Debugger.setAsyncCallStackDepth', () => ({}));
    connection.setSuccessHandler('Overlay.disable', () => ({}));
    connection.setSuccessHandler('Animation.disable', () => ({}));
    connection.setSuccessHandler('Tracing.start', () => ({}));
    connection.setSuccessHandler('Runtime.evaluate', () => ({} as Protocol.Runtime.EvaluateResponse));
    connection.setSuccessHandler('Runtime.addBinding', () => ({}));
    connection.setSuccessHandler('Page.addScriptToEvaluateOnNewDocument',
                                 () => ({} as Protocol.Page.AddScriptToEvaluateOnNewDocumentResponse));
    connection.setSuccessHandler('Tracing.end', () => {
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
    primaryPage?.dispose('test');
  });
});
