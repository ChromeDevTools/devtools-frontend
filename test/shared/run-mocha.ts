// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Mocha from 'mocha';
import * as path from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  duplicateTests,
  pruneSuite,
} from '../../front_end/testing/MochaHelpers.js';
import {computeBuildTestId} from '../../front_end/testing/TestIdGeneration.js';
import {TEST_ID_REGEX} from '../conductor/paths.js';
import {TestConfig} from '../conductor/test_config.js';
import {getSkippedTests} from '../conductor/test_expectations.js';

type Options = Mocha.MochaOptions&{spec?: string[], suiteName?: string};
type OmitOptions = 'reporter'|'allowUncaught'|'retries'|'failZero';

function optionsWithDefalts(options: Options): Options {
  const withDefaults = {
    // This should make mocha crash on uncaught errors.
    // See https://github.com/mochajs/mocha/blob/master/docs/index.md#--allow-uncaught.
    allowUncaught: true,
    retries: TestConfig.retries,
    reporter: path.join(__dirname, 'mocha-resultsdb-reporter.js'),
    slow: 1000,
    failZero: false,
    ...options,
    ...TestConfig.mochaGrep,
  };

  if (TestConfig.debug) {
    withDefaults.timeout = 0;
  }

  return withDefaults;
}

export async function run(options: Omit<Options, OmitOptions>) {
  const mocha = new Mocha(optionsWithDefalts(options));

  // Load files
  const files = options.spec;
  if (Array.isArray(files)) {
    for (const file of files) {
      mocha.addFile(file);
    }
  }

  // Load requires if necessary (Mocha programmatic API might not automatically load requires,
  // we may need to import them manually).

  // eslint-disable-next-line  @typescript-eslint/no-unsafe-function-type
  const globalSetups: Function[] = [];
  // eslint-disable-next-line  @typescript-eslint/no-unsafe-function-type
  const globalTeardowns: Function[] = [];
  if (options.require) {
    const requires = Array.isArray(options.require) ? options.require : [options.require];
    for (const req of requires) {
      const importTarget = path.isAbsolute(req) ? pathToFileURL(req).href : req;

      const mod = await import(importTarget);
      const exportsObj = mod.default || mod;
      if (exportsObj.mochaGlobalSetup) {
        globalSetups.push(exportsObj.mochaGlobalSetup);
      }
      if (exportsObj.mochaGlobalTeardown) {
        globalTeardowns.push(exportsObj.mochaGlobalTeardown);
      }
      if (exportsObj.mochaHooks) {
        mocha.rootHooks(exportsObj.mochaHooks);
      }
    }
  }

  if (globalSetups.length > 0) {
    // @ts-expect-error unknown types
    mocha.globalSetup(globalSetups);
  }
  if (globalTeardowns.length > 0) {
    // @ts-expect-error unknown types
    mocha.globalTeardown(globalTeardowns);
  }

  await mocha.loadFilesAsync();

  const testIds = new Set(
      TestConfig.tests.filter(testId => TEST_ID_REGEX.test(testId)),
  );
  const seenTestIds = new Set<string>();
  const skippedTests = getSkippedTests();

  function shouldIncludeTest(test: Mocha.Test) {
    if (!test.file) {
      throw new Error(`Test ${test.titlePath()} does not have a file.`);
    }
    const testId = computeBuildTestId(test.file, test.titlePath());
    if (seenTestIds.has(testId)) {
      throw new Error(`Duplicate test ${testId}`);
    }
    seenTestIds.add(testId);

    const isSkipped = skippedTests.some((skippedTest: string) => {
      return testId === skippedTest || testId.startsWith(`${skippedTest}:`);
    });

    if (isSkipped) {
      test.pending = true;
    }

    if (testIds.size === 0) {
      return true;
    }
    return testIds.has(testId);
  }

  pruneSuite(mocha.suite, shouldIncludeTest);

  duplicateTests(mocha.suite, TestConfig.repetitions);

  mocha.enableGlobalSetup(true);
  mocha.enableGlobalTeardown(true);

  const failures = await new Promise<number>(resolve => {
    mocha.run(resolve);
  });

  if (process.exitCode === undefined) {
    process.exitCode = failures > 0 ? 1 : 0;
  }
}
