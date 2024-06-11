// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Root from '../../../core/root/root.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Explain from '../explain.js';

describeWithEnvironment('ConsoleInsight', () => {
  function getTestAidaClient() {
    return {
      async *
          fetch() {
            yield {explanation: 'test', metadata: {}};
          },
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

  describe('consent onboarding', () => {
    afterEach(() => {
      Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    });

    it('should show privacy notice first', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Privacy notice');
    });

    it('should show legal notice second', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.next-button')!);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Legal notice');
    });

    it('should not confirm legal notice without checkbox', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.next-button')!);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.continue-button')!);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Legal notice');
    });

    it('should confirm legal notice if checkbox is pressed', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
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
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      dispatchClickEvent(component.shadowRoot!.querySelector('.cancel-button')!);
      await drainMicroTasks();
      assert(component.getAttribute('class')?.includes('closing'));
    });

    it('can disable the feature', async () => {
      Common.Settings.settingForTest('console-insights-enabled').set(true);
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
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
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      assert.strictEqual(component.shadowRoot!.querySelector('h2')?.innerText, 'Data used to understand this message');
      // Continue button is present.
      assert(component.shadowRoot!.querySelector('.continue-button'));
    });

    it('consent reminder can be accepted', async () => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
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

    const renderInsight = async(): Promise<Explain.ConsoleInsight> => {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: true,
        accountEmail: 'some-email',
      });
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
      const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
      const registerAidaClientEvent =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'registerAidaClientEvent');

      const component = await renderInsight();
      dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
        bubbles: true,
        composed: true,
      });

      assert(registerAidaClientEvent.calledOnce);
      assert.include(registerAidaClientEvent.firstCall.firstArg, positive ? 'POSITIVE' : 'NEGATIVE');
      assert(actionTaken.calledWith(
          positive ? Host.UserMetrics.Action.InsightRatedPositive : Host.UserMetrics.Action.InsightRatedNegative));

      dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
        bubbles: true,
        composed: true,
      });
      // Can only rate once.
      assert(registerAidaClientEvent.calledOnce);
      assert.include(registerAidaClientEvent.firstCall.firstArg, positive ? 'POSITIVE' : 'NEGATIVE');
    };

    it('reports positive rating', reportsRating(true));
    it('reports negative rating', reportsRating(false));

    it('has no thumbs up/down buttons if logging is disabled', async () => {
      const settings = Common.Settings.Settings.instance();
      const stub = sinon.stub(settings, 'getHostConfig').returns({
        devToolsConsoleInsights: {
          enabled: true,
          disallowLogging: true,
        } as Root.Runtime.HostConfigConsoleInsights,
        devToolsConsoleInsightsDogfood: {
          enabled: false,
        } as Root.Runtime.HostConfigConsoleInsightsDogfood,
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
    const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
      isSyncActive: false,
    });
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'This feature is only available when you sign into Chrome with your Google account.');
  });

  it('report if the sync is not enabled', async () => {
    const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
      isSyncActive: false,
      accountEmail: 'some-email',
    });
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'This feature requires you to turn on Chrome sync.');
  });

  it('report if the navigator is offline', async () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')!;
    Object.defineProperty(globalThis, 'navigator', {
      get() {
        return {onLine: false};
      },
    });

    try {
      const component = new Explain.ConsoleInsight(getTestPromptBuilder(), getTestAidaClient(), {
        isSyncActive: false,
        accountEmail: 'some-email',
      });
      renderElementIntoDOM(component);
      await drainMicroTasks();
      const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
      assert.strictEqual(content, 'Check your internet connection and try again.');
    } finally {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    }
  });
});
