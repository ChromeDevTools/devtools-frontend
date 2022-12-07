// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

import type * as WebauthnModule from '../../../../../front_end/panels/webauthn/webauthn.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

const {assert} = chai;

describeWithMockConnection('WebAuthn pane', () => {
  let Webauthn: typeof WebauthnModule;

  before(async () => {
    Webauthn = await import('../../../../../front_end/panels/webauthn/webauthn.js');
  });

  it('disables the large blob checkbox if resident key is disabled', () => {
    const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance();
    const largeBlob = panel.largeBlobCheckbox;
    const residentKeys = panel.residentKeyCheckbox;

    if (!largeBlob || !residentKeys) {
      assert.fail('Required checkbox not found');
      return;
    }

    // Make sure resident keys is disabled. Large blob should be disabled and
    // unchecked.
    residentKeys.checked = false;
    residentKeys.dispatchEvent(new Event('change'));
    assert.isTrue(largeBlob.disabled);
    assert.isFalse(largeBlob.checked);

    // Enable resident keys. Large blob should be enabled but still not
    // checked.
    residentKeys.checked = true;
    residentKeys.dispatchEvent(new Event('change'));
    assert.isFalse(largeBlob.disabled);
    assert.isFalse(largeBlob.checked);

    // Manually check large blob.
    largeBlob.checked = true;
    assert.isTrue(largeBlob.checked);

    // Disabling resident keys should reset large blob to disabled and
    // unchecked.
    residentKeys.checked = false;
    residentKeys.dispatchEvent(new Event('change'));
    assert.isTrue(largeBlob.disabled);
    assert.isFalse(largeBlob.checked);
  });

  const tests = (targetFactory: () => SDK.Target.Target) => {
    it('adds an authenticator with large blob option', done => {
      const target = targetFactory();
      const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance();
      panel.modelAdded(new SDK.WebAuthnModel.WebAuthnModel(target));

      const largeBlob = panel.largeBlobCheckbox;
      const residentKeys = panel.residentKeyCheckbox;

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      largeBlob.checked = true;

      setMockConnectionResponseHandler('WebAuthn.addVirtualAuthenticator', params => {
        assert.isTrue(params.options.hasLargeBlob);
        assert.isTrue(params.options.hasResidentKey);
        done();
        return {
          authenticatorId: 'test',
        };
      });
      panel.addAuthenticatorButton?.click();
    });

    it('adds an authenticator without the large blob option', done => {
      const target = targetFactory();
      const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance();
      panel.modelAdded(new SDK.WebAuthnModel.WebAuthnModel(target));

      const largeBlob = panel.largeBlobCheckbox;
      const residentKeys = panel.residentKeyCheckbox;

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      largeBlob.checked = false;

      setMockConnectionResponseHandler('WebAuthn.addVirtualAuthenticator', params => {
        assert.isFalse(params.options.hasLargeBlob);
        assert.isTrue(params.options.hasResidentKey);
        done();
        return {
          authenticatorId: 'test',
        };
      });
      panel.addAuthenticatorButton?.click();
    });

    it('lists and removes credentials', async () => {
      const target = targetFactory();
      const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance({forceNew: true});
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;
      const model = new SDK.WebAuthnModel.WebAuthnModel(target);
      panel.modelAdded(model);

      // Add an authenticator.
      const authenticatorAdded = new Promise<void>(resolve => {
        setMockConnectionResponseHandler('WebAuthn.addVirtualAuthenticator', () => {
          window.setTimeout(resolve);
          return {authenticatorId};
        });
      });
      panel.addAuthenticatorButton?.click();
      await authenticatorAdded;

      // Verify a data grid appeared with a single row to show there is no data.
      const dataGrid = panel.dataGrids.get(authenticatorId);
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      let emptyNode = dataGrid.rootNode().children[0];
      assert.isOk(emptyNode);
      assert.deepEqual(emptyNode.data, {});

      // Add a credential.
      const credential = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'morgan',
        signCount: 1,
      };
      const credentialAdded = new Promise<void>(resolve => {
        model.addEventListener(SDK.WebAuthnModel.Events.CredentialAdded, () => resolve());
      });
      dispatchEvent(target, 'WebAuthn.credentialAdded', {
        authenticatorId,
        credential,
      });
      await credentialAdded;

      // Verify the credential appeared and the empty row was removed.
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Remove the credential.
      const credentialRemoved = new Promise<void>(resolve => {
        setMockConnectionResponseHandler('WebAuthn.removeCredential', request => {
          assert.strictEqual(request.authenticatorId, authenticatorId);
          assert.strictEqual(request.credentialId, credential.credentialId);
          resolve();
          return {};
        });
      });
      dataGrid.element.querySelectorAll('button')[1].click();
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      emptyNode = dataGrid.rootNode().children[0];
      assert.isOk(emptyNode);
      assert.deepEqual(emptyNode.data, {});
      await credentialRemoved;
    });

    it('updates credentials', async () => {
      const target = targetFactory();
      const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance({forceNew: true});
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;
      const model = new SDK.WebAuthnModel.WebAuthnModel(target);
      panel.modelAdded(model);

      // Add an authenticator.
      const authenticatorAdded = new Promise<void>(resolve => {
        setMockConnectionResponseHandler('WebAuthn.addVirtualAuthenticator', () => {
          window.setTimeout(resolve);
          return {authenticatorId};
        });
      });
      panel.addAuthenticatorButton?.click();
      await authenticatorAdded;

      // Add a credential.
      const credential = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'morgan',
        signCount: 1,
      };
      const credentialAdded = new Promise<void>(resolve => {
        model.addEventListener(SDK.WebAuthnModel.Events.CredentialAdded, () => resolve());
      });
      dispatchEvent(target, 'WebAuthn.credentialAdded', {
        authenticatorId,
        credential,
      });
      await credentialAdded;

      // Verify the credential appeared.
      const dataGrid = panel.dataGrids.get(authenticatorId);
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Update the credential.
      const updatedCredential = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'morgan',
        signCount: 2,
      };
      const credentialUpdated = new Promise<void>(resolve => {
        model.addEventListener(SDK.WebAuthnModel.Events.CredentialAsserted, () => resolve());
      });
      dispatchEvent(target, 'WebAuthn.credentialAsserted', {
        authenticatorId,
        credential: updatedCredential,
      });
      await credentialUpdated;

      // Verify the credential was updated.
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      assert.strictEqual(credentialNode.data, updatedCredential);

      // Updating a different credential should not affect the existing one.
      const anotherCredential = {
        credentialId: 'another-credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'alex',
        signCount: 1,
      };
      const anotherCredentialUpdated = new Promise<void>(resolve => {
        model.addEventListener(SDK.WebAuthnModel.Events.CredentialAsserted, () => resolve());
      });
      dispatchEvent(target, 'WebAuthn.credentialAsserted', {
        authenticatorId,
        credential: anotherCredential,
      });
      await anotherCredentialUpdated;

      // Verify the credential was unchanged.
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      assert.strictEqual(credentialNode.data, updatedCredential);
    });
  };

  describe('without tab target', () => tests(() => createTarget()));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
