// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getTestServerPort, goToResource, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getStructuredConsoleMessages,
  navigateToConsoleTab,
  showVerboseMessages,
  waitForConsoleMessagesToBeNonEmpty,
} from '../helpers/console-helpers.js';

/* eslint-disable no-console */

describe('The Console\'s errors', () => {
  it('picks up custom exception names ending with \'Error\' and symbolizes stack traces according to source maps',
     async () => {
       await goToResource('sources/error-with-sourcemap.html');
       await navigateToConsoleTab();
       await showVerboseMessages();
       await waitForFunction(async () => {
         const messages = await getStructuredConsoleMessages();
         if (messages.length !== 1) {
           return false;
         }
         const [{message}] = messages;
         return /^MyError.*error-with-sourcemap.ts:6/.test((message as string).replace('\n', ''));
       });
     });

  it('correctly symbolizes stack traces with async frames for anonymous functions', async () => {
    await goToResource('console/error-with-async-frame.html');
    await navigateToConsoleTab();
    await showVerboseMessages();
    await waitForFunction(async () => {
      const messages = await getStructuredConsoleMessages();
      if (messages.length !== 1) {
        return false;
      }
      const [{message}] = messages;
      return message === `Error
    at foo (async.js:2:46)
    at async async.js:3:21`;
    });
  });

  it('shows errors to load a resource', async () => {
    await goToResource('console/resource-errors.html');
    await navigateToConsoleTab();
    await showVerboseMessages();
    await waitForConsoleMessagesToBeNonEmpty(5);
    const messages = await getStructuredConsoleMessages();
    messages.sort((m1, m2) => (m1.message as string).localeCompare(m2.message as string));
    assert.deepEqual(messages, [
      {
        message:
            `GET https://localhost:${getTestServerPort()}/test/e2e/resources/console/non-existent-xhr 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors.html:20',
        stackPreview: `
loadXHR @ resource-errors.html:20
step2 @ resource-errors.html:12
error (async)
performActions @ resource-errors.html:7
(anonymous) @ resource-errors.html:30`,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: `GET https://localhost:${
            getTestServerPort()}/test/e2e/resources/missing.css net::ERR_ABORTED 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors-iframe.html:3',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message:
            `GET https://localhost:${getTestServerPort()}/test/e2e/resources/non-existent-iframe.html 404 (Not Found)`,
        messageClasses: 'console-message',
        repeatCount: null,
        source: 'resource-errors-iframe.html:8',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
      {
        message: `GET https://localhost:${
            getTestServerPort()}/test/e2e/resources/non-existent-script.js net::ERR_ABORTED 404 (Not Found)`,
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
Image (async)
performActions @ resource-errors.html:8
(anonymous) @ resource-errors.html:30`,
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
    ]);
  });
});
