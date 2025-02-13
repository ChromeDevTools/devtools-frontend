// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Host from '../../../front_end/core/host/host.js';
import type * as Root from '../../../front_end/core/root/root.js';
import {expectError} from '../../conductor/events.js';
import {click, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';
import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {closeSettings} from '../helpers/settings-helpers.js';

describe('AI Assistance', function() {
  let preloadScriptId: string;

  afterEach(async () => {
    // The tests end but DevTools might be still doing things resulting
    // in an error caused by the test runner closing or navigating the
    // target page.
    expectError('Inspected target navigated or closed');
    if (!preloadScriptId) {
      return;
    }
    const {frontend} = getBrowserAndPages();
    await frontend.removeScriptToEvaluateOnNewDocument(preloadScriptId);
  });

  async function setupMocks(
      hostConfig: Root.Runtime.HostConfig,
      messages: string[],
  ) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();

    const syncInformation = {
      accountEmail: 'some-email',
      isSyncActive: true,
      arePreferencesSynced: false,
    };

    // TODO: come up with less invasive way to mock host configs.
    const {identifier} = await frontend.evaluateOnNewDocument(`
      globalThis.hostConfigForTesting = {
        ...globalThis.hostConfigForTesting ?? {},
        ...JSON.parse('${JSON.stringify(hostConfig)}'),
      }

      globalThis.getSyncInformationForTesting = () => {
        return JSON.parse('${JSON.stringify(syncInformation)}');
      };
    `);

    preloadScriptId = identifier;
    await frontend.reload({
      waitUntil: 'networkidle0',
    });

    await resetMockMessages(messages);
  }

  async function resetMockMessages(
      messages: string[],
  ) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await frontend.evaluate(messages => {
      let call = 0;
      // @ts-ignore devtools context.
      globalThis.InspectorFrontendHost.doAidaConversation = async (request, streamId, cb) => {
        const response = JSON.stringify([
          {
            textChunk: {
              text: messages[call],
            },
            metadata: {},
          },
        ]);
        call++;
        let first = true;
        for (const chunk of response.split(',{')) {
          await new Promise(resolve => setTimeout(resolve, 0));
          // @ts-ignore devtools context.
          globalThis.InspectorFrontendAPI.streamWrite(streamId, first ? chunk : ',{' + chunk);
          first = false;
        }
        cb({statusCode: 200});
      };
    }, messages);
  }

  async function inspectNode(selector: string, iframeId?: string, shadowRoot?: string): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await frontend.locator('aria/Console prompt').click();
    let inspectText = `inspect(document.querySelector(${JSON.stringify(selector)}))`;
    if (iframeId) {
      inspectText = `inspect(document.querySelector('iframe#${iframeId}').contentDocument.querySelector((${
          JSON.stringify(selector)})))`;
    }
    if (shadowRoot) {
      inspectText = `inspect(document.querySelector(${JSON.stringify(shadowRoot)}).shadowRoot.querySelector((${
          JSON.stringify(selector)})))`;
    }
    await frontend.keyboard.type(inspectText);
    await frontend.keyboard.press('Enter');
  }

  async function turnOnAiAssistance() {
    const {frontend} = getBrowserAndPages();

    // Click on the settings redirect link.
    await frontend.locator('pierce/.disabled-view button[role=link]').click();
    // Enable "AI Assistance" toggle in the settings.
    await frontend.locator('aria/Enable AI assistance').click();
    // Close settings to come back to the AI Assistance panel.
    await closeSettings();
  }

  async function openFreestyler(): Promise<void> {
    await openSoftContextMenuAndClickOnItem('pierce/.elements-disclosure li.selected', 'Ask AI');
  }

  async function enableDebugModeForFreestyler(): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await frontend.waitForFunction(() => {
      return 'setDebugAiAssistanceEnabled' in window;
    });
    await frontend.evaluate(() => {
      // @ts-ignore
      setDebugAiAssistanceEnabled(true);
    });
  }

  async function typeQuery(query: string): Promise<void> {
    const inputSelector = 'aria/Ask a question about the selected element';
    const {frontend} = getBrowserAndPages();
    await frontend.locator(inputSelector).click();

    await frontend.locator(inputSelector).fill(query);
  }

  interface Log {
    request: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      current_message: Host.AidaClient.Content,
    };
  }

  async function submitAndWaitTillDone(waitForSideEffect?: boolean): Promise<Log[]> {
    const {frontend} = getBrowserAndPages();
    const done = frontend.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('aiassistancedone', resolve, {
          once: true,
        });
      });
    });
    await frontend.keyboard.press('Enter');

    if (waitForSideEffect) {
      await frontend.waitForSelector('aria/Continue');
      return JSON.parse(await frontend.evaluate((): string => {
        return localStorage.getItem('aiAssistanceStructuredLog') as string;
      })) as Log[];
    }

    const abort = new AbortController();
    async function autoAcceptEvals(signal: AbortSignal) {
      while (!signal.aborted) {
        await frontend.locator('aria/Continue').click({signal});
      }
    }
    // Click continue once without sending abort signal.
    autoAcceptEvals(abort.signal).catch(() => {});
    await done;
    abort.abort();
    return JSON.parse(await frontend.evaluate((): string => {
      return localStorage.getItem('aiAssistanceStructuredLog') as string;
    })) as Log[];
  }

  async function runAiAssistance(options: {
    query: string,
    messages: string[],
    resource?: string,
    node?: string,
    iframeId?: string,
    shadowRoot?: string,
    waitForSideEffect?: boolean,
  }) {
    const {
      messages,
      query,
      resource = '../resources/recorder/recorder.html',
      node = 'div',
      iframeId,
      shadowRoot,
      waitForSideEffect
    } = options;

    await setupMocks(
        {
          aidaAvailability: {
            enabled: true,
            disallowLogging: true,
            enterprisePolicyValue: 0,
          },
          devToolsFreestyler: {
            enabled: true,
          },
        },
        messages);
    await goToResource(resource, {
      waitUntil: 'networkidle0',
    });
    await openFreestyler();
    await turnOnAiAssistance();
    await enableDebugModeForFreestyler();
    return await sendAiAssistanceMessage({
      node,
      iframeId,
      shadowRoot,
      query,
      messages,
      waitForSideEffect,
    });
  }

  async function sendAiAssistanceMessage(options: {
    query: string,
    messages: string[],
    node?: string,
    iframeId?: string,
    shadowRoot?: string,
    waitForSideEffect?: boolean,
  }) {
    const {messages, query, node = 'div', iframeId, shadowRoot, waitForSideEffect} = options;

    await resetMockMessages(messages);
    await inspectNode(node, iframeId, shadowRoot);
    await typeQuery(query);
    return await submitAndWaitTillDone(waitForSideEffect);
  }

  it('gets data about elements', async () => {
    const result = await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
const data = {
  color: window.getComputedStyle($0).color
}
STOP`,
        'ANSWER: changed styles',
      ],
    });
    assert.deepEqual(
        result.at(-1)!.request.current_message, {role: 1, parts: [{text: 'OBSERVATION: {"color":"rgb(0, 0, 0)"}'}]});
  });

  it('handles trailing ;', async () => {
    const result = await runAiAssistance(
        {
          query: 'Change the background color for this element to blue',
          messages: [
            `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
const originalWidth = $0.style.width;
const originalHeight = $0.style.height;
$0.removeAttribute('width');
$0.removeAttribute('height');
const computedStyles = window.getComputedStyle($0);
const data = {
  aspectRatio: computedStyles['aspect-ratio'],
};
$0.style.width = originalWidth; // Restore original width
$0.style.height = originalHeight;
STOP`,
            'ANSWER: changed styles',
          ],
        },
    );
    assert.deepEqual(
        result.at(-1)!.request.current_message, {role: 1, parts: [{text: 'OBSERVATION: {"aspectRatio":"auto"}'}]});
  });

  it('handles comments', async () => {
    const result = await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
const originalWidth = $0.style.width;
const originalHeight = $0.style.height;
$0.removeAttribute('width');
$0.removeAttribute('height');
const computedStyles = window.getComputedStyle($0);
const data = {
  aspectRatio: computedStyles['aspect-ratio'],
};
$0.style.width = originalWidth; // Restore original width
$0.style.height = originalHeight; // Restore original height
STOP`,
        'ANSWER: changed styles',
      ],
    });
    assert.deepEqual(
        result.at(-1)!.request.current_message, {role: 1, parts: [{text: 'OBSERVATION: {"aspectRatio":"auto"}'}]});
  });

  it('modifies the inline styles using the extension functions', async () => {
    await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
await setElementStyles($0.parentElement, { 'background-color': 'green' });
STOP`,
        'ANSWER: changed styles',
      ],
    });

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 0, 255)' &&
          // @ts-ignore page context.
          window.getComputedStyle(document.querySelector('body')).backgroundColor === 'rgb(0, 128, 0)';
    });
  });

  it('modifies multiple styles', async () => {
    await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
STOP`,
        'ANSWER: changed styles',
      ],
      node: 'div',
    });

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 0, 255)';
    });

    await sendAiAssistanceMessage({
      query: 'Change the background color for this element to green',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'green' });
