// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Plaform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describe('SetUtilities', () => {
  describe('addAll', () => {
    it('adds all items in the iterable to the set', () => {
      const itemsToAdd = ['b', 'c', 'd'];
      const set = new Set(['a']);

      Plaform.SetUtilities.addAll(set, itemsToAdd);
      assert.deepEqual([...set], ['a', 'b', 'c', 'd']);
    });
  });

  describe('isEqual', () => {
    it('checks if sets are equal', () => {
      const isEqual = Plaform.SetUtilities.isEqual;
      assert(isEqual(new Set(), new Set()));
      assert(!isEqual(new Set(['a']), new Set()));
      assert(isEqual(new Set(['a']), new Set(['a'])));
      assert(!isEqual(new Set(['a']), new Set(['b'])));
      assert(!isEqual(new Set(), new Set(['b'])));
      const set = new Set(['a']);
      assert(isEqual(set, set));
    });
  });
});
