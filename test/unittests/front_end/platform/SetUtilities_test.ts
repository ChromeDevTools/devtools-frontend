// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Plaform from '../../../../front_end/platform/platform.js';

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
});
