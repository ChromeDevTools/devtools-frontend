// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describe('KeyboardUtilities', () => {
  describe('#keyIsArrowKey', () => {
    it('returns true for ArrowUp, ArrowDown, ArrowLeft and ArrowRight', () => {
      const keysAreArrowKeys = [
        'ArrowDown',
        'ArrowUp',
        'ArrowLeft',
        'ArrowRight',
      ].map(key => Platform.KeyboardUtilities.keyIsArrowKey(key));
      assert.deepEqual(keysAreArrowKeys, [true, true, true, true]);
    });
    it('returns false for anything else', () => {
      const keysAreNotArrowKeys = [
        'Enter',
        ' ',
        'a',
        'C',
      ].map(key => Platform.KeyboardUtilities.keyIsArrowKey(key));
      assert.deepEqual(keysAreNotArrowKeys, [false, false, false, false]);
    });
  });
});
