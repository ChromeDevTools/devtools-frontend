// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createCoverageMap, createFileCoverage} from 'istanbul-lib-coverage';
import * as report from 'istanbul-lib-report';
import {createSourceMapStore} from 'istanbul-lib-source-maps';
import * as reports from 'istanbul-reports';

import {collectCoverageFromPage, postFileTeardown, preFileSetup, resetPages} from './hooks.js';
import {getTestRunnerConfigSetting} from './test_runner_config.js';
import {startServer, stopServer} from './test_server.js';

/* eslint-disable no-console */

process.on('SIGINT', postFileTeardown);

// TODO (jacktfranklin): remove fallback to process.env once test runner config migration is done: crbug.com/1186163
const TEST_SERVER_TYPE = getTestRunnerConfigSetting('test-server-type', process.env.TEST_SERVER_TYPE);

if (TEST_SERVER_TYPE !== 'hosted-mode' && TEST_SERVER_TYPE !== 'component-docs') {
  throw new Error(`Invalid test server type: ${TEST_SERVER_TYPE}`);
}

// Required to reassign to allow for TypeScript to correctly deduce its type
const DERIVED_SERVER_TYPE = TEST_SERVER_TYPE;

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
  // Start the test server in the 'main' process. In parallel mode, we
  // share one server between all parallel runners. The parallel runners are all
  // in different processes, so we pass the port number as an environment var.
  process.env.testServerPort = String(await startServer(DERIVED_SERVER_TYPE));
  console.log(`Started ${DERIVED_SERVER_TYPE} server on port ${process.env.testServerPort}`);
}

export function mochaGlobalTeardown() {
  console.log('Stopping server');
  stopServer();
}

const testSuiteCoverageMap = createCoverageMap();
const SHOULD_GATHER_COVERAGE_INFORMATION = process.env.COVERAGE === '1' && DERIVED_SERVER_TYPE === 'component-docs';

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

    // Pause when running interactively in debug mode. This is mututally
    // exclusive with parallel mode.
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
  // In serial mode, run after all tests end, once only.
  // In parallel mode, run after all tests end, for each file.
  afterAll: async function() {
    await postFileTeardown();

    if (!SHOULD_GATHER_COVERAGE_INFORMATION) {
      return;
    }

    const remappedCoverageMap = await createSourceMapStore().transformCoverage(testSuiteCoverageMap);
    const context = report.createContext({
      dir: 'interactions-coverage/',
      coverageMap: remappedCoverageMap,
      defaultSummarizer: 'nested',
    });
    // The types in @types/istanbul-lib-report are incorrectly typing `create`
    // to return a Visitor instead of a ReportBase.
    (reports.create('html') as unknown as report.ReportBase).execute(context);
    (reports.create('json') as unknown as report.ReportBase).execute(context);
    (reports.create('json-summary') as unknown as report.ReportBase).execute(context);
  },
  // In both modes, run before each test.
  beforeEach: async function(this: Mocha.Suite) {
    // Sets the timeout higher for this hook only.
    this.timeout(10000);
    await resetPages();
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
