// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type * as Console from '../../../front_end/panels/console/console.js';
import {click, getBrowserAndPages, hover, setDevToolsSettings, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickOnContextMenu, CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';

describe('ConsoleInsight', function() {
  const CLICK_TARGET_SELECTOR = '.console-message-text';
  const EXPLAIN_LABEL = 'Understand this error';

  async function setupMocks(aidaResponse: unknown) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await frontend.evaluateOnNewDocument(`
      globalThis.doAidaConversationForTesting = (data, cb) => {
        cb({"response": JSON.stringify(${JSON.stringify(aidaResponse)})});
      }
      globalThis.getSyncInformation = (cb) => {
        cb({"isSyncActive": true, "accountEmail": "some-email"});
      }
    `);
    await frontend.goto(frontend.url() + '&enableAida=true', {
      waitUntil: 'networkidle0',
    });
  }

  it('shows an insight for a console message via the context menu', async () => {
    const {target} = getBrowserAndPages();
    await setupMocks([
      {'textChunk': {'text': 'test'}},
    ]);
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await clickOnContextMenu(CLICK_TARGET_SELECTOR, EXPLAIN_LABEL);
    await waitFor('devtools-console-insight', undefined, undefined, 'pierce');
  });

  it('shows an insight for a console message via the hover button', async () => {
    const {target} = getBrowserAndPages();
    await setupMocks([
      {'textChunk': {'text': 'test'}},
    ]);
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await waitFor('.hover-button', undefined, undefined, 'pierce');
    await hover('.console-message');
    await click('.hover-button');
    await waitFor('devtools-console-insight', undefined, undefined, 'pierce');
  });

  it('does not show context menu if AIDA is not available', async () => {
    const {target} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await click(CLICK_TARGET_SELECTOR, {clickOptions: {button: 'right'}});
    const menu = await waitFor('.soft-context-menu', undefined, undefined, 'pierce');
    const items = await menu.$$('.soft-context-menu-item');
    const texts = await Promise.all(items.map(item => item.evaluate(e => (e as HTMLElement).innerText)));
    assert(
        !texts.some(item => item.toLowerCase().startsWith(EXPLAIN_LABEL.toLowerCase())),
        'Context menu shows the explain option');
    await waitForNone('.hover-button');
  });

  it('does not show the hover button if locale is not supported', async () => {
    const {target} = getBrowserAndPages();
    await setDevToolsSettings({language: 'zh'});
    await setupMocks([
      {'textChunk': {'text': 'test'}},
    ]);
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await waitForNone('.hover-button', undefined, undefined, 'pierce');
  });

  it('gets console message texts', async () => {
    const {frontend, target} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    const tests = [
      {
        script: 'console.warn(\'Text warning\');',
        expectedWithStackTrace: 'Text warning',
      },
      {
        script: 'console.warn(new Error(\'Error in a warning\'));',
        expectedWithStackTrace: 'Error: Error in a warning\n    at <anonymous>:1:1',
      },
      {
        script: 'console.warn(\'Text warning\', new Error(\'Error\'));',
        expectedWithStackTrace: 'Text warning Error: Error\n    at <anonymous>:1:1',
      },
      {
        script: 'console.warn(new Error(\'Error with newline \\n in a warning\'));',
        expectedWithStackTrace: 'Error: Error with newline \n in a warning\n    at <anonymous>:1:1',
      },
      {
        script: 'console.warn(\'Warning\', new Error(\'Error 1\'), new Error(\'Error 2\'));',
        expectedWithStackTrace: 'Warning Error: Error 1\n    at <anonymous>:1:1 Error: Error 2\n    at <anonymous>:1:1',
      },
      {
        script: 'const warning = \'warning\'; console.warn(\'%s with substitution.\', warning);',
        expectedWithStackTrace: 'warning with substitution.',
      },
      {
        script:
            'console.warn("%cWarning with style", \'background-color: darkblue; color: white; font-style: italic; border: 5px solid hotpink; font-size: 2em;\');',
        expectedWithStackTrace: 'Warning with style',
      },
      {
        script: 'console.warn(\'\x1B[41;93;4mHello ANSI escape seq\x1B[m\');',
        expectedWithStackTrace: 'Hello ANSI escape seq',
      },
      {
        script: 'console.warn(\'Warning\', 1, null, undefined, {}, [], true, \'str\', 1.4, document.body);',
        expectedWithStackTrace: 'Warning 1 null undefined {} [] true str 1.4 null',
      },
      {
        script: 'console.error(\'Text error\');',
        expectedWithStackTrace: 'Text error',
      },
      {
        script: 'console.error(new Error(\'Error in an error\'));',
        expectedWithStackTrace: 'Error: Error in an error\n    at <anonymous>:1:1',
      },
      {
        script: 'console.error(\'Text error\', new Error(\'Error\'));',
        expectedWithStackTrace: 'Text error Error: Error\n    at <anonymous>:1:1',
      },
      {
        script: 'console.error(\'Text error\', new Error(\'Error 1\'), new Error(\'Error 2\'));',
        expectedWithStackTrace:
            'Text error Error: Error 1\n    at <anonymous>:1:1 Error: Error 2\n    at <anonymous>:1:1',
      },
      {
        script: 'console.error({ test: \'not an error\' });',
        expectedWithStackTrace: '{test: \'not an error\'}',
      },
      {
        script: 'console.error(\'%s with substitution.\', \'error\');',
        expectedWithStackTrace: 'error with substitution.',
      },
      {
        script: 'console.error("%cError with style", \'border: 5px solid hotpink;\');',
        expectedWithStackTrace: 'Error with style',
      },
      {
        script: 'console.error(\'\x1B[41;93;4mHello ANSI escape seq\x1B[m\');',
        expectedWithStackTrace: 'Hello ANSI escape seq',
      },
      {
        script: 'console.error(new Error(\'\'))',
        expectedWithStackTrace: 'Error\n    at <anonymous>:1:1',
      },
      {
        script: 'throw new Error(\'Uncaught error\')',
        expectedWithStackTrace: 'Uncaught Error: Uncaught error\n    at <anonymous>:1:1',
      },
    ];

    await target.setContent(`
      <script>
        ${tests.map(test => test.script).join('\n')}
      </script>
    `);

    let messages: puppeteer.ElementHandle[] = [];

    while (messages.length !== tests.length) {
      messages = await frontend.$$('pierce/.console-message-wrapper');
    }

    const messageGetter = async (consoleModule: typeof Console, consoleElement: Element) => {
      const consoleViewMessage = consoleModule.ConsoleViewMessage.getMessageForElement(consoleElement);
      const message = consoleViewMessage?.toMessageTextString() || '';
      // Replace dynamic line and column numbers in stacktraces with ':1:1'.
      // Ignore stacktrace added by Puppeteer.
      return message.replace(/:\d+:\d+/gi, ':1:1').replaceAll(/\n    at pptr:;CdpFrame\.%3Can….js%3A\d+%3A\d+\):1:1/gi, '');
    };
    const consoleModule = (await frontend.evaluateHandle('import(\'./panels/console/console.js\')')) as
        puppeteer.JSHandle<typeof Console>;

    for (let testIdx = 0; testIdx < messages.length; testIdx++) {
      const messageWithStacktrace = await frontend.evaluate(messageGetter, consoleModule, messages[testIdx], true);
      assert.deepStrictEqual(messageWithStacktrace, tests[testIdx].expectedWithStackTrace);
    }
  });
});
