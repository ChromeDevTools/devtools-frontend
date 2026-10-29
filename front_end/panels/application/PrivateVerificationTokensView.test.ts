// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;
const {PrivateVerificationTokensView} = Application.PrivateVerificationTokensView;

function makeToken(
    overrides: Partial<Protocol.Storage.PrivateVerificationToken>&
    Pick<Protocol.Storage.PrivateVerificationToken, 'id'|'issuerOrigin'>): Protocol.Storage.PrivateVerificationToken {
  return {
    keyId: 10,
    expiration: 1700000000,
    creationTime: 1690000000,
    version: 1,
    token: 'AQIDBA==',
    ...overrides,
  };
}

function stubStorage(target: SDK.Target.Target, tokens: Protocol.Storage.PrivateVerificationToken[] = [],
                     configs: Protocol.Storage.PrivateVerificationTokensIssuerConfig[] = []): void {
  sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens')
      .resolves({tokens, getError: () => undefined});
  sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
      .resolves({configs, getError: () => undefined});
}

async function createWidget() {
  const viewStub = createViewFunctionStub(PrivateVerificationTokensView);
  const component = new PrivateVerificationTokensView(undefined, viewStub);
  renderElementIntoDOM(component);
  await viewStub.nextInput;
  return {viewStub, component};
}

describeWithEnvironment('PrivateVerificationTokensView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
    target.setInspectedURL(urlString`http://example.com`);
  });

  describe('presenter', () => {
    it('includes issued and redeemable tokens for the current origin and omits unrelated tokens', async () => {
      stubStorage(target,
                  [
                    makeToken({id: '1', issuerOrigin: 'https://issuer.org/'}),
                    makeToken({id: '2', issuerOrigin: 'http://example.com', keyId: 20, token: 'BQYHCA=='}),
                    makeToken({id: '3', issuerOrigin: 'https://unrelated.org', keyId: 30, token: 'CQoLDA=='}),
                  ],
                  [
                    {issuerOrigin: 'https://issuer.org', redeemerOrigins: ['http://example.com']},
                    {issuerOrigin: 'http://example.com', redeemerOrigins: ['https://redeemer.org']},
                    {issuerOrigin: 'https://unrelated.org', redeemerOrigins: ['https://other-redeemer.org']},
                  ]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, [
        {
          id: '2',
          issuerOrigin: urlString`http://example.com`,
          isIssuer: true,
          isRedeemer: false,
          keyId: 20,
          expiration: '2023-11-14T22:13:20.000Z',
          creationTime: '2023-07-22T04:26:40.000Z',
          version: 1,
          token: 'BQYHCA==',
        },
        {
          id: '1',
          issuerOrigin: urlString`https://issuer.org`,
          isIssuer: false,
          isRedeemer: true,
          keyId: 10,
          expiration: '2023-11-14T22:13:20.000Z',
          creationTime: '2023-07-22T04:26:40.000Z',
          version: 1,
          token: 'AQIDBA==',
        },
      ]);
    });

    it('formats unset timestamps with a placeholder', async () => {
      stubStorage(target, [makeToken({id: '1', issuerOrigin: 'http://example.com', expiration: 0, creationTime: 0})]);
      const {viewStub} = await createWidget();

      assert.strictEqual(viewStub.input.tokens[0].expiration, '—');
      assert.strictEqual(viewStub.input.tokens[0].creationTime, '—');
    });

    it('passes empty tokens list when there are no matching private verification tokens', async () => {
      stubStorage(target, [makeToken({id: '3', issuerOrigin: 'https://unrelated.org'})],
                  [{issuerOrigin: 'https://unrelated.org', redeemerOrigins: ['https://other-redeemer.org']}]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, []);
    });

    it('passes empty tokens list when there is no primary page target', async () => {
      stubStorage(target, [makeToken({id: '1', issuerOrigin: 'http://example.com'})]);
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(null);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, []);
    });

    it('sorts tokens in natural ID order within the same issuer origin', async () => {
      stubStorage(target, [
        makeToken({id: '10', issuerOrigin: 'http://example.com'}),
        makeToken({id: '2', issuerOrigin: 'http://example.com'}),
        makeToken({id: '1', issuerOrigin: 'http://example.com'}),
      ]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens.map(t => t.id), ['1', '2', '10']);
    });

    it('enables tracking when shown and disables tracking when hidden', async () => {
      const trackingStub = sinon.stub(target.storageAgent(), 'invoke_setPrivateVerificationTokensTracking').resolves({
        getError: () => undefined,
      });
      stubStorage(target);

      const {component} = await createWidget();
      sinon.assert.calledOnceWithExactly(trackingStub, {enable: true});

      component.detach();
      sinon.assert.calledWithExactly(trackingStub, {enable: false});
    });

    it('refreshes tokens when privateVerificationTokensUpdated event is received', async () => {
      sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
          .resolves({configs: [], getError: () => undefined});
      const getTokensStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens');
      getTokensStub.onFirstCall().resolves({tokens: [], getError: () => undefined});
      getTokensStub.onSecondCall().resolves(
          {tokens: [makeToken({id: '99', issuerOrigin: 'http://example.com'})], getError: () => undefined});

      const {viewStub} = await createWidget();
      assert.deepEqual(viewStub.input.tokens, []);

      const model = target.model(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel);
      assert.isNotNull(model);
      model.privateVerificationTokensUpdated();
      await viewStub.nextInput;

      assert.lengthOf(viewStub.input.tokens, 1);
      assert.strictEqual(viewStub.input.tokens[0].id, '99');
    });

    it('does not render stale tokens when hidden while a fetch is in flight', async () => {
      sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
          .resolves({configs: [], getError: () => undefined});
      const getTokensStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens');
      getTokensStub.onFirstCall().resolves({tokens: [], getError: () => undefined});
      const {promise: pendingTokens, resolve: resolveTokens} =
          Promise.withResolvers<Protocol.Storage.GetPrivateVerificationTokensResponse>();
      getTokensStub.onSecondCall().returns(pendingTokens);

      const {viewStub, component} = await createWidget();
      const callCount = viewStub.callCount;

      const model = target.model(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel);
      assert.isNotNull(model);
      model.privateVerificationTokensUpdated();
      await raf();
      sinon.assert.calledTwice(getTokensStub);

      component.detach();
      resolveTokens({tokens: [makeToken({id: '99', issuerOrigin: 'http://example.com'})], getError: () => undefined});
      await raf();

      sinon.assert.callCount(viewStub, callCount);
    });
  });
});
