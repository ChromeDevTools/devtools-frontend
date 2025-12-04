// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as NetworkForward from '../forward/forward.js';

import * as NetworkComponents from './components.js';

async function renderRequestHeaderSection(request: SDK.NetworkRequest.NetworkRequest) {
  const view = createViewFunctionStub(NetworkComponents.RequestHeaderSection.RequestHeaderSection);
  const widget = new NetworkComponents.RequestHeaderSection.RequestHeaderSection(undefined, view);
  renderElementIntoDOM(widget.contentElement);
  widget.request = request;
  await view.nextInput;
  return {view, widget};
}

describeWithEnvironment('RequestHeaderSection', () => {
  it('renders provisional headers warning', async () => {
    const request = {
      cachedInMemory: () => true,
      cached: () => false,
      requestHeaders: () =>
          [{name: ':method', value: 'GET'},
           {name: 'accept-encoding', value: 'gzip, deflate, br'},
           {name: 'cache-control', value: 'no-cache'},
    ],
      requestHeadersText: () => undefined,
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const {view} = await renderRequestHeaderSection(request);
    const input = view.input;
    assert.isTrue(input.isProvisionalHeaders);
  });

  it('sorts headers alphabetically', async () => {
    const request = {
      cachedInMemory: () => true,
      cached: () => false,
      requestHeaders: () =>
          [{name: 'Ab', value: 'second'},
           {name: 'test', value: 'fifth'},
           {name: 'name', value: 'fourth'},
           {name: 'abc', value: 'third'},
           {name: 'aa', value: 'first'},
    ],
      requestHeadersText: () => 'placeholderText',
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const {view} = await renderRequestHeaderSection(request);
    const headers = view.input.headers.map(header => [header.name, header.value]);
    assert.deepEqual(headers, [
      ['aa', 'first'],
      ['ab', 'second'],
      ['abc', 'third'],
      ['name', 'fourth'],
      ['test', 'fifth'],
    ]);
  });

  it('highlights the requested header', async () => {
    const request = {
      cachedInMemory: () => true,
      cached: () => false,
      requestHeaders: () =>
          [{name: 'Ab', value: 'second'},
           {name: 'test', value: 'fifth'},
           {name: 'name', value: 'fourth'},
           {name: 'abc', value: 'third'},
           {name: 'aa', value: 'first'},
    ],
      requestHeadersText: () => 'placeholderText',
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const {view, widget} = await renderRequestHeaderSection(request);
    widget.toReveal = {section: NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST, header: 'Ab'};
    await view.nextInput;

    const headers = view.input.headers;
    const highlightedHeader = headers.find(header => header.name === 'ab');
    assert.isTrue(highlightedHeader?.highlight);
  });

  it('highlights the requested header', async () => {
    const request = {
      cachedInMemory: () => true,
      cached: () => false,
      requestHeaders: () =>
          [{name: 'Ab', value: 'second'},
           {name: 'test', value: 'fifth'},
           {name: 'name', value: 'fourth'},
           {name: 'abc', value: 'third'},
           {name: 'aa', value: 'first'},
    ],
      requestHeadersText: () => 'placeholderText',
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const {view, widget} = await renderRequestHeaderSection(request);
    widget.toReveal = {section: NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST, header: 'Ab'};
    await view.nextInput;

    const headers = view.input.headers;
    const highlightedHeader = headers.find(header => header.name === 'ab');
    assert.isTrue(highlightedHeader?.highlight);
  });

  it('correctly sets cached state', async () => {
    const request = {
      cachedInMemory: () => true,
      cached: () => false,
      requestHeaders: () => [],
      requestHeadersText: () => undefined,
    } as unknown as SDK.NetworkRequest.NetworkRequest;
    const {view, widget} = await renderRequestHeaderSection(request);
    assert.isTrue(view.input.isRequestCached);

    const request2 = {
      ...request,
      cachedInMemory: () => false,
      cached: () => true,
    } as unknown as SDK.NetworkRequest.NetworkRequest;
    widget.request = request2;
    const input2 = await view.nextInput;
    assert.isTrue(input2.isRequestCached);

    const request3 = {
      ...request,
      cachedInMemory: () => false,
      cached: () => false,
    } as unknown as SDK.NetworkRequest.NetworkRequest;
    widget.request = request3;
    const input3 = await view.nextInput;
    assert.isFalse(input3.isRequestCached);
  });

  it('renders correctly', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    NetworkComponents.RequestHeaderSection.DEFAULT_VIEW(
        {
          headers: [
            {
              name: Platform.StringUtilities.toLowerCaseString('Referer'),
              value: 'https://example.com',
              valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.FORBIDDEN,
            },
            {
              name: Platform.StringUtilities.toLowerCaseString('User-agent'),
              value: 'Chrome',
              valueEditable: NetworkComponents.HeaderSectionRow.EditingAllowedStatus.ENABLED,
            }
          ],
          isProvisionalHeaders: true,
          isRequestCached: true,
        },
        undefined, container);
    await assertScreenshot('network/request_header_section_default.png');
  });
});
