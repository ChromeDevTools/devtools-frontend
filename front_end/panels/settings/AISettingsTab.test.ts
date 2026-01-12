// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import type {LocalizedString} from '../../core/platform/UIString.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Switch from '../../ui/components/switch/switch.js';

import * as Settings from './settings.js';

describeWithEnvironment('AISettingsTab', () => {
  let deleteAiAssistanceHistoryStub:
      sinon.SinonStub<Parameters<typeof AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.prototype.deleteAll>>;
  let aidaAccessStub: sinon.SinonStub<[], Promise<Host.AidaClient.AidaAccessPreconditions>>;

  beforeEach(async () => {
    deleteAiAssistanceHistoryStub =
        sinon.stub(AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.prototype, 'deleteAll');
    AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance({forceNew: true});
    updateHostConfig({
      devToolsAiGeneratedTimelineLabels: {
        enabled: true,
      },
      devToolsAiCodeCompletion: {
        enabled: true,
      }
    });
    aidaAccessStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
  });

  afterEach(async () => {
    aidaAccessStub.restore();
  });

  function mockHostConfigWithExplainThisResourceEnabled() {
    updateHostConfig({
      devToolsAiAssistanceNetworkAgent: {
        enabled: true,
        modelId: 'test',
      },
    });
  }

  async function setupWidget(): Promise<{
    widget: Settings.AISettingsTab.AISettingsTab,
    view: ViewFunctionStub<typeof Settings.AISettingsTab.AISettingsTab>,
  }> {
    const view = createViewFunctionStub(Settings.AISettingsTab.AISettingsTab);
    const widget = new Settings.AISettingsTab.AISettingsTab(view);
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;
    return {widget, view};
  }

  it('renders disclaimers and settings', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
    Common.Settings.moduleSetting('ai-annotations-enabled').set(true);
    Common.Settings.moduleSetting('ai-code-completion-enabled').set(true);

    const {view} = await setupWidget();

    const disclaimers = view.input.sharedDisclaimerBulletPoints;
    const sendDataDiscalimer = disclaimers[1].text as LocalizedString;
    assert.strictEqual(
        sendDataDiscalimer,
        'These features send relevant data to Google. Google collects this data and feedback to improve its products and services with the help of human reviewers. Avoid sharing sensitive or personal information.');
    const dataCollectionDiscalimer = disclaimers[2].text as LocalizedString;
    assert.strictEqual(dataCollectionDiscalimer, 'Depending on your region, Google may refrain from data collection');

    const settingToParams = view.input.settingToParams;
    const settingParams = Array.from(settingToParams.values());
    const settingNames = settingParams.map(setting => setting.settingName);
    assert.deepEqual(settingNames, ['Console Insights', 'AI assistance', 'Auto annotations', 'Code suggestions']);
    assert.strictEqual(settingParams[0].settingDescription, 'Helps you understand and fix console warnings and errors');
    assert.strictEqual(settingParams[1].settingDescription, 'Get help with understanding CSS styles');
    assert.strictEqual(
        settingParams[2].settingDescription, 'Automatically generate titles for performance trace annotations');
    assert.strictEqual(settingParams[3].settingDescription, 'Write code faster with AI-powered suggestions');
  });

  it('has different dislaimers for managed users which have logging disabled', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
    Common.Settings.moduleSetting('ai-annotations-enabled').set(true);
    Common.Settings.moduleSetting('ai-code-completion-enabled').set(true);
    updateHostConfig({
      aidaAvailability: {
        enabled: true,
        blockedByAge: false,
        blockedByEnterprisePolicy: false,
        blockedByGeo: false,
        disallowLogging: true,
        enterprisePolicyValue: 1,
      },
    });

    const {view} = await setupWidget();

    const disclaimers = view.input.sharedDisclaimerBulletPoints;
    const sendDataNoLogging = disclaimers[1].text as LocalizedString;
    assert.strictEqual(
        sendDataNoLogging,
        'Your content will not be used by human reviewers to improve AI. Your organization may change these settings at any time.');
    const dataCollectionNoLogging = disclaimers[2].text as LocalizedString;
    assert.strictEqual(
        dataCollectionNoLogging,
        'Depending on your Google account management and/or region, Google may refrain from data collection');
  });

  it('has explain this resource enabled', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
    mockHostConfigWithExplainThisResourceEnabled();

    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const explainThisResource = settingToParams.next();
    assert.exists(explainThisResource.value);
    assert.isFalse(explainThisResource.value[0].disabled());
    assert.strictEqual(
        explainThisResource.value[1].settingDescription,
        'Get help with understanding CSS styles, and network requests');
  });

  it('can turn feature on, which automatically expands it', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    const {view} = await setupWidget();

    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());
    const setting = view.input.settingToParams.entries().next();
    assert.exists(setting.value);
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.toggleSetting(setting.value[0], new Switch.Switch.SwitchChangeEvent(true));
    assert.isTrue(Common.Settings.moduleSetting('console-insights-enabled').get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('can expand and collapse details via click', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    const {view} = await setupWidget();

    const setting = view.input.settingToParams.entries().next();
    assert.exists(setting.value);
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());

    view.input.expandSetting(setting.value[0]);
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.expandSetting(setting.value[0]);
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('can turn feature off without collapsing it', async () => {
    Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const setting = settingToParams.next();
    assert.exists(setting.value);

    view.input.expandSetting(setting.value[0]);
    assert.isTrue(Common.Settings.moduleSetting('ai-assistance-enabled').get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.toggleSetting(setting.value[0], new MouseEvent('click'));
    assert.isFalse(Common.Settings.moduleSetting('ai-assistance-enabled').get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('disables switches if blocked by age', async () => {
    const underAgeExplainer = 'This feature is only available to users who are 18 years of age or older.';
    updateHostConfig({
      aidaAvailability: {
        blockedByAge: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
      },
      devToolsFreestyler: {
        enabled: true,
      },
    });

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [underAgeExplainer]);
  });

  it('updates when the user logs in', async () => {
    const notLoggedInExplainer = 'This feature is only available when you sign into Chrome with your Google account.';
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL));

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [notLoggedInExplainer]);

    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
    await view.nextInput;

    assert.deepEqual(view.input.disabledReasons, []);
  });

  it('updates disabled reason', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').setRegistration({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      disabledCondition: () => {
        return {disabled: true, reasons: ['some reason' as Platform.UIString.LocalizedString]};
      },
    });
    Common.Settings.moduleSetting('ai-assistance-enabled').setRegistration({
      settingName: 'ai-assistance-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
      disabledCondition: () => {
        return {disabled: true, reasons: ['some reason' as Platform.UIString.LocalizedString]};
      },
    });

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, ['some reason']);
  });

  it('can turn feature off and clear history', async () => {
    Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
    Common.Settings.moduleSetting('ai-assistance-history-entries').set([{}, {}]);
    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const setting = settingToParams.next();
    assert.exists(setting.value);

    view.input.toggleSetting(setting.value[0], new MouseEvent('click'));
    assert.isFalse(Common.Settings.moduleSetting('ai-assistance-enabled').get());
    assert.isTrue(
        deleteAiAssistanceHistoryStub.called, 'Expected AiHistoryStorage deleteAll to be called but it is not called');
  });
});
