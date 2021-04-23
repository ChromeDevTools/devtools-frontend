// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

function comparator(a: number, b: number): number {
  return a < b ? -1 : (a > b ? 1 : 0);
}

describe('ArrayUtilities', () => {
  describe('removeElement', () => {
    it('removes elements', () => {
      const testCases = [
        {input: [], expectedFirstOnlyTrue: [], expectedFirstOnlyFalse: []},
        {input: [1], expectedFirstOnlyTrue: [1], expectedFirstOnlyFalse: [1]},
        {
          input: [1, 2, 3, 4, 5, 4, 3, 2, 1],
          expectedFirstOnlyTrue: [1, 3, 4, 5, 4, 3, 2, 1],
          expectedFirstOnlyFalse: [1, 3, 4, 5, 4, 3, 1],
        },
        {input: [2, 2, 2, 2, 2], expectedFirstOnlyTrue: [2, 2, 2, 2], expectedFirstOnlyFalse: []},
        {input: [2, 2, 2, 1, 2, 2, 3, 2], expectedFirstOnlyTrue: [2, 2, 1, 2, 2, 3, 2], expectedFirstOnlyFalse: [1, 3]},
      ];

      for (const testCase of testCases) {
        const actualFirstOnlyTrue = [...testCase.input];

        Platform.ArrayUtilities.removeElement(actualFirstOnlyTrue, 2, true);
        assert.deepStrictEqual(actualFirstOnlyTrue, testCase.expectedFirstOnlyTrue, 'Removing firstOnly (true) failed');

        const actualFirstOnlyFalse = [...testCase.input];
        Platform.ArrayUtilities.removeElement(actualFirstOnlyFalse, 2, false);
        assert.deepStrictEqual(
            actualFirstOnlyFalse, testCase.expectedFirstOnlyFalse, 'Removing firstOnly (false) failed');
      }
    });
  });

  const fixtures = [
    [],
    [1],
    [2, 1],
    [6, 4, 2, 7, 10, 15, 1],
    [10, 44, 3, 6, 56, 66, 10, 55, 32, 56, 2, 5],
  ];
  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];

    it(`sorts ranges, fixture ${i}`, () => {
      for (let left = 0, l = fixture.length - 1; left < l; ++left) {
        for (let right = left, r = fixture.length; right < r; ++right) {
          for (let first = left; first <= right; ++first) {
            for (let count = 1, k = right - first + 1; count <= k; ++count) {
              const actual = fixture.slice(0);
              Platform.ArrayUtilities.sortRange(actual, comparator, left, right, first, first + count - 1);
              assert.deepStrictEqual(
                  fixture.slice(0, left), actual.slice(0, left), 'left ' + left + ' ' + right + ' ' + count);
              assert.deepStrictEqual(
                  fixture.slice(right + 1), actual.slice(right + 1), 'right ' + left + ' ' + right + ' ' + count);

              const middle = fixture.slice(left, right + 1);
              middle.sort(comparator);
              assert.deepStrictEqual(
                  middle.slice(first - left, first - left + count), actual.slice(first, first + count),
                  'sorted ' + left + ' ' + right + ' ' + first + ' ' + count);

              const actualRest = actual.slice(first + count, right + 1);
              actualRest.sort(comparator);
              assert.deepStrictEqual(
                  middle.slice(first - left + count), actualRest,
                  'unsorted ' + left + ' ' + right + ' ' + first + ' ' + count);
            }
          }
        }
      }
    });
  }
  describe('binaryIndexOf', () => {
    it('calculates the correct binary index', () => {
      const fixtures = [
        [],
        [1],
        [1, 10],
        [1, 10, 11, 12, 13, 14, 100],
        [-100, -50, 0, 50, 100],
        [-100, -14, -13, -12, -11, -10, -1],
      ];

      function testArray(array: number[]) {
        function comparator(a: number, b: number) {
          return a < b ? -1 : (a > b ? 1 : 0);
        }

        for (let i = -100; i <= 100; ++i) {
          const reference = array.indexOf(i);
          const actual = Platform.ArrayUtilities.binaryIndexOf(array, i, comparator);
          assert.strictEqual(reference, actual);
        }
      }

      for (const fixture of fixtures) {
        testArray(fixture);
      }
    });
  });
  describe('merge and intersect', () => {
    it('orders merge intersect', () => {
      function comparator(a: number, b: number) {
        return a - b;
      }

      function count(a: number[], x: number) {
        return Platform.ArrayUtilities.upperBound(a, x, Platform.ArrayUtilities.DEFAULT_COMPARATOR) -
            Platform.ArrayUtilities.lowerBound(a, x, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      }

      function testAll(a: number[], b: number[]) {
        testOperation(a, b, Platform.ArrayUtilities.mergeOrdered(a, b, comparator), Math.max, 'U');
        testOperation(a, b, Platform.ArrayUtilities.intersectOrdered(a, b, comparator), Math.min, 'x');
      }

      function testOperation(
          a: number[], b: number[], actual: number[], checkOperation: (...values: number[]) => number, opName: string) {
        const allValues = a.concat(b).concat(actual);
        let expectedCount: number;
        let actualCount: number;

        for (let i = 0; i < allValues.length; ++i) {
          const value = allValues[i];
          expectedCount = checkOperation(count(a, value), count(b, value));
          actualCount = count(actual, value);
          assert.strictEqual(
              expectedCount, actualCount,
              'Incorrect result for value: ' + value + ' at [' + a + '] ' + opName + ' [' + b + '] -> [' + actual +
                  ']');
        }

        const shallowCopy = [...actual];
        assert.deepStrictEqual(actual.sort(), shallowCopy, 'Result array is ordered');
      }

      const fixtures = new Map([
        [[], []],
        [[1], []],
        [[1, 2, 2, 2, 3], []],
        [[4, 5, 5, 8, 8], [1, 1, 1, 2, 6]],
        [[1, 2, 2, 2, 2, 3, 3, 4], [2, 2, 2, 3, 3, 3, 3]],
        [[1, 2, 3, 4, 5], [1, 2, 3]],
      ]);

      for (const [a, b] of fixtures) {
        testAll(a, b);
        testAll(b, a);
      }
    });
  });

  describe('calculates bounds', () => {
    it('calculates the lower bound', () => {
      const fixtures = [
        [],
        [1],
        [-1, -1, 0, 0, 0, 0, 2, 3, 4, 4, 4, 7, 9, 9, 9],
      ];

      function testArray(array: number[], useComparator: boolean) {
        function comparator(a: number, b: number) {
          return a < b ? -1 : (a > b ? 1 : 0);
        }

        for (let value = -2; value <= 12; ++value) {
          const index = useComparator ?
              Platform.ArrayUtilities.lowerBound(array, value, comparator) :
              Platform.ArrayUtilities.lowerBound(array, value, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
          assert.isTrue(0 <= index && index <= array.length, 'index is not within bounds');
          assert.isTrue(index === 0 || array[index - 1] < value, 'array[index - 1] >= value');
          assert.isTrue(index === array.length || array[index] >= value, 'array[index] < value');
        }
      }

      for (const fixture of fixtures) {
        testArray(fixture, false);
        testArray(fixture, true);
      }
    });

    it('calculates the upper bound', () => {
      const fixtures = [
        [],
        [1],
        [-1, -1, 0, 0, 0, 0, 2, 3, 4, 4, 4, 7, 9, 9, 9],
      ];

      function testArray(array: number[], useComparator: boolean) {
        function comparator(a: number, b: number) {
          return a < b ? -1 : (a > b ? 1 : 0);
        }

        for (let value = -2; value <= 12; ++value) {
          const index = useComparator ?
              Platform.ArrayUtilities.upperBound(array, value, comparator) :
              Platform.ArrayUtilities.upperBound(array, value, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
          assert.isTrue(0 <= index && index <= array.length, 'index is out of bounds');
          assert.isTrue(index === 0 || array[index - 1] <= value, 'array[index - 1] > value');
          assert.isTrue(index === array.length || array[index] > value, 'array[index] <= value');
        }
      }

      for (const fixture of fixtures) {
        testArray(fixture, false);
        testArray(fixture, true);
      }
    });
  });
});
