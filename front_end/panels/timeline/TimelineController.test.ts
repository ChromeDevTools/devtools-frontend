// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithRealConnection} from '../../testing/RealConnection.js';

import * as Timeline from './timeline.js';

describeWithRealConnection('TimelineController', () => {
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

    const primaryPage = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!primaryPage) {
      throw new Error('Could not find primary page');
    }
    const root = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!root) {
      throw new Error('Could not find root target');
    }

    const controller = new Timeline.TimelineController.TimelineController(root, primaryPage, client);

    class TestTracingComponent extends HTMLElement {
      connectedCallback() {
        const newDiv = document.createElement('div');
        newDiv.innerHTML = 'testing';
        this.appendChild(newDiv);
      }
    }
    customElements.define('test-tracing-component', TestTracingComponent);
    const component = new TestTracingComponent();

    // Start a recording and inject the test component to trigger some trace events.
    await controller.startRecording({});
    renderElementIntoDOM(component);
    // Run the test for at least 0.5s to have progress events be sent.
    await new Promise(resolve => setTimeout(resolve, 1500));
    await controller.stopRecording();
    assert.strictEqual(stubs.processingStarted.callCount, 1);
    // Depending on the speed of the machine you might get more than 1 progress
    // call, hence we assert that there is at least one.
    assert.isAtLeast(stubs.recordingProgress.callCount, 1);
    assert.strictEqual(stubs.loadingStarted.callCount, 1);
    assert.isAtLeast(stubs.loadingProgress.callCount, 1);
    assert.strictEqual(stubs.loadingComplete.callCount, 1);
    const [collectedEvents] = stubs.loadingComplete.getCall(0).args as [Trace.Types.Events.Event[]];
    // Ensure we collected events during tracing.
    assert.isTrue(collectedEvents.length > 0);
  });
});
