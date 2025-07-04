// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getStructuredConsoleMessages,
  navigateToConsoleTab,
  showVerboseMessages,
  waitForConsoleMessagesToBeNonEmpty,
} from '../../e2e/helpers/console-helpers.js';
import {
  increaseTimeoutForPerfPanel,
} from '../../e2e/helpers/performance-helpers.js';

describe('The Console\'s errors', function() {
  increaseTimeoutForPerfPanel(this);
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
});
