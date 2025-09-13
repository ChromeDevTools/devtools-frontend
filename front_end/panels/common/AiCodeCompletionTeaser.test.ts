// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

const {AiCodeCompletionTeaser, FreDialog} = PanelCommon;

describeWithEnvironment('AiCodeCompletionTeaser', () => {
  let showFreDialogStub: sinon.SinonStub<Parameters<typeof FreDialog.show>, Promise<boolean>>;
  let checkAccessPreconditionsStub: sinon.SinonStub;

  beforeEach(() => {
    showFreDialogStub = sinon.stub(FreDialog, 'show');
    checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
  });

  async function createTeaser() {
    const view = createViewFunctionStub(AiCodeCompletionTeaser);
    const widget = new AiCodeCompletionTeaser({onDetach: sinon.stub()}, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  afterEach(() => {
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-teaser-dismissed').set(false);
    Common.Settings.Settings.instance().settingForTest('ai-code-completion-enabled').set(false);
  });

  it('should dismiss and open snackbar on dismiss click', async () => {
    const {view, widget} = await createTeaser();
    const showSnackbar = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');

    assert.isTrue(widget.isShowing());
    assert.exists(view.input.onDismiss);
    view.input.onDismiss(new Event('click'));
    await widget.updateComplete;

    sinon.assert.calledOnce(showSnackbar);
    assert.isTrue(Common.Settings.Settings.instance().settingForTest('ai-code-completion-teaser-dismissed').get());
    assert.isFalse(widget.isShowing());
  });

  it('should open settings on snackbar action click', async () => {
    const {view, widget} = await createTeaser();
    const showSnackbar = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
    assert.exists(view.input.onDismiss);
    view.input.onDismiss(new Event('click'));

    sinon.assert.calledOnce(showSnackbar);
    const snackbarOptions = showSnackbar.firstCall.args[0];
    assert.exists(snackbarOptions.actionProperties);
    snackbarOptions.actionProperties.onClick();

    assert.isTrue(showViewStub.calledOnceWith('chrome-ai'));
    widget.detach();
  });

  it('should FRE text include no logging case when the enterprise policy value is ALLOW_WITHOUT_LOGGING', async () => {
    updateHostConfig(
        {aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING}});

    const {view, widget} = await createTeaser();
    view.input.onAction(new Event(''));

    sinon.assert.called(showFreDialogStub);
    assert.exists(showFreDialogStub.lastCall.args[0].reminderItems.find(
        reminderItem =>
            reminderItem.content.toString().includes('This data will not be used to improve Google’s AI models.')));
    widget.detach();
  });

  it('should FRE text not include no logging case when the enterprise policy value is ALLOW', async () => {
    updateHostConfig({aidaAvailability: {enterprisePolicyValue: Root.Runtime.GenAiEnterprisePolicyValue.ALLOW}});

    const {view, widget} = await createTeaser();
    view.input.onAction(new Event(''));

    sinon.assert.called(showFreDialogStub);
    assert.notExists(showFreDialogStub.lastCall.args[0].reminderItems.find(
        reminderItem =>
            reminderItem.content.toString().includes('This data will not be used to improve Google’s AI models.')));
    widget.detach();
  });

  it('renders when AIDA becomes available', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);

    const {view, widget} = await createTeaser();

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);

    await view.nextInput;

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    widget.detach();
  });

  it('does not render when AIDA becomes unavailable', async () => {
    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    const {view, widget} = await createTeaser();

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    checkAccessPreconditionsStub.resolves(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);

    await view.nextInput;

    assert.strictEqual(view.input.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    widget.detach();
  });
});
