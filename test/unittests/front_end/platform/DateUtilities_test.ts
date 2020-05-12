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
});
