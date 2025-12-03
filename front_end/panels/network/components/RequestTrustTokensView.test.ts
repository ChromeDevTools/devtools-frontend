// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as NetworkComponents from './components.js';

describe('RequestTrustTokensView', () => {
  setupLocaleHooks();

  const makeRequest =
      (params?: Protocol.Network.TrustTokenParams, result?: Protocol.Network.TrustTokenOperationDoneEvent) => {
        return {
          trustTokenParams: () => params,
          trustTokenOperationDoneEvent: () => result,
          addEventListener: () => {},
          removeEventListener: () => {},
        } as unknown as SDK.NetworkRequest.NetworkRequest;
      };

  it('renders the success state correctly', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    NetworkComponents.RequestTrustTokensView.DEFAULT_VIEW(
        {
          status: 'Success',
          description: 'The operations result was served from cache.',
          issuedTokenCount: 5,
          params: [
            {name: 'Type', value: 'Issuance', isCode: true},
            {name: 'Refresh policy', value: 'UseCached', isCode: true},
            {name: 'Issuers', value: ['example.org', 'foo.dev']},
            {name: 'Top level origin', value: 'foo.dev'},
            {name: 'Issuer', value: 'example.org'},
          ],
        },
        undefined, container);
    await assertScreenshot('network/request_trust_tokens_view_success.png');
  });

  it('renders the failure state correctly', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    NetworkComponents.RequestTrustTokensView.DEFAULT_VIEW(
        {
          status: 'Failure',
          description: 'The servers response was malformed or otherwise invalid.',
          params: [
            {name: 'Type', value: 'Redemption', isCode: true},
          ],
        },
        undefined, container);
    await assertScreenshot('network/request_trust_tokens_view_failure.png');
  });

  it('adds refreshPolicy for Redemption request params', async () => {
    const view = createViewFunctionStub(NetworkComponents.RequestTrustTokensView.RequestTrustTokensView);
    const component = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(undefined, view);
    const request = makeRequest({
      operation: Protocol.Network.TrustTokenOperationType.Redemption,
      refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
    });
    component.request = request;

    const input = await view.nextInput;
    assert.deepEqual(input.params, [
      {name: 'Type', value: 'Redemption', isCode: true},
      {name: 'Refresh policy', value: 'UseCached', isCode: true},
    ]);
  });

  it('adds issuedTokenCount an Issuance request result section', async () => {
    const view = createViewFunctionStub(NetworkComponents.RequestTrustTokensView.RequestTrustTokensView);
    const component = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(undefined, view);
    const request = makeRequest(
        {
          operation: Protocol.Network.TrustTokenOperationType.Issuance,
          refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
        },
        {
          status: Protocol.Network.TrustTokenOperationDoneEventStatus.Ok,
          type: Protocol.Network.TrustTokenOperationType.Issuance,
          requestId: 'mockId' as Protocol.Network.RequestId,
          issuedTokenCount: 5,
        });
    component.request = request;

    const input = await view.nextInput;
    assert.deepEqual(input.params, [
      {name: 'Type', value: 'Issuance', isCode: true},
    ]);
    assert.strictEqual(input.issuedTokenCount, 5);
  });

  it('adds topLevelOrigin and issuerOrigin to params if present in result', async () => {
    const view = createViewFunctionStub(NetworkComponents.RequestTrustTokensView.RequestTrustTokensView);
    const component = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(undefined, view);
    const request = makeRequest(
        {
          operation: Protocol.Network.TrustTokenOperationType.Redemption,
          refreshPolicy: Protocol.Network.TrustTokenParamsRefreshPolicy.UseCached,
        },
        {
          status: Protocol.Network.TrustTokenOperationDoneEventStatus.Ok,
          type: Protocol.Network.TrustTokenOperationType.Redemption,
          requestId: 'mockId' as Protocol.Network.RequestId,
          topLevelOrigin: 'https://toplevel.com',
          issuerOrigin: 'https://issuer.com',
        });
    component.request = request;

    const input = await view.nextInput;
    assert.deepEqual(input.params, [
      {name: 'Type', value: 'Redemption', isCode: true},
      {name: 'Refresh policy', value: 'UseCached', isCode: true},
      {name: 'Top level origin', value: 'https://toplevel.com'},
      {name: 'Issuer', value: 'https://issuer.com'},
    ]);
  });
});
