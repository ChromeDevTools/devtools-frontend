// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNull} from '../../../../../../front_end/core/platform/platform.js';
import * as NetworkComponents from '../../../../../../front_end/panels/network/components/components.js';
import {getElementsWithinComponent, getElementWithinComponent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('RequestTrustTokensView', () => {
  const renderRequestTrustTokensView = () => {
    const component = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensReport();
    renderElementIntoDOM(component);
    return component;
  };

  it('renders the RefreshPolicy for redemptions', () => {
    const component = renderRequestTrustTokensView();
    component.data = {
      params: {
        type: Protocol.Network.TrustTokenOperationType.Redemption,
        refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
      },
    } as NetworkComponents.RequestTrustTokensView.RequestTrustTokensReportData;

    const [typeSpan, refreshPolicySpan] =
        getElementsWithinComponent(component, 'devtools-report-value.code', HTMLElement);
    assert.strictEqual(typeSpan.textContent, 'Redemption');
    assert.strictEqual(refreshPolicySpan.textContent, 'UseCached');
  });

  it('renders all issuers as a list', () => {
    const component = renderRequestTrustTokensView();
    const expectedIssuers = ['example.org', 'foo.dev', 'bar.com'];
    component.data = {
      params: {
        type: Protocol.Network.TrustTokenOperationType.Signing,
        issuers: expectedIssuers,
      },
    } as NetworkComponents.RequestTrustTokensView.RequestTrustTokensReportData;

    const issuerElements = getElementsWithinComponent(component, 'ul.issuers-list > li', HTMLElement);
    const actualIssuers = [...issuerElements].map(e => e.textContent);

    assert.deepStrictEqual(actualIssuers.sort(), expectedIssuers.sort());
  });

  it('renders a result section with success status for successful requests', () => {
    const component = renderRequestTrustTokensView();
    component.data = {
      result: {
        status: Protocol.Network.TrustTokenOperationDoneEventStatus.Ok,
        type: Protocol.Network.TrustTokenOperationType.Issuance,
        requestId: 'mockId',
      },
    };

    const simpleText = getElementWithinComponent(component, 'span > strong', HTMLElement);
    assertNotNull(simpleText);
    assert.strictEqual(simpleText.textContent, 'Success');
  });

  it('renders a result section with failure status for failed requests', () => {
    const component = renderRequestTrustTokensView();
    component.data = {
      result: {
        status: Protocol.Network.TrustTokenOperationDoneEventStatus.BadResponse,
        type: Protocol.Network.TrustTokenOperationType.Issuance,
        requestId: 'mockId',
      },
    };

    const simpleText = getElementWithinComponent(component, 'span > strong', HTMLElement);
    assertNotNull(simpleText);
    assert.strictEqual(simpleText.textContent, 'Failure');
  });
});
