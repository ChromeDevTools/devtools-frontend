// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import {createConsoleInsightWidget} from '../../../testing/ConsoleInsightHelpers.js';
import {
  assertScreenshot,
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as Console from '../../console/console.js';
import * as Explain from '../explain.js';

type Insight = Extract<Explain.ViewInput['state'], {type: Explain.State.INSIGHT}>;

describeWithEnvironment('ConsoleInsight', () => {
  let component: Explain.ConsoleInsight|undefined;

  function createConsoleInsight(
      promptBuilder: Explain.PublicPromptBuilder,
      aidaClient: Explain.PublicAidaClient,
      aidaPreconditions: Host.AidaClient.AidaAccessPreconditions,
  ) {
    const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions');
    checkAccessPreconditionsStub.callsFake(() => Promise.resolve(aidaPreconditions));
    const component = new Explain.ConsoleInsight(promptBuilder, aidaClient, aidaPreconditions);
    return {component, checkAccessPreconditionsStub};
  }

  const containerCss = `
      box-sizing: border-box;
      background-color: aqua;
    `;

  beforeEach(() => {
    sinon.stub(Host.AidaClient.HostConfigTracker.instance(), 'pollAidaAvailability').callsFake(async () => {});
  });

  afterEach(() => {
    component?.detach();
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
              type: Console.PromptBuilder.SourceType.MESSAGE,
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

  it('shows opt-in teaser when setting is turned off', async () => {
    Common.Settings.settingForTest('console-insights-enabled').set(false);
    const {view, component} = await createConsoleInsightWidget();

    assert.strictEqual(view.input.state.type, Explain.State.LOADING);

    component.wasShown();
    const nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.SETTING_IS_NOT_TRUE);
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

    const {view, component} = await createConsoleInsightWidget();

    assert.strictEqual(view.input.state.type, Explain.State.LOADING);

    component.wasShown();
    const nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.SETTING_IS_NOT_TRUE);
  });

  it('generates an explanation when the user logs in', async () => {
    const {view, component, stubAidaCheckAccessPreconditions} = await createConsoleInsightWidget({
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
    });

    assert.strictEqual(view.input.state.type, Explain.State.NOT_LOGGED_IN);

    component.wasShown();

    stubAidaCheckAccessPreconditions(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);

    const nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
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

    const {view, component} = await createConsoleInsightWidget();

    assert.strictEqual(view.input.state.type, Explain.State.LOADING);

    component.wasShown();
    const nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.SETTING_IS_NOT_TRUE);

    setting.setRegistration({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
  });

  it('shows reminder on first run of console insights', async () => {
    Common.Settings.settingForTest('console-insights-onboarding-finished').set(false);
    const {view, component} = await createConsoleInsightWidget();

    assert.strictEqual(view.input.state.type, Explain.State.LOADING);

    component.wasShown();
    let nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.CONSENT_REMINDER);

    await view.input.callbacks.onConsentReminderConfirmed();
    nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithTimeout(),
    });

    assert.strictEqual(view.input.state.type, Explain.State.LOADING);

    component.wasShown();
    const nextInput = await view.nextInput;

    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;
    assert.isTrue(insight.timedOut);
  });

  const reportsRating = (positive: boolean, disallowLogging: boolean) => async () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging,
      },
    });
    const actionTaken = sinon.stub(Host.userMetrics, 'actionTaken');
    const {view, component, testAidaClient} = await createConsoleInsightWidget();

    component.wasShown();
    await view.nextInput;

    await view.input.callbacks.onRating(positive);
    await view.nextInput;

    sinon.assert.calledOnce(testAidaClient.registerClientEvent);
    sinon.assert.match(testAidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
      corresponding_aida_rpc_global_id: 0,
      disable_user_content_logging: disallowLogging,
      do_conversation_client_event: {
        user_feedback: {sentiment: positive ? 'POSITIVE' : 'NEGATIVE'},
      },
    }));
    sinon.assert.calledWith(
        actionTaken,
        positive ? Host.UserMetrics.Action.InsightRatedPositive : Host.UserMetrics.Action.InsightRatedNegative);

    await view.input.callbacks.onRating(positive);

    sinon.assert.calledOnce(testAidaClient.registerClientEvent);
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
    ({component} = createConsoleInsight(
         getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
    renderElementIntoDOM(component);
    await component.updateComplete;
    const thumbsUpButton = component.contentElement!.querySelector('.rating [data-rating="true"]');
    assert.isNotNull(thumbsUpButton);
    const thumbsDownButton = component.contentElement!.querySelector('.rating [data-rating="false"]');
    assert.isNotNull(thumbsDownButton);
  });

  it('report if the user is not logged in', async () => {
    const {view} = await createConsoleInsightWidget({
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
    });

    assert.strictEqual(view.input.state.type, Explain.State.NOT_LOGGED_IN);
  });

  it('report if the navigator is offline', async () => {
    const {view} = await createConsoleInsightWidget({
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
    });
    assert.strictEqual(view.input.state.type, Explain.State.OFFLINE);
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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithMetadata(),
    });
    component.wasShown();
    const nextInput = await view.nextInput;
    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;
    assert.deepEqual(insight.relatedUrls, [
      'https://www.firstSource.test/someInfo',
      'https://www.anotherSource.test/page',
    ]);
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

    ({component} = createConsoleInsight(
         getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
    renderElementIntoDOM(component);
    await component.updateComplete;

    const markdownView = component.contentElement!.querySelector('devtools-markdown-view');
    assert.strictEqual(
        getCleanTextContentFromElements(markdownView!.shadowRoot!, '.message')[0],
        'This is not[1] a real answer[2], it is just a test.');
    const details = component.contentElement!.querySelector('details');
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
    await component.updateComplete;
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

    ({component} = createConsoleInsight(
         getTestPromptBuilder(), getAidaClientWithMetadata(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
    renderElementIntoDOM(component);
    await component.updateComplete;

    const markdownView = component.contentElement!.querySelector('devtools-markdown-view');
    const codeBlock = markdownView!.shadowRoot!.querySelector('devtools-code-block');
    const citations = codeBlock!.shadowRoot!.querySelectorAll('button.citation');
    assert.lengthOf(citations, 2);
    assert.strictEqual(citations[0].textContent, '[1]');
    assert.strictEqual(citations[1].textContent, '[2]');

    const details = component.contentElement!.querySelector('details');
    const directCitations = details!.querySelectorAll('ol x-link');
    assert.lengthOf(directCitations, 2);
    assert.strictEqual(directCitations[0].textContent?.trim(), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[0].getAttribute('href'), 'https://www.wiki.test/directSource');
    assert.strictEqual(directCitations[1].textContent?.trim(), 'https://www.world-fact.test/');
    assert.strictEqual(directCitations[1].getAttribute('href'), 'https://www.world-fact.test/');

    assert.isFalse(details?.hasAttribute('open'));
    assert.isFalse(directCitations[0].classList.contains('highlighted'));
    (citations[0] as HTMLElement).click();
    await component.updateComplete;
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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithMetadata(),
    });
    component.wasShown();
    const nextInput = await view.nextInput;
    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;

    assert.lengthOf(insight.relatedUrls, 3);
    assert.strictEqual(insight.relatedUrls[0], 'https://www.firstSource.test/someInfo');
    assert.strictEqual(insight.relatedUrls[1], 'https://www.training.test/');
    assert.strictEqual(insight.relatedUrls[2], 'https://www.github.com/chromedevtools/devtools-frontend');
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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithMetadata(),
    });
    component.wasShown();
    const nextInput = await view.nextInput;
    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;

    assert.lengthOf(insight.directCitationUrls, 2);
    assert.lengthOf(insight.relatedUrls, 2);
    assert.strictEqual(insight.directCitationUrls[0], 'https://www.world-fact-and-factuality.test/');
    assert.strictEqual(insight.directCitationUrls[1], 'https://www.all-three.test/');
    assert.strictEqual(insight.relatedUrls[0], 'https://www.training-and-factuality.test/');
    assert.strictEqual(insight.relatedUrls[1], 'https://www.factuality.test/');
  });

  it('renders the opt-in teaser', async () => {
    Common.Settings.settingForTest('console-insights-enabled').set(false);

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    container.style.width = '574px';
    container.style.height = '64px';
    renderElementIntoDOM(container);

    const {component} = createConsoleInsight(
        getTestPromptBuilder(), getTestAidaClient(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    component.markAsRoot();
    component.show(container);

    await component.updateComplete;
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
                type: Console.PromptBuilder.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Console.PromptBuilder.SourceType.NETWORK_REQUEST,
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

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    container.style.width = '574px';
    container.style.height = '271px';
    renderElementIntoDOM(container);

    const {component} = createConsoleInsight(
        getPromptBuilderForConsentReminder(), getAidaClientForConsentReminder(),
        Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    component.markAsRoot();
    component.show(container);

    await component.updateComplete;
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
                type: Console.PromptBuilder.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Console.PromptBuilder.SourceType.STACKTRACE,
                value: 'Stacktrace line1\nStacketrace line2',
              },
              {
                type: Console.PromptBuilder.SourceType.RELATED_CODE,
                value: 'RelatedCode',
              },
              {
                type: Console.PromptBuilder.SourceType.NETWORK_REQUEST,
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

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    container.style.width = '574px';
    container.style.height = '530px';
    renderElementIntoDOM(container);

    const {component} = createConsoleInsight(
        getPromptBuilderForInsight(), getAidaClientForInsight(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    component.disableAnimations = true;
    component.markAsRoot();
    component.show(container);

    // Animation are hidden and started one by one so
    // so we need multiple drains
    await component.updateComplete;
    await component.updateComplete;
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
                type: Console.PromptBuilder.SourceType.MESSAGE,
                value: 'Something went wrong\n\nSomething went wrong',
              },
              {
                type: Console.PromptBuilder.SourceType.STACKTRACE,
                value: 'Stacktrace line1\nStacketrace line2',
              },
              {
                type: Console.PromptBuilder.SourceType.RELATED_CODE,
                value: 'RelatedCode',
              },
              {
                type: Console.PromptBuilder.SourceType.NETWORK_REQUEST,
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

    const container = document.createElement('div');
    container.style.cssText = containerCss;
    container.style.width = '576px';
    container.style.height = '463px';
    renderElementIntoDOM(container);

    const {component} = createConsoleInsight(
        getPromptBuilderForInsight(), getAidaClientForInsight(), Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    component.markAsRoot();
    component.show(container);

    await component.updateComplete;

    const detailsElement = component.contentElement!.querySelector('details.references')!;
    detailsElement.querySelector('summary')!.click();
    await component.updateComplete;

    await assertScreenshot('explain/console_insight_references.png');
  });
});
