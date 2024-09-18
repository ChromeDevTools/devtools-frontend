// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, getGetHostConfigStub} from '../../../testing/EnvironmentHelpers.js';
import * as Explain from '../explain.js';

describeWithEnvironment('ConsoleInsight', () => {
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

  function skipConsentOnboarding() {
    beforeEach(() => {
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
    });

    afterEach(() => {
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    });
  }

  describe('new consent onboarding', () => {
    before(() => {
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL);
    });

    after(() => {
      Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL);
      Common.Settings.settingForTest('console-insights-enabled').set(false);
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    });

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
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
      const setting = Common.Settings.settingForTest('console-insights-enabled');
      setting.set(true);
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
      Common.Settings.settingForTest('console-insights-enabled').set(true);
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.isNotNull(component.shadowRoot);
      assert.strictEqual(
          component.shadowRoot!.querySelector('h2')?.innerText, 'Understand console messages with Chrome AI');

      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!, {
        bubbles: true,
        composed: true,
      });
      await drainMicroTasks();
      // Rating buttons are shown.
      assert(component.shadowRoot!.querySelector('.rating'));
    });

    it('immediately renders insight on subsequent runs', async () => {
      Common.Settings.settingForTest('console-insights-enabled').set(true);
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.isNotNull(component.shadowRoot);
      // Rating buttons are shown.
      assert(component.shadowRoot!.querySelector('.rating'));
    });
  });

  describe('consent onboarding', () => {
    afterEach(() => {
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    });

    it('should show privacy notice first', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Privacy notice');
    });

    it('should show legal notice second', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.next-button')!);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Legal notice');
    });

    it('should not confirm legal notice without checkbox', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.next-button')!);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Legal notice');
    });

    it('should confirm legal notice if checkbox is pressed', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.next-button')!);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('input')!);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Data used to understand this message');
      await drainMicroTasks();
      assert.strictEqual(Common.Settings.settingForTest('console-insights-onboarding-finished').get(), true);
    });

    it('can cancel the onboarding flow', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.cancel-button')!);
      await drainMicroTasks();
      assert(component.getAttribute('class')?.includes('closing'));
    });

    it('can disable the feature', async () => {
      Common.Settings.settingForTest('console-insights-enabled').set(true);
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.disable-button')!);
      await drainMicroTasks();
      assert.strictEqual(Common.Settings.settingForTest('console-insights-enabled').get(), false);
    });
  });

  describe('with consent onboarding finished', () => {
    skipConsentOnboarding();

    it('shows the consent reminder flow for signed-in users', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Data used to understand this message');
      // Continue button is present.
      assert(component.shadowRoot!.querySelector('.continue-button'));
    });

    it('consent reminder can be accepted', async () => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!, {
        bubbles: true,
        composed: true,
      });
      // Expected to be rendered in the next task.
      await new Promise(resolve => setTimeout(resolve, 0));
      // Rating buttons are shown.
      assert(component.shadowRoot!.querySelector('.rating'));
    });

    const renderInsight = async(aidaClient = getTestAidaClient()): Promise<Explain.ConsoleInsight> => {
      const component = new Explain.ConsoleInsight(
          getTestPromptBuilder(), aidaClient, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!, {
        bubbles: true,
        composed: true,
      });
      // Expected to be rendered in the next task.
      await new Promise(resolve => setTimeout(resolve, 0));
      return component;
    };

    const reportsRating = (positive: boolean) => async () => {
      const stub = getGetHostConfigStub({});
      const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
      const aidaClient = getTestAidaClient();
      const component = await renderInsight(aidaClient);
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
      const component = await renderInsight();
      const thumbsUpButton = component.shadowRoot!.querySelector('.rating [data-rating="true"]');
      assert.isNull(thumbsUpButton);
      const thumbsDownButton = component.shadowRoot!.querySelector('.rating [data-rating="false"]');
      assert.isNull(thumbsDownButton);

      stub.restore();
    });
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
