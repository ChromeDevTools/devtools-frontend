// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import {
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as NetworkComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderRequestHeaderSection(request: SDK.NetworkRequest.NetworkRequest):
    Promise<NetworkComponents.RequestHeaderSection.RequestHeaderSection> {
  const component = new NetworkComponents.RequestHeaderSection.RequestHeaderSection();
  renderElementIntoDOM(component);
  component.data = {request};
  await coordinator.done();
  assert.instanceOf(component, HTMLElement);
  assert.isNotNull(component.shadowRoot);
  return component;
}

describeWithEnvironment('RequestHeaderSection', () => {
  it('renders provisional headers warning', async () => {
    const request = {
      cachedInMemory: () => true,
      requestHeaders: () =>
          [{name: ':method', value: 'GET'},
           {name: 'accept-encoding', value: 'gzip, deflate, br'},
           {name: 'cache-control', value: 'no-cache'},
    ],
      requestHeadersText: () => undefined,
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderRequestHeaderSection(request);
    assert.isNotNull(component.shadowRoot);

    assert.strictEqual(
        getCleanTextContentFromElements(component.shadowRoot, '.call-to-action')[0],
        'Provisional headers are shown. Disable cache to see full headers. Learn more',
    );
  });

  it('sorts headers alphabetically', async () => {
    const request = {
      cachedInMemory: () => true,
      requestHeaders: () =>
          [{name: 'Ab', value: 'second'},
           {name: 'test', value: 'fifth'},
           {name: 'name', value: 'fourth'},
           {name: 'abc', value: 'third'},
           {name: 'aa', value: 'first'},
    ],
      requestHeadersText: () => 'placeholderText',
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderRequestHeaderSection(request);
    assert.isNotNull(component.shadowRoot);

    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    const sorted = Array.from(rows).map(row => {
      assert.isNotNull(row.shadowRoot);
      return [
        row.shadowRoot.querySelector('.header-name')?.textContent?.trim() || '',
        row.shadowRoot.querySelector('.header-value')?.textContent?.trim() || '',
      ];
    });
    assert.deepStrictEqual(sorted, [
      ['aa:', 'first'],
      ['ab:', 'second'],
      ['abc:', 'third'],
      ['name:', 'fourth'],
      ['test:', 'fifth'],
    ]);
  });

  it('does not warn about pseudo-headers containing invalid characters', async () => {
    const request = {
      cachedInMemory: () => true,
      requestHeaders: () =>
          [{name: ':Authority', value: 'www.example.com'},
           {name: ':Method', value: 'GET'},
           {name: ':Path', value: '/'},
           {name: ':Scheme', value: 'https'},
    ],
      requestHeadersText: () => 'placeholderText',
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderRequestHeaderSection(request);
    assert.isNotNull(component.shadowRoot);

    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');
    for (const row of rows) {
      assert.isNotNull(row.shadowRoot);
      assert.isNull(row.shadowRoot.querySelector('.disallowed-characters'));
    }
  });
});
