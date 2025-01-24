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
  let component: Explain.ConsoleInsight|undefined;

  afterEach(() => {
    component?.remove();
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

  it('shows opt-in teaser when setting is turned off', async () => {
    Common.Settings.settingForTest('console-insights-enabled').set(false);
    component = new Explain.ConsoleInsight(
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

  it('shows opt-in teaser when blocked by age', async () => {
    const stub = getGetHostConfigStub({
      aidaAvailability: {
        blockedByAge: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
      },
    });
    component = new Explain.ConsoleInsight(
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
    stub.restore();
  });

  it('generates an explanation when the user logs in', async () => {
    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    assert.isNotNull(component.shadowRoot);
    assert.deepEqual(
        getCleanTextContentFromElements(component.shadowRoot, 'main'),
        [
          'This feature is only available when you sign into Chrome with your Google account.',
        ],
    );

    const stub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
                     .returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
    await drainMicroTasks();
    assert.deepEqual(getCleanTextContentFromElements(component.shadowRoot, 'h2'), ['Explanation']);
    stub.restore();
  });

  it('shows opt-in teaser when setting is disabled via disabledCondition', async () => {
    const setting = Common.Settings.settingForTest('console-insights-enabled');
    setting.setRegistration({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
      disabledCondition: () => {
        return {disabled: true, reasons: ['disabled for test']};
      },
    });
    component = new Explain.ConsoleInsight(
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
    component = new Explain.ConsoleInsight(
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

  it('shows an error message on timeout', async () => {
    function getAidaClientWithTimeout() {
      return {
        async *
            fetch() {
              yield {
                explanation: 'test',
                metadata: {
                  rpcGlobalId: 0,
                },
                completed: true,
              };
              throw new Error('doAidaConversation timed out');
            },
        registerClientEvent: sinon.spy(),
      };
    }

    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getAidaClientWithTimeout(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    assert.isNotNull(component.shadowRoot);
    assert.strictEqual(
        component.shadowRoot.querySelector('.error-message')?.textContent,
        'Generating a response took too long. Please try again.');
  });

  const reportsRating = (positive: boolean) => async () => {
    const stub = getGetHostConfigStub({});
    const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
    const aidaClient = getTestAidaClient();
    component = new Explain.ConsoleInsight(
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
    component = new Explain.ConsoleInsight(
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
    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'This feature is only available when you sign into Chrome with your Google account.');
  });

  it('report if the navigator is offline', async () => {
    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.NO_INTERNET);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const content = component.shadowRoot!.querySelector('main')!.innerText.trim();
    assert.strictEqual(content, 'Check your internet connection and try again.');
  });

  it('displays factuality metadata as related content', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            fetch() {
              yield {
                explanation: 'test',
                metadata: {
                  rpcGlobalId: 0,
                  factualityMetadata: {
                    facts: [
                      {sourceUri: 'https://www.firstSource.test/someInfo'},
                      {sourceUri: 'https://www.anotherSource.test/page'},
                    ],
                  },
                },
                completed: true,
              };
            },
        registerClientEvent: sinon.spy(),
      };
    }

    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();
    const details = component.shadowRoot!.querySelector('details');
    assert.strictEqual(details!.querySelector('summary')!.textContent?.trim(), 'Sources and related content');
    const xLinks = details!.querySelectorAll('x-link');
    assert.strictEqual(xLinks[0].textContent?.trim(), 'https://www.firstSource.test/someInfo');
    assert.strictEqual(xLinks[0].getAttribute('href'), 'https://www.firstSource.test/someInfo');
    assert.strictEqual(xLinks[1].textContent?.trim(), 'https://www.anotherSource.test/page');
    assert.strictEqual(xLinks[1].getAttribute('href'), 'https://www.anotherSource.test/page');
  });

  it('displays direct citations', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            fetch() {
              yield {
                explanation: 'This is not a real answer, it is just a test.',
                metadata: {
                  rpcGlobalId: 0,
                  attributionMetadata: {
                    attributionAction: Host.AidaClient.RecitationAction.CITE,
                    citations: [
                      {
                        startIndex: 0,
                        endIndex: 10,
                        uri: 'https://www.wiki.test/directSource',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                      {
                        startIndex: 20,
                        endIndex: 25,
                        uri: 'https://www.world-fact.test/',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                    ],
                  },
                  factualityMetadata: {
                    facts: [
                      {sourceUri: 'https://www.firstSource.test/someInfo'},
                    ],
                  },
                },
                completed: true,
              };
            },
        registerClientEvent: sinon.spy(),
      };
    }

    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();

    const markdownView = component.shadowRoot!.querySelector('devtools-markdown-view');
    assert.strictEqual(
        getCleanTextContentFromElements(markdownView!.shadowRoot!, '.message')[0],
        'This is not[1] a real answer[2], it is just a test.');
    const details = component.shadowRoot!.querySelector('details');
    assert.strictEqual(details!.querySelector('summary')!.textContent?.trim(), 'Sources and related content');
    const directCitations = details!.querySelectorAll('ol x-link');
    assert.lengthOf(directCitations, 2);
    assert.strictEqual(directCitations[0].textContent?.trim(), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[0].getAttribute('href'), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[1].textContent?.trim(), 'https://www.world-fact.test/');
    assert.strictEqual(directCitations[1].getAttribute('href'), 'https://www.world-fact.test/');
    const relatedContent = details!.querySelectorAll('ul x-link');
    assert.lengthOf(relatedContent, 1);
    assert.strictEqual(relatedContent[0].textContent?.trim(), 'https://www.firstSource.test/someInfo');
    assert.strictEqual(relatedContent[0].getAttribute('href'), 'https://www.firstSource.test/someInfo');

    assert.isFalse(details?.hasAttribute('open'));
    assert.isFalse(directCitations[0].classList.contains('highlighted'));
    const link = markdownView!.shadowRoot?.querySelector('sup x-link') as HTMLElement;
    link.click();
    assert.isTrue(details?.hasAttribute('open'));
    assert.isTrue(directCitations[0].classList.contains('highlighted'));
  });

  it('displays training data citations', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            fetch() {
              yield {
                explanation: 'This is not a real answer, it is just a test.',
                metadata: {
                  rpcGlobalId: 0,
                  attributionMetadata: {
                    attributionAction: Host.AidaClient.RecitationAction.CITE,
                    citations: [
                      {
                        startIndex: 5,
                        endIndex: 9,
                        uri: 'https://www.training.test/',
                        sourceType: Host.AidaClient.CitationSourceType.TRAINING_DATA,
                      },
                      {
                        startIndex: 15,
                        endIndex: 22,
                        repository: 'chromedevtools/devtools-frontend',
                        sourceType: Host.AidaClient.CitationSourceType.TRAINING_DATA,
                      },
                    ],
                  },
                  factualityMetadata: {
                    facts: [
                      {sourceUri: 'https://www.firstSource.test/someInfo'},
                    ],
                  },
                },
                completed: true,
              };
            },
        registerClientEvent: sinon.spy(),
      };
    }

    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();

    const details = component.shadowRoot!.querySelector('details');
    assert.strictEqual(details!.querySelector('summary')!.textContent?.trim(), 'Sources and related content');
    const xLinks = details!.querySelectorAll('x-link');
    assert.lengthOf(xLinks, 3);
    assert.strictEqual(xLinks[0].textContent?.trim(), 'https://www.firstSource.test/someInfo');
    assert.strictEqual(xLinks[0].getAttribute('href'), 'https://www.firstSource.test/someInfo');
    assert.strictEqual(xLinks[1].textContent?.trim(), 'https://www.training.test/');
    assert.strictEqual(xLinks[1].getAttribute('href'), 'https://www.training.test/');
    assert.strictEqual(xLinks[2].textContent?.trim(), 'https://www.github.com/chromedevtools/devtools-frontend');
    assert.strictEqual(xLinks[2].getAttribute('href'), 'https://www.github.com/chromedevtools/devtools-frontend');
  });

  it('deduplicates citation URLs', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            fetch() {
              yield {
                explanation: 'This is not a real answer, it is just a test.',
                metadata: {
                  rpcGlobalId: 0,
                  attributionMetadata: {
                    attributionAction: Host.AidaClient.RecitationAction.CITE,
                    citations: [
                      {
                        startIndex: 5,
                        endIndex: 9,
                        uri: 'https://www.training-and-factuality.test/',
                        sourceType: Host.AidaClient.CitationSourceType.TRAINING_DATA,
                      },
                      {
                        startIndex: 10,
                        endIndex: 12,
                        uri: 'https://www.all-three.test/',
                        sourceType: Host.AidaClient.CitationSourceType.TRAINING_DATA,
                      },
                      {
                        startIndex: 20,
                        endIndex: 25,
                        uri: 'https://www.world-fact-and-factuality.test/',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                      {
                        startIndex: 26,
                        endIndex: 30,
                        uri: 'https://www.all-three.test/',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                    ],
                  },
                  factualityMetadata: {
                    facts: [
                      {sourceUri: 'https://www.training-and-factuality.test/'},
                      {sourceUri: 'https://www.world-fact-and-factuality.test/'},
                      {sourceUri: 'https://www.factuality.test/'},
                      {sourceUri: 'https://www.all-three.test/'},
                    ],
                  },
                },
                completed: true,
              };
            },
        registerClientEvent: sinon.spy(),
      };
    }

    component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    renderElementIntoDOM(component);
    await drainMicroTasks();

    const details = component.shadowRoot!.querySelector('details');
    assert.strictEqual(details!.querySelector('summary')!.textContent?.trim(), 'Sources and related content');
    const xLinks = details!.querySelectorAll('x-link');
    assert.lengthOf(xLinks, 4);
    assert.strictEqual(xLinks[0].textContent?.trim(), 'https://www.world-fact-and-factuality.test/');
    assert.strictEqual(xLinks[0].getAttribute('href'), 'https://www.world-fact-and-factuality.test/');
    assert.strictEqual(xLinks[1].textContent?.trim(), 'https://www.all-three.test/');
    assert.strictEqual(xLinks[1].getAttribute('href'), 'https://www.all-three.test/');
    assert.strictEqual(xLinks[2].textContent?.trim(), 'https://www.training-and-factuality.test/');
    assert.strictEqual(xLinks[2].getAttribute('href'), 'https://www.training-and-factuality.test/');
    assert.strictEqual(xLinks[3].textContent?.trim(), 'https://www.factuality.test/');
    assert.strictEqual(xLinks[3].getAttribute('href'), 'https://www.factuality.test/');
  });
});
