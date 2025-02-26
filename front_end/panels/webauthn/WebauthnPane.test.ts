// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';

import type * as WebauthnModule from './webauthn.js';

describeWithMockConnection('WebAuthn pane', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Webauthn: typeof WebauthnModule;

  before(async () => {
    Webauthn = await import('./webauthn.js');
  });

  it('disables the large blob checkbox if resident key is disabled', () => {
    const panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
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

  const tests = (inScope: boolean) => {
    let target: SDK.Target.Target;
    let model: SDK.WebAuthnModel.WebAuthnModel;
    let panel: WebauthnModule.WebauthnPane.WebauthnPaneImpl;
    beforeEach(() => {
      const tabTarget = createTarget({type: SDK.Target.Type.TAB});
      createTarget({parentTarget: tabTarget, subtype: 'prerender'});
      target = createTarget({parentTarget: tabTarget});
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      model = target.model(SDK.WebAuthnModel.WebAuthnModel) as SDK.WebAuthnModel.WebAuthnModel;
      assert.exists(model);
      panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
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
      assert.lengthOf(dataGrid.rootNode().children, 1);
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
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, {
        authenticatorId,
        credential,
      });

      // Verify the credential appeared and the empty row was removed.
      assert.lengthOf(dataGrid.rootNode().children, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Remove the credential.
      const removeCredential = sinon.stub(model, 'removeCredential').resolves();
      dataGrid.element.querySelectorAll('devtools-button')[1].click();
      assert.lengthOf(dataGrid.rootNode().children, 1);
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
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, {
        authenticatorId,
        credential,
      });

      // Verify the credential appeared.
      const dataGrid = panel.dataGrids.get(authenticatorId);
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.lengthOf(dataGrid.rootNode().children, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Update the credential.
      const updatedCredential1 = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'morgan',
        signCount: 2,
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_ASSERTED, {
        authenticatorId,
        credential: updatedCredential1,
      });

      // Verify the credential was updated.
      assert.lengthOf(dataGrid.rootNode().children, 1);
      assert.strictEqual(credentialNode.data, updatedCredential1);

      // The credential can also be updated through the CREDENTIAL_UPDATED
      // event.
      const updatedCredential2 = {
        credentialId: 'credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'danielle',
        signCount: 2,
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_UPDATED, {
        authenticatorId,
        credential: updatedCredential2,
      });

      // Verify the credential was updated.
      assert.lengthOf(dataGrid.rootNode().children, 1);
      assert.strictEqual(credentialNode.data, updatedCredential2);

      // Updating a different credential should not affect the existing one.
      const anotherCredential = {
        credentialId: 'another-credential',
        isResidentCredential: false,
        rpId: 'talos1.org',
        userHandle: 'alex',
        signCount: 1,
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_ASSERTED, {
        authenticatorId,
        credential: anotherCredential,
      });

      // Verify the credential was unchanged.
      assert.lengthOf(dataGrid.rootNode().children, 1);
      assert.strictEqual(credentialNode.data, updatedCredential2);
    });

    it('removes credentials that were deleted', async () => {
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
        privateKey: '',
      };
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, {
        authenticatorId,
        credential,
      });

      // Verify the credential appeared.
      const dataGrid = panel.dataGrids.get(authenticatorId);
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.lengthOf(dataGrid.rootNode().children, 1);
      const credentialNode = dataGrid.rootNode().children[0];
      assert.isOk(credentialNode);
      assert.strictEqual(credentialNode.data, credential);

      // Delete a credential with a different ID. This should be ignored.
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, {
        authenticatorId,
        credentialId: 'another credential',
      });
      assert.lengthOf(dataGrid.rootNode().children, 1);

      // Delete the credential. It should be removed from the list.
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, {
        authenticatorId,
        credentialId: credential.credentialId,
      });
      assert.lengthOf(dataGrid.rootNode().children, 0);
    });

    it('disables "internal" if an internal authenticator exists', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;
      let panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
      let transport = panel.transportSelect;
      if (!transport) {
        assert.fail('Transport select is not present');
      }
      let internalTransportIndex = -1;
      for (let i = 0; i < transport.options.length; ++i) {
        if (transport.options[i].value === Protocol.WebAuthn.AuthenticatorTransport.Internal) {
          internalTransportIndex = i;
          break;
        }
      }
      assert.notEqual(internalTransportIndex, -1);
      assert.isFalse(transport.options[internalTransportIndex].disabled);

      // Add an internal authenticator.
      transport.selectedIndex = internalTransportIndex;
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.addAuthenticatorButton?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(addAuthenticator.called, inScope);
      if (!inScope) {
        return;
      }

      // The "internal" option should have been disabled, and another option selected.
      assert.notEqual(transport.selectedIndex, internalTransportIndex);
      assert.isTrue(transport.options[internalTransportIndex].disabled);

      // Restoring the authenticator when loading the panel again should also cause "internal" to be disabled.
      panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
      transport = panel.transportSelect;
      if (!transport) {
        assert.fail('Transport select is not present');
      }
      assert.isTrue(transport.options[internalTransportIndex].disabled);

      // Removing the internal authenticator should re-enable the option.
      panel.removeAuthenticator(authenticatorId);
      assert.isFalse(transport.options[internalTransportIndex].disabled);
    });
  };

  describe('in scope', () => tests(true));
  describe('out of scope', () => tests(false));

  it('shows the placeholder', () => {
    const panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
    assert.exists(panel.contentElement.querySelector('.empty-state'));
    assert.deepEqual(panel.contentElement.querySelector('.empty-state-header')?.textContent, 'No authenticator set up');
    assert.deepEqual(
        panel.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'Use WebAuthn for phishing-resistant authentication.');
  });
});
