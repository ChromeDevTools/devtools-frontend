// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type * as Root from '../../../front_end/core/root/root.js';
import type * as Console from '../../../front_end/panels/console/console.js';
import {
  clickOnContextMenu,
  CONSOLE_TAB_SELECTOR,
} from '../../e2e/helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('ConsoleInsight', function() {
  const CLICK_TARGET_SELECTOR = '.console-message-text';
  const EXPLAIN_LABEL = 'Understand this error';
  const EXPLAIN_ACTION_ID = 'explain.console-message.context.error';

  async function setupMocks(
      aidaAvailability: Partial<Root.Runtime.AidaAvailability>,
      devToolsConsoleInsights: Partial<Root.Runtime.HostConfigConsoleInsights>,
      devToolsPage: DevToolsPage,
  ) {
    const syncInformation = {
      accountEmail: 'some-email',
      isSyncActive: true,
      arePreferencesSynced: false,
    };
    const hostConfig = {
      devToolsConsoleInsights: {...devToolsConsoleInsights},
      aidaAvailability: {...aidaAvailability},
    };
    await devToolsPage.evaluateOnNewDocument(`
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

    await devToolsPage.reload({
      waitUntil: 'networkidle0',
    });
    await devToolsPage.useSoftMenu();
  }

  it('shows an insight for a console message via the context menu', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({enabled: true}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await clickOnContextMenu(CLICK_TARGET_SELECTOR, EXPLAIN_ACTION_ID, devToolsPage);

    await devToolsPage.waitFor('devtools-console-insight');
  });

  it('shows an insight for a console message via the hover button', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({enabled: true}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await devToolsPage.waitFor('.console-message');
    await devToolsPage.waitFor('.hover-button');
    await devToolsPage.hover('.console-message');
    await devToolsPage.click('.hover-button');
    await devToolsPage.waitFor('devtools-console-insight');
  });

  it('does not show context menu if AIDA is not available', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({enabled: false}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await devToolsPage.click(CLICK_TARGET_SELECTOR, {clickOptions: {button: 'right'}});
    const menu = await devToolsPage.waitFor('.soft-context-menu');
    const items = await menu.$$('.soft-context-menu-item');
    const texts = await Promise.all(items.map(item => item.evaluate(e => (e as HTMLElement).innerText)));
    assert.isNotOk(
        texts.some(item => (item as string).toLowerCase().startsWith(EXPLAIN_LABEL.toLowerCase())),
        'Context menu shows the explain option');
    await devToolsPage.waitFor('.console-message');
    await devToolsPage.waitForNone('.hover-button');
  });

  describe('if locale is not supported', () => {
    setup({devToolsSettings: {language: 'zh'}});

    it('still shows the hover button', async ({devToolsPage, inspectedPage}) => {
      await setupMocks({enabled: true}, {enabled: true}, devToolsPage);
      await devToolsPage.click(CONSOLE_TAB_SELECTOR);
      await inspectedPage.evaluate(() => {
        console.error(new Error('Unexpected error'));
      });
      await devToolsPage.waitFor('.console-message');
      await devToolsPage.waitFor('.hover-button');
    });
  });

  it('shows the hover button even if age check is not passing', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({blockedByAge: true, enabled: true}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await devToolsPage.waitFor('.console-message');
    await devToolsPage.waitFor('.hover-button');
  });

  it('does not show the hover button if policy does not allow it', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({blockedByEnterprisePolicy: true, enabled: true}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await devToolsPage.waitFor('.console-message');
    await devToolsPage.waitForNone('.hover-button');
  });

  it('does not show the hover button if it is restriced by geography', async ({devToolsPage, inspectedPage}) => {
    await setupMocks({blockedByGeo: true, enabled: true}, {enabled: true}, devToolsPage);
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await inspectedPage.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await devToolsPage.waitFor('.console-message');
    await devToolsPage.waitForNone('.hover-button');
  });

  it('gets console message texts', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
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
        script: 'console.warn(\'\\x1B[41;93;4mHello ANSI escape seq\\x1B[m\');',
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
        script: 'console.error(\'\\x1B[41;93;4mHello ANSI escape seq\\x1B[m\');',
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

    await inspectedPage.page.setContent(`
      <script>
        ${tests.map(test => test.script).join('\n')}
      </script>
    `);

    let messages: puppeteer.ElementHandle[] = [];

    await devToolsPage.waitForFunction(async () => {
      messages = await devToolsPage.$$('.console-message-wrapper');
      return messages.length === tests.length;
    });

    const messageGetter = async (consoleModule: typeof Console, consoleElement: Element) => {
      const consoleViewMessage = consoleModule.ConsoleViewMessage.getMessageForElement(consoleElement);
      const message = consoleViewMessage?.toMessageTextString() || '';
      // Replace dynamic line and column numbers in stacktraces with ':1:1'.
      // Ignore stacktrace added by Puppeteer.
      return message.replace(/:\d+:\d+/gi, ':1:1')
          .replaceAll(/\n    at pptr:;CdpFrame\.%3Can…js%3A\d+%3A\d+\):1:1/gi, '');
    };
    const consoleModule = (await devToolsPage.page.evaluateHandle('import(\'./panels/console/console.js\')')) as
        puppeteer.JSHandle<typeof Console>;

    for (let testIdx = 0; testIdx < messages.length; testIdx++) {
      const messageWithStacktrace = await devToolsPage.evaluate(messageGetter, consoleModule, messages[testIdx], true);
      assert.deepEqual(messageWithStacktrace, tests[testIdx].expectedWithStackTrace);
    }
  });
});
