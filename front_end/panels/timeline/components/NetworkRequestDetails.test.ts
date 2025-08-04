// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import {cleanTextContent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Timeline from '../timeline.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('NetworkRequestDetails', () => {
  async function makeDetailsComponent(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, request: Trace.Types.Events.SyntheticNetworkRequest,
      entityMapper: Timeline.Utils.EntityMapper.EntityMapper):
      Promise<TimelineComponents.NetworkRequestDetails.NetworkRequestDetails> {
    const details = new TimelineComponents.NetworkRequestDetails.NetworkRequestDetails();
    details.parsedTrace = parsedTrace;
    details.request = request;
    details.target = Timeline.TargetForEvent.targetForEvent(parsedTrace, request);
    details.entityMapper = entityMapper;
    details.linkifier = new Components.Linkifier.Linkifier();
    renderElementIntoDOM(details);
    await details.updateComplete;
    return details;
  }

  it('renders the right details for a network event from Trace', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }

    const details = await makeDetailsComponent(parsedTrace, cssRequest, entityMapper);
    const titleSwatch: HTMLElement|null = details.contentElement.querySelector('.network-request-details-title div');
    // css request is in 'Css' category, which will use `--app-color-css: var(--ref-palette-purple60)` colour
    assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(191, 103, 255)');

    const rowData = getRowDataForDetailsElement(details.contentElement);
    const durationInnerText = 'Duration\n12.58 ms\n' +
        'Queuing and connecting\n1.83 ms\n' +
        'Request sent and waiting\n4.80 ms\n' +
        'Content downloading\n1.66 ms\n' +
        'Waiting on main thread\n4.29 ms';
    assert.deepEqual(
        rowData,
        [
          {title: undefined, value: 'chromedevtools.github.io/performance-stories/lcp-web-font/app.css'},
          {title: 'Request method', value: 'GET'},
          {title: 'Protocol', value: 'unknown'},
          {title: 'Priority', value: 'Highest'},
          {title: 'MIME type', value: 'text/css'},
          {title: 'Encoded data', value: '(from cache)'},
          {title: 'Decoded body', value: '96 B'},
          {
            title: 'Blocking',
            value: 'Render blocking',
          },
          {title: 'From cache', value: 'Yes'},
          {title: '3rd party', value: 'GitHub'},
          {title: undefined, value: durationInnerText},
          {
            title: 'Initiated by',
            value: 'chromedevtools.github.io/performance-stories/lcp-web-font/index.html',
          },
        ],
    );
  });

  it('renders the server timing details for a network event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'server-timings.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const htmlRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://node-server-tan.vercel.app/waste-time';
    });
    if (!htmlRequest) {
      throw new Error('Could not find expected network request.');
    }

    const details = await makeDetailsComponent(parsedTrace, htmlRequest, entityMapper);
    const titleSwatch: HTMLElement|null = details.contentElement.querySelector('.network-request-details-title div');
    assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(76, 141, 246)');

    const rowData = getServerTimingDataDetailsElement(details.contentElement);
    assert.deepEqual(
        rowData,
        [
          [
            'Server timing',
            'Description',
            'Time',
          ],
          [
            'Topleveltask1',
            'Description of top level task 1',
            '1004.2932819999987',
          ],
          [
            'Secondleveltask1',
            'Description of second level task 1',
            '904.2932819999987',
          ],
          [
            'Topleveltask2',
            '-',
            '1000.0925859999988',
          ],
        ],
    );
  });

  it('renders the redirect details for a network event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'many-redirects.json.gz');
    const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const htmlRequest = networkRequests.find(request => {
      return request.args.data.url === 'http://localhost:10200/redirects-final.html';
    });
    if (!htmlRequest) {
      throw new Error('Could not find expected network request.');
    }

    const details = await makeDetailsComponent(parsedTrace, htmlRequest, entityMapper);

    const titleSwatch: HTMLElement|null = details.contentElement.querySelector('.network-request-details-title div');
    assert.strictEqual(titleSwatch?.style.backgroundColor, 'rgb(76, 141, 246)');

    const rowData = getRedirectDetailsElement(details.contentElement);
    assert.deepEqual(
        rowData,
        [
          'Redirects\n' +
              'http://localhost:10200/online-only.html?delay=1000&redirect_count=3&redirect=%2Fredirects-final.html\n' +
              'http://localhost:10200/online-only.html?delay=1000&redirect_count=2&redirect=%2Fredirects-final.html\n' +
              'http://localhost:10200/online-only.html?delay=1000&redirect_count=1&redirect=%2Fredirects-final.html',
        ],
    );
  });
});

function getRowDataForDetailsElement(details: HTMLElement) {
  return Array
      .from(details.querySelectorAll<HTMLDivElement>(
          '.network-request-details-item, .network-request-details-row, .timing-rows'))
      .map(row => {
        const title = row.querySelector<HTMLDivElement>('.title')?.innerText;
        let value = cleanTextContent(row.querySelector<HTMLDivElement>('.value')?.innerText || '');
        if (!title && !value) {
          value = cleanTextContent(row.innerText || '');
        }
        return {title, value};
      });
}

function getServerTimingDataDetailsElement(details: HTMLElement) {
  return Array.from(details.querySelectorAll<HTMLDivElement>('.server-timings > .value, .server-timing-column-header'))
      .map(row => cleanTextContent(row.innerText))
      .reduce((result, current, i) => {
        // group items by rows of three items
        const rowNumber = Math.floor(i / 3);
        const row: string[] = result[rowNumber] = result[rowNumber] || [];
        row.push(current);
        return result;
      }, []);
}

function getRedirectDetailsElement(details: HTMLElement) {
  return Array.from(details.querySelectorAll<HTMLDivElement>('.redirect-details'))
      .map(row => cleanTextContent(row.innerText));
}
