// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ArrayUtilities} from '../../../../front_end/platform/platform.js';

const {assert} = chai;

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

        ArrayUtilities.removeElement(actualFirstOnlyTrue, 2, true);
        assert.deepStrictEqual(actualFirstOnlyTrue, testCase.expectedFirstOnlyTrue, 'Removing firstOnly (true) failed');

        const actualFirstOnlyFalse = [...testCase.input];
        ArrayUtilities.removeElement(actualFirstOnlyFalse, 2, false);
        assert.deepStrictEqual(
            actualFirstOnlyFalse, testCase.expectedFirstOnlyFalse, 'Removing firstOnly (false) failed');
      }
    });
  });
});
