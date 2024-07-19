// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Timeline from '../timeline.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('NetworkRequestDetails', () => {
  it('renders the right details for a network event from TraceEngine', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
    const networkRequests = traceData.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }

    const details =
        new TimelineComponents.NetworkRequestDetails.NetworkRequestDetails(new Components.Linkifier.Linkifier());
    await details.setData(cssRequest, Timeline.TargetForEvent.targetForEvent(traceData, cssRequest));

    if (!details.shadowRoot) {
      throw new Error('Could not find expected element to test.');
    }

    const titleSwatch: HTMLElement|null = details.shadowRoot.querySelector('.network-request-details-title div');
    // css request is in 'Css' category, which will use `--app-color-css: var(--ref-palette-purple60)` colour
    assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(191, 103, 255)');

    const rowData = getRowDataForDetailsElement(details.shadowRoot);
    const durationInnerText = '12.58 ms' +
        'Queuing and connecting0' +
        'Request sent and waiting0' +
        'Content downloading8.29 ms' +
        'Waiting on main thread4.29 ms';
    assert.deepEqual(
        rowData,
        [
          {title: 'URL', value: 'chromedevtools.github.io/performance-stories/lcp-web-font/app.css'},
          {title: 'Request Method', value: 'GET'},
          {title: 'Initial Priority', value: 'Highest'},
          {title: 'Priority', value: 'Highest'},
          {title: 'Mime Type', value: 'text/css'},
          {title: 'Encoded Data', value: ' (from cache)'},
          {title: 'Decoded Body', value: '96 B'},
          {title: 'From cache', value: 'Yes'},
          {title: 'Duration', value: durationInnerText},
        ],
    );
  });
});

function getRowDataForDetailsElement(details: ShadowRoot) {
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
