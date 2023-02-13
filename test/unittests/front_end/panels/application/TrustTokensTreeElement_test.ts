// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as ApplicationComponents from '../../../../../front_end/panels/application/components/components.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('TrustTokensViewWidgetWrapper', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let view: ApplicationComponents.TrustTokensView.TrustTokensView;
    let wrapper: Application.TrustTokensTreeElement.TrustTokensViewWidgetWrapper;
    const TOKENS = [{issuerOrigin: 'origin1', count: 42}, {issuerOrigin: 'origin2', count: 21}];

    beforeEach(() => {
      target = targetFactory();
      view = new ApplicationComponents.TrustTokensView.TrustTokensView();
    });

    afterEach(() => {
      wrapper.detach();
    });

    it('reads and propagates trust tokens', async () => {
      const getTrustTokens = sinon.stub(target.storageAgent(), 'invoke_getTrustTokens');
      wrapper = new Application.TrustTokensTreeElement.TrustTokensViewWidgetWrapper(view);
      wrapper.markAsRoot();
      wrapper.show(document.body);
      const [, data] = await Promise.all([
        new Promise<void>(resolve => getTrustTokens.callsFake(() => {
          resolve();
          return Promise.resolve({tokens: TOKENS} as Protocol.Storage.GetTrustTokensResponse);
        })),
        new Promise<ApplicationComponents.TrustTokensView.TrustTokensViewData>(
            resolve => sinon.stub(view, 'data').set(resolve)),
      ]);
      assert.deepStrictEqual(data.tokens, TOKENS);
    });

    it('sets delete handler', async () => {
      sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').returns(Promise.resolve({
        tokens: TOKENS,
      } as Protocol.Storage.GetTrustTokensResponse));
      wrapper = new Application.TrustTokensTreeElement.TrustTokensViewWidgetWrapper(view);
      wrapper.markAsRoot();
      wrapper.show(document.body);
      const data = await new Promise<ApplicationComponents.TrustTokensView.TrustTokensViewData>(
          resolve => sinon.stub(view, 'data').set(resolve));
      const clearTrustTokens = sinon.spy(target.storageAgent(), 'invoke_clearTrustTokens');
      data.deleteClickHandler('test_issuer');
      assert.isTrue(clearTrustTokens.calledOnceWith({issuerOrigin: 'test_issuer'}));
    });
  };
  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
