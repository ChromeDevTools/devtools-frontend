// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
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
    const panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance({forceNew: true});
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

  const tests = (targetFactory: () => SDK.Target.Target, inScope: boolean) => {
    let target: SDK.Target.Target;
    let model: SDK.WebAuthnModel.WebAuthnModel;
    let panel: WebauthnModule.WebauthnPane.WebauthnPaneImpl;
    beforeEach(() => {
      target = targetFactory();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      model = target.model(SDK.WebAuthnModel.WebAuthnModel) as SDK.WebAuthnModel.WebAuthnModel;
      assertNotNullOrUndefined(model);
      panel = Webauthn.WebauthnPane.WebauthnPaneImpl.instance({forceNew: true});
    });

    it('adds an authenticator with large blob option', async () => {
      const largeBlob = panel.largeBlobCheckbox;
      const residentKeys = panel.residentKeyCheckbox;

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      largeBlob.checked = true;

      const addAuthenticator = sinon.stub(model, 'addAuthenticator');
      panel.addAuthenticatorButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(addAuthenticator.called, inScope);
      if (inScope) {
        const options = addAuthenticator.firstCall.firstArg;
        assert.isTrue(options.hasLargeBlob);
        assert.isTrue(options.hasResidentKey);
      }
    });

    it('adds an authenticator without the large blob option', async () => {
      const largeBlob = panel.largeBlobCheckbox;
      const residentKeys = panel.residentKeyCheckbox;

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      largeBlob.checked = false;

      const addAuthenticator = sinon.stub(model, 'addAuthenticator');
      panel.addAuthenticatorButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(addAuthenticator.called, inScope);
      if (inScope) {
        const options = addAuthenticator.firstCall.firstArg;
        assert.isFalse(options.hasLargeBlob);
        assert.isTrue(options.hasResidentKey);
      }
    });

    it('lists and removes credentials', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;

      // Add an authenticator.
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.addAuthenticatorButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(addAuthenticator.called, inScope);
      if (!inScope) {
        return;
      }

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
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CredentialAdded, {
        authenticatorId,
        credential,
      });

      // Verify the credential appeared and the empty row was removed.
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Remove the credential.
      const removeCredential = sinon.stub(model, 'removeCredential').resolves();
      dataGrid.element.querySelectorAll('button')[1].click();
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      emptyNode = dataGrid.rootNode().children[0];
      assert.isOk(emptyNode);
      assert.deepEqual(emptyNode.data, {});
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.isTrue(removeCredential.called);

      assert.strictEqual(removeCredential.firstCall.firstArg, authenticatorId);
      assert.strictEqual(removeCredential.firstCall.lastArg, credential.credentialId);
    });

    it('updates credentials', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;

      // Add an authenticator.
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.addAuthenticatorButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(addAuthenticator.called, inScope);
      if (!inScope) {
        return;
      }

      // Add a credential.
      const credential = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'morgan',
        signCount: 1,
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CredentialAdded, {
        authenticatorId,
        credential,
      });

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
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CredentialAsserted, {
        authenticatorId,
        credential: updatedCredential,
      });

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
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CredentialAsserted, {
        authenticatorId,
        credential: anotherCredential,
      });

      // Verify the credential was unchanged.
      assert.strictEqual(dataGrid.rootNode().children.length, 1);
      assert.strictEqual(credentialNode.data, updatedCredential);
    });
  };

  describe('without tab target in scope', () => tests(() => createTarget(), true));
  describe('without tab target out of scope', () => tests(() => createTarget(), false));
  describe('with tab target in scope', () => tests(() => {
                                         const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                         createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                         return createTarget({parentTarget: tabTarget});
                                       }, true));
  describe('with tab target out of scope', () => tests(() => {
                                             const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                             createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                             return createTarget({parentTarget: tabTarget});
                                           }, false));
});
