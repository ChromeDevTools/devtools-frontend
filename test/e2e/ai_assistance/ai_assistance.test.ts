// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Host from '../../../front_end/core/host/host.js';
import type * as Root from '../../../front_end/core/root/root.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

describe('AI Assistance', function() {
  if (this.timeout() > 0) {
    // Takes longer on Macs.
    this.timeout(20000);
  }

  let preloadScriptId: string;

  async function setupMocks(
      devToolsPage: DevToolsPage,
      hostConfig: Root.Runtime.HostConfig,
      messages: AidaPart[],
  ) {
    // TODO: come up with less invasive way to mock host configs.
    preloadScriptId = await devToolsPage.setupMockHostConfigAndReload(hostConfig);
    await resetMockMessages(devToolsPage, messages);
  }

  async function resetMockMessages(
      devtoolsPage: DevToolsPage,
      messages: AidaPart[],
  ) {
    await devtoolsPage.evaluate(() => {
      // @ts-expect-error different context
      DevToolsAPI.setUseSoftMenu(true);
    });
    await devtoolsPage.evaluate(messages => {
      let call = 0;
      globalThis.InspectorFrontendHost.dispatchHttpRequest = async (request, cb) => {
        if (!request.streamId) {
          throw new Error('No streamId');
        }
        const response = JSON.stringify([
          messages[call],
        ]);
        call++;
        let first = true;
        for (const chunk of response.split(',{')) {
          await new Promise(resolve => setTimeout(resolve, 0));
          globalThis.InspectorFrontendAPI.streamWrite(request.streamId, first ? chunk : ',{' + chunk);
          first = false;
        }
        cb({statusCode: 200, response: ''});
      };
    }, messages);
  }

  async function inspectNode(
      devToolsPage: DevToolsPage, selector: string, iframeId?: string, shadowRoot?: string): Promise<void> {
    await devToolsPage.click('#tab-console');
    await devToolsPage.click('aria/Console prompt');
    let inspectText = `inspect(document.querySelector(${JSON.stringify(selector)}))`;
    if (iframeId) {
      inspectText = `inspect(document.querySelector('iframe#${iframeId}').contentDocument.querySelector((${
          JSON.stringify(selector)})))`;
    }
    if (shadowRoot) {
      inspectText = `inspect(document.querySelector(${JSON.stringify(shadowRoot)}).shadowRoot.querySelector((${
          JSON.stringify(selector)})))`;
    }
    await devToolsPage.typeText(inspectText);
    await devToolsPage.pressKey('Enter');
  }

  async function turnOnAiAssistance(devtoolsPage: DevToolsPage) {
    // Click on the settings redirect link.
    await devtoolsPage.click('pierce/.disabled-view [role=link]');
    // Enable "AI Assistance" toggle in the settings.
    await devtoolsPage.click('pierce/[data-testid="Enable AI assistance"]');
    // Close settings to come back to the AI Assistance panel.
    await devtoolsPage.click('.dialog-close-button');
  }

  async function askAiOnSelectedElement(devtoolsPage: DevToolsPage): Promise<void> {
    await devtoolsPage.bringToFront();
    // Click on first element.
    await devtoolsPage.click('pierce/.webkit-html-tag-name');
    await devtoolsPage.click('devtools-floating-button');
  }

  async function enableDebugModeForFreestyler(devtoolsPage: DevToolsPage): Promise<void> {
    await devtoolsPage.waitForFunction(async () => {
      return await devtoolsPage.evaluate(() => {
        return 'setAiAssistanceStructuredLogEnabled' in window;
      });
    });
    await devtoolsPage.evaluate(() => {
      // @ts-expect-error different context
      setAiAssistanceStructuredLogEnabled(true);
    });
  }

  async function typeQuery(devtoolsPage: DevToolsPage, query: string): Promise<void> {
    await devtoolsPage.waitFor('textarea.chat-input');
    await devtoolsPage.scrollElementIntoView('textarea.chat-input');
    await devtoolsPage.click('textarea.chat-input');
    await devtoolsPage.typeText(query);
  }

  interface Log {
    request: Host.AidaClient.DoConversationRequest;
  }

  async function submitAndWaitTillDone(
      devtoolsPage: DevToolsPage, waitForSideEffect?: boolean, throwOnSideEffect?: boolean): Promise<Log[]> {
    const done = devtoolsPage.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('aiassistancedone', resolve, {
          once: true,
        });
      });
    });
    await devtoolsPage.pressKey('Enter');

    if (waitForSideEffect) {
      await devtoolsPage.waitForAria('Continue');
      return JSON.parse(await devtoolsPage.evaluate((): string => {
        return localStorage.getItem('aiAssistanceStructuredLog') as string;
      })) as Log[];
    }

    const abort = new AbortController();
    let sideEffectCount = 0;
    async function autoAcceptEvals(signal: AbortSignal) {
      while (!signal.aborted) {
        await devtoolsPage.locator('aria/Continue').click({signal});
        sideEffectCount++;
      }
    }
    // Click continue once without sending abort signal.
    autoAcceptEvals(abort.signal).catch(() => {});
    await done;
    abort.abort();
    if (sideEffectCount && throwOnSideEffect) {
      throw new Error('Unexpected side effect');
    }
    return JSON.parse(await devtoolsPage.evaluate((): string => {
      return localStorage.getItem('aiAssistanceStructuredLog') as string;
    })) as Log[];
  }

  type AidaPart = object;

  async function runAiAssistance(devToolsPage: DevToolsPage, inspectedPage: InspectedPage, options: {
    query: string,
    messages: AidaPart[],
    resource?: string,
    host?: string,
    node?: string,
    iframeId?: string,
    shadowRoot?: string,
    waitForSideEffect?: boolean,
    throwOnSideEffect?: boolean,
    v2Architecture?: boolean,
  }) {
    const {
      messages,
      query,
      resource = '../resources/recorder/recorder.html',
      host,
      node = 'div',
      iframeId,
      shadowRoot,
      waitForSideEffect,
      throwOnSideEffect,
      v2Architecture,
    } = options;

    try {
      const hostConfig: Root.Runtime.HostConfig = {
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
          enterprisePolicyValue: 0,
        },
        // devToolsFreestyler must remain enabled because ai_assistance-meta.ts gates panel registration on it.
        devToolsFreestyler: {
          enabled: true,
        },
        isOffTheRecord: false,
        ...(v2Architecture ? {devToolsAiV2Architecture: {enabled: true}} : {}),
      };
      await setupMocks(devToolsPage, hostConfig, messages);
      await devToolsPage.evaluate(() => {
        localStorage.removeItem('aiAssistanceStructuredLog');
      });
      if (host) {
        await inspectedPage.goToResourceWithCustomHost(host, resource);
      } else {
        await inspectedPage.goToResource(resource);
      }
      await askAiOnSelectedElement(devToolsPage);
      await turnOnAiAssistance(devToolsPage);
      await enableDebugModeForFreestyler(devToolsPage);
      return await sendAiAssistanceMessage(devToolsPage, {
        node,
        iframeId,
        shadowRoot,
        query,
        messages,
        waitForSideEffect,
        throwOnSideEffect,
      });
    } finally {
      if (preloadScriptId) {
        await devToolsPage.removeScriptToEvaluateOnNewDocument(preloadScriptId);
        preloadScriptId = '';
      }
    }
  }

  async function sendAiAssistanceMessage(devToolsPage: DevToolsPage, options: {
    query: string,
    messages: AidaPart[],
    node?: string,
    iframeId?: string,
    shadowRoot?: string,
    waitForSideEffect?: boolean,
    throwOnSideEffect?: boolean,
  }) {
    const {messages, query, node = 'div', iframeId, shadowRoot, waitForSideEffect, throwOnSideEffect} = options;

    await resetMockMessages(devToolsPage, messages);
    await inspectNode(devToolsPage, node, iframeId, shadowRoot);
    await typeQuery(devToolsPage, query);
    return await submitAndWaitTillDone(devToolsPage, waitForSideEffect, throwOnSideEffect);
  }

  async function openConversationFromHistory(devToolsPage: DevToolsPage, historyEntrySelector: string) {
    await devToolsPage.bringToFront();
    await devToolsPage.click('aria/History');
    await devToolsPage.click(historyEntrySelector);
  }

  it('gets data about elements', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: `const data = {
  color: window.getComputedStyle($0).color
}`,
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
    });
    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: '{"color":"rgb(0, 0, 0)"}'}}}],
    });
  });

  it('handles trailing ;', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(
        devToolsPage,
        inspectedPage,
        {
          query: 'Change the background color for this element to blue',
          messages: [
            {
              functionCallChunk: {
                functionCall: {
                  name: 'executeJavaScript',
                  args: {
                    thought:
                        'I can change the background color of an element by setting the background-color CSS property.',
                    title: 'changing the property',
                    code: `const originalWidth = $0.style.width;
  const originalHeight = $0.style.height;
  $0.removeAttribute('width');
  $0.removeAttribute('height');
  const computedStyles = window.getComputedStyle($0);
  const data = {
    aspectRatio: computedStyles['aspect-ratio'],
  };
  $0.style.width = originalWidth; // Restore original width
  $0.style.height = originalHeight;`,
                  },
                },
              },
            },
            {textChunk: {text: 'changed styles'}},
          ],
        },
    );
    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: '{"aspectRatio":"auto"}'}}}],
    });
  });

  it('handles comments', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: `const originalWidth = $0.style.width;
  const originalHeight = $0.style.height;
  $0.removeAttribute('width');
  $0.removeAttribute('height');
  const computedStyles = window.getComputedStyle($0);
  const data = {
    aspectRatio: computedStyles['aspect-ratio'],
  };
  $0.style.width = originalWidth; // Restore original width
  $0.style.height = originalHeight; // Restore original height`,
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
    });
    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: '{"aspectRatio":"auto"}'}}}],
    });
  });

  it('modifies the inline styles using the extension functions', async ({devToolsPage, inspectedPage}) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: `await setElementStyles($0, { 'background-color': 'blue' });
  await setElementStyles($0.parentElement, { 'background-color': 'green' });`,
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 0, 255)' &&
            // @ts-expect-error page context.
            window.getComputedStyle(document.querySelector('body')).backgroundColor === 'rgb(0, 128, 0)';
      });
    });
  });

  it('modifies multiple styles', async ({devToolsPage, inspectedPage}) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'background-color\': \'blue\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      node: 'div',
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 0, 255)';
      });
    });

    await sendAiAssistanceMessage(devToolsPage, {
      query: 'Change the background color for this element to green',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'background-color\': \'green\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      node: 'button',
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('button')).backgroundColor === 'rgb(0, 128, 0)';
      });
    });
  });

  it('modifies multiple styles for elements inside shadow DOM', async ({devToolsPage, inspectedPage}) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'background-color\': \'blue\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      resource: '../resources/recorder/shadow-open.html',
      node: 'button',
      shadowRoot: 'login-element',
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('login-element').shadowRoot.querySelector('button'))
                   .backgroundColor === 'rgb(0, 0, 255)';
      });
    });

    await sendAiAssistanceMessage(devToolsPage, {
      query: 'Change the font color for this element to green',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought: 'I can change the font color of an element by setting the color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'color\': \'green\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      node: 'button',
      shadowRoot: 'login-element',
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        const buttonStyles =
            // @ts-expect-error page context.
            window.getComputedStyle(document.querySelector('login-element').shadowRoot.querySelector('button'));
        return buttonStyles.backgroundColor === 'rgb(0, 0, 255)' && buttonStyles.color === 'rgb(0, 128, 0)';
      });
    });
  });

  it('executes in the correct realm', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'What is the document title',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought: 'I can get the title via web API',
                title: 'getting the document title',
                code: `// TODO: Enable once this stop crashing the page
  // if(window.self === window.top){
  //   throw new Error('Access from non frame')
  // }

  const data = {
    title: document.title,
  };
`,
              },
            },
          },
        },
        {textChunk: {text: 'Title collected'}},
      ],
      resource: '../resources/ai_assistance/index.html',
      node: 'div',
      iframeId: 'iframe',
    });

    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: '{"title":"I have a title"}'}}}],
    });
  });

  it('aborts ongoing conversation if new input is submitted by pressing enter', async ({
                                                                                  devToolsPage,
                                                                                  inspectedPage,
                                                                                }) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [{
        functionCallChunk: {
          functionCall: {
            name: 'executeJavaScript',
            args: {
              thought: 'I can change the background color of an element by setting the background-color CSS property.',
              title: 'changing the property',
              code: 'await setElementStyles($0, { \'background-color\': \'blue\' });',
            },
          },
        },
      }],
      node: 'div',
      waitForSideEffect: true,
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgba(0, 0, 0, 0)';
      });
    });

    const messages = [
      {
        functionCallChunk: {
          functionCall: {
            name: 'executeJavaScript',
            args: {
              thought: 'I can change the background color of an element by setting the background-color CSS property.',
              title: 'changing the property',
              code: 'await setElementStyles($0, { \'background-color\': \'green\' });',
            },
          },
        },
      },
      {textChunk: {text: 'changed styles'}},
    ];
    await resetMockMessages(devToolsPage, messages);
    await inspectNode(devToolsPage, 'div');
    await typeQuery(devToolsPage, 'Change the background color for this element to green');
    await devToolsPage.pressKey('Enter');
    // Verify that the prior conversation is aborted and its confirmation unmounts before continuing.
    await devToolsPage.waitForElementWithTextContent('You stopped this response');
    // Wait for the new conversation's side-effect confirmation to mount and approve it.
    await devToolsPage.waitForAria('Continue');
    await devToolsPage.click('aria/Continue');
    await devToolsPage.waitForElementWithTextContent('changed styles');

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 128, 0)';
      });
    });
  });

  it('aborts ongoing conversation when previous chat is opened from history', async ({devToolsPage, inspectedPage}) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the background color for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought:
                    'I can change the background color of an element by setting the background-color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'background-color\': \'blue\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      node: 'div',
    });

    await devToolsPage.click('aria/New chat');

    await sendAiAssistanceMessage(devToolsPage, {
      query: 'Change the background color for this element to green',
      messages: [{
        functionCallChunk: {
          functionCall: {
            name: 'executeJavaScript',
            args: {
              thought: 'I can change the background color of an element by setting the background-color CSS property.',
              title: 'changing the property',
              code: 'await setElementStyles($0, { \'background-color\': \'green\' });',
            },
          },
        },
      }],
      node: 'div',
      waitForSideEffect: true,
    });

    await openConversationFromHistory(
        devToolsPage, 'aria/Change the background color for this element to blue, unchecked');
    await openConversationFromHistory(
        devToolsPage, 'aria/Change the background color for this element to green, unchecked');

    await devToolsPage.click(
        'aria/Show thinking for prompt Change the background color for this element to (and 6 more characters)');
    await devToolsPage.waitForAria('Aborted');
  });

  it('modifies styles to a selector with high specificity', async ({devToolsPage, inspectedPage}) => {
    await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the color for this element to rebeccapurple',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought: 'I can change the color of an element by setting the color CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'color\': \'rebeccapurple\' });',
              },
            },
          },
        },
        {textChunk: {text: 'changed styles'}},
      ],
      resource: '../resources/ai_assistance/high-specificity.html',
      node: 'h1',
    });

    await inspectedPage.waitForFunction(() => {
      return inspectedPage.evaluate(() => {
        // @ts-expect-error page context.
        return window.getComputedStyle(document.querySelector('h1')).color === 'rgb(102, 51, 153)';
      });
    });
  });

  it('fails when non CSS property is used', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the non/css/prop for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought: 'I can change the non/css/prop color of an element by setting the non/css/prop CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { \'non/css/prop\': \'blue\' });',
              },
            },
          },
        },
        {textChunk: {text: 'Unable to make the change'}},
      ],
    });

    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{
        functionResponse: {
          name: 'executeJavaScript',
          response: {
            result:
                `Error: None of the suggested CSS properties or their values for selector were considered valid by the browser's CSS engine. Please ensure property names are correct and values match the expected format for those properties.`,
          },
        },
      }],
    });
  });

  it('work when CSS property with upper case is used', async ({devToolsPage, inspectedPage}) => {
    const result = await runAiAssistance(devToolsPage, inspectedPage, {
      query: 'Change the fontSize for this element to blue',
      messages: [
        {
          functionCallChunk: {
            functionCall: {
              name: 'executeJavaScript',
              args: {
                thought: 'I can change the fontSize of an element by setting the fontSize CSS property.',
                title: 'changing the property',
                code: 'await setElementStyles($0, { fontSize: \'100px\' });',
              },
            },
          },
        },
        {textChunk: {text: 'Unable to make the change'}},
      ],
    });

    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: 'undefined'}}}],
    });
  });

  for (const code of ['const data = {}', 'throw new Error("test")', 'const data = {;']) {
    it(`should not trigger a side-effect for "${code}"`, async ({devToolsPage, inspectedPage}) => {
      await runAiAssistance(devToolsPage, inspectedPage, {
        query: 'Change the fontSize for this element to blue',
        throwOnSideEffect: true,
        messages: [
          {
            functionCallChunk: {
              functionCall: {
                name: 'executeJavaScript',
                args: {
                  thought: 'data',
                  title: 'data',
                  code,
                },
              },
            },
          },
          {textChunk: {text: 'done'}},
        ],
      });
    });
  }

  const CROSS_ORIGIN_PLACEHOLDER = 'To talk about data from another origin, start a new chat';

  async function assertBlockedByCrossOrigin(devToolsPage: DevToolsPage): Promise<void> {
    const textarea = await devToolsPage.waitFor('textarea.chat-input:disabled');
    await devToolsPage.waitForFunction(async () => {
      return await textarea.evaluate(
          (el, expected) => el.getAttribute('placeholder') === expected,
          CROSS_ORIGIN_PLACEHOLDER,
      );
    });
    await devToolsPage.waitForElementWithTextContent('Start new chat');
  }

  async function resetOriginLockViaNewChat(devToolsPage: DevToolsPage): Promise<void> {
    await devToolsPage.click('.start-new-chat-button');
    await devToolsPage.waitFor('textarea.chat-input:not(:disabled)');
    await devToolsPage.waitForNone('.start-new-chat-button');
  }

  async function selectConsoleExecutionContext(devToolsPage: DevToolsPage, contextLabel: string): Promise<void> {
    await devToolsPage.click('#tab-console');
    const [menuItem] = await devToolsPage.waitForFunction(async () => {
      await devToolsPage.click('[aria-label^="JavaScript context:"]');
      const menuItems = await devToolsPage.waitForManyWithTries('[role=menuitem]', 1, 3);
      if (!menuItems) {
        return null;
      }
      for (const item of menuItems) {
        if (await devToolsPage.$textContent(contextLabel, item)) {
          return [item];
        }
      }
      return null;
    });
    await menuItem.click();
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${contextLabel}"]`);
  }

  it('locks conversation to origin and blocks input on cross-origin navigation until new chat',
     async ({devToolsPage, inspectedPage}) => {
       // Clearly distinguish the two distinct origins used in this test.
       // Both hosts resolve to 127.0.0.1 in the test runner, but produce different SDK.SecurityOrigin instances.
       const ORIGIN_A_HOST = 'a.devtools.test';
       const ORIGIN_B_HOST = 'b.devtools.test';
       const ORIGIN_A_USER_QUERY = 'Explain this element on origin A';
       const ORIGIN_A_AI_RESPONSE = 'Answer for Origin A element';
       const ORIGIN_B_USER_QUERY = 'Explain this element on origin B';
       const ORIGIN_B_AI_RESPONSE = 'Answer for Origin B element';

       // 1. Establish an initial conversation locked to ORIGIN_A.
       await runAiAssistance(devToolsPage, inspectedPage, {
         host: ORIGIN_A_HOST,
         resource: 'elements/simple-styled-page.html',
         node: 'h1',
         query: ORIGIN_A_USER_QUERY,
         messages: [{textChunk: {text: ORIGIN_A_AI_RESPONSE}}],
       });

       // 2. Navigate inspected page to ORIGIN_B and inspect an element under the new origin.
       await inspectedPage.goToResourceWithCustomHost(ORIGIN_B_HOST, 'recorder/recorder.html');
       await inspectNode(devToolsPage, 'div');

       // 3. Verify that cross-origin navigation blocks the active conversation.
       await assertBlockedByCrossOrigin(devToolsPage);

       // 4. Click "Start new chat" to clear the origin lock.
       await resetOriginLockViaNewChat(devToolsPage);

       // 5. Submit query on ORIGIN_B and assert that the response renders in the UI.
       await resetMockMessages(devToolsPage, [{textChunk: {text: ORIGIN_B_AI_RESPONSE}}]);
       await typeQuery(devToolsPage, ORIGIN_B_USER_QUERY);
       const result = await submitAndWaitTillDone(devToolsPage);
       await devToolsPage.waitForElementWithTextContent(ORIGIN_B_AI_RESPONSE);

       // 6. Verify that starting a new chat clears prior history in the outgoing request.
       const lastRequest = result.at(-1)?.request;
       assert.isUndefined(lastRequest?.historical_contexts);
     });

  it('allows continuing conversation when navigating across pages on the same origin',
     async ({devToolsPage, inspectedPage}) => {
       const ORIGIN_HOST = 'a.devtools.test';
       const PAGE_1_USER_QUERY = 'Explain this element on origin A page 1';
       const PAGE_1_AI_RESPONSE = 'Answer for page 1 element';
       const PAGE_2_USER_QUERY = 'Explain this element on origin A page 2';
       const PAGE_2_AI_RESPONSE = 'Answer for page 2 element';

       // 1. Establish an initial conversation locked to ORIGIN_HOST.
       await runAiAssistance(devToolsPage, inspectedPage, {
         host: ORIGIN_HOST,
         resource: 'elements/simple-styled-page.html',
         node: 'h1',
         query: PAGE_1_USER_QUERY,
         messages: [{textChunk: {text: PAGE_1_AI_RESPONSE}}],
       });

       // 2. Navigate to another document under the same origin and select a new element.
       await inspectedPage.goToResourceWithCustomHost(ORIGIN_HOST, 'recorder/recorder.html');
       await inspectNode(devToolsPage, 'div');

       // 3. Verify that context affirmatively updates to the new element and the conversation remains unblocked.
       await devToolsPage.waitForElementWithTextContent('div', await devToolsPage.waitFor('.select-element'));
       await devToolsPage.waitFor('textarea.chat-input:not(:disabled)');
       await devToolsPage.waitForNone('.start-new-chat-button');

       // 4. Submit a follow-up query to verify the existing conversation thread continues without reset.
       await resetMockMessages(devToolsPage, [{textChunk: {text: PAGE_2_AI_RESPONSE}}]);
       await typeQuery(devToolsPage, PAGE_2_USER_QUERY);
       const result = await submitAndWaitTillDone(devToolsPage);
       await devToolsPage.waitForElementWithTextContent(PAGE_2_AI_RESPONSE);

       // 5. Verify that the follow-up query preserves prior history in the outgoing request.
       assert.isAtLeast(result.length, 2);
       const lastRequest = result.at(-1)?.request;
       assert.isNotEmpty(lastRequest?.historical_contexts);
     });

  it('locks conversation to origin and blocks input when selecting an element in a cross-origin iframe',
     async ({devToolsPage, inspectedPage}) => {
       const TOP_ORIGIN_HOST = 'a.devtools.test';
       // page-with-oopif.html specifically embeds an iframe hosted on devtools.oopif.test.
       const OOPIF_HOST = 'devtools.oopif.test';
       const TOP_USER_QUERY = 'Explain top-level body element';
       const TOP_AI_RESPONSE = 'Answer for top-level element';
       const OOPIF_USER_QUERY = 'Explain this element in cross-origin iframe';
       const OOPIF_AI_RESPONSE = 'Answer for OOPIF element';

       // 1. Establish an initial conversation locked to the top-level origin.
       await runAiAssistance(devToolsPage, inspectedPage, {
         host: TOP_ORIGIN_HOST,
         resource: 'host/page-with-oopif.html',
         node: 'body',
         query: TOP_USER_QUERY,
         messages: [{textChunk: {text: TOP_AI_RESPONSE}}],
       });

       // 2. Wait for the out-of-process iframe to load before querying its execution context.
       await inspectedPage.page.waitForFrame(frame => frame.url().includes(OOPIF_HOST));

       // 3. Switch the Console prompt execution context to the OOPIF frame so inspectNode evaluates in the iframe realm.
       await selectConsoleExecutionContext(devToolsPage, 'iframe.html');

       // 4. Inspect an element inside the cross-origin frame to trigger origin validation.
       await inspectNode(devToolsPage, 'h1');

       // 5. Verify that selecting a cross-origin element blocks the conversation and prompts for a new chat.
       await assertBlockedByCrossOrigin(devToolsPage);

       // 6. Click "Start new chat" to clear the prior origin lock.
       await resetOriginLockViaNewChat(devToolsPage);

       // 7. Submit a query targeting the OOPIF element and assert that the response renders in the UI.
       await resetMockMessages(devToolsPage, [{textChunk: {text: OOPIF_AI_RESPONSE}}]);
       await typeQuery(devToolsPage, OOPIF_USER_QUERY);
       const result = await submitAndWaitTillDone(devToolsPage);
       await devToolsPage.waitForElementWithTextContent(OOPIF_AI_RESPONSE);

       // 8. Verify that starting a new chat clears prior history in the outgoing request.
       const lastRequest = result.at(-1)?.request;
       assert.isUndefined(lastRequest?.historical_contexts);
     });

  function assertIsTextPromptPart(part?: Host.AidaClient.Part): asserts part is {text: string} {
    assert.isDefined(part, 'Expected part to be defined.');
    assert.isTrue('text' in part, 'Expected part to contain text.');
  }

  function assertIsFunctionResponsePart(part?: Host.AidaClient.Part):
      asserts part is Host.AidaClient.FunctionResponsePart {
    assert.isDefined(part, 'Expected part to be defined.');
    assert.isTrue('functionResponse' in part, 'Expected part to contain a functionResponse.');
  }

  describe('with V2 architecture', () => {
    it('answers a query about an element with AiAgent2', async ({devToolsPage, inspectedPage}) => {
      const AI_RESPONSE = 'Answer from V2 agent';
      const aidaRoundTrips = await runAiAssistance(devToolsPage, inspectedPage, {
        resource: '../resources/ai_assistance/index.html',
        node: 'div.test-node',
        query: 'Explain this element',
        v2Architecture: true,
        messages: [{textChunk: {text: AI_RESPONSE}}],
      });

      // 1. Verify UI response rendering and active input state.
      await devToolsPage.waitForElementWithTextContent(AI_RESPONSE);
      await devToolsPage.waitFor('textarea.chat-input:not(:disabled)');

      // 2. Verify exactly one round-trip to AIDA was made with the V2 client feature.
      assert.lengthOf(aidaRoundTrips, 1, 'Expected a single round-trip to AIDA for a direct query.');
      const [{request}] = aidaRoundTrips;

      // In E2E tests, Host is imported as a type-only module, so runtime enum values cannot be referenced directly.
      // The numeric value 29 corresponds to Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT.
      // Asserting client_feature confirms that DevTools routed the query to AiAgent2 rather than a legacy V1 agent.
      const CHROME_DEVTOOLS_V2_AGENT: Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT = 29;
      assert.strictEqual(
          request.client_feature,
          CHROME_DEVTOOLS_V2_AGENT,
          'Expected request to use the V2 agent client feature.',
      );

      // 3. Verify user prompt and selected element context were sent to AIDA.
      const [promptPart] = request.current_message.parts;
      assertIsTextPromptPart(promptPart);
      assert.include(promptPart.text, 'Explain this element');
      assert.include(promptPart.text, '.test-node', 'Expected prompt to attach selected element context.');
    });

    it('learns a skill and registers its tools with AiAgent2', async ({devToolsPage, inspectedPage}) => {
      const AI_RESPONSE = 'I have learned how to inspect and style elements.';
      const aidaRoundTrips = await runAiAssistance(devToolsPage, inspectedPage, {
        resource: '../resources/ai_assistance/index.html',
        node: 'div.test-node',
        query: 'Help me style this element',
        v2Architecture: true,
        messages: [
          // Round-trip 1 response: Server requests executing the learnSkills function for 'styling'.
          {
            functionCallChunk: {
              functionCall: {
                name: 'learnSkills',
                args: {skills: ['styling']},
              },
            },
          },
          // Round-trip 2 response: Server acknowledges skill learning and sends the final answer.
          {textChunk: {text: AI_RESPONSE}},
        ],
      });

      // 1. Verify UI renders the final response.
      await devToolsPage.waitForElementWithTextContent(AI_RESPONSE);

      // 2. Verify two round-trips occurred: tool invocation, followed by tool output response.
      assert.lengthOf(aidaRoundTrips, 2, 'Expected two round-trips to AIDA: tool invocation and tool response.');

      // Round-trip 1: Only learnSkills is declared initially.
      const initialTools = aidaRoundTrips[0].request.function_declarations?.map(decl => decl.name) ?? [];
      assert.deepEqual(initialTools, ['learnSkills']);

      // Round-trip 2: Contains functionResponse for learnSkills and registers styling tools (executeJavaScript, getStyles).
      const secondRequest = aidaRoundTrips[1].request;
      const secondCallTools = secondRequest.function_declarations?.map(decl => decl.name) ?? [];
      assert.includeMembers(secondCallTools, ['learnSkills', 'executeJavaScript', 'getStyles']);

      const [responsePart] = secondRequest.current_message.parts;
      assertIsFunctionResponsePart(responsePart);
      assert.strictEqual(responsePart.functionResponse.name, 'learnSkills');
    });
  });
});
