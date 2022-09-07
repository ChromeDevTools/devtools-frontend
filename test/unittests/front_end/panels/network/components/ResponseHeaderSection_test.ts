// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function renderResponseHeaderSection(request: SDK.NetworkRequest.NetworkRequest):
    Promise<NetworkComponents.ResponseHeaderSection.ResponseHeaderSection> {
  const component = new NetworkComponents.ResponseHeaderSection.ResponseHeaderSection();
  renderElementIntoDOM(component);
  Object.setPrototypeOf(request, SDK.NetworkRequest.NetworkRequest.prototype);
  component.data = {request};
  await coordinator.done();
  assertElement(component, HTMLElement);
  assertShadowRoot(component.shadowRoot);
  return component;
}

describeWithEnvironment('ResponseHeaderSection', () => {
  it('renders detailed reason for blocked requests', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'content-length', value: '661'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => true,
      blockedReason: () => Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
      originalResponseHeaders: [],
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);

    const row = component.shadowRoot.querySelectorAll('devtools-header-section-row')[1];
    assertElement(row, HTMLElement);
    assertShadowRoot(row.shadowRoot);

    assert.strictEqual(
        row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), 'not-set cross-origin-resource-policy:');
    assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), '');
    assert.strictEqual(
        getCleanTextContentFromElements(row.shadowRoot, '.call-to-action')[0],
        'To use this resource from a different origin, the server needs to specify a cross-origin ' +
            'resource policy in the response headers:Cross-Origin-Resource-Policy: same-siteChoose ' +
            'this option if the resource and the document are served from the same site.' +
            'Cross-Origin-Resource-Policy: cross-originOnly choose this option if an arbitrary website ' +
            'including this resource does not impose a security risk.Learn more',
    );
  });

  it('displays info about blocked "Set-Cookie"-headers', async () => {
    const request = {
      sortedResponseHeaders: [{name: 'Set-Cookie', value: 'secure=only; Secure'}],
      blockedResponseCookies: () => [{
        blockedReasons: ['SecureOnly', 'OverwriteSecure'],
        cookieLine: 'secure=only; Secure',
        cookie: null,
      }],
      wasBlocked: () => false,
      originalResponseHeaders: [],
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);

    const row = component.shadowRoot.querySelector('devtools-header-section-row');
    assertElement(row, HTMLElement);
    assertShadowRoot(row.shadowRoot);

    assert.strictEqual(row.shadowRoot.querySelector('.header-name')?.textContent?.trim(), 'set-cookie:');
    assert.strictEqual(row.shadowRoot.querySelector('.header-value')?.textContent?.trim(), 'secure=only; Secure');

    const icon = row.shadowRoot.querySelector('devtools-icon');
    assertElement(icon, HTMLElement);
    assert.strictEqual(
        icon.title,
        'This attempt to set a cookie via a Set-Cookie header was blocked because it had the ' +
            '"Secure" attribute but was not received over a secure connection.\nThis attempt to ' +
            'set a cookie via a Set-Cookie header was blocked because it was not sent over a ' +
            'secure connection and would have overwritten a cookie with the Secure attribute.');
  });

  it('marks overridden headers', async () => {
    const request = {
      sortedResponseHeaders: [
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'not-in-original-headers', value: 'is an override'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-actual-headers', value: 'second'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'DevTools'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
        {name: 'triplicate', value: '2'},
      ],
      blockedResponseCookies: () => [],
      wasBlocked: () => false,
      originalResponseHeaders: [
        {name: 'is-in-original-headers', value: 'not an override'},
        {name: 'duplicate-in-actual-headers', value: 'first'},
        {name: 'duplicate-in-original-headers', value: 'one'},
        {name: 'duplicate-in-original-headers', value: 'two'},
        {name: 'duplicate-both-no-mismatch', value: 'foo'},
        {name: 'duplicate-both-no-mismatch', value: 'bar'},
        {name: 'duplicate-both-with-mismatch', value: 'Chrome'},
        {name: 'duplicate-both-with-mismatch', value: 'Canary'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '1'},
        {name: 'triplicate', value: '2'},
      ],
    } as unknown as SDK.NetworkRequest.NetworkRequest;

    const component = await renderResponseHeaderSection(request);
    assertShadowRoot(component.shadowRoot);
    const rows = component.shadowRoot.querySelectorAll('devtools-header-section-row');

    const checkRow = (shadowRoot: ShadowRoot, headerName: string, headerValue: string, isOverride: boolean): void => {
      assert.strictEqual(shadowRoot.querySelector('.header-name')?.textContent?.trim(), headerName);
      assert.strictEqual(shadowRoot.querySelector('.header-value')?.textContent?.trim(), headerValue);
      assert.strictEqual(shadowRoot.querySelector('.row')?.classList.contains('header-overridden'), isOverride);
    };

    assertShadowRoot(rows[0].shadowRoot);
    checkRow(rows[0].shadowRoot, 'is-in-original-headers:', 'not an override', false);
    assertShadowRoot(rows[1].shadowRoot);
    checkRow(rows[1].shadowRoot, 'not-in-original-headers:', 'is an override', true);
    assertShadowRoot(rows[2].shadowRoot);
    checkRow(rows[2].shadowRoot, 'duplicate-in-actual-headers:', 'first', true);
    assertShadowRoot(rows[3].shadowRoot);
    checkRow(rows[3].shadowRoot, 'duplicate-in-actual-headers:', 'second', true);
    assertShadowRoot(rows[4].shadowRoot);
    checkRow(rows[4].shadowRoot, 'duplicate-in-original-headers:', 'two', true);
    assertShadowRoot(rows[5].shadowRoot);
    checkRow(rows[5].shadowRoot, 'duplicate-both-no-mismatch:', 'foo', false);
    assertShadowRoot(rows[6].shadowRoot);
    checkRow(rows[6].shadowRoot, 'duplicate-both-no-mismatch:', 'bar', false);
    assertShadowRoot(rows[7].shadowRoot);
    checkRow(rows[7].shadowRoot, 'duplicate-both-with-mismatch:', 'Chrome', true);
    assertShadowRoot(rows[8].shadowRoot);
    checkRow(rows[8].shadowRoot, 'duplicate-both-with-mismatch:', 'DevTools', true);
    assertShadowRoot(rows[9].shadowRoot);
    checkRow(rows[9].shadowRoot, 'triplicate:', '1', true);
    assertShadowRoot(rows[10].shadowRoot);
    checkRow(rows[10].shadowRoot, 'triplicate:', '2', true);
    assertShadowRoot(rows[11].shadowRoot);
    checkRow(rows[11].shadowRoot, 'triplicate:', '2', true);
  });
});
