// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {globalSetup, globalTeardown, resetPages} from './hooks.js';

/* eslint-disable no-console */

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

export const mochaHooks = {
  async beforeAll(this: Mocha.Suite) {
    // It can take arbitrarly long on bots to boot up a server and start
    // DevTools. Since this timeout only applies for this hook, we can let it
    // take an arbitrarily long time, while still enforcing that tests run
    // reasonably quickly (2 seconds by default).
    this.timeout(0);

    await globalSetup();

    if (process.env['DEBUG']) {
      console.log('Running in debug mode.');
      console.log(' - Press enter to run the test suite.');
      console.log(' - Press ctrl + c to quit.');

      await new Promise<void>(resolve => {
        const {stdin} = process;

        stdin.on('data', () => {
          stdin.pause();
          resolve();
        });
      });
    }
  },
  async afterAll() {
    await shutdown();
  },
  async beforeEach(this: Mocha.Suite) {
    // Sets the timeout higher for this hook only.
    this.timeout(3000);
    await resetPages();
  },
};
