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

function getRowDataForNetworkDetailsElement(details: ShadowRoot) {
  return Array.from(details.querySelectorAll<HTMLDivElement>('.network-request-details-row')).map(row => {
    const title = row.querySelector<HTMLDivElement>('.title')?.innerText;
    // The innerText in here will contain a `\n` and a few space for each child <div> tag, so just remove these empty
    // characters for easier test.
    const regExpForLineBreakAndFollowingSpaces = /\n[\s]+/g;
    const value =
        row.querySelector<HTMLDivElement>('.value')?.innerText.replaceAll(regExpForLineBreakAndFollowingSpaces, '');
    return {title, value};
  });
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
    assert.strictEqual(detailsContentElement.childNodes.length, 1);
    const detailsElementShadowRoot = (detailsContentElement.childNodes[0] as HTMLElement).shadowRoot;
    if (!detailsElementShadowRoot) {
      throw new Error('Could not find expected element to test.');
    }
    const rowData = getRowDataForNetworkDetailsElement(detailsElementShadowRoot);

    const durationInnerText = '12.58 ms' +
        'Queuing and connecting1.83 ms' +
        'Request sent and waiting4.80 ms' +
        'Content downloading1.66 ms' +
        'Waiting on main thread4.29 ms';
    assert.deepEqual(
        rowData,
        [
          {title: 'URL', value: 'chromedevtools.github.io/performance-stories/lcp-web-font/app.css'},
          {title: 'Request method', value: 'GET'},
          {title: 'Initial priority', value: 'Highest'},
          {title: 'Priority', value: 'Highest'},
          {title: 'MIME type', value: 'text/css'},
          {title: 'Encoded data', value: ' (from cache)'},
          {title: 'Decoded body', value: '96 B'},
          {
            title: 'Initiated by',
            value: 'chromedevtools.github.io/performance-stories/lcp-web-font/index.html',
          },
          {title: 'From cache', value: 'Yes'},
          {title: 'Duration', value: durationInnerText},
        ],
    );
  });
});
