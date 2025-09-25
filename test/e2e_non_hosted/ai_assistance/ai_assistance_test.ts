// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Host from '../../../front_end/core/host/host.js';
import type * as Root from '../../../front_end/core/root/root.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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
    const syncInformation = {
      accountEmail: 'some-email',
      isSyncActive: true,
      arePreferencesSynced: false,
    };

    // TODO: come up with less invasive way to mock host configs.
    const {identifier} = await devToolsPage.evaluateOnNewDocument(`
      Object.defineProperty(window, 'InspectorFrontendHost', {
        configurable: true,
        enumerable: true,
        get() {
            return this._InspectorFrontendHost;
        },
        set(value) {
            value.getHostConfig = (cb) => {
              cb({
                ...globalThis.hostConfigForTesting ?? {},
                ...JSON.parse('${JSON.stringify(hostConfig)}'),
              });
            }

            value.getSyncInformation = (cb) => {
              cb(JSON.parse('${JSON.stringify(syncInformation)}'));
            };
            this._InspectorFrontendHost = value;
        }
      });
    `);

    preloadScriptId = identifier;
    await devToolsPage.reload();
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
      // @ts-expect-error devtools context.
      globalThis.InspectorFrontendHost.doAidaConversation = async (request, streamId, cb) => {
        const response = JSON.stringify([
          messages[call],
        ]);
        call++;
        let first = true;
        for (const chunk of response.split(',{')) {
          await new Promise(resolve => setTimeout(resolve, 0));
          // @ts-expect-error devtools context.
          globalThis.InspectorFrontendAPI.streamWrite(streamId, first ? chunk : ',{' + chunk);
          first = false;
        }
        cb({statusCode: 200});
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
    await devtoolsPage.click('pierce/.disabled-view span[role=link]');
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
    await devtoolsPage.click('aria/Ask a question about the selected element');
    await devtoolsPage.typeText(query);
  }

  interface Log {
    request: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      current_message: Host.AidaClient.Content,
    };
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
    node?: string,
    iframeId?: string,
    shadowRoot?: string,
    waitForSideEffect?: boolean,
    throwOnSideEffect?: boolean,
  }) {
    const {
      messages,
      query,
      resource = '../resources/recorder/recorder.html',
      node = 'div',
      iframeId,
      shadowRoot,
      waitForSideEffect,
      throwOnSideEffect
    } = options;

    try {
      await setupMocks(
          devToolsPage, {
            aidaAvailability: {
              enabled: true,
              disallowLogging: true,
              enterprisePolicyValue: 0,
            },
            devToolsFreestyler: {
              enabled: true,
            },
            isOffTheRecord: false,
          },
          messages);
      await inspectedPage.goToResource(resource);
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
}`
              }
            }
          }
        },
        {textChunk: {text: 'changed styles'}},
      ],
    });
    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{functionResponse: {name: 'executeJavaScript', response: {result: '{"color":"rgb(0, 0, 0)"}'}}}]
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
            {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'Title collected'}}
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

  it('aborts ongoing conversation if new input is submitted by pressing enter',
     async ({devToolsPage, inspectedPage}) => {
       await runAiAssistance(devToolsPage, inspectedPage, {
         query: 'Change the background color for this element to blue',
         messages: [{
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
                 thought:
                     'I can change the background color of an element by setting the background-color CSS property.',
                 title: 'changing the property',
                 code: 'await setElementStyles($0, { \'background-color\': \'green\' });',
               },
             },
           },
         },
         {textChunk: {text: 'changed styles'}}
       ];
       await resetMockMessages(devToolsPage, messages);
       await inspectNode(devToolsPage, 'div');
       await typeQuery(devToolsPage, 'Change the background color for this element to green');
       const done = devToolsPage.evaluate(() => {
         return new Promise(resolve => {
           window.addEventListener('aiassistancedone', resolve, {
             once: true,
           });
         });
       });
       await devToolsPage.pressKey('Enter');
       await devToolsPage.click('aria/Continue');
       await done;

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
        {textChunk: {text: 'changed styles'}}
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

    await devToolsPage.waitForAria('Canceled');
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
        {textChunk: {text: 'changed styles'}}
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
        {textChunk: {text: 'Unable to make the change'}}
      ],
    });

    assert.deepEqual(result.at(-1)!.request.current_message, {
      role: 0,
      parts: [{
        functionResponse: {
          name: 'executeJavaScript',
          response: {
            result:
                'Error: None of the suggested CSS properties or their values for selector were considered valid by the browser\'s CSS engine. Please ensure property names are correct and values match the expected format for those properties.',
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
        {textChunk: {text: 'Unable to make the change'}}
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
          {textChunk: {text: 'done'}}
        ],
      });
    });
  }
});
