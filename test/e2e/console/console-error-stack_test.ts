// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getStructuredConsoleMessages, navigateToConsoleTab, showVerboseMessages} from '../helpers/console-helpers.js';

/* eslint-disable no-console */

describe('The Console\'s error stack formatting', async () => {
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
         console.log(message);
         return /^MyError.*error-with-sourcemap.ts:6/.test(message.replace('\n', ''));
       });
     });
});
