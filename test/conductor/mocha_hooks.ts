// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';

import {
  postFileTeardown,
  preFileSetup,
  resetPages,
  setupPages,
  unregisterAllServiceWorkers,
} from './hooks.js';
import {makeInstrumentedTestFunction} from './mocha-interface-helpers.js';
import {SOURCE_ROOT} from './paths.js';
import {TestConfig} from './test_config.js';
import {startServer, stopServer} from './test_server.js';

/* eslint-disable no-console */

process.on('SIGINT', postFileTeardown);

// We can run Mocha in two modes: serial and parallel. In parallel mode, Mocha
// starts multiple node processes which don't know about each other. It provides
// them one test file at a time, and when they are finished with that file they
// ask for another one. This means in parallel mode, the unit of work is a test
// file, and a full setup and teardown is done before/after each file even if it
// will eventually run another test file. This is inefficient for us because we
// have a relatively long setup time, but we can't avoid it at the moment. It
// also means that the setup and teardown code needs to be aware that it may be
// run multiple times within the same node process.

// The two functions below are 'global setup fixtures':
// https://mochajs.org/#global-setup-fixtures. These let us start one hosted
// mode server and share it between all the parallel test runners.
export async function mochaGlobalSetup(this: Mocha.Suite) {
  process.env.testServerPort = String(await startServer(TestConfig.serverType, []));
  console.log(`Started ${TestConfig.serverType} server on port ${process.env.testServerPort}`);
}

export function mochaGlobalTeardown() {
  console.log('Stopping server');
  stopServer();
}

let didPauseAtBeginning = false;

// These are the 'root hook plugins': https://mochajs.org/#root-hook-plugins
// These open and configure the browser before tests are run.
export const mochaHooks = {
  // In serial mode (Mocha’s default), before all tests begin, once only.
  // In parallel mode, run before all tests begin, for each file.
  beforeAll: async function(this: Mocha.Suite) {
    // It can take arbitrarly long on bots to boot up a server and start
    // DevTools. Since this timeout only applies for this hook, we can let it
    // take an arbitrarily long time, while still enforcing that tests run
    // reasonably quickly (2 seconds by default).
    this.timeout(0);
    await preFileSetup(Number(process.env.testServerPort));
  },
  // In serial mode, run after all tests end, once only.
  // In parallel mode, run after all tests end, for each file.
  afterAll: async function(this: Mocha.Suite) {
    // Closing the browser can take some time.
    this.timeout(20000);
    await postFileTeardown();
    copyGoldens();
  },
  // In both modes, run before each test.
  beforeEach: makeInstrumentedTestFunction(
      async function(this: Mocha.Context) {
        const paused = TestConfig.debug && !didPauseAtBeginning;
        // Sets the timeout higher for this hook only and if not waiting for user input..
        this.timeout(paused ? 0 : 20000);
        await setupPages();

        // Pause when running interactively in debug mode. This is mututally
        // exclusive with parallel mode.
        // We need to pause after `resetPagesBetweenTests`, otherwise the DevTools
        // and target tab are not available to us to set breakpoints in.
        // We still only want to pause once, so we remember that we did pause.
        if (TestConfig.debug && !didPauseAtBeginning) {
          didPauseAtBeginning = true;

          console.log('Running in debug mode.');
          console.log(' - Press enter to run the test.');
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
      'beforeEach in global hooks'),
  afterEach: makeInstrumentedTestFunction(
      async function(this: Mocha.Context) {
        this.timeout(20000);
        await resetPages();
        await unregisterAllServiceWorkers();
      },
      'afterEach in global hooks'),
};

function copyGoldens() {
  if (TestConfig.artifactsDir === SOURCE_ROOT || !TestConfig.copyScreenshotGoldens) {
    return;
  }
  fs.cpSync(
      path.join(SOURCE_ROOT, 'test', 'interactions', 'goldens'),
      path.join(TestConfig.artifactsDir, 'goldens'),
      {recursive: true},
  );
}
