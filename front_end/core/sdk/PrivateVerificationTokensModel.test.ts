// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import * as sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import * as SDK from './sdk.js';

describe('PrivateVerificationTokensModel', () => {
  setupRuntimeHooks();

  let model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel;
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    model = target.model(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel)!;
    assert.exists(model);
  });

  it('retrieves tokens and issuer configs', async () => {
    const tokens: Protocol.Storage.PrivateVerificationToken[] = [
      {
        id: '1',
        issuerOrigin: 'https://issuer.example',
        keyId: 10,
        expiration: 1800000000,
        creationTime: 1700000000,
        version: 1,
        token: 'AQIDBA==',
      },
    ];
    const configs: Protocol.Storage.PrivateVerificationTokensIssuerConfig[] = [
      {
        issuerOrigin: 'https://issuer.example',
        redeemerOrigins: ['https://redeemer.example'],
      },
    ];
    connection.setSuccessHandler('Storage.getPrivateVerificationTokens', () => ({tokens}));
    connection.setSuccessHandler('Storage.getPrivateVerificationTokensIssuerConfigs', () => ({configs}));

    assert.deepEqual(await model.getTokens(), tokens);
    assert.deepEqual(await model.getIssuerConfigs(), configs);
  });

  it('returns empty arrays on protocol error', async () => {
    connection.setFailureHandler('Storage.getPrivateVerificationTokens',
                                 () => ({
                                   message: 'Failed',
                                   code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                                 }));
    connection.setFailureHandler('Storage.getPrivateVerificationTokensIssuerConfigs',
                                 () => ({
                                   message: 'Failed',
                                   code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                                 }));

    assert.deepEqual(await model.getTokens(), []);
    assert.deepEqual(await model.getIssuerConfigs(), []);
  });

  it('forwards tracking, clearTokens, and deleteToken commands', async () => {
    const trackingSpy = sinon.spy();
    const clearSpy = sinon.spy();
    const deleteSpy = sinon.spy();
    connection.setSuccessHandler('Storage.setPrivateVerificationTokensTracking', params => {
      trackingSpy(params);
      return {};
    });
    connection.setSuccessHandler('Storage.clearPrivateVerificationTokens', params => {
      clearSpy(params);
      return {};
    });
    connection.setSuccessHandler('Storage.deletePrivateVerificationToken', params => {
      deleteSpy(params);
      return {};
    });

    model.setTracking(true);
    await model.clearTokens('https://issuer.example');
    await model.deleteToken('42');

    sinon.assert.calledOnceWithExactly(trackingSpy, {enable: true});
    sinon.assert.calledOnceWithExactly(clearSpy, {issuerOrigin: 'https://issuer.example'});
    sinon.assert.calledOnceWithExactly(deleteSpy, {tokenId: '42'});
  });

  it('dispatches TOKENS_UPDATED when Storage.privateVerificationTokensUpdated event arrives', () => {
    const listener = sinon.spy();
    model.addEventListener(SDK.PrivateVerificationTokensModel.Events.TOKENS_UPDATED, listener);

    connection.dispatchEvent('Storage.privateVerificationTokensUpdated', undefined, undefined);

    sinon.assert.calledOnce(listener);
  });
});
