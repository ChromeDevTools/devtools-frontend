// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DateUtilities} from '../../../../front_end/platform/platform.js';

const {assert} = chai;

describe('DateUtilities', () => {
  describe('isValid', () => {
    it('returns true for a valid date', () => {
      assert.isTrue(DateUtilities.isValid(new Date()));
    });

    it('returns false for a nonsense date', () => {
      const soNotADate = new Date('not-a-date');

      assert.isFalse(DateUtilities.isValid(soNotADate));
    });
  });

  describe('toISO8601Compact', () => {
    it('formats a date into a string', () => {
      const date = new Date(2020, 10, 20, 12, 13, 14);
      assert.strictEqual(DateUtilities.toISO8601Compact(date), '20201120T121314');
    });

    it('adds leading zeroes', () => {
      const date = new Date(2020, 0, 1, 0, 0, 0);
      assert.strictEqual(DateUtilities.toISO8601Compact(date), '20200101T000000');
    });
  });
});
