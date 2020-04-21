// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {globalSetup, globalTeardown, resetPages} from './hooks.js';

/* eslint-disable no-console */

before(async function() {
  // It can take arbitrarly long on bots to boot up a server and
  // startup DevTools. Since this timeout only applies for this
  // hook, we can let it arbitrarily take a long time, while still
  // enforcing tests to run reasonably quick (2 seconds by default).
  this.timeout(0);

  await globalSetup();

  if (process.env['DEBUG']) {
    console.log('Running in debug mode.');
    console.log(' - Press any key to run the test suite.');
    console.log(' - Press ctrl + c to quit.');

    await new Promise(resolve => {
      const {stdin} = process;

      stdin.on('data', () => {
        stdin.pause();
        resolve();
      });
    });
  }
});

let hasShutdown = false;

async function shutdown() {
  if (hasShutdown) {
    return;
  }
  hasShutdown = true;
  await globalTeardown();
}

process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);

after(async () => {
  await shutdown();
});

beforeEach(async function() {
  this.timeout(3000);
  await resetPages();
});
