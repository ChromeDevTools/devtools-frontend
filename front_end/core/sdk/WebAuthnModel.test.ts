// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import * as SDK from './sdk.js';

const AUTHENTICATOR_ID = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;

const CREDENTIAL: Protocol.WebAuthn.Credential = {
  credentialId: 'Y3JlZGVudGlhbA==',
  isResidentCredential: true,
  rpId: 'example.com',
  privateKey: 'cHJpdmF0ZUtleQ==',
  userHandle: 'dXNlcg==',
  signCount: 0,
};

describe('WebAuthnModel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
  let universe: TestUniverse;
  let connection: MockCDPConnection;
  let model: SDK.WebAuthnModel.WebAuthnModel;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    const webAuthnModel = target.model(SDK.WebAuthnModel.WebAuthnModel);
    assert.exists(webAuthnModel);
    model = webAuthnModel;
  });

  afterEach(() => {
    universe.dispose();
  });

  function captureRequest<C extends ProtocolClient.CDPConnection.Command>(
      method: C,
      result: ProtocolClient.CDPConnection.CommandResult<C>): Promise<ProtocolClient.CDPConnection.CommandParams<C>> {
    const {promise, resolve} = Promise.withResolvers<ProtocolClient.CDPConnection.CommandParams<C>>();
    connection.setSuccessHandler(method, params => {
      resolve(params);
      return result;
    });
    return promise;
  }

  describe('setVirtualAuthEnvEnabled', () => {
    it('enables the environment with the UI by default', async () => {
      const request = captureRequest('WebAuthn.enable', {});
      await model.setVirtualAuthEnvEnabled(true);
      assert.deepEqual(await request, {enableUI: true});
    });

    it('enables the environment without the UI', async () => {
      const request = captureRequest('WebAuthn.enable', {});
      await model.setVirtualAuthEnvEnabled(true, false);
      assert.deepEqual(await request, {enableUI: false});
    });

    it('disables the environment', async () => {
      const request = captureRequest('WebAuthn.disable', {});
      await model.setVirtualAuthEnvEnabled(false);
      await request;
    });
  });

  it('adds an authenticator', async () => {
    const options: Protocol.WebAuthn.VirtualAuthenticatorOptions = {
      protocol: Protocol.WebAuthn.AuthenticatorProtocol.Ctap2,
      transport: Protocol.WebAuthn.AuthenticatorTransport.Internal,
      hasResidentKey: true,
      hasUserVerification: true,
    };
    const request = captureRequest('WebAuthn.addVirtualAuthenticator', {authenticatorId: AUTHENTICATOR_ID});
    const authenticatorId = await model.addAuthenticator(options);
    assert.deepEqual(await request, {options});
    assert.strictEqual(authenticatorId, AUTHENTICATOR_ID);
  });

  it('removes an authenticator', async () => {
    const request = captureRequest('WebAuthn.removeVirtualAuthenticator', {});
    await model.removeAuthenticator(AUTHENTICATOR_ID);
    assert.deepEqual(await request, {authenticatorId: AUTHENTICATOR_ID});
  });

  it('sets whether user verification succeeds', async () => {
    const request = captureRequest('WebAuthn.setUserVerified', {});
    await model.setUserVerified(AUTHENTICATOR_ID, false);
    assert.deepEqual(await request, {authenticatorId: AUTHENTICATOR_ID, isUserVerified: false});
  });

  it('adds a credential', async () => {
    const request = captureRequest('WebAuthn.addCredential', {});
    await model.addCredential(AUTHENTICATOR_ID, CREDENTIAL);
    assert.deepEqual(await request, {authenticatorId: AUTHENTICATOR_ID, credential: CREDENTIAL});
  });

  it('gets credentials', async () => {
    const request = captureRequest('WebAuthn.getCredentials', {credentials: [CREDENTIAL]});
    const credentials = await model.getCredentials(AUTHENTICATOR_ID);
    assert.deepEqual(await request, {authenticatorId: AUTHENTICATOR_ID});
    assert.deepEqual(credentials, [CREDENTIAL]);
  });

  it('removes a credential', async () => {
    const request = captureRequest('WebAuthn.removeCredential', {});
    await model.removeCredential(AUTHENTICATOR_ID, CREDENTIAL.credentialId);
    assert.deepEqual(await request, {authenticatorId: AUTHENTICATOR_ID, credentialId: CREDENTIAL.credentialId});
  });
  describe('when the backend returns an error', () => {
    const ERROR_MESSAGE = 'Could not find a virtual authenticator matching the ID';

    function failWith(method: ProtocolClient.CDPConnection.Command): void {
      connection.setFailureHandler(method, () => ({
                                             message: ERROR_MESSAGE,
                                             code: ProtocolClient.CDPConnection.CDPErrorStatus.INVALID_PARAMS,
                                           }));
    }

    async function assertRejects(promise: Promise<unknown>): Promise<void> {
      try {
        await promise;
      } catch (error) {
        assert.instanceOf(error, Error);
        assert.include(error.message, ERROR_MESSAGE);
        return;
      }
      assert.fail('Expected the promise to reject');
    }

    it('rejects setVirtualAuthEnvEnabled(true)', async () => {
      failWith('WebAuthn.enable');
      await assertRejects(model.setVirtualAuthEnvEnabled(true));
    });

    it('rejects setVirtualAuthEnvEnabled(false)', async () => {
      failWith('WebAuthn.disable');
      await assertRejects(model.setVirtualAuthEnvEnabled(false));
    });

    it('rejects addAuthenticator', async () => {
      failWith('WebAuthn.addVirtualAuthenticator');
      await assertRejects(model.addAuthenticator({
        protocol: Protocol.WebAuthn.AuthenticatorProtocol.Ctap2,
        transport: Protocol.WebAuthn.AuthenticatorTransport.Internal,
      }));
    });

    it('rejects removeAuthenticator', async () => {
      failWith('WebAuthn.removeVirtualAuthenticator');
      await assertRejects(model.removeAuthenticator(AUTHENTICATOR_ID));
    });

    it('rejects setAutomaticPresenceSimulation', async () => {
      failWith('WebAuthn.setAutomaticPresenceSimulation');
      await assertRejects(model.setAutomaticPresenceSimulation(AUTHENTICATOR_ID, true));
    });

    it('rejects setUserVerified', async () => {
      failWith('WebAuthn.setUserVerified');
      await assertRejects(model.setUserVerified(AUTHENTICATOR_ID, true));
    });

    it('rejects addCredential', async () => {
      failWith('WebAuthn.addCredential');
      await assertRejects(model.addCredential(AUTHENTICATOR_ID, CREDENTIAL));
    });

    it('rejects getCredentials', async () => {
      failWith('WebAuthn.getCredentials');
      await assertRejects(model.getCredentials(AUTHENTICATOR_ID));
    });

    it('rejects removeCredential', async () => {
      failWith('WebAuthn.removeCredential');
      await assertRejects(model.removeCredential(AUTHENTICATOR_ID, CREDENTIAL.credentialId));
    });
  });
});
