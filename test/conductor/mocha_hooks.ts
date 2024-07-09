// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {createCoverageMap, createFileCoverage} from 'istanbul-lib-coverage';
import * as report from 'istanbul-lib-report';
import {createSourceMapStore} from 'istanbul-lib-source-maps';
import * as reports from 'istanbul-reports';
import * as path from 'path';
import * as rimraf from 'rimraf';

import {
  collectCoverageFromPage,
  postFileTeardown,
  preFileSetup,
  resetPages,
  unregisterAllServiceWorkers,
  watchForHang,
} from './hooks.js';
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
  const commandLineArgs = [];
  if (TestConfig.coverage) {
    commandLineArgs.push('--coverage');
  }
  process.env.testServerPort = String(await startServer(TestConfig.serverType, commandLineArgs));

  console.log(`Started ${TestConfig.serverType} server on port ${process.env.testServerPort}`);
}

export function mochaGlobalTeardown() {
  console.log('Stopping server');
  stopServer();
}

const testSuiteCoverageMap = createCoverageMap();

const SHOULD_GATHER_COVERAGE_INFORMATION = TestConfig.coverage && TestConfig.serverType === 'component-docs';
const INTERACTIONS_COVERAGE_LOCATION = path.join(TestConfig.artifactsDir, 'interactions-coverage/');

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
    await postFileTeardown();
    copyGoldens();

    if (!SHOULD_GATHER_COVERAGE_INFORMATION) {
      return;
    }

    // Writing the coverage files to disk can take a lot longer on CQ than the
    // default timeout. Since all of this work is synchronous (and would
    // immediately fail if it went wrong), we can set the timeout to infinite
    // here.
    this.timeout(0);

    // Make sure that any previously existing coverage reports are purged.
    if (fs.existsSync(INTERACTIONS_COVERAGE_LOCATION)) {
      rimraf.sync(INTERACTIONS_COVERAGE_LOCATION);
    }

    await writeCoverageReports();
  },
  // In both modes, run before each test.
  beforeEach: async function(this: Mocha.Context) {
    // Sets the timeout higher for this hook only.
    this.timeout(20000);
    const currentTest = this.currentTest?.fullTitle();
    await watchForHang(currentTest, resetPages);
    await watchForHang(currentTest, unregisterAllServiceWorkers);

    // Pause when running interactively in debug mode. This is mututally
    // exclusive with parallel mode.
    // We need to pause after `resetPagesBetweenTests`, otherwise the DevTools
    // and target tab are not available to us to set breakpoints in.
    // We still only want to pause once, so we remember that we did pause.
    if (TestConfig.debug && !didPauseAtBeginning) {
      this.timeout(0);
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
  afterEach: async function(this: Mocha.Suite) {
    if (!SHOULD_GATHER_COVERAGE_INFORMATION) {
      return;
    }

    const coverageData = await collectCoverageFromPage();
    const testCoverageMap = createCoverageMap();

    if (coverageData) {
      for (const file of Object.values(coverageData)) {
        testCoverageMap.addFileCoverage(createFileCoverage(file));
      }
    }

    testSuiteCoverageMap.merge(testCoverageMap);
  },
};

async function writeCoverageReports() {
  const remappedCoverageMap = await createSourceMapStore().transformCoverage(testSuiteCoverageMap);
  const context = report.createContext({
    dir: INTERACTIONS_COVERAGE_LOCATION,
    coverageMap: remappedCoverageMap,
    defaultSummarizer: 'nested',
  });
  reports.create('html').execute(context);
  reports.create('json').execute(context);
  reports.create('text', {file: 'coverage.txt'}).execute(context);
  reports.create('json-summary').execute(context);
}

function copyGoldens() {
  if (TestConfig.artifactsDir === SOURCE_ROOT) {
    return;
  }
  fs.cpSync(
      path.join(SOURCE_ROOT, 'test', 'interactions', 'goldens'),
      path.join(TestConfig.artifactsDir, 'goldens'),
      {recursive: true},
  );
}
