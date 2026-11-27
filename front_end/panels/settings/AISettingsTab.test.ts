// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import {getVeHash} from '../../testing/VisualLoggingHelpers.js';
import * as Switch from '../../ui/components/switch/switch.js';

import * as Settings from './settings.js';

type LocalizedString = Platform.UIString.LocalizedString;

describeWithEnvironment('AISettingsTab', () => {
  let deleteAiAssistanceHistoryStub:
      sinon.SinonStub<Parameters<typeof AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.prototype.deleteAll>>;
  let aidaAccessStub: sinon.SinonStub<[], Promise<Host.AidaClient.AidaAccessPreconditions>>;

  beforeEach(async () => {
    deleteAiAssistanceHistoryStub =
        sinon.stub(AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.prototype, 'deleteAll');
    AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance({forceNew: true});
    updateHostConfig({
      aidaAvailability: {
        enabled: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
      },
      devToolsFreestyler: {
        enabled: true,
      },
      devToolsAiGeneratedTimelineLabels: {
        enabled: true,
      },
      devToolsAiCodeCompletion: {
        enabled: true,
      },
    });
    aidaAccessStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
  });

  function mockHostConfigWithExplainThisResourceEnabled() {
    updateHostConfig({
      devToolsAiAssistanceNetworkAgent: {
        enabled: true,
        modelId: 'test',
      },
    });
  }

  function resolveConditionalSetting<R>(descriptor: Common.Settings.ConditionalSettingDescriptor<boolean, R>):
      Common.Settings.Setting<boolean> {
    const res = Common.Settings.Settings.instance().maybeResolve(descriptor);
    if (!('setting' in res)) {
      assert.fail('Expected setting to be available');
    }
    return res.setting;
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
    resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).set(true);
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);
    Common.Settings.Settings.instance().createSetting('ai-annotations-enabled', false).set(true);
    Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false).set(true);

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
    assert.strictEqual(settingParams[1].settingDescription, 'Get context-aware help on the inspected page');
    assert.strictEqual(settingParams[2].settingDescription,
                       'Automatically generate titles for performance trace annotations');
    assert.strictEqual(settingParams[3].settingDescription, 'Write code faster with AI-powered suggestions');
  });

  it('has different dislaimers for managed users which have logging disabled', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).set(true);
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);
    Common.Settings.Settings.instance().createSetting('ai-annotations-enabled', false).set(true);
    Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false).set(true);
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
        'Your content won’t be used by human reviewers to improve AI. Your organization may change these settings at any time.');
    const dataCollectionNoLogging = disclaimers[2].text as LocalizedString;
    assert.strictEqual(
        dataCollectionNoLogging,
        'Depending on your Google account management and/or region, Google may refrain from data collection');
  });

  it('has explain this resource enabled', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).set(true);
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);
    mockHostConfigWithExplainThisResourceEnabled();

    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const explainThisResource = settingToParams.next();
    assert.exists(explainThisResource.value);
    assert.isFalse(explainThisResource.value[1].setting instanceof AiAssistanceModel.AiSetting.AiSetting &&
                   explainThisResource.value[1].setting.disabled);
    assert.strictEqual(explainThisResource.value[1].settingDescription, 'Get context-aware help on the inspected page');
  });

  it('can turn feature on, which automatically expands it', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).set(false);
    const {view} = await setupWidget();

    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).get());
    const setting = view.input.settingToParams.entries().next();
    assert.exists(setting.value);
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.toggleSetting(setting.value[0], new Switch.Switch.SwitchChangeEvent(true));
    assert.isTrue(resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('can expand and collapse details via click', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).set(false);
    const {view} = await setupWidget();

    const setting = view.input.settingToParams.entries().next();
    assert.exists(setting.value);
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);
    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).get());

    view.input.expandSetting(setting.value[0]);
    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.expandSetting(setting.value[0]);
    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor).get());
    assert.isFalse(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('can turn feature off without collapsing it', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);
    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const setting = settingToParams.next();
    assert.exists(setting.value);

    view.input.expandSetting(setting.value[0]);
    assert.isTrue(resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);

    view.input.toggleSetting(setting.value[0], new MouseEvent('click'));
    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).get());
    assert.isTrue(setting.value[1].settingExpandState.isSettingExpanded);
  });

  it('disables switches if blocked by age', async () => {
    const underAgeExplainer = 'This feature is only available to users 18 years or older';
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
    const notLoggedInExplainer = 'This feature is only available when you sign in to Chrome with your Google account';
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL));

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [notLoggedInExplainer]);

    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    await view.nextInput;

    assert.deepEqual(view.input.disabledReasons, []);
  });

  it('disables switches if off the record (incognito)', async () => {
    const incognitoExplainer = 'AI assistance isn’t available in Incognito mode or Guest mode';
    updateHostConfig({
      isOffTheRecord: true,
    });

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [incognitoExplainer]);
  });

  it('disables switches if offline', async () => {
    const offlineExplainer = 'This feature is only available with an active internet connection';
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.NO_INTERNET));

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [offlineExplainer]);
  });

  it('disables switches if sync is paused', async () => {
    const notLoggedInExplainer = 'This feature is only available when you sign in to Chrome with your Google account';
    aidaAccessStub.returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED));

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [notLoggedInExplainer]);
  });

  it('updates disabled reason', async () => {
    sinon.stub(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor, 'isAvailable').returns({
      status: Common.Settings.SettingAvailability.DISABLED,
      reason: [AiAssistanceModel.AiUtils.DisabledReason.WRONG_LOCALE],
    });

    const {view} = await setupWidget();

    assert.deepEqual(view.input.disabledReasons, [
      'To use this feature, set your language preference to English in DevTools settings' as
          Platform.UIString.LocalizedString,
    ]);
  });

  it('can turn feature off and clear history', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);
    Common.Settings.Settings.instance().createSetting<unknown[]>('ai-assistance-history-entries', []).set([{}, {}]);
    const {view} = await setupWidget();

    const settingToParams = view.input.settingToParams.entries();
    settingToParams.next();
    const setting = settingToParams.next();
    assert.exists(setting.value);

    view.input.toggleSetting(setting.value[0], new MouseEvent('click'));
    assert.isFalse(resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).get());
    assert.isTrue(deleteAiAssistanceHistoryStub.called,
                  'Expected AiHistoryStorage deleteAll to be called but it is not called');
  });

  it('shows AI assistance setting strings', async () => {
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);

    const {view} = await setupWidget();

    const settingToParams = Array.from(view.input.settingToParams.values());
    const aiAssistanceParams = settingToParams.find(p => p.settingName === 'AI assistance');
    assert.exists(aiAssistanceParams);
    assert.strictEqual(aiAssistanceParams.settingDescription, 'Get context-aware help on the inspected page');
    assert.strictEqual(
        aiAssistanceParams.settingItems[0].text,
        'Debug styling, network, performance, source code, accessibility and storage issues with DevTools AI assistance');
    assert.strictEqual(aiAssistanceParams.settingItems[1].text,
                       'Follow the agent’s reasoning step-by-step and quickly jump to the relevant source data');
    assert.strictEqual(
        aiAssistanceParams.toConsiderSettingItems[0].text,
        'To generate explanations, chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.');
  });

  it('shows AI assistance setting strings when logging is disabled', async () => {
    updateHostConfig({
      aidaAvailability: {
        enabled: true,
        enterprisePolicyValue: 1,  // ALLOW_WITHOUT_LOGGING
      },
    });
    resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor).set(true);

    const {view} = await setupWidget();

    const settingToParams = Array.from(view.input.settingToParams.values());
    const aiAssistanceParams = settingToParams.find(p => p.settingName === 'AI assistance');
    assert.exists(aiAssistanceParams);
    assert.strictEqual(
        aiAssistanceParams.toConsiderSettingItems[0].text,
        'To generate explanations, chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google. The content you submit and that is generated by this feature won’t be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.');
  });

  it('marks the V2 opt-in dialog as seen when turning on AI assistance', async () => {
    const aiAssistanceEnabledSetting =
        resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor);
    aiAssistanceEnabledSetting.set(false);
    const v2OptInSeenSetting = Common.Settings.Settings.instance().resolve(
        AiAssistanceModel.AiUtils.aiAssistanceV2OptInChangeDialogSeenSettingDescriptor);
    v2OptInSeenSetting.set(false);

    const {view} = await setupWidget();

    const settingToParams = Array.from(view.input.settingToParams.entries());
    const aiAssistanceEntry = settingToParams.find(entry => entry[1].settingName === 'AI assistance');
    assert.exists(aiAssistanceEntry);

    view.input.toggleSetting(aiAssistanceEntry[0], new Switch.Switch.SwitchChangeEvent(true));

    assert.isTrue(aiAssistanceEnabledSetting.get());
    assert.isTrue(v2OptInSeenSetting.get());
  });

  it('registers setting entries with string settingName keys', async () => {
    const {view} = await setupWidget();

    const settingNames = Array.from(view.input.settingToParams.keys());
    assert.include(settingNames, 'console-insights-enabled');
    assert.include(settingNames, 'ai-assistance-enabled');
  });

  describe('AI assistance opt-in and opt-out metrics', () => {
    let recordEnumeratedHistogramSpy: sinon.SinonSpy<
        Parameters<typeof Host.InspectorFrontendHost.InspectorFrontendHostInstance.recordEnumeratedHistogram>>;

    beforeEach(() => {
      recordEnumeratedHistogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
    });

    it('records AiAssistance.OptIn.SETTINGS when AI assistance is enabled from false', async () => {
      const aiAssistanceEnabledSetting =
          resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor);
      assert.isFalse(aiAssistanceEnabledSetting.get());
      const {view} = await setupWidget();

      view.input.toggleSetting('ai-assistance-enabled', new Switch.Switch.SwitchChangeEvent(true));

      assert.isTrue(aiAssistanceEnabledSetting.get());
      assert.strictEqual(Host.UserMetrics.AiAssistanceOptIn.SETTINGS, 0);
      assert.isAbove(Host.UserMetrics.AiAssistanceOptIn.MAX_VALUE, Host.UserMetrics.AiAssistanceOptIn.SETTINGS);
      sinon.assert.calledOnceWithExactly(
          recordEnumeratedHistogramSpy,
          Host.InspectorFrontendHostAPI.EnumeratedHistogram.AiAssistanceOptIn,
          Host.UserMetrics.AiAssistanceOptIn.SETTINGS,
          Host.UserMetrics.AiAssistanceOptIn.MAX_VALUE,
      );
    });

    it('records Action.AiAssistanceOptedOut when AI assistance is disabled from true', async () => {
      const aiAssistanceEnabledSetting =
          resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor);
      aiAssistanceEnabledSetting.set(true);
      const {view} = await setupWidget();

      view.input.toggleSetting('ai-assistance-enabled', new Switch.Switch.SwitchChangeEvent(false));

      assert.isFalse(aiAssistanceEnabledSetting.get());
      assert.strictEqual(Host.UserMetrics.Action.AiAssistanceOptedOut, 210);
      assert.isAbove(Host.UserMetrics.Action.MAX_VALUE, Host.UserMetrics.Action.AiAssistanceOptedOut);
      sinon.assert.calledOnceWithExactly(
          recordEnumeratedHistogramSpy,
          Host.InspectorFrontendHostAPI.EnumeratedHistogram.ActionTaken,
          Host.UserMetrics.Action.AiAssistanceOptedOut,
          Host.UserMetrics.Action.MAX_VALUE,
      );
    });

    it('does not record AI assistance opt-in or opt-out when the setting is disabled', async () => {
      const aiAssistanceEnabledSetting =
          resolveConditionalSetting(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor);
      sinon.stub(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor, 'isAvailable').returns({
        status: Common.Settings.SettingAvailability.DISABLED,
        reason: [AiAssistanceModel.AiUtils.DisabledReason.WRONG_LOCALE],
      });
      const {view} = await setupWidget();

      view.input.toggleSetting('ai-assistance-enabled', new MouseEvent('click'));

      assert.isFalse(aiAssistanceEnabledSetting.get());
      sinon.assert.notCalled(recordEnumeratedHistogramSpy);
    });

    it('does not record AI assistance opt-in or opt-out when toggling another AI setting', async () => {
      const consoleInsightsEnabledSetting =
          resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor);
      const {view} = await setupWidget();

      view.input.toggleSetting('console-insights-enabled', new Switch.Switch.SwitchChangeEvent(true));
      assert.isTrue(consoleInsightsEnabledSetting.get());
      view.input.toggleSetting('console-insights-enabled', new Switch.Switch.SwitchChangeEvent(false));
      assert.isFalse(consoleInsightsEnabledSetting.get());

      sinon.assert.notCalled(recordEnumeratedHistogramSpy);
    });
  });

  describe('allowed tools', () => {
    const {ToolName} = AiAssistanceModel.Tool;

    function createAlwaysAllowedTools(): AiAssistanceModel.AlwaysAllowedTools.AlwaysAllowedTools {
      return new AiAssistanceModel.AlwaysAllowedTools.AlwaysAllowedTools(Common.Settings.Settings.instance());
    }

    function renderView(allowedTools: Settings.AISettingsTab.AllowedTool[]): void {
      const target = document.createElement('div');
      target.style.width = '600px';
      target.style.height = '400px';
      target.style.position = 'relative';
      renderElementIntoDOM(target, {includeCommonStyles: true});

      Settings.AISettingsTab.AI_SETTINGS_TAB_DEFAULT_VIEW({
        disabledReasons: [],
        sharedDisclaimerBulletPoints: [],
        settingToParams: new Map(),
        isNaturalLanguageInterfaceEnabled: true,
        allowedTools,
        expandSetting: () => {},
        toggleSetting: () => {},
        removeAllowedTool: () => {},
      },
                                                          {}, target);
    }

    beforeEach(() => {
      updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: true}});
    });

    it('is hidden when the natural language interface is disabled', async () => {
      updateHostConfig({devToolsAiNaturalLanguageInterface: {enabled: false}});
      Common.Settings.Settings.instance()
          .resolve(AiAssistanceModel.AlwaysAllowedTools.alwaysAllowedToolsSettingDescriptor)
          .set([ToolName.GET_COOKIE_VALUES]);

      const {view} = await setupWidget();

      assert.isFalse(view.input.isNaturalLanguageInterfaceEnabled);
    });

    it('is shown when the natural language interface is enabled', async () => {
      const {view} = await setupWidget();

      assert.isTrue(view.input.isNaturalLanguageInterfaceEnabled);
    });

    it('is empty when no tool is allowed', async () => {
      const {view} = await setupWidget();

      assert.deepEqual(view.input.allowedTools, []);
    });

    it('lists allowed tools sorted by display name', async () => {
      const alwaysAllowedTools = createAlwaysAllowedTools();
      alwaysAllowedTools.allow(ToolName.GET_STORAGE_VALUES);
      alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);

      const {view} = await setupWidget();

      assert.deepEqual(view.input.allowedTools, [
        {toolName: ToolName.GET_COOKIE_VALUES, displayName: 'Read cookie values'},
        {toolName: ToolName.GET_STORAGE_VALUES, displayName: 'Read storage values'},
      ]);
    });

    it('removes a tool and logs ai-permission-revoked with the tool name', async () => {
      const recordFunctionCallStub = sinon.stub(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance,
          'recordFunctionCall',
      );
      const expectedRevoked = await getVeHash('ai-permission-revoked');
      const expectedGetCookieValuesTool = await getVeHash('get-cookie-values');

      const alwaysAllowedTools = createAlwaysAllowedTools();
      alwaysAllowedTools.allow(ToolName.GET_COOKIE_VALUES);
      alwaysAllowedTools.allow(ToolName.GET_STORAGE_VALUES);
      const {view} = await setupWidget();

      view.input.removeAllowedTool(ToolName.GET_COOKIE_VALUES);
      const input = await view.nextInput;

      assert.deepEqual(input.allowedTools,
                       [{toolName: ToolName.GET_STORAGE_VALUES, displayName: 'Read storage values'}]);
      assert.isFalse(alwaysAllowedTools.isAllowed(ToolName.GET_COOKIE_VALUES));
      assert.isTrue(alwaysAllowedTools.isAllowed(ToolName.GET_STORAGE_VALUES));
      await expectCalled(recordFunctionCallStub);
      sinon.assert.calledOnceWithExactly(recordFunctionCallStub, {
        name: expectedRevoked,
        context: expectedGetCookieValuesTool,
      });
    });

    it('re-renders when a tool is allowed elsewhere', async () => {
      const {view} = await setupWidget();
      assert.deepEqual(view.input.allowedTools, []);

      createAlwaysAllowedTools().allow(ToolName.GET_COOKIE_VALUES);
      const input = await view.nextInput;

      assert.deepEqual(input.allowedTools, [{toolName: ToolName.GET_COOKIE_VALUES, displayName: 'Read cookie values'}]);
    });

    it('renders the allowed tools card', async () => {
      renderView([
        {toolName: ToolName.GET_COOKIE_VALUES, displayName: 'Read cookie values'},
        {toolName: ToolName.GET_STORAGE_VALUES, displayName: 'Read storage values'},
        {toolName: ToolName.EXECUTE_JAVASCRIPT, displayName: 'Run JavaScript on the page'},
      ]);

      await assertScreenshot('settings/ai_settings_allowed_tools.png');
    });

    it('renders the empty allowed tools card', async () => {
      renderView([]);

      await assertScreenshot('settings/ai_settings_allowed_tools_empty.png');
    });

    describe('highlightObject', () => {
      async function showWidget(): Promise<{
        widget: Settings.AISettingsTab.AISettingsTab,
        highlightAllowedTools: sinon.SinonStub,
      }> {
        const highlightAllowedTools = sinon.stub();
        const view = createViewFunctionStub(Settings.AISettingsTab.AISettingsTab, {highlightAllowedTools});
        const widget = new Settings.AISettingsTab.AISettingsTab(view);
        const container = document.createElement('div');
        renderElementIntoDOM(container);
        widget.markAsRoot();
        widget.show(container);
        await view.nextInput;
        return {widget, highlightAllowedTools};
      }

      it('highlights the allowed tools section for the always allowed tools setting', async () => {
        const {widget, highlightAllowedTools} = await showWidget();
        const setting = Common.Settings.Settings.instance().resolve(
            AiAssistanceModel.AlwaysAllowedTools.alwaysAllowedToolsSettingDescriptor);

        widget.highlightObject(setting);
        await widget.updateComplete;

        sinon.assert.calledOnce(highlightAllowedTools);
      });

      it('ignores other settings', async () => {
        const {widget, highlightAllowedTools} = await showWidget();

        widget.highlightObject(
            resolveConditionalSetting(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor));
        await widget.updateComplete;

        sinon.assert.notCalled(highlightAllowedTools);
      });
    });
  });
});
