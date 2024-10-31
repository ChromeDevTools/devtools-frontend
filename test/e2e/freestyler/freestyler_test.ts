// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Root from '../../../front_end/core/root/root.js';
import {expectError} from '../../conductor/events.js';
import {click, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';
import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {closeSettings} from '../helpers/settings-helpers.js';

describe('Freestyler', function() {
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

      console.log(globalThis.hostConfigForTesting);

      globalThis.getSyncInformationForTesting = () => {
        return JSON.parse('${JSON.stringify(syncInformation)}');
      };
    `);

    preloadScriptId = identifier;
    await frontend.reload({
      waitUntil: 'networkidle0',
    });

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

  async function inspectNode(selector: string): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await frontend.locator('aria/Console prompt').click();
    await frontend.keyboard.type(`inspect(document.querySelector(${JSON.stringify(selector)}))`);
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
      return 'setDebugFreestylerEnabled' in window;
    });
    await frontend.evaluate(() => {
      // @ts-ignore
      setDebugFreestylerEnabled(true);
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
      input: string,
    };
  }

  async function submitAndWaitTillDone(): Promise<Array<Log>> {
    const {frontend} = getBrowserAndPages();
    const done = frontend.evaluate(() => {
      return new Promise(resolve => {
        window.addEventListener('freestylerdone', resolve, {
          once: true,
        });
      });
    });
    await frontend.keyboard.press('Enter');
    const abort = new AbortController();
    async function autoAcceptEvals(signal: AbortSignal) {
      while (!signal.aborted) {
        await frontend.locator('aria/Continue').click({signal});
      }
    }
    autoAcceptEvals(abort.signal).catch(() => {});
    await done;
    abort.abort();
    return JSON.parse(await frontend.evaluate((): string => {
      return localStorage.getItem('freestylerStructuredLog') as string;
    })) as Array<Log>;
  }

  async function runWithMessages(query: string, messages: string[]): Promise<Array<Log>> {
    await setupMocks(
        {
          aidaAvailability: {},
          devToolsFreestyler: {
            enabled: true,
          },
        },
        messages);
    await goToResource('../resources/recorder/recorder.html');

    await inspectNode('div');
    await openFreestyler();
    await turnOnAiAssistance();
    await enableDebugModeForFreestyler();
    await typeQuery(query);
    return await submitAndWaitTillDone();
  }

  it('gets data about elements', async () => {
    const result = await runWithMessages('Change the background color for this element to blue', [
      `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
const data = {
  color: window.getComputedStyle($0).color
}
STOP`,
      'ANSWER: changed styles',
    ]);
    assert.deepStrictEqual(result.at(-1)!.request.input, 'OBSERVATION: {"color":"rgb(0, 0, 0)"}');
  });

  it('gets handles trailing ;', async () => {
    const result = await runWithMessages('Change the background color for this element to blue', [
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
    ]);
    assert.deepStrictEqual(result.at(-1)!.request.input, 'OBSERVATION: {"aspectRatio":"auto"}');
  });

  it('gets handles comments', async () => {
    const result = await runWithMessages('Change the background color for this element to blue', [
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
    ]);
    assert.deepStrictEqual(result.at(-1)!.request.input, 'OBSERVATION: {"aspectRatio":"auto"}');
  });

  it('modifies the inline styles using the extension functions', async () => {
    await runWithMessages('Change the background color for this element to blue', [
      `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
await setElementStyles($0.parentElement, { 'background-color': 'green' });
STOP`,
      'ANSWER: changed styles',
    ]);

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('div')).backgroundColor === 'rgb(0, 0, 255)' &&
          // @ts-ignore page context.
          window.getComputedStyle(document.querySelector('body')).backgroundColor === 'rgb(0, 128, 0)';
    });
  });
});
