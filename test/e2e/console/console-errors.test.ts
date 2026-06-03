// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  getStructuredConsoleMessages,
  navigateToConsoleTab,
  showVerboseMessages,
  waitForConsoleMessagesToBeNonEmpty,
  waitForLastConsoleMessageToHaveContent,
} from '../helpers/console-helpers.js';
import {assertScreenshot} from '../helpers/screenshot-helpers.js';

describe('The Console\'s errors', function() {
  setup({enableScreenshotAssertion: true});

  it('picks up custom exception names ending with \'Error\' and symbolizes stack traces according to source maps',
     async ({
       devToolsPage,
       inspectedPage,
     }) => {
       await inspectedPage.goToResource('sources/error-with-sourcemap.html');
       await navigateToConsoleTab(devToolsPage);
       await showVerboseMessages(devToolsPage);
       await devToolsPage.waitForFunction(async () => {
         const messages = await getStructuredConsoleMessages(devToolsPage);
         if (messages.length !== 1) {
           return false;
         }
         const [{message}] = messages;
         return /^MyError.*error-with-sourcemap.ts:6/.test((message as string).replace('\n', ''));
       });
     });

  it('correctly symbolizes stack traces with async frames for anonymous functions', async ({
                                                                                      devToolsPage,
                                                                                      inspectedPage,
                                                                                    }) => {
    await inspectedPage.goToResource('console/error-with-async-frame.html');
    await navigateToConsoleTab(devToolsPage);
    await showVerboseMessages(devToolsPage);
    await devToolsPage.waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages(devToolsPage);
      if (messages.length !== 1) {
        return false;
      }
      const [{message}] = messages;
      return message === `Error
    at foo (async.js:2:46)
    at async async.js:3:21`;
    });
  });

  it('shows errors to load a resource', async ({
                                          devToolsPage,
                                          inspectedPage,
                                        }) => {
    await inspectedPage.goToResource('console/resource-errors.html');
    await navigateToConsoleTab(devToolsPage);
    await showVerboseMessages(devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(5, devToolsPage);
    const messages = await getStructuredConsoleMessages(devToolsPage);
    messages.sort((m1, m2) => (m1.message as string).localeCompare(m2.message as string));
    assert.deepEqual(messages, [
      {
        message: `GET https://localhost:${
            inspectedPage.serverPort}/test/e2e/resources/console/non-existent-xhr 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors.html:20',
        stackPreview: `
loadXHR @ resource-errors.html:20
step2 @ resource-errors.html:12`,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: `GET https://localhost:${
            inspectedPage.serverPort}/test/e2e/resources/missing.css net::ERR_ABORTED 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors-iframe.html:3',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: `GET https://localhost:${
            inspectedPage.serverPort}/test/e2e/resources/non-existent-iframe.html 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors-iframe.html:8',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: `GET https://localhost:${
            inspectedPage.serverPort}/test/e2e/resources/non-existent-script.js net::ERR_ABORTED 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors-iframe.html:4',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: 'GET unknown-scheme://foo net::ERR_UNKNOWN_URL_SCHEME',
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'unknown-scheme://foo:1',
        stackPreview: `
Image
performActions @ resource-errors.html:8
(anonymous) @ resource-errors.html:30`,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
    ]);
  });

  it('shows Error.cause', async ({
                            devToolsPage,
                            inspectedPage,
                          }) => {
    await inspectedPage.goToResource('sources/error-with-cause.html');
    await navigateToConsoleTab(devToolsPage);
    await showVerboseMessages(devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(/* numberOfMessages */ 1, devToolsPage);

    const messages = await getStructuredConsoleMessages(devToolsPage);
    assert.lengthOf(messages, 1);
    assert.strictEqual(messages[0].message, `Uncaught Error: rethrower
    at caller (error-with-cause.html:20:13)
    at error-with-cause.html:24:3Caused by: Error: original
    at foo (error-with-cause.html:9:11)
    at bar (error-with-cause.html:13:5)
    at caller (error-with-cause.html:18:7)
    at error-with-cause.html:24:3`);
  });

  it('renders caught SyntaxError inline with location fallback', async ({
                                                                   devToolsPage,
                                                                   inspectedPage,
                                                                 }) => {
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.evaluate(() => {
      try {
        eval('function syntaxErrorDemo() { const class = 1; } \n//# sourceURL=http://example.com/buggy-script.js');
      } catch (e) {
        console.error(e);
      }
    });

    await waitForConsoleMessagesToBeNonEmpty(1, devToolsPage);
    const messages = await getStructuredConsoleMessages(devToolsPage);
    assert.lengthOf(messages, 1);
    const firstMessage = messages[0];
    assert.exists(firstMessage);
    const message = firstMessage.message;
    assert.exists(message);
    const lines = message.split('\n');
    assert.isAtLeast(lines.length, 2);
    assert.strictEqual(lines[0], 'SyntaxError: Unexpected token \'class\' (at buggy-script.js:1:36)');
    for (let i = 1; i < lines.length; i++) {
      assert.notInclude(lines[i], '(at buggy-script.js:1:36)');
    }
  });

  it('screenshots various error stack traces from error-demo.html', async ({devToolsPage, inspectedPage}) => {
    // Make the viewport tall enough to fit all messages so we bypass virtualized scrolling entirely
    await devToolsPage.page.setViewport({width: 800, height: 3000});

    await inspectedPage.goToResource('console/error-demo.html');
    await navigateToConsoleTab(devToolsPage);
    await showVerboseMessages(devToolsPage);

    await waitForLastConsoleMessageToHaveContent(
        'Demo finished. Please inspect the errors in the Console panel.', devToolsPage);

    // Spell out all the screenshot names so the PRESUBMIT doesn't flag them as obsolete.
    const errorMatchers = [
      {matcher: 'Standard Error occurred', file: 'e2e/console/error-demo-1.png'},
      {matcher: 'Error from ignore-listed library', file: 'e2e/console/error-demo-2.png'},
      {matcher: 'Error from nested eval', file: 'e2e/console/error-demo-3.png'},
      {matcher: 'The main error that the user saw', file: 'e2e/console/error-demo-4.png'},
      {matcher: 'buggy-script.js', file: 'e2e/console/error-demo-5.png'},
      {matcher: 'Unparsable Error Demo', file: 'e2e/console/error-demo-6.png'},
      {matcher: 'JS error called from Wasm', file: 'e2e/console/error-demo-7.png'},
      {matcher: 'Top-level application error', file: 'e2e/console/error-demo-8.png'},
      {matcher: 'Class and Method Error', file: 'e2e/console/error-demo-9.png'},
      {matcher: 'Direct stack log error', file: 'e2e/console/error-demo-10.png'},
      {matcher: 'Source map Class and Method Error', file: 'e2e/console/error-demo-11.png'},
    ];

    for (const {matcher, file} of errorMatchers) {
      const isCase9 = matcher === 'Class and Method Error';

      // We use evaluateHandle instead of a standard text selector to efficiently
      // filter out a substring conflict (the 'Source map' error contains the same text).
      const element = await devToolsPage.page.evaluateHandle((text, isCase9) => {
        const elements = Array.from(document.querySelectorAll('.console-message-wrapper'));
        for (const el of elements) {
          const content = el.textContent || '';
          if (content.includes(text)) {
            if (isCase9 && content.includes('Source map')) {
              continue;
            }
            return el as HTMLElement;
          }
        }
        throw new Error(`Could not find element with text: ${text}`);
      }, matcher, isCase9);

      await assertScreenshot(devToolsPage, element as puppeteer.ElementHandle, file);
    }
  });
});
