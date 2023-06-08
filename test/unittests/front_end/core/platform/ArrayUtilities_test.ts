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

  describe('upperBound', () => {
    it('finds the first object after the needle whose value is greater than the needle', async () => {
      const input = [0, 1, 2, 3, 4, 5];
      const index = Platform.ArrayUtilities.upperBound(input, 2, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      assert.strictEqual(index, 3);
    });

    it('can take left and right params to alter the range', async () => {
      const input = [0, 1, 2, 3, 4, 5];
      const index = Platform.ArrayUtilities.upperBound(input, 2, Platform.ArrayUtilities.DEFAULT_COMPARATOR, 4, 6);
      assert.strictEqual(index, 4);
    });

    it('can take a custom comparator to determine how to compare elements', async () => {
      const input = [{time: 0, name: 'test1'}, {time: 6, name: 'test2'}];
      const index = Platform.ArrayUtilities.upperBound(input, 2, (needle, element) => {
        if (needle > element.time) {
          return 1;
        }
        if (element.time > needle) {
          return -1;
        }
        return 0;
      });
      assert.strictEqual(index, 1);
    });
  });

  describe('lowerBound', () => {
    it('finds the first object after the needle whose value is equal to or greater than the needle', async () => {
      const input = [0, 1, 2, 3, 4, 5];
      const index = Platform.ArrayUtilities.lowerBound(input, 2, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      assert.strictEqual(index, 2);
    });

    it('can take left and right params to alter the range', async () => {
      const input = [0, 1, 2, 3, 4, 5];
      const index = Platform.ArrayUtilities.lowerBound(input, 2, Platform.ArrayUtilities.DEFAULT_COMPARATOR, 5, 6);
      assert.strictEqual(index, 5);
    });

    it('can take a custom comparator to determine how to compare elements', async () => {
      const input = [{time: 0, name: 'test1'}, {time: 2, name: 'test2'}, {time: 3, name: 'test3'}];
      const index = Platform.ArrayUtilities.lowerBound(input, 2, (needle, element) => {
        if (needle > element.time) {
          return 1;
        }
        if (element.time > needle) {
          return -1;
        }
        return 0;
      });
      assert.strictEqual(index, 1);
    });
  });

  describe('Nearest', () => {
    describe('Finding the last item where predicate is true', () => {
      it('works with an even number of entries', () => {
        const ascEntries = [{a: 1}, {a: 3}, {a: 3}, {a: 12}, {a: 13}, {a: 18}, {a: 23}, {a: 24}];
        let nearest = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, value => value.a < 7);

        assert.strictEqual(nearest, 2);

        const descEntries = [{a: 23}, {a: 18}, {a: 13}, {a: 12}, {a: 12}, {a: 3}, {a: 1}, {a: 0}];
        nearest = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, value => value.a > 7);

        assert.strictEqual(nearest, 4);
      });

      it('works with an odd number of entries', () => {
        const ascEntries = [
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 23},
          {a: 32},
          {a: 33},
        ];
        let nearest = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, value => value.a < 31);
        assert.strictEqual(nearest, 6);

        const descEntries = [
          {a: 32},
          {a: 23},
          {a: 18},
          {a: 13},
          {a: 12},
          {a: 3},
          {a: 3},
          {a: 1},
        ];
        nearest = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, value => value.a > 2);
        assert.strictEqual(nearest, 6);
      });

      it('returns null if there are no matches at all', () => {
        const ascEntries = [
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 32},
        ];
        let zeroth = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, value => value.a < 0);
        assert.isNull(zeroth);

        const descEntries = [
          {a: 32},
          {a: 23},
          {a: 18},
          {a: 13},
          {a: 12},
          {a: 3},
          {a: 1},
        ];
        zeroth = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, value => value.a > 40);
        assert.isNull(zeroth);
      });

      it('works when the result is the last item', () => {
        const ascEntries = [
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 32},
          {a: 32},
        ];
        let last = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, value => value.a < 40);
        assert.strictEqual(last, ascEntries.length - 1);

        const descEntries = [
          {a: 32},
          {a: 23},
          {a: 18},
          {a: 13},
          {a: 12},
          {a: 3},
          {a: 1},
          {a: 1},
        ];
        last = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, value => value.a > 0);
        assert.strictEqual(last, descEntries.length - 1);
      });

      it('works on exact values', () => {
        const ascEntries = [
          {a: 1},
          {a: 2},
          {a: 3},
          {a: 3},
          {a: 4},
          {a: 5},
          {a: 6},
        ];
        const predicateFunc = (value: {a: number}) => value.a <= 3;

        // Odd number of entries.
        // Note that the predicate is allowing an the exact match.
        let nearest = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, predicateFunc);
        assert.strictEqual(nearest, 3);

        // Even number of entries.
        ascEntries.push({a: 7});
        nearest = Platform.ArrayUtilities.nearestIndexFromEnd(ascEntries, predicateFunc);
        assert.strictEqual(nearest, 3);

        const descEntries = [
          {a: 6},
          {a: 5},
          {a: 4},
          {a: 3},
          {a: 3},
          {a: 2},
          {a: 1},
        ];
        // Note that the predicate is allowing an the exact match.
        const gePredicate = (value: {a: number}) => value.a >= 3;

        // Odd number of entries.
        nearest = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, gePredicate);
        assert.strictEqual(nearest, 4);

        // Even number of entries.
        descEntries.push({a: 7});
        nearest = Platform.ArrayUtilities.nearestIndexFromEnd(descEntries, gePredicate);
        assert.strictEqual(nearest, 4);
      });
    });
    describe('Finding the first item in the array where predicate is true', () => {
      it('works with an even number of entries', () => {
        const ascEntries = [{a: 1}, {a: 3}, {a: 12}, {a: 12}, {a: 13}, {a: 18}, {a: 23}, {a: 24}];
        let nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(ascEntries, value => value.a > 7);
        assert.strictEqual(nearest, 2);

        const descEntries = [{a: 23}, {a: 18}, {a: 13}, {a: 12}, {a: 12}, {a: 3}, {a: 1}, {a: 0}];
        nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(descEntries, value => value.a < 13);
        assert.strictEqual(nearest, 3);
      });

      it('works with an odd number of entries', () => {
        const ascEntries = [
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 32},
          {a: 32},
          {a: 33},
        ];
        let nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(ascEntries, value => value.a > 31);
        assert.strictEqual(nearest, 6);

        const descEntries = [
          {a: 33},
          {a: 32},
          {a: 23},
          {a: 23},
          {a: 18},
          {a: 23},
          {a: 32},
          {a: 3},
          {a: 1},
        ];
        nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(descEntries, value => value.a < 32);
        assert.strictEqual(nearest, 2);
      });

      it('returns null if there are no matches at all', () => {
        const entries = [
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 32},
        ];
        const predicate = (value: {a: number}) => value.a > 33;
        const nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(entries, predicate);
        assert.isNull(nearest);
      });

      it('works when the result is the first item', () => {
        const ascEntries = [
          {a: 1},
          {a: 1},
          {a: 3},
          {a: 12},
          {a: 13},
          {a: 18},
          {a: 23},
          {a: 32},
        ];
        const greaterThanPredicate = (value: {a: number}) => value.a > 0;
        let first = Platform.ArrayUtilities.nearestIndexFromBeginning(ascEntries, greaterThanPredicate);
        assert.strictEqual(first, 0);

        const descEntries = [
          {a: 32},
          {a: 32},
          {a: 23},
          {a: 18},
          {a: 13},
          {a: 12},
          {a: 5},
          {a: 5},
        ];
        const predicate = (value: {a: number}) => value.a < 64;
        first = Platform.ArrayUtilities.nearestIndexFromBeginning(descEntries, predicate);
        assert.strictEqual(first, 0);
      });

      it('works on exact values', () => {
        const ascEntries = [
          {a: 1},
          {a: 2},
          {a: 3},
          {a: 3},
          {a: 4},
          {a: 5},
          {a: 6},
        ];
        // Note that the predicate is allowing an the exact match.
        const gePredicate = (value: {a: number}) => value.a >= 3;

        // Even number of entries.
        let nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(ascEntries, gePredicate);
        assert.strictEqual(nearest, 2);

        // Odd number of entries.
        ascEntries.push({a: 7});
        nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(ascEntries, gePredicate);
        assert.strictEqual(nearest, 2);

        const descEntries = [
          {a: 6},
          {a: 5},
          {a: 4},
          {a: 3},
          {a: 3},
          {a: 2},
          {a: 1},
        ];
        // Note that the predicate is allowing an the exact match.
        const predicateFunc = (value: {a: number}) => value.a <= 3;

        // Even number of entries.
        nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(descEntries, predicateFunc);
        assert.strictEqual(nearest, 3);

        // Odd number of entries.
        descEntries.push({a: 7});
        nearest = Platform.ArrayUtilities.nearestIndexFromBeginning(descEntries, predicateFunc);

        assert.strictEqual(nearest, 3);
      });
    });
  });

  describe('arrayDoesNotContainNullOrUndefined', () => {
    it('should return false when array contains null', () => {
      assert.isFalse(Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined([1, null, 2]));
    });
    it('should return false when array contains undefined', () => {
      assert.isFalse(Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined([1, undefined, 2]));
    });
    it('should return true when array does not contain undefined and null', () => {
      assert.isTrue(Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined([1, 2]));
    });
  });
});
