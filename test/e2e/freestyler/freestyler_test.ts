// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Root from '../../../front_end/core/root/root.js';
import {click, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';

describe('Freestyler', function() {
  // TODO: make mocks more re-usable.
  async function setupMocks(
      aidaAvailability: Partial<Root.Runtime.AidaAvailability>,
      devToolsFreestylerDogfood: Partial<Root.Runtime.HostConfigFreestylerDogfood>) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await frontend.evaluateOnNewDocument(
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

  it('modifes the inline styles using the extension functions', async () => {
    // TODO: extract helpers.
    const {target, frontend} = getBrowserAndPages();
    await setupMocks({}, {enabled: true});
    await goToResource('../resources/recorder/recorder.html');
    await click(CONSOLE_TAB_SELECTOR);

    await frontend.locator('aria/Console prompt').click();
    await frontend.keyboard.type('inspect(document.querySelector(\'body\'))');
    await frontend.keyboard.press('Enter');

    await frontend.locator('aria/Customize and control DevTools').click();
    await frontend.locator('aria/More tools').click();
    await frontend.locator('aria/AI assistant').click();
    await frontend.locator('aria/Accept').click();

    await frontend.waitForFunction(() => {
      return 'setDebugFreestylerEnabled' in window;
    });
    await frontend.evaluate(() => {
      // @ts-ignore
      setDebugFreestylerEnabled(true);
    });

    await frontend.locator('aria/Ask a question about the selected element').click();

    await frontend.locator('aria/Ask a question about the selected element')
        .fill('Change the background color for this element to blue');

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

    await target.bringToFront();
    await target.waitForFunction(() => {
      // @ts-ignore page context.
      return window.getComputedStyle(document.querySelector('body')).backgroundColor === 'rgb(0, 0, 255)';
    });
  });
});
