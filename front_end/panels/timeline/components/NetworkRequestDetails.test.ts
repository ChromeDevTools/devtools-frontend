// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Timeline from '../timeline.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('NetworkRequestDetails', () => {
  it('renders the right details for a network event from Trace', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }

    const details =
        new TimelineComponents.NetworkRequestDetails.NetworkRequestDetails(new Components.Linkifier.Linkifier());
    await details.setData(parsedTrace, cssRequest, Timeline.TargetForEvent.targetForEvent(parsedTrace, cssRequest));

    if (!details.shadowRoot) {
      throw new Error('Could not find expected element to test.');
    }

    const titleSwatch: HTMLElement|null = details.shadowRoot.querySelector('.network-request-details-title div');
    // css request is in 'Css' category, which will use `--app-color-css: var(--ref-palette-purple60)` colour
    assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(191, 103, 255)');

    const rowData = getRowDataForDetailsElement(details.shadowRoot);
    const durationInnerText = 'Duration12.58 ms' +
        'Queuing and connecting1.83 ms' +
        'Request sent and waiting4.80 ms' +
        'Content downloading1.66 ms' +
        'Waiting on main thread4.29 ms';
    assert.deepEqual(
        rowData,
        [
          {title: undefined, value: 'chromedevtools.github.io/performance-stories/lcp-web-font/app.css'},
          {title: 'Request method', value: 'GET'},
          {title: 'Priority', value: 'Highest'},
          {title: 'MIME type', value: 'text/css'},
          {title: 'Encoded data', value: ' (from cache)'},
          {title: 'Decoded body', value: '96 B'},
          {
            title: 'Blocking',
            value: 'Render blocking',
          },
          {title: 'From cache', value: 'Yes'},
          {title: undefined, value: durationInnerText},
          {
            title: 'Initiated by',
            value: 'chromedevtools.github.io/performance-stories/lcp-web-font/index.html',
          },
        ],
    );
  });
});

function getRowDataForDetailsElement(details: ShadowRoot) {
  return Array.from(details.querySelectorAll<HTMLDivElement>('.network-request-details-row, .timing-rows')).map(row => {
    const title = row.querySelector<HTMLDivElement>('.title')?.innerText;
    // The innerText in here will contain a `\n` and a few space for each child <div> tag, so just remove these empty
    // characters for easier test.
    const regExpForLineBreakAndFollowingSpaces = /\n[\s]+/g;
    let value =
        row.querySelector<HTMLDivElement>('.value')?.innerText.replaceAll(regExpForLineBreakAndFollowingSpaces, '');

    if (!title && !value) {
      value = row.innerText.replaceAll(regExpForLineBreakAndFollowingSpaces, '');
    }
    return {title, value};
  });
}
