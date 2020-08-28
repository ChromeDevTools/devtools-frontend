// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

// FIXME: Convert to pure functions as these utilities have side effects.
import '../../../../front_end/platform/utilities.js';

declare global {
  interface Array<T> {
    mergeOrdered(array: T[], comparator: (a: T, b: T) => number): T[];
    upperBound(value: T, comparator?: (a: T, b: T) => number): number;
    lowerBound(value: T, comparator?: (a: T, b: T) => number): number;
    binaryIndexOf(value: T, comparator: (a: T, b: T) => number): number;
    sortRange(
        comparator: (a: T, b: T) => number, leftBound: number, rightBound: number, sortWindowLeft: number,
        sortWindowRight: number): T[];
  }

  interface String {
    trimMiddle(maxLength: number): string;
    repeat(length: number): string;
  }

  interface StringConstructor {
    hashCode(value: string): number;
    naturalOrderComparator(a: string, b: string): number;
  }

  function unescapeCssString(input: string): string;
}

describe('Utilities', () => {
  it('orders merge intersect', () => {
    function comparator(a: number, b: number) {
      return a - b;
    }

    function count(a: number[], x: number) {
      return a.upperBound(x) - a.lowerBound(x);
    }

    function testAll(a: number[], b: number[]) {
      testOperation(a, b, a.mergeOrdered(b, comparator), Math.max, 'U');
      testOperation(a, b, a.intersectOrdered(b, comparator), Math.min, 'x');
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
            'Incorrect result for value: ' + value + ' at [' + a + '] ' + opName + ' [' + b + '] -> [' + actual + ']');
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

  it('calculates the binary index', () => {
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
        const actual = array.binaryIndexOf(i, comparator);
        assert.deepStrictEqual(reference, actual);
      }
      return true;
    }

    for (const fixture of fixtures) {
      testArray(fixture);
    }
  });

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
        const index = useComparator ? array.lowerBound(value, comparator) : array.lowerBound(value);
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
        const index = useComparator ? array.upperBound(value, comparator) : array.upperBound(value);
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

  it('sorts ranges', () => {
    const fixtures = [
      [],
      [1],
      [2, 1],
      [6, 4, 2, 7, 10, 15, 1],
      [10, 44, 3, 6, 56, 66, 10, 55, 32, 56, 2, 5],
    ];

    function testArray(array: number[]) {
      function comparator(a: number, b: number) {
        return a < b ? -1 : (a > b ? 1 : 0);
      }

      for (let left = 0, l = array.length - 1; left < l; ++left) {
        for (let right = left, r = array.length; right < r; ++right) {
          for (let first = left; first <= right; ++first) {
            for (let count = 1, k = right - first + 1; count <= k; ++count) {
              const actual = array.slice(0);
              actual.sortRange(comparator, left, right, first, first + count - 1);
              assert.deepStrictEqual(
                  array.slice(0, left), actual.slice(0, left), 'left ' + left + ' ' + right + ' ' + count);
              assert.deepStrictEqual(
                  array.slice(right + 1), actual.slice(right + 1), 'right ' + left + ' ' + right + ' ' + count);

              const middle = array.slice(left, right + 1);
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
    }

    for (const fixture of fixtures) {
      testArray(fixture);
    }
  });

  it('sorts natural order', () => {
    const testArray = [
      'dup', 'a1',   'a4222',  'a91',       'a07',      'dup', 'a7',        'a007',      'abc00',     'abc0',
      'abc', 'abcd', 'abc000', 'x10y20z30', 'x9y19z29', 'dup', 'x09y19z29', 'x10y22z23', 'x10y19z43', '1',
      '10',  '11',   'dup',    '2',         '2',        '2',   '555555',    '5',         '5555',      'dup',
    ];

    for (let i = 0, n = testArray.length; i < n; ++i) {
      assert.strictEqual(0, String.naturalOrderComparator(testArray[i], testArray[i]), 'comparing equal strings');
    }

    testArray.sort(String.naturalOrderComparator);

    // Check comparator's transitivity.
    for (let i = 0, n = testArray.length; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        const a = testArray[i];
        const b = testArray[j];
        const diff = String.naturalOrderComparator(a, b);
        if (diff === 0) {
          assert.strictEqual(a, b, 'zero diff');
        } else if (diff < 0) {
          assert.isTrue(i < j);
        } else {
          assert.isTrue(i > j);
        }
      }
    }
  });

  it('hashes strings', () => {
    const stringA = ' '.repeat(10000);
    const stringB = stringA + ' ';
    const hashA = String.hashCode(stringA);
    assert.isTrue(hashA !== String.hashCode(stringB));
    assert.isTrue(isFinite(hashA));
    assert.isTrue(hashA + 1 !== hashA);
  });

  it('escapes regex characters', () => {
    const inputString = '^[]{}()\\.^$*+?|-';
    const outputString = inputString.escapeForRegExp();
    assert.strictEqual(outputString, '\\^\\[\\]\\{\\}\\(\\)\\\\\\.\\^\\$\\*\\+\\?\\|\\-');
  });

  it('trims the middle of strings', () => {
    const fixtures = [
      '',
      '!',
      '\u{1F648}A\u{1F648}L\u{1F648}I\u{1F648}N\u{1F648}A\u{1F648}\u{1F648}',
      'test',
    ];
    for (const string of fixtures) {
      for (let maxLength = string.length + 1; maxLength > 0; --maxLength) {
        const trimmed = string.trimMiddle(maxLength);
        assert.isTrue(trimmed.length <= maxLength);
      }
    }
  });

  it('unescapes CSS strings', () => {
    assert.strictEqual(
        unescapeCssString(String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
        '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
    assert.strictEqual(
        unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
        '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
    assert.strictEqual(
        unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`), '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"',
        'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
    assert.strictEqual(
        unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"', 'surrogates should not be combined');
    assert.strictEqual(
        unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
        'certain trailing whitespace characters should be consumed as part of the escape sequence');
  });
});
