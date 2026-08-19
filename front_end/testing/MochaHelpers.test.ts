// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as Mocha from 'mocha';

import {
  checkForDuplicateTests,
  createTestIdMap,
  duplicateTests,
  listContainsTestOrSuite,
  pruneSuite,
} from './MochaHelpers.js';

interface MockTestOptions {
  file?: string;
  titlePath: string[];
  pending?: boolean;
}

function createMockTest(options: MockTestOptions): Mocha.Test {
  return {
    file: options.file,
    titlePath: () => options.titlePath,
    pending: options.pending ?? false,
  } as unknown as Mocha.Test;
}

describe('MochaHelpers', () => {
  describe('createTestIdMap', () => {
    it('creates a map of Mocha.Test to computed test ID for all tests in suites', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const test2 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'sub suite', 'test 2']});
      const subSuite: Mocha.Suite = {
        tests: [test2],
        suites: [],
      } as unknown as Mocha.Suite;
      const rootSuite: Mocha.Suite = {
        tests: [test1],
        suites: [subSuite],
      } as unknown as Mocha.Suite;

      const map = createTestIdMap(rootSuite);
      assert.strictEqual(map.get(test1), 'base/test.ts:suite:test_1');
      assert.strictEqual(map.get(test2), 'base/test.ts:suite:sub_suite:test_2');
      assert.strictEqual(map.size, 2);
    });

    it('throws an error if test does not have a file', () => {
      const test = createMockTest({titlePath: ['Suite', 'test 1']});
      const suite: Mocha.Suite = {
        tests: [test],
        suites: [],
      } as unknown as Mocha.Suite;

      assert.throws(() => createTestIdMap(suite), /Test Suite,test 1 does not have a file\./);
    });
  });

  describe('checkForDuplicateTests', () => {
    it('passes when there are no duplicates', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const test2 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 2']});
      const map = new Map<Mocha.Test, string>([
        [test1, 'base/test.ts:suite:test_1'],
        [test2, 'base/test.ts:suite:test_2'],
      ]);

      assert.doesNotThrow(() => checkForDuplicateTests(map));
    });

    it('throws when duplicate tests are found', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const test2 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const map = new Map<Mocha.Test, string>([
        [test1, 'base/test.ts:suite:test_1'],
        [test2, 'base/test.ts:suite:test_1'],
      ]);

      assert.throws(() => checkForDuplicateTests(map), /Duplicate test base\/test\.ts:suite:test_1/);
    });
  });

  describe('pruneSuite', () => {
    it('recursively filters tests in suites using testIds', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const test2 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'sub suite', 'test 2']});
      const test3 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'sub suite', 'test 3']});

      const subSuite: Mocha.Suite = {
        tests: [test2, test3],
        suites: [],
      } as unknown as Mocha.Suite;

      const rootSuite: Mocha.Suite = {
        tests: [test1],
        suites: [subSuite],
      } as unknown as Mocha.Suite;

      const map = createTestIdMap(rootSuite);
      pruneSuite(rootSuite, map, {
        testIds: new Set(['base/test.ts:suite:sub_suite:test_2']),
      });

      assert.deepEqual(rootSuite.tests, []);
      assert.deepEqual(subSuite.tests, [test2]);
    });

    it('marks skipped tests as pending (by exact match or prefix)', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const test2 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'sub suite', 'test 2']});

      const subSuite: Mocha.Suite = {
        tests: [test2],
        suites: [],
      } as unknown as Mocha.Suite;

      const rootSuite: Mocha.Suite = {
        tests: [test1],
        suites: [subSuite],
      } as unknown as Mocha.Suite;

      const map = createTestIdMap(rootSuite);
      pruneSuite(rootSuite, map, {
        skippedTests: ['base/test.ts:suite:test_1', 'base/test.ts:suite:sub_suite'],
      });

      assert.isTrue(test1.pending);
      assert.isTrue(test2.pending);
      assert.deepEqual(rootSuite.tests, [test1]);
      assert.deepEqual(subSuite.tests, [test2]);
    });

    it('keeps all tests when testIds is empty', () => {
      const test1 = createMockTest({file: 'base/test.ts', titlePath: ['Suite', 'test 1']});
      const suite: Mocha.Suite = {
        tests: [test1],
        suites: [],
      } as unknown as Mocha.Suite;

      const map = createTestIdMap(suite);
      pruneSuite(suite, map, {testIds: new Set()});

      assert.deepEqual(suite.tests, [test1]);
    });
  });

  describe('duplicateTests', () => {
    it('duplicates tests in suites according to repetitions', () => {
      const originalTest = {
        pending: false,
        clone(): {pending: boolean} {
          return {pending: originalTest.pending};
        },
      } as unknown as Mocha.Test;

      const suite: Mocha.Suite = {
        tests: [originalTest],
        suites: [],
        _onlyTests: [] as Mocha.Test[],
        addTest(test: Mocha.Test) {
          suite.tests.push(test);
        },
      } as unknown as Mocha.Suite;

      duplicateTests(suite, 3);
      assert.lengthOf(suite.tests, 3);
    });
  });

  describe('listContainsTestOrSuite', () => {
    it('returns true when exact test ID is present in an array', () => {
      const list = ['base/test.ts:suite:test_1', 'base/test.ts:suite:test_2'];
      assert.isTrue(listContainsTestOrSuite(list, 'base/test.ts:suite:test_1'));
    });

    it('returns true when exact test ID is present in a set', () => {
      const set = new Set(['base/test.ts:suite:test_1', 'base/test.ts:suite:test_2']);
      assert.isTrue(listContainsTestOrSuite(set, 'base/test.ts:suite:test_1'));
    });

    it('returns true when a suite prefix of test ID is present', () => {
      const list = ['base/test.ts:suite'];
      assert.isTrue(listContainsTestOrSuite(list, 'base/test.ts:suite:test_1'));
      assert.isTrue(listContainsTestOrSuite(list, 'base/test.ts:suite:sub_suite:test_2'));
    });

    it('returns false when test ID is not present and no suite prefix matches', () => {
      const list = ['base/test.ts:suite:test_2', 'base/other.ts:suite'];
      assert.isFalse(listContainsTestOrSuite(list, 'base/test.ts:suite:test_1'));
    });

    it('returns false when item in list is only a prefix without colon separator', () => {
      const list = ['base/test.ts:suite'];
      assert.isFalse(listContainsTestOrSuite(list, 'base/test.ts:suite_extra:test_1'));
    });

    it('returns false when list is empty', () => {
      assert.isFalse(listContainsTestOrSuite([], 'base/test.ts:suite:test_1'));
      assert.isFalse(listContainsTestOrSuite(new Set(), 'base/test.ts:suite:test_1'));
    });
  });
});
