// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import {
  assertScreenshot,
  dispatchClickEvent,
  getCleanTextContentFromElements,
  raf,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as Explain from '../explain.js';

describeWithEnvironment('ConsoleInsight', () => {
  let component: Explain.ConsoleInsight|undefined;

  const containerCss = `
      box-sizing: border-box;
      background-color: aqua;
    `;

  beforeEach(() => {
    sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').callsFake(async () => {});
  });

  afterEach(() => {
    component?.remove();
    Common.Settings.settingForTest('console-insights-enabled').set(true);
    Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
  });

  function getTestAidaClient() {
    return {
      async *
          doConversation() {
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
    updateHostConfig({
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
        return {disabled: true, reasons: ['disabled for test' as Platform.UIString.LocalizedString]};
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
    assert.strictEqual(component.shadowRoot.querySelector('h2')?.innerText, 'Understand console messages with AI');

    dispatchClickEvent(component.shadowRoot.querySelector('.continue-button')!, {
      bubbles: true,
      composed: true,
    });
    await drainMicroTasks();
    // Rating buttons are shown.
    assert(component.shadowRoot.querySelector('.rating'));
  });

  it('shows an error message on timeout', async () => {
    function getAidaClientWithTimeout() {
      return {
        async *
            doConversation() {
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

  const reportsRating = (positive: boolean, disallowLogging: boolean) => async () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging,
      },
    });
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

    sinon.assert.calledOnce(aidaClient.registerClientEvent);
    sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
      corresponding_aida_rpc_global_id: 0,
      disable_user_content_logging: disallowLogging,
      do_conversation_client_event: {
        user_feedback: {sentiment: positive ? 'POSITIVE' : 'NEGATIVE'},
      },
    }));
    sinon.assert.calledWith(
        actionTaken,
        positive ? Host.UserMetrics.Action.InsightRatedPositive : Host.UserMetrics.Action.InsightRatedNegative);

    dispatchClickEvent(component.shadowRoot!.querySelector(`.rating [data-rating=${positive}]`)!, {
      bubbles: true,
      composed: true,
    });
    // Can only rate once.
    sinon.assert.calledOnce(aidaClient.registerClientEvent);
  };

  describe('without logging', () => {
    it('reports positive rating', reportsRating(true, true));
    it('reports negative rating', reportsRating(false, true));
  });

  describe('with logging', () => {
    it('reports positive rating', reportsRating(true, false));
    it('reports negative rating', reportsRating(false, false));
  });

  it('has thumbs up/down buttons if logging is disabled', async () => {
    updateHostConfig({
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
    assert.isNotNull(thumbsUpButton);
    const thumbsDownButton = component.shadowRoot!.querySelector('.rating [data-rating="false"]');
    assert.isNotNull(thumbsDownButton);
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
            doConversation() {
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
            doConversation() {
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
    const link = markdownView!.shadowRoot?.querySelector('sup button') as HTMLElement;
    link.click();
    assert.isTrue(details?.hasAttribute('open'));
    assert.isTrue(directCitations[0].classList.contains('highlighted'));
  });

  it('displays direct citations in code blocks', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            doConversation() {
              yield {
                explanation: `before

\`\`\`\`\`
const foo = document.querySelector('.some-class');
\`\`\`\`\`

after
`,
                metadata: {
                  rpcGlobalId: 0,
                  attributionMetadata: {
                    attributionAction: Host.AidaClient.RecitationAction.CITE,
                    citations: [
                      {
                        startIndex: 20,
                        endIndex: 25,
                        uri: 'https://www.wiki.test/directSource',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                      {
                        startIndex: 30,
                        endIndex: 38,
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
    const codeBlock = markdownView!.shadowRoot!.querySelector('devtools-code-block');
    const citations = codeBlock!.shadowRoot!.querySelectorAll('button.citation');
    assert.lengthOf(citations, 2);
    assert.strictEqual(citations[0].textContent, '[1]');
    assert.strictEqual(citations[1].textContent, '[2]');

    const details = component.shadowRoot!.querySelector('details');
    const directCitations = details!.querySelectorAll('ol x-link');
    assert.lengthOf(directCitations, 2);
    assert.strictEqual(directCitations[0].textContent?.trim(), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[0].getAttribute('href'), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[1].textContent?.trim(), 'https://www.world-fact.test/');
    assert.strictEqual(directCitations[1].getAttribute('href'), 'https://www.world-fact.test/');

    assert.isFalse(details?.hasAttribute('open'));
    assert.isFalse(directCitations[0].classList.contains('highlighted'));
    (citations[0] as HTMLElement).click();
    assert.isTrue(details?.hasAttribute('open'));
    assert.isTrue(directCitations[0].classList.contains('highlighted'));
  });

  it('displays training data citations', async () => {
    function getAidaClientWithMetadata() {
      return {
        async *
            doConversation() {
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
            doConversation() {
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

  it('renders the opt-in teaser', async () => {
    Common.Settings.settingForTest('console-insights-enabled').set(false);

    const component = new Explain.ConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    component.style.width = '574px';
    component.style.height = '64px';
    container.appendChild(component);
    renderElementIntoDOM(container);

    await drainMicroTasks();
    await assertScreenshot('explain/console_insight_optin.png');
  });

  it('renders the consent reminder', async () => {
    function getPromptBuilderForConsentReminder() {
      return {
        getSearchQuery() {
          return '';
        },
        async buildPrompt() {
          return {
            prompt: '',
            isPageReloadRecommended: false,
            sources: [
              {
                type: Explain.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Explain.SourceType.NETWORK_REQUEST,
                value: `Request: https://example.com/data.html

Request headers:
:authority: example.com
:method: GET
:path: https://example.com/data.json
:scheme: https
accept: */*
accept-encoding: gzip, deflate, br
accept-language: en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6
referer: https://example.com/demo.html
sec-ch-ua: "Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"
sec-ch-ua-arch: "arm"
sec-ch-ua-bitness: "64"
sec-ch-ua-full-version: "121.0.6116.0"
sec-ch-ua-full-version-list: "Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6116.0", "Chromium";v="121.0.6116.0"
sec-ch-ua-mobile: ?0
sec-ch-ua-model: ""
sec-ch-ua-platform: "macOS"
sec-ch-ua-platform-version: "14.1.0"
sec-ch-ua-wow64: ?0
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-origin
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36

Response headers:
accept-ch: Sec-CH-UA, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Full-Version, Sec-CH-UA-Full-Version-List, Sec-CH-UA-Mobile, Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version, Sec-CH-UA-WoW64
content-length: 1646
content-type: text/html; charset=UTF-8
cross-origin-opener-policy-report-only: same-origin; report-to="gfe-static-content-corp"
date: Fri, 10 Nov 2023 13:46:47 GMT
permissions-policy: ch-ua=*, ch-ua-arch=*, ch-ua-bitness=*, ch-ua-full-version=*, ch-ua-full-version-list=*, ch-ua-mobile=*, ch-ua-model=*, ch-ua-platform=*, ch-ua-platform-version=*, ch-ua-wow64=*
server: sffe
strict-transport-security: max-age=31536000; includeSubdomains
vary: Origin

Response status: 404`,
              },
            ]
          };
        }
      };
    }

    function getAidaClientForConsentReminder() {
      return {
        async *
            doConversation() {
              await new Promise(resolve => setTimeout(resolve, 2000));
              yield {
                explanation: `Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`
`,
                metadata: {},
                completed: true,
              };
            },
        registerClientEvent: () => Promise.resolve({}),
      };
    }

    Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(false);

    const component = new Explain.ConsoleInsight(
        getPromptBuilderForConsentReminder(), getAidaClientForConsentReminder(),
        Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    component.style.width = '574px';
    component.style.height = '271px';
    container.appendChild(component);
    renderElementIntoDOM(container);

    await drainMicroTasks();
    await assertScreenshot('explain/console_insight_reminder.png');
  });

  it('renders the insight', async () => {
    function getPromptBuilderForInsight() {
      return {
        getSearchQuery() {
          return '';
        },
        async buildPrompt() {
          return {
            prompt: '',
            isPageReloadRecommended: false,
            sources: [
              {
                type: Explain.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Explain.SourceType.STACKTRACE,
                value: 'Stacktrace line1\nStacketrace line2',
              },
              {
                type: Explain.SourceType.RELATED_CODE,
                value: 'RelatedCode',
              },
              {
                type: Explain.SourceType.NETWORK_REQUEST,
                value: `Request: https://example.com/data.html

Request headers:
:authority: example.com
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36

Response headers:
Response status: 404`,
              },
            ],
          };
        },
      };
    }

    function getAidaClientForInsight() {
      return {
        async *
            doConversation() {
              yield {
                explanation: `## Result

Some text with \`code\`. Some code:
\`\`\`ts
console.log('test');
document.querySelector('test').style = 'black';
\`\`\`

\`\`\`
<!DOCTYPE html>
<div>Hello world</div>
<script>
  console.log('Hello World');
</script>
\`\`\`

Links: [https://example.com](https://example.com)
Images: ![https://example.com](https://example.com)
`,
                metadata: {},
                completed: true,
              };
            },
        registerClientEvent: () => Promise.resolve({}),
      };
    }

    const component = new Explain.ConsoleInsight(
        getPromptBuilderForInsight(), getAidaClientForInsight(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    component.disableAnimations = true;

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    component.style.width = '574px';
    component.style.height = '530px';
    container.appendChild(component);
    renderElementIntoDOM(container);

    // Animation are hidden and started one by one so
    // so we need multiple drains
    await drainMicroTasks();
    await drainMicroTasks();
    await assertScreenshot('explain/console_insight.png');
  });

  it('renders insights with references', async () => {
    function getPromptBuilderForInsight() {
      return {
        getSearchQuery() {
          return '';
        },
        async buildPrompt() {
          return {
            prompt: '',
            isPageReloadRecommended: false,
            sources: [
              {
                type: Explain.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Explain.SourceType.STACKTRACE,
                value: 'Stacktrace line1\nStacketrace line2',
              },
              {
                type: Explain.SourceType.RELATED_CODE,
                value: 'RelatedCode',
              },
              {
                type: Explain.SourceType.NETWORK_REQUEST,
                value: `Request: https://example.com/data.html

Request headers:
:authority: example.com
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36

Response headers:
Response status: 404`,
              },
            ],
          };
        },
      };
    }

    function getAidaClientForInsight() {
      return {
        async *
            doConversation() {
              yield {
                explanation: `## Result

Here is a text which contains both direct and indirect citations.

An indirect citation is a link to a reference which applies to the whole response.

A direct citation is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.
`,
                metadata: {
                  attributionMetadata: {
                    attributionAction: Host.AidaClient.RecitationAction.CITE,
                    citations: [
                      {
                        startIndex: 20,
                        endIndex: 50,
                        uri: 'https://www.direct-citation.dev',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                      {
                        startIndex: 170,
                        endIndex: 176,
                        uri: 'https://www.another-direct-citation.dev',
                        sourceType: Host.AidaClient.CitationSourceType.WORLD_FACTS,
                      },
                    ],
                  },
                  factualityMetadata: {
                    facts: [
                      {
                        sourceUri: 'https://www.indirect-citation.dev',
                      },
                      {
                        sourceUri: 'https://www.the-whole-world.dev',
                      },
                      {
                        sourceUri: 'https://www.even-more-content.dev',
                      },
                    ]
                  }
                },
                completed: true,
              };
            },
        registerClientEvent: () => Promise.resolve({}),
      };
    }

    const component = new Explain.ConsoleInsight(
        getPromptBuilderForInsight(), getAidaClientForInsight(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    component.style.width = '576px';
    component.style.height = '463px';
    container.appendChild(component);
    renderElementIntoDOM(container);
    await raf();

    const detailsElement = component.shadowRoot!.querySelector('details.references')!;
    const transitioned = new Promise<void>(resolve => {
      detailsElement.addEventListener('transitionend', () => {
        resolve();
      });
    });
    await raf();
    detailsElement.querySelector('summary')!.click();
    await transitioned;

    await assertScreenshot('explain/console_insight_references.png');
  });
});
