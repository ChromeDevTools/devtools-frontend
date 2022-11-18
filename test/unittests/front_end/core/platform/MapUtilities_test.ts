// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describe('MapUtilities', () => {
  describe('inverse', () => {
    it('inverts the map returning a multimap with the map\'s values as keys and the map\'s keys as values', () => {
      const pairs: readonly(readonly[string, number])[] = [
        ['a', 1],
        ['b', 2],
        ['c', 3],
        ['d', 1],
      ];
      const map = new Map(pairs);

      const inverse = Platform.MapUtilities.inverse(map);
      for (const [, value] of pairs) {
        assert.sameMembers([...inverse.get(value)], [...getKeys(value)]);
      }

      function getKeys(lookupValue: number): Set<string> {
        const keys = new Set<string>();
        for (const [key, value] of pairs) {
          if (value === lookupValue) {
            keys.add(key);
          }
        }
        return keys;
      }
    });
  });
  describe('getWithDefault', () => {
    it('returns the default when it has no value', () => {
      const expected = new Set();
      const returned = Platform.MapUtilities.getWithDefault(new Map(), 'foo', () => expected);

      assert.strictEqual(expected, returned);
    });

    it('returns the same item on successive calls', () => {
      const data = new Map<string, Set<void>>();
      const returnedFirst = Platform.MapUtilities.getWithDefault(data, 'foo', () => new Set());
      const returnedSecond = Platform.MapUtilities.getWithDefault(data, 'foo', () => new Set());

      assert.strictEqual(returnedFirst, returnedSecond);
    });
  });
});
