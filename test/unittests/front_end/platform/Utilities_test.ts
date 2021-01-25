// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

// FIXME: Convert to pure functions as these utilities have side effects.
import '../../../../front_end/platform/utilities.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Array<T> {
    upperBound(value: T, comparator?: (a: T, b: T) => number): number;
    lowerBound(value: T, comparator?: (a: T, b: T) => number): number;
    binaryIndexOf<S>(value: S, comparator: (a: S, b: T) => number): number;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface String {
    repeat(length: number): string;
  }
}

describe('Utilities', () => {
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
});
