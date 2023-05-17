// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import {
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithLocale('RequestTrustTokensView', () => {
  const mockId = 'mockId' as Protocol.Network.RequestId;

  const makeRequest = (params?: Protocol.Network.TrustTokenParams,
                       result?: Protocol.Network.TrustTokenOperationDoneEvent): SDK.NetworkRequest.NetworkRequest => {
    return {trustTokenParams: () => params, trustTokenOperationDoneEvent: () => result} as
        SDK.NetworkRequest.NetworkRequest;
  };

  const renderRequestTrustTokensView = (request: SDK.NetworkRequest.NetworkRequest) => {
    const component = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(request);
    renderElementIntoDOM(component);
    void component.render();
    return component;
  };

  it('renders the RefreshPolicy for redemptions', () => {
    const component = renderRequestTrustTokensView(makeRequest({
      operation: Protocol.Network.TrustTokenOperationType.Redemption,
      refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
    }));

    const [typeSpan, refreshPolicySpan] =
        getElementsWithinComponent(component, 'devtools-report-value.code', HTMLElement);
    assert.strictEqual(typeSpan.textContent, 'Redemption');
    assert.strictEqual(refreshPolicySpan.textContent, 'UseCached');
  });

  it('renders all issuers as a list', () => {
    const expectedIssuers = ['example.org', 'foo.dev', 'bar.com'];
    const component = renderRequestTrustTokensView(makeRequest({
      operation: Protocol.Network.TrustTokenOperationType.Signing,
      issuers: expectedIssuers,
    } as Protocol.Network.TrustTokenParams));

    const issuerElements = getElementsWithinComponent(component, 'ul.issuers-list > li', HTMLElement);
    const actualIssuers = [...issuerElements].map(e => e.textContent);

    assert.deepStrictEqual(actualIssuers.sort(), expectedIssuers.sort());
  });

  it('renders a result section with success status for successful requests', () => {
    const component = renderRequestTrustTokensView(makeRequest(undefined, {
      status: Protocol.Network.TrustTokenOperationDoneEventStatus.Ok,
      type: Protocol.Network.TrustTokenOperationType.Issuance,
      requestId: mockId,
    }));

    const simpleText = getElementWithinComponent(component, 'span > strong', HTMLElement);
    assertNotNullOrUndefined(simpleText);
    assert.strictEqual(simpleText.textContent, 'Success');
  });

  it('renders a result section with failure status for failed requests', () => {
    const component = renderRequestTrustTokensView(makeRequest(undefined, {
      status: Protocol.Network.TrustTokenOperationDoneEventStatus.BadResponse,
      type: Protocol.Network.TrustTokenOperationType.Issuance,
      requestId: mockId,
    }));

    const simpleText = getElementWithinComponent(component, 'span > strong', HTMLElement);
    assertNotNullOrUndefined(simpleText);
    assert.strictEqual(simpleText.textContent, 'Failure');
  });
});
