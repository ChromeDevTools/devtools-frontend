// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
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

  it('disables the large blob checkbox if resident key is disabled', async () => {
    const panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
    const largeBlob = panel.contentElement.querySelector<HTMLInputElement>('#large-blob');
    const residentKeys = panel.contentElement.querySelector<HTMLInputElement>('#resident-key');

    if (!largeBlob || !residentKeys) {
      assert.fail('Required checkbox not found');
      return;
    }

    // Make sure resident keys is disabled. Large blob should be disabled and
    // unchecked.
    residentKeys.checked = false;
    residentKeys.dispatchEvent(new Event('change'));
    await panel.updateComplete;
    assert.isTrue(largeBlob.disabled);
    assert.isFalse(largeBlob.checked);

    // Enable resident keys. Large blob should be enabled but still not
    // checked.
    residentKeys.checked = true;
    residentKeys.dispatchEvent(new Event('change'));
    await panel.updateComplete;
    assert.isFalse(largeBlob.disabled);
    assert.isFalse(largeBlob.checked);

    // Manually check large blob.
    largeBlob.checked = true;
    largeBlob.dispatchEvent(new Event('change'));
    await panel.updateComplete;

    // Disabling resident keys should reset large blob to disabled and
    // unchecked.
    residentKeys.checked = false;
    residentKeys.dispatchEvent(new Event('change'));
    await panel.updateComplete;
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
      const largeBlob = panel.contentElement.querySelector<HTMLInputElement>('#large-blob');
      const residentKeys = panel.contentElement.querySelector<HTMLInputElement>('#resident-key');

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      residentKeys.dispatchEvent(new Event('change'));
      largeBlob.checked = true;
      largeBlob.dispatchEvent(new Event('change'));

      const addAuthenticator = sinon.stub(model, 'addAuthenticator');
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;
      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);
      const options = addAuthenticator.firstCall.firstArg;
      assert.isTrue(options.hasLargeBlob);
      assert.isTrue(options.hasResidentKey);
    });

    it('adds an authenticator without the large blob option', async () => {
      const largeBlob = panel.contentElement.querySelector<HTMLInputElement>('#large-blob');
      const residentKeys = panel.contentElement.querySelector<HTMLInputElement>('#resident-key');

      if (!largeBlob || !residentKeys) {
        assert.fail('Required checkbox not found');
        return;
      }
      residentKeys.checked = true;
      residentKeys.dispatchEvent(new Event('change'));
      largeBlob.checked = false;
      largeBlob.dispatchEvent(new Event('change'));

      const addAuthenticator = sinon.stub(model, 'addAuthenticator');
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;
      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);
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
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;

      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);

      // Verify a data grid appeared with a single row to show there is no data.
      const dataGrid = panel.contentElement.querySelector('devtools-data-grid tbody');
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.include(dataGrid.deepInnerText(), 'No credentials');

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
      await panel.updateComplete;

      // Verify the credential appeared and the empty row was removed.
      assert.include(dataGrid.deepInnerText(), Object.values(credential).join('\n'));

      // Remove the credential.
      const removeCredential = sinon.stub(model, 'removeCredential').resolves();
      dataGrid.querySelectorAll('devtools-button')[1].click();
      await panel.updateComplete;
      await expectCalled(removeCredential);

      assert.strictEqual(removeCredential.firstCall.firstArg, authenticatorId);
      assert.strictEqual(removeCredential.firstCall.lastArg, credential.credentialId);
    });

    it('updates credentials', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;

      // Add an authenticator.
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;
      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);

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
      await panel.updateComplete;

      // Verify the credential appeared.
      const dataGrid = panel.contentElement.querySelector('devtools-data-grid tbody');
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.include(dataGrid.deepInnerText(), Object.values(credential).join('\n'));

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
      await panel.updateComplete;

      // Verify the credential was updated.
      assert.include(dataGrid.deepInnerText(), Object.values(updatedCredential1).join('\n'));

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
      await panel.updateComplete;

      // Verify the credential was updated.
      assert.include(dataGrid.deepInnerText(), Object.values(updatedCredential2).join('\n'));

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
      await panel.updateComplete;

      // Verify the credential was unchanged.
      assert.include(dataGrid.deepInnerText(), Object.values(updatedCredential2).join('\n'));
    });

    it('removes credentials that were deleted', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;

      // Add an authenticator.
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;
      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);

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
      await panel.updateComplete;

      // Verify the credential appeared.
      const dataGrid = panel.contentElement.querySelector('devtools-data-grid tbody');
      if (!dataGrid) {
        assert.fail('Expected dataGrid to be truthy');
        return;
      }
      assert.include(dataGrid.deepInnerText(), Object.values(credential).join('\n'));

      // Delete a credential with a different ID. This should be ignored.
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, {
        authenticatorId,
        credentialId: 'another credential',
      });
      await panel.updateComplete;
      assert.include(dataGrid.deepInnerText(), Object.values(credential).join('\n'));

      // Delete the credential. It should be removed from the list.
      model.dispatchEventToListeners(SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, {
        authenticatorId,
        credentialId: credential.credentialId,
      });
      await panel.updateComplete;
      assert.include(dataGrid.deepInnerText(), 'No credentials');
    });

    it('disables "internal" if an internal authenticator exists', async () => {
      const authenticatorId = 'authenticator-1' as Protocol.WebAuthn.AuthenticatorId;
      let panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
      let transport = panel.contentElement.querySelector<HTMLSelectElement>('#transport');
      assert.isOk(transport, 'Transport select is not present');
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
      transport.dispatchEvent(new Event('change'));
      const addAuthenticator = sinon.stub(model, 'addAuthenticator').resolves(authenticatorId);
      panel.contentElement.querySelector<HTMLElement>('#add-authenticator')?.click();
      await panel.updateComplete;
      if (!inScope) {
        return;
      }
      await expectCalled(addAuthenticator);

      // The "internal" option should have been disabled, and another option selected.
      assert.notEqual(transport.selectedIndex, internalTransportIndex);
      assert.isTrue(transport.options[internalTransportIndex].disabled);

      // Restoring the authenticator when loading the panel again should also cause "internal" to be disabled.
      panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
      transport = panel.contentElement.querySelector<HTMLSelectElement>('#transport');
      assert.isOk(transport, 'Transport select is not present');
      assert.isTrue(transport.options[internalTransportIndex].disabled);

      // Removing the internal authenticator should re-enable the option.
      panel.removeAuthenticator(authenticatorId);
      await panel.updateComplete;
      assert.isFalse(transport.options[internalTransportIndex].disabled);
    });
  };

  describe('in scope', () => tests(true));
  describe('out of scope', () => tests(false));

  it('shows the placeholder', () => {
    const panel = new Webauthn.WebauthnPane.WebauthnPaneImpl();
    renderElementIntoDOM(panel);
    assert.exists(panel.contentElement.querySelector('.empty-state'));
    assert.deepEqual(panel.contentElement.querySelector('.empty-state-header')?.textContent, 'No authenticator set up');
    assert.deepEqual(
        panel.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'Use WebAuthn for phishing-resistant authentication.');
  });
});
