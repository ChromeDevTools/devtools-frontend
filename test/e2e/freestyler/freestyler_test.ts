// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Root from '../../../front_end/core/root/root.js';
import {click, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';

describe('Freestyler', function() {
  let preloadScriptId: string;

  afterEach(async () => {
    if (!preloadScriptId) {
      return;
    }
    const {frontend} = getBrowserAndPages();
    await frontend.removeScriptToEvaluateOnNewDocument(preloadScriptId);
  });

  // TODO: make mocks more re-usable.
  async function setupMocks(
      aidaAvailability: Partial<Root.Runtime.AidaAvailability>,
      devToolsFreestylerDogfood: Partial<Root.Runtime.HostConfigFreestylerDogfood>) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    // TODO: come up with less invasive way to mock host configs.
    const {identifier} = await frontend.evaluateOnNewDocument(
        `globalThis.hostConfigForTesting = {...globalThis.hostConfigForTesting, devToolsFreestylerDogfood: ${
            JSON.stringify(devToolsFreestylerDogfood)}, aidaAvailability: ${JSON.stringify(aidaAvailability)}
  };

  globalThis.getSyncInformationForTesting = () => {
    return {
      accountEmail: 'some-email',
      isSyncActive: true,
      arePreferencesSynced: false,
    };
  };
  `);

    preloadScriptId = identifier;
    await frontend.reload({
      waitUntil: 'networkidle0',
    });

    await frontend.evaluate(() => {
      let call = 1;
      // @ts-ignore devtools context.
      globalThis.InspectorFrontendHost.doAidaConversation = async (request, streamId, cb) => {
        const response = JSON.stringify([
          {
            textChunk: {
              text: call === 1 ?
                  `THOUGHT: I can change the background color of an element by setting the background-color CSS property.
TITLE: changing the property
ACTION
await setElementStyles($0, { 'background-color': 'blue' });
STOP
` :
                  'ANSWER: changed styles',
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
    });
  }

  async function inspectNode(selector: string): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await frontend.locator('aria/Console prompt').click();
    await frontend.keyboard.type(`inspect(document.querySelector(${JSON.stringify(selector)}))`);
    await frontend.keyboard.press('Enter');
  }

  async function openFreestyler(): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await frontend.locator('aria/Customize and control DevTools').click();
    await frontend.locator('aria/More tools').click();
    await frontend.locator('aria/AI assistant').click();
    // Accept consent.
    await frontend.locator('aria/Accept').click();
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

  async function submitAndWaitTillDone(): Promise<void> {
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
        await frontend.locator('aria/Execute').click({signal});
      }
    }
    autoAcceptEvals(abort.signal).catch(() => {});
    await done;
    abort.abort();
  }

  it('modifes the inline styles using the extension functions', async () => {
    await setupMocks({}, {enabled: true});
    await goToResource('../resources/recorder/recorder.html');

    await inspectNode('body');
    await openFreestyler();
    await enableDebugModeForFreestyler();
    await typeQuery('Change the background color for this element to blue');
    await submitAndWaitTillDone();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('body')).backgroundColor === 'rgb(0, 0, 255)';
    });
  });
});