STOP`,
        'ANSWER: changed styles',
      ],
      node: 'button',
    });

    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('button')).backgroundColor === 'rgb(0, 128, 0)';
    });
  });

  it('modifies multiple styles for elements inside shadow DOM', async () => {
    await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
STOP`,
        'ANSWER: changed styles',
      ],
      resource: '../resources/recorder/shadow-open.html',
      node: 'button',
      shadowRoot: 'login-element',
    });

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('login-element').shadowRoot.querySelector('button'))
                 .backgroundColor === 'rgb(0, 0, 255)';
    });

    await sendAiAssistanceMessage({
      query: 'Change the font color for this element to green',
      messages: [
        `THOUGHT: I can change the font color of an element by setting the color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'color': 'green' });
STOP`,
        'ANSWER: changed styles',
      ],
      node: 'button',
      shadowRoot: 'login-element',
    });

    await target.bringToFront();
    await target.waitForFunction(() => {
      const buttonStyles =
          // @ts-ignore page context.
          window.getComputedStyle(document.querySelector('login-element').shadowRoot.querySelector('button'));
      return buttonStyles.backgroundColor === 'rgb(0, 0, 255)' && buttonStyles.color === 'rgb(0, 128, 0)';
    });
  });

  it('executes in the correct realm', async () => {
    const result = await runAiAssistance({
      query: 'What is the document title',
      messages: [
        `THOUGHT: I can get the title via web API
TITLE: getting the document title
ACTION

// TODO: Enable once this stop crashing the page
// if(window.self === window.top){
//   throw new Error('Access from non frame')
// }

const data = {
  title: document.title,
};
STOP`,
        'ANSWER: Title collected',
      ],
      resource: '../resources/ai_assistance/index.html',
      node: 'div',
      iframeId: 'iframe',
    });

    assert.deepEqual(result.at(-1)!.request.current_message.parts[0], {
      text: 'OBSERVATION: {"title":"I have a title"}',
    });
  });

  it('aborts ongoing conversation if new input is submitted by pressing enter', async () => {
    await runAiAssistance({
      query: 'Change the background color for this element to blue',
      messages: [
        `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
STOP`,
      ],
      node: 'div',
      waitForSideEffect: true,
    });

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgba(0, 0, 0, 0)';
    });

    const messages = [
      `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'green' });
STOP`,
      'ANSWER: changed styles',
    ];
    await resetMockMessages(messages);
    await inspectNode('div');
    await typeQuery('Change the background color for this element to green');
    const {frontend} = getBrowserAndPages();
    const done = frontend.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('aiassistancedone', resolve, {
          once: true,
        });
      });
    });
    await frontend.keyboard.press('Enter');
    await frontend.locator('aria/Continue').click();
    await done;

    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 128, 0)';
    });
  });
});
