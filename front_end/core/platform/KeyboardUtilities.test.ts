// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from './platform.js';

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

  describe('isEscKey', () => {
    it('is true for the escape key', () => {
      const event = new KeyboardEvent('keydown', {key: 'Escape'});
      assert.isTrue(Platform.KeyboardUtilities.isEscKey(event));
    });

    it('is false for another key', () => {
      const event = new KeyboardEvent('keydown', {key: 'Enter'});
      assert.isFalse(Platform.KeyboardUtilities.isEscKey(event));
    });
  });

  describe('isEnterOrSpaceKey', () => {
    it('returns true for enter', () => {
      const event = new KeyboardEvent('keydown', {key: 'Enter'});
      assert.isTrue(Platform.KeyboardUtilities.isEnterOrSpaceKey(event));
    });

    it('returns true for space', () => {
      const event = new KeyboardEvent('keydown', {key: ' '});
      assert.isTrue(Platform.KeyboardUtilities.isEnterOrSpaceKey(event));
    });

    it('returns false for any other key', () => {
      const event = new KeyboardEvent('keydown', {key: 'a'});
      assert.isFalse(Platform.KeyboardUtilities.isEnterOrSpaceKey(event));
    });
  });
});
