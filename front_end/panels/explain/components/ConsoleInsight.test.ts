// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import {createConsoleInsightWidget} from '../../../testing/ConsoleInsightHelpers.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as Console from '../../console/console.js';
import * as Explain from '../explain.js';

type Insight = Extract<Explain.ViewInput['state'], {type: Explain.State.INSIGHT}>;

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
    component?.detach();
    Common.Settings.settingForTest('console-insights-enabled').set(true);
    Common.Settings.settingForTest('console-insights-onboarding-finished').set(true);
  });

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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithMetadata(),
    });
    component.wasShown();
    let nextInput = await view.nextInput;
    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;
    assert.deepEqual(insight.directCitationUrls, [
      'https://www.wiki.test/directSource',
      'https://www.world-fact.test/',
    ]);
    assert.deepEqual(insight.relatedUrls, [
      'https://www.firstSource.test/someInfo',
    ]);

    view.input.citationClickHandler(1);
    nextInput = await view.nextInput;
    assert.isTrue(nextInput.areReferenceDetailsOpen);
    assert.strictEqual(nextInput.highlightedCitationIndex, 0);
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

    const {view, component} = await createConsoleInsightWidget({
      aidaClient: getAidaClientWithMetadata(),
    });
    component.wasShown();
    let nextInput = await view.nextInput;
    assert.strictEqual(nextInput.state.type, Explain.State.INSIGHT);
    const insight = nextInput.state as Insight;

    assert.lengthOf(insight.directCitationUrls, 2);
    assert.strictEqual(insight.directCitationUrls[0], 'https://www.wiki.test/directSource');
    assert.strictEqual(insight.directCitationUrls[1], 'https://www.world-fact.test/');
    assert.isFalse(nextInput.areReferenceDetailsOpen);
    assert.strictEqual(nextInput.highlightedCitationIndex, -1);

    nextInput.citationClickHandler(1);
    nextInput = await view.nextInput;

    assert.isTrue(nextInput.areReferenceDetailsOpen);
    assert.strictEqual(nextInput.highlightedCitationIndex, 0);
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

  const DEFAULT_INPUT: Explain.ViewInput = {
    state: {type: Explain.State.LOADING},
    closing: false,
    disableAnimations: true,
    renderer: new MarkdownView.MarkdownView.MarkdownInsightRenderer(),
    citationClickHandler: () => {},
    noLogging: false,
    areReferenceDetailsOpen: false,
    highlightedCitationIndex: -1,
    callbacks: {
      onClose: () => {},
      onAnimationEnd: () => {},
      onCitationAnimationEnd: () => {},
      onSearch: () => {},
      onRating: (_isPositive: boolean) => undefined,
      onReport: () => {},
      onGoToSignIn: () => {},
      onConsentReminderConfirmed: async () => {},
      onToggleReferenceDetails: (_event: Event) => {},
      onDisclaimerSettingsLink: () => {},
      onReminderSettingsLink: () => {},
      onEnableInsightsInSettingsLink: () => {},
      onReferencesOpen: () => {},
    }
  };

  const createViewOutput = (): Explain.ViewOutput => ({
    headerRef: Lit.Directives.createRef<HTMLHeadingElement>(),
    citationLinks: [],
  });

  function createTarget(width: string, height: string) {
    const container = document.createElement('div');
    container.style.cssText = containerCss;

    const target = document.createElement('div');
    target.style.width = width;
    target.style.height = height;

    container.appendChild(target);
    renderElementIntoDOM(container);

    return target;
  }

  it('renders the opt-in teaser', async () => {
    const target = createTarget('574px', '64px');
    Explain.DEFAULT_VIEW(
        {
          ...DEFAULT_INPUT,
          state: {type: Explain.State.SETTING_IS_NOT_TRUE},
        },
        createViewOutput(), target);

    await assertScreenshot('explain/console_insight_optin.png');
  });

  it('renders the consent reminder', async () => {
    const target = createTarget('574px', '271px');
    Explain.DEFAULT_VIEW(
        {
          ...DEFAULT_INPUT,
          state: {type: Explain.State.CONSENT_REMINDER},
        },
        createViewOutput(), target);

    await assertScreenshot('explain/console_insight_reminder.png');
  });

  const rendersInsight = (noLogging: boolean, golden: string) => async () => {
    const target = createTarget('574px', '530px');
    Explain.DEFAULT_VIEW(
        {
          ...DEFAULT_INPUT,
          noLogging,
          state: {
            type: Explain.State.INSIGHT,
            tokens: [
              {
                type: 'heading',
                raw: '## Result\n\n',
                depth: 2,
                text: 'Result',
                tokens: [{type: 'text', raw: 'Result', text: 'Result'}]
              },
              {
                type: 'paragraph',
                raw: 'Some text with `code`. Some code:\n',
                text: 'Some text with `code`. Some code:',
                tokens: [
                  {type: 'text', raw: 'Some text with ', text: 'Some text with '},
                  {type: 'codespan', raw: '`code`', text: 'code'},
                  {type: 'text', raw: '. Some code:', text: '. Some code:'}
                ]
              },
              {
                type: 'code',
                raw: '```ts\nconsole.log(\'test\');\ndocument.querySelector(\'test\').style = \'black\';\n```',
                lang: 'ts',
                text: 'console.log(\'test\');\ndocument.querySelector(\'test\').style = \'black\';'
              },
              {type: 'space', raw: '\n\n'}, {
                type: 'code',
                raw:
                    '```\n<!DOCTYPE html>\n<div>Hello world</div>\n<script>\n  console.log(\'Hello World\');\n</script>\n```',
                lang: '',
                text: '<!DOCTYPE html>\n<div>Hello world</div>\n<script>\n  console.log(\'Hello World\');\n</script>'
              },
              {type: 'space', raw: '\n\n'}, {
                type: 'paragraph',
                raw:
                    'Links: [https://example.com](https://example.com)\nImages: ![https://example.com](https://example.com)\n',
                text:
                    'Links: [https://example.com](https://example.com)\nImages: ![https://example.com](https://example.com)',
                tokens: [
                  {type: 'text', raw: 'Links: ', text: 'Links: '}, {
                    type: 'link',
                    raw: '[https://example.com](https://example.com)',
                    href: 'https://example.com',
                    title: null,
                    text: 'https://example.com',
                    tokens: [{type: 'text', raw: 'https://example.com', text: 'https://example.com'}]
                  },
                  {type: 'text', raw: '\nImages: ', text: '\nImages: '}, {
                    type: 'image',
                    raw: '![https://example.com](https://example.com)',
                    href: 'https://example.com',
                    title: null,
                    text: 'https://example.com'
                  }
                ]
              }
            ],
            validMarkdown: true,
            explanation:
                '## Result\n\nSome text with `code`. Some code:\n```ts\nconsole.log(\'test\');\ndocument.querySelector(\'test\').style = \'black\';\n```\n\n```\n<!DOCTYPE html>\n<div>Hello world</div>\n<script>\n  console.log(\'Hello World\');\n</script>\n```\n\nLinks: [https://example.com](https://example.com)\nImages: ![https://example.com](https://example.com)\n',
            sources:
                [
                  {
                    type: Console.PromptBuilder.SourceType.MESSAGE,
                    value: 'Something went wrong\n\nSomething went wrong'
                  },
                  {type: Console.PromptBuilder.SourceType.STACKTRACE, value: 'Stacktrace line1\nStacketrace line2'},
                  {type: Console.PromptBuilder.SourceType.RELATED_CODE, value: 'RelatedCode'}, {
                    type: Console.PromptBuilder.SourceType.NETWORK_REQUEST,
                    value:
                        'Request: https://example.com/data.html\n\nRequest headers:\n:authority: example.com\nuser-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\n\nResponse headers:\nResponse status: 404'
                  }
                ],
            metadata: {},
            isPageReloadRecommended: false,
            completed: true,
            directCitationUrls: [],
            relatedUrls: []
          }
        },
        createViewOutput(), target);

    await assertScreenshot(golden);
  };

  describe('without logging', () => {
    it('reports positive rating', reportsRating(true, true));
    it('reports negative rating', reportsRating(false, true));
    // formerly 'has thumbs up/down buttons if logging is disabled'
    it('renders the insight', rendersInsight(true, 'explain/console_insight_no_logging.png'));
  });

  describe('with logging', () => {
    it('reports positive rating', reportsRating(true, false));
    it('reports negative rating', reportsRating(false, false));
    it('renders the insight', rendersInsight(false, 'explain/console_insight.png'));
  });

  it('renders insights with references', async () => {
    const target = createTarget('576px', '463px');
    Explain.DEFAULT_VIEW(
        {
          ...DEFAULT_INPUT,
          areReferenceDetailsOpen: true,
          state: {
            type: Explain.State.INSIGHT,
            tokens: [
              {
                type: 'heading',
                raw: '## Result\n\n',
                depth: 2,
                text: 'Result',
                tokens: [{type: 'text', raw: 'Result', text: 'Result'}]
              },
              {
                type: 'paragraph',
                raw: 'Here is a text which contains both direct[^1] and indirect citations.',
                text: 'Here is a text which contains both direct[^1] and indirect citations.',
                tokens: [
                  {
                    type: 'text',
                    raw: 'Here is a text which contains both direct',
                    text: 'Here is a text which contains both direct'
                  },
                  {type: 'citation', raw: '[^1]', linkText: 1},
                  {type: 'text', raw: ' and indirect citations.', text: ' and indirect citations.'}
                ]
              },
              {type: 'space', raw: '\n\n'}, {
                type: 'paragraph',
                raw: 'An indirect citation is a link to a reference which applies to the whole response.',
                text: 'An indirect citation is a link to a reference which applies to the whole response.',
                tokens: [{
                  type: 'text',
                  raw: 'An indirect citation is a link to a reference which applies to the whole response.',
                  text: 'An indirect citation is a link to a reference which applies to the whole response.'
                }]
              },
              {type: 'space', raw: '\n\n'}, {
                type: 'paragraph',
                raw:
                    'A direct citation[^2] is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.\n',
                text:
                    'A direct citation[^2] is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.',
                tokens: [
                  {type: 'text', raw: 'A direct citation', text: 'A direct citation'},
                  {type: 'citation', raw: '[^2]', linkText: 2}, {
                    type: 'text',
                    raw:
                        ' is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.',
                    text:
                        ' is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.'
                  }
                ]
              }
            ],
            validMarkdown: true,
            explanation:
                '## Result\n\nHere is a text which contains both direct and indirect citations.\n\nAn indirect citation is a link to a reference which applies to the whole response.\n\nA direct citation is a link to a reference, but it only applies to a specific part of the response. Direct citations are numbered and are shown as a number within square brackets in the response text.\n',
            sources: [
              {type: Console.PromptBuilder.SourceType.MESSAGE, value: 'Something went wrong\n\nSomething went wrong'},
              {type: Console.PromptBuilder.SourceType.STACKTRACE, value: 'Stacktrace line1\nStacketrace line2'},
              {type: Console.PromptBuilder.SourceType.RELATED_CODE, value: 'RelatedCode'}, {
                type: Console.PromptBuilder.SourceType.NETWORK_REQUEST,
                value:
                    'Request: https://example.com/data.html\n\nRequest headers:\n:authority: example.com\nuser-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\n\nResponse headers:\nResponse status: 404'
              }
            ],
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
                  }
                ]
              },
              factualityMetadata: {
                facts: [
                  {sourceUri: 'https://www.indirect-citation.dev'}, {sourceUri: 'https://www.the-whole-world.dev'},
                  {sourceUri: 'https://www.even-more-content.dev'}
                ]
              }
            },
            isPageReloadRecommended: false,
            completed: true,
            directCitationUrls: ['https://www.direct-citation.dev', 'https://www.another-direct-citation.dev'],
            relatedUrls: [
              'https://www.indirect-citation.dev', 'https://www.the-whole-world.dev',
              'https://www.even-more-content.dev'
            ]
          }
        },
        createViewOutput(), target);

    await assertScreenshot('explain/console_insight_references.png');
  });
});
