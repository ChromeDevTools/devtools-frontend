// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import type * as Common from '../../../../../../front_end/core/common/common.js';
import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  dispatchKeyDownEvent,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function renderHeadersComponent() {
  const component = new NetworkComponents.RequestHeadersView.RequestHeadersComponent();
  renderElementIntoDOM(component);
  component.data = {
    request: {
      statusCode: 200,
      statusText: 'OK',
      requestMethod: 'GET',
      url: () => 'https://www.example.com/index.html',
      cachedInMemory: () => true,
      remoteAddress: () => '199.36.158.100:443',
      referrerPolicy: () => Protocol.Network.RequestReferrerPolicy.StrictOriginWhenCrossOrigin,
      sortedResponseHeaders: [
        {name: 'age', value: '0'},
        {name: 'cache-control', value: 'max-age=600'},
        {name: 'content-encoding', value: 'gzip'},
        {name: 'content-length', value: '661'},
      ],
      requestHeadersText: () => undefined,
      requestHeaders: () =>
          [{name: ':method', value: 'GET'},
           {name: 'accept-encoding', value: 'gzip, deflate, br'},
           {name: 'cache-control', value: 'no-cache'},
  ],
      responseHeadersText: `HTTP/1.1 200 OK
      age: 0
      cache-control: max-age=600
      content-encoding: gzip
      content-length: 661
      `,
    } as unknown as SDK.NetworkRequest.NetworkRequest,
  } as NetworkComponents.RequestHeadersView.RequestHeadersComponentData;
  await coordinator.done();
  return component;
}

describeWithEnvironment('RequestHeadersView', () => {
  it('renders the General section', async () => {
    const component = await renderHeadersComponent();
    assertShadowRoot(component.shadowRoot);

    const generalCategory = component.shadowRoot.querySelector('[aria-label="General"]');
    assertElement(generalCategory, HTMLElement);

    const names = getCleanTextContentFromElements(generalCategory, '.header-name');
    assert.deepEqual(names, [
      'Request URL:',
      'Request Method:',
      'Status Code:',
      'Remote Address:',
      'Referrer Policy:',
    ]);

    const values = getCleanTextContentFromElements(generalCategory, '.header-value');
    assert.deepEqual(values, [
      'https://www.example.com/index.html',
      'GET',
      '200 OK (from memory cache)',
      '199.36.158.100:443',
      'strict-origin-when-cross-origin',
    ]);
  });

  it('renders request and response headers', async () => {
    const component = await renderHeadersComponent();
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), [
      'age:',
      'cache-control:',
      'content-encoding:',
      'content-length:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), [
      '0',
      'max-age=600',
      'gzip',
      '661',
    ]);

    const requestHeadersCategory = component.shadowRoot.querySelector('[aria-label="Request Headers"]');
    assertElement(requestHeadersCategory, HTMLElement);
    assert.deepEqual(getCleanTextContentFromElements(requestHeadersCategory, '.header-name'), [
      ':method:',
      'accept-encoding:',
      'cache-control:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(requestHeadersCategory, '.header-value'), [
      'GET',
      'gzip, deflate, br',
      'no-cache',
    ]);
  });

  it('can switch between source and parsed view', async () => {
    const component = await renderHeadersComponent();
    assertShadowRoot(component.shadowRoot);

    const responseHeadersCategory = component.shadowRoot.querySelector('[aria-label="Response Headers"]');
    assertElement(responseHeadersCategory, HTMLElement);

    // Switch to viewing source view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());

    const rawHeadersDiv = responseHeadersCategory.querySelector('.raw-headers');
    assertElement(rawHeadersDiv, HTMLDivElement);
    const rawTextContent = rawHeadersDiv.textContent?.replace(/ {2,}/g, '');
    assert.strictEqual(
        rawTextContent,
        'HTTP/1.1 200 OK\nage: 0\ncache-control: max-age=600\ncontent-encoding: gzip\ncontent-length: 661');

    // Switch to viewing parsed view
    responseHeadersCategory.dispatchEvent(new NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent());

    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-name'), [
      'age:',
      'cache-control:',
      'content-encoding:',
      'content-length:',
    ]);
    assert.deepEqual(getCleanTextContentFromElements(responseHeadersCategory, '.header-value'), [
      '0',
      'max-age=600',
      'gzip',
      '661',
    ]);
  });
});

describeWithEnvironment('RequestHeadersView\'s Category', () => {
  it('can be opened and closed with right/left arrow keys', async () => {
    const component = new NetworkComponents.RequestHeadersView.Category();
    renderElementIntoDOM(component);
    component.data = {
      name: 'general',
      title: 'General' as Common.UIString.LocalizedString,
    };
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();

    const details = getElementWithinComponent(component, 'details', HTMLDetailsElement);
    const summary = getElementWithinComponent(component, 'summary', HTMLElement);

    assert.isTrue(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowLeft'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowDown'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowLeft'});
    assert.isFalse(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowRight'});
    assert.isTrue(details.hasAttribute('open'));

    dispatchKeyDownEvent(summary, {key: 'ArrowUp'});
    assert.isTrue(details.hasAttribute('open'));
  });

  it('dispatches an event when its checkbox is toggled', async () => {
    let eventCounter = 0;
    const component = new NetworkComponents.RequestHeadersView.Category();
    renderElementIntoDOM(component);
    component.data = {
      name: 'responseHeaders',
      title: 'Response Headers' as Common.UIString.LocalizedString,
      headerCount: 3,
      checked: false,
    };
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    component.addEventListener(NetworkComponents.RequestHeadersView.ToggleRawHeadersEvent.eventName, () => {
      eventCounter += 1;
    });
    const checkbox = getElementWithinComponent(component, 'input', HTMLInputElement);

    dispatchClickEvent(checkbox);
    assert.strictEqual(eventCounter, 1);
  });
});
