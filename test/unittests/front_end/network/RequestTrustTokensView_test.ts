// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from '../../../../front_end/network/network.js';

import {assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('RequestTrustTokensView', () => {
  it('renders the RefreshPolicy for redemptions', () => {
    const component = new Network.RequestTrustTokensView.RequestTrustTokensReport();
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);

    component.data = {
      type: Protocol.Network.TrustTokenOperationType.Redemption,
      refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
    } as Protocol.Network.TrustTokenParams;

    const [typeSpan, refreshPolicySpan] = component.shadowRoot.querySelectorAll('span.code');
    assert.strictEqual(typeSpan.textContent, 'Redemption');
    assert.strictEqual(refreshPolicySpan.textContent, 'UseCached');
  });

  it('renders all issuers as a list', () => {
    const component = new Network.RequestTrustTokensView.RequestTrustTokensReport();
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);

    const expectedIssuers = ['example.org', 'foo.dev', 'bar.com'];
    component.data = {
      type: Protocol.Network.TrustTokenOperationType.Signing,
      issuers: expectedIssuers,
    } as Protocol.Network.TrustTokenParams;

    const issuerElements = component.shadowRoot.querySelectorAll('ul.issuers-list > li');
    const actualIssuers = [...issuerElements].map(e => e.textContent);

    assert.deepStrictEqual(actualIssuers.sort(), expectedIssuers.sort());
  });
});
