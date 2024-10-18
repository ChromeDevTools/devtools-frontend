// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
  element = document.createElement('div');
}

describeWithEnvironment('TimelineDetailsView', function() {
  const mockViewDelegate = new MockViewDelegate();
  it('displays the details of a network request event correctly', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);

    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }
    const selection = Timeline.TimelineSelection.TimelineSelection.fromTraceEvent(cssRequest);

    await detailsView.setModel(
        {parsedTrace, selectedEvents: null, traceInsightsSets: insights, eventToRelatedInsightsMap: null});
    await detailsView.setSelection(selection);

    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // NetworkRequestDetails and RelatedInsightsChips nodes.
    assert.strictEqual(detailsContentElement.childNodes.length, 2);
  });
});
