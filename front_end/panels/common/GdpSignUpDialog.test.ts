// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Badges from '../../models/badges/badges.js';
import {
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

function stubCreateProfileWithResolvers() {
  const {promise: createProfilePromise, resolve: resolveCreateProfile} = Promise.withResolvers<{name: string}|null>();
  const createProfileStub =
      sinon.stub(Host.GdpClient.GdpClient.instance(), 'createProfile').returns(createProfilePromise);
  return {createProfileStub, createProfilePromise, resolveCreateProfile};
}

describeWithEnvironment('GdpSignUpDialog', () => {
  async function createWidget(options: {onSuccess?: () => void, onCancel?: () => void} = {}) {
    const view = createViewFunctionStub(PanelCommon.GdpSignUpDialog);
    const dialog = new UI.Dialog.Dialog();
    const hideSpy = sinon.spy(dialog, 'hide');
    const widget = new PanelCommon.GdpSignUpDialog(
        {
          dialog,
          onSuccess: options.onSuccess ?? (() => {}),
          onCancel: options.onCancel ?? (() => {}),
        },
        view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget, hideSpy};
  }

  it('renders with initial state', async () => {
    const {view} = await createWidget();
    assert.isFalse(view.input.keepMeUpdated);
    assert.isFalse(view.input.isSigningUp);
  });

  it('updates keepMeUpdated state on change', async () => {
    const {view} = await createWidget();
    view.input.onKeepMeUpdatedChange(true);
    const finalInput = await view.nextInput;
    assert.isTrue(finalInput.keepMeUpdated);
  });

  it('hides the dialog on cancel', async () => {
    const {view, hideSpy} = await createWidget();
    view.input.onCancelClick();
    sinon.assert.calledOnce(hideSpy);
  });

  describe('onSignUpClick', () => {
    let userBadgesInitializeStub: sinon.SinonStub;
    let userBadgesRecordActionStub: sinon.SinonStub;
    let snackbarShowStub: sinon.SinonStub;

    beforeEach(() => {
      Badges.UserBadges.instance({forceNew: true});
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getSyncInformation')
          .callsFake((callback: (info: Host.InspectorFrontendHostAPI.SyncInformation) => void) => {
            callback({accountEmail: 'test@google.com', accountFullName: 'Test User', isSyncActive: false});
          });

      userBadgesInitializeStub = sinon.stub(Badges.UserBadges.instance(), 'initialize').resolves();
      userBadgesRecordActionStub = sinon.stub(Badges.UserBadges.instance(), 'recordAction');
      snackbarShowStub = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');

      Common.Settings.settingForTest('receive-gdp-badges').set(false);
    });

    it('handles successful sign up', async () => {
      const {createProfileStub, createProfilePromise, resolveCreateProfile} = stubCreateProfileWithResolvers();
      const {view, hideSpy} = await createWidget();

      void view.input.onSignUpClick();

      const nextInput = await view.nextInput;
      assert.isTrue(nextInput.isSigningUp);

      resolveCreateProfile({name: 'test/name'});
      await createProfilePromise;
      // Wait for `Badges.UserBadges.instance().initialize` to resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isTrue(Common.Settings.settingForTest('receive-gdp-badges').get());
      sinon.assert.calledOnceWithExactly(
          createProfileStub, {user: 'Test User', emailPreference: Host.GdpClient.EmailPreference.DISABLED});
      sinon.assert.calledOnce(userBadgesInitializeStub);
      sinon.assert.calledOnceWithExactly(userBadgesRecordActionStub, Badges.BadgeAction.GDP_SIGN_UP_COMPLETE);
      sinon.assert.calledOnce(hideSpy);
    });

    it('handles successful sign up with email preference', async () => {
      const {createProfileStub, createProfilePromise, resolveCreateProfile} = stubCreateProfileWithResolvers();
      const {view, hideSpy} = await createWidget();

      view.input.onKeepMeUpdatedChange(true);
      await view.nextInput;

      void view.input.onSignUpClick();

      const nextInput = await view.nextInput;
      assert.isTrue(nextInput.isSigningUp);

      resolveCreateProfile({name: 'user/name'});
      await createProfilePromise;
      // Wait for `Badges.UserBadges.instance().initialize` to resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isTrue(Common.Settings.settingForTest('receive-gdp-badges').get());
      sinon.assert.calledOnceWithExactly(
          createProfileStub, {user: 'Test User', emailPreference: Host.GdpClient.EmailPreference.ENABLED});
      sinon.assert.calledOnce(userBadgesInitializeStub);
      sinon.assert.calledOnceWithExactly(userBadgesRecordActionStub, Badges.BadgeAction.GDP_SIGN_UP_COMPLETE);
      sinon.assert.calledOnce(hideSpy);
    });

    it('handles failed sign up', async () => {
      const {createProfileStub, createProfilePromise, resolveCreateProfile} = stubCreateProfileWithResolvers();
      const {view, hideSpy} = await createWidget();

      void view.input.onSignUpClick();

      const nextInput = await view.nextInput;
      assert.isTrue(nextInput.isSigningUp);

      resolveCreateProfile(null);
      await createProfilePromise;
      // Wait for `Badges.UserBadges.instance().initialize` to resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.isFalse(Common.Settings.settingForTest('receive-gdp-badges').get());
      sinon.assert.calledOnce(createProfileStub);
      sinon.assert.calledOnce(snackbarShowStub);
      sinon.assert.notCalled(userBadgesInitializeStub);
      sinon.assert.notCalled(userBadgesRecordActionStub);
      sinon.assert.notCalled(hideSpy);

      const finalInput = await view.nextInput;
      assert.isFalse(finalInput.isSigningUp);
    });

    it('calls onSuccess on successful sign up', async () => {
      const {createProfileStub, createProfilePromise, resolveCreateProfile} = stubCreateProfileWithResolvers();
      const onSuccessSpy = sinon.spy();
      const {view, hideSpy} = await createWidget({onSuccess: onSuccessSpy});

      void view.input.onSignUpClick();

      const nextInput = await view.nextInput;
      assert.isTrue(nextInput.isSigningUp);

      resolveCreateProfile({name: 'test/name'});
      await createProfilePromise;
      // Wait for `Badges.UserBadges.instance().initialize` to resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.calledOnce(createProfileStub);
      sinon.assert.calledOnce(onSuccessSpy);
      sinon.assert.calledOnce(hideSpy);
    });

    it('calls `onCancel` when user clicks cancel', async () => {
      const onCancelSpy = sinon.spy();
      const {view, hideSpy} = await createWidget({onCancel: onCancelSpy});

      void view.input.onCancelClick();

      sinon.assert.calledOnce(hideSpy);
      sinon.assert.calledOnce(onCancelSpy);
    });
  });
});
