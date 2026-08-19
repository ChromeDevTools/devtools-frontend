// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {computeBuildTestId} from './TestIdGeneration.js';

export function createTestIdMap(suite: Mocha.Suite): Map<Mocha.Test, string> {
  const map = new Map<Mocha.Test, string>();
  function populate(s: Mocha.Suite) {
    for (const test of s.tests) {
      if (!test.file) {
        throw new Error(`Test ${test.titlePath()} does not have a file.`);
      }
      const testId = computeBuildTestId(test.file, test.titlePath());
      map.set(test, testId);
    }
    for (const subSuite of s.suites) {
      populate(subSuite);
    }
  }
  populate(suite);
  return map;
}

export function checkForDuplicateTests(testIdMap: ReadonlyMap<Mocha.Test, string>): void {
  const seenTestIds = new Set<string>();
  for (const testId of testIdMap.values()) {
    if (seenTestIds.has(testId)) {
      throw new Error(`Duplicate test ${testId}`);
    }
    seenTestIds.add(testId);
  }
}

export interface PruneSuiteOptions {
  testIds?: ReadonlySet<string>;
  skippedTests?: readonly string[];
}

export function listContainsTestOrSuite(list: Iterable<string>, testId: string): boolean {
  for (const item of list) {
    if (testId === item || testId.startsWith(`${item}:`)) {
      return true;
    }
  }
  return false;
}

export function pruneSuite(
    suite: Mocha.Suite,
    testIdMap: ReadonlyMap<Mocha.Test, string>,
    options: PruneSuiteOptions = {},
    ): void {
  const skippedTests = options.skippedTests ?? [];
  const testIds = options.testIds;

  suite.tests = suite.tests.filter(test => {
    const testId = testIdMap.get(test);
    if (!testId) {
      return false;
    }
    const isSkipped = listContainsTestOrSuite(skippedTests, testId);
    if (isSkipped) {
      test.pending = true;
    }
    if (!testIds || testIds.size === 0) {
      return true;
    }
    return listContainsTestOrSuite(testIds, testId);
  });

  for (const subSuite of suite.suites) {
    pruneSuite(subSuite, testIdMap, options);
  }
}

export function duplicateTests(suite: Mocha.Suite, repetitions: number): void {
  if (repetitions > 1) {
    const originalTests = [...suite.tests];
    suite.tests = [];
    for (const test of originalTests) {
      suite.tests.push(test);
      for (let i = 1; i < repetitions; i++) {
        const cloned = test.clone();
        cloned.pending = test.pending;
        suite.addTest(cloned);
        // @ts-expect-error _onlyTests is internal.
        if (suite._onlyTests.includes(test)) {
          // @ts-expect-error _onlyTests is internal.
          suite._onlyTests.push(cloned);
        }
      }
    }
  }
  for (const subSuite of suite.suites) {
    duplicateTests(subSuite, repetitions);
  }
}
