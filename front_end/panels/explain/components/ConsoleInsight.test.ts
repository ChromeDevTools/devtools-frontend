// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, getGetHostConfigStub} from '../../../testing/EnvironmentHelpers.js';
import * as Explain from '../explain.js';

describeWithEnvironment('ConsoleInsight', () => {
  afterEach(() => {
    Common.Settings.settingForTest('console-insights-enabled').set(true);
    Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
  });

  function getTestAidaClient() {
    return {
      async *
          fetch() {
            yield {explanation: 'test', metadata: {rpcGlobalId: 0}, completed: true};
          },
      registerClientEvent: sinon.spy(),
    };
  }

  function getTestPromptBuilder() {
    return {
      async buildPrompt() {
        return {
          prompt: '',
          sources: [
            {
              type: Explain.SourceType.MESSAGE,
              value: 'error message',
            },
          ],
          isPageReloadRecommended: true,
        };
      },
      getSearchQuery() {
        return '';
      },
    };
  }

  async function drainMicroTasks() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  it('shows opt-in teaser when setting is disabled', async () => {
    Common.Settings.settingForTest('console-insights-enabled').set(false);
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    assert.isNotNull(component.shadowRoot);
    assert.deepEqual(
        getCleanTextContentFromElements(component.shadowRoot, 'main'),
        [
          'Turn on Console insights in Settings to receive AI assistance for understanding and addressing console warnings and errors. Learn more',
        ],
    );
  });

  it('shows opt-in teaser when setting is disabled via disabledCondition', async () => {
    const setting = Common.Settings.settingForTest('console-insights-enabled');
    setting.setRegistration({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
      disabledCondition: () => {
        return {disabled: true, reason: 'disabled for test'};
      },
    });
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    assert.isNotNull(component.shadowRoot);
    assert.deepEqual(
        getCleanTextContentFromElements(component.shadowRoot, 'main'),
        [
          'Turn on Console insights in Settings to receive AI assistance for understanding and addressing console warnings and errors. Learn more',
        ],
    );

    setting.setRegistration({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
  });

  it('shows reminder on first run of console insights', async () => {
    Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    assert.isNotNull(component.shadowRoot);
    assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Understand console messages with AI');

    dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!, {
      bubbles: true,
      composed: true,
    });
    await drainMicroTasks();
    // Rating buttons are shown.
    assert(component.shadowRoot!.querySelector('.rating'));
  });

  const reportsRating = (positive: boolean) => async () => {
    const stub = getGetHostConfigStub({});
    const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
    const aidaClient = getTestAidaClient();
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), aidaClient, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
      bubbles: true,
      composed: true,
    });

    assert(aidaClient.registerClientEvent.calledOnce);
    sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
      corresponding_aida_rpc_global_id: 0,
      do_conversation_client_event: {
        user_feedback: {sentiment: positive ? 'POSITIVE' : 'NEGATIVE'},
      },
    }));
    assert(actionTaken.calledWith(
        positive ? Host.UserMetrics.Action.InsightRatedPositive : Host.UserMetrics.Action.InsightRatedNegative));

    dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
      bubbles: true,
      composed: true,
    });
    // Can only rate once.
    assert(aidaClient.registerClientEvent.calledOnce);
    stub.restore();
  };

  it('reports positive rating', reportsRating(true));
  it('reports negative rating', reportsRating(false));

  it('has no thumbs up/down buttons if logging is disabled', async () => {
    const stub = getGetHostConfigStub({
      aidaAvailability: {
        disallowLogging: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
      },
    });
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const thumbsUpButton = component.shadowRoot!.querySelector('.rating [data-rating="true"]');
    assert.isNull(thumbsUpButton);
    const thumbsDownButton = component.shadowRoot!.querySelector('.rating [data-rating="false"]');
    assert.isNull(thumbsDownButton);

    stub.restore();
  });

  it('report if the user is not logged in', async () => {
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'This feature is only available when you sign into Chrome with your Google account.');
  });

  it('report if the navigator is offline', async () => {
    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.NO_INTERNET);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'Check your internet connection and try again.');
  });
});
