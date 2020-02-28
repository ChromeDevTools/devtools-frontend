// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {StringUtilities} from '../../../../front_end/platform/platform.js';

const {assert} = chai;

describe('StringUtilities', () => {
  describe('escapeCharacters', () => {
    it('escapes the given characters', () => {
      const inputString = 'My string with a single quote \' in the middle';
      const charsToEscape = '\'';
      const outputString = StringUtilities.escapeCharacters(inputString, charsToEscape);

      assert.equal(outputString, 'My string with a single quote \\\' in the middle');
    });

    it('leaves the string alone if the characters are not found', () => {
      const inputString = 'Just a boring string';
      const charsToEscape = '\'';
      const outputString = StringUtilities.escapeCharacters(inputString, charsToEscape);
      assert.equal(outputString, inputString);
    });
  });

  describe('toBase64', () => {
    it('encodes correctly and supports unicode characters', () => {
      const fixtures = new Map([
        ['', ''],
        ['a', 'YQ=='],
        ['bc', 'YmM='],
        ['def', 'ZGVm'],
        ['ghij', 'Z2hpag=='],
        ['klmno', 'a2xtbm8='],
        ['pqrstu', 'cHFyc3R1'],
        ['\u0444\u5555\u6666\u7777', '0YTllZXmmabnnbc='],
      ]);
      for (const [inputString, encodedString] of fixtures) {
        assert.equal(encodedString, StringUtilities.toBase64(inputString), `failed to encode ${inputString} correctly`);
      }
    });
  });

  describe('findIndexesOfSubstring', () => {
    it('finds the expected indexes', () => {
      const inputString = '111111F1111111F11111111F';
      const indexes = StringUtilities.findIndexesOfSubString(inputString, 'F');
      assert.deepEqual(indexes, [6, 14, 23]);
    });
  });

  describe('findLineEndingIndexes', () => {
    it('finds the indexes of the line endings and returns them', () => {
      const inputString = `1234
56
78
9`;
      const indexes = StringUtilities.findLineEndingIndexes(inputString);
      assert.deepEqual(indexes, [4, 7, 10, 12]);
    });
  });

  describe('isWhitespace', () => {
    it('correctly recognizes different kinds of whitespace', () => {
      assert.isTrue(StringUtilities.isWhitespace(''));
      assert.isTrue(StringUtilities.isWhitespace('  '));
      assert.isTrue(StringUtilities.isWhitespace('\t'));
      assert.isTrue(StringUtilities.isWhitespace('\n'));

      assert.isFalse(StringUtilities.isWhitespace('  foo '));
    });
  });
});
