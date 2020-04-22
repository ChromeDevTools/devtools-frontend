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

      assert.strictEqual(outputString, 'My string with a single quote \\\' in the middle');
    });

    it('leaves the string alone if the characters are not found', () => {
      const inputString = 'Just a boring string';
      const charsToEscape = '\'';
      const outputString = StringUtilities.escapeCharacters(inputString, charsToEscape);
      assert.strictEqual(outputString, inputString);
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
        assert.strictEqual(
            encodedString, StringUtilities.toBase64(inputString), `failed to encode ${inputString} correctly`);
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

  describe('trimURL', () => {
    it('trims the protocol and an optional domain from URLs', () => {
      const baseURLDomain = 'www.chromium.org';
      const fixtures = new Map([
        ['http://www.chromium.org/foo/bar', '/foo/bar'],
        ['https://www.CHromium.ORG/BAZ/zoo', '/BAZ/zoo'],
        ['https://example.com/foo[]', 'example.com/foo[]'],
      ]);
      for (const [url, expected] of fixtures) {
        assert.strictEqual(StringUtilities.trimURL(url, baseURLDomain), expected, url);
      }
    });
  });

  describe('collapseWhitespace', () => {
    it('collapses consecutive whitespace chars down to a single one', () => {
      const inputString = 'look                at this!';
      const outputString = StringUtilities.collapseWhitespace(inputString);
      assert.strictEqual(outputString, 'look at this!');
    });

    it('matches globally and collapses all whitespace sections', () => {
      const inputString = 'a     b           c';
      const outputString = StringUtilities.collapseWhitespace(inputString);
      assert.strictEqual(outputString, 'a b c');
    });
  });

  describe('reverse', () => {
    it('reverses the string', () => {
      const inputString = 'abc';
      assert.strictEqual(StringUtilities.reverse(inputString), 'cba');
    });

    it('does nothing to an empty string', () => {
      assert.strictEqual('', StringUtilities.reverse(''));
    });
  });

  describe('replaceControlCharacters', () => {
    it('replaces C0 and C1 control character sets with the replacement character', () => {
      const charsThatShouldBeEscaped = [
        '\0',   '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\b',   '\x0B', '\f',   '\x0E', '\x0F',
        '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', '\x1A', '\x1B', '\x1C',
        '\x1D', '\x1E', '\x1F', '\x80', '\x81', '\x82', '\x83', '\x84', '\x85', '\x86', '\x87', '\x88', '\x89',
        '\x8A', '\x8B', '\x8C', '\x8D', '\x8E', '\x8F', '\x90', '\x91', '\x92', '\x93', '\x94', '\x95', '\x96',
        '\x97', '\x98', '\x99', '\x9A', '\x9B', '\x9C', '\x9D', '\x9E', '\x9F',
      ];

      const inputString = charsThatShouldBeEscaped.join('');
      const outputString = StringUtilities.replaceControlCharacters(inputString);

      const replacementCharacter = '\uFFFD';
      const expectedString = charsThatShouldBeEscaped.fill(replacementCharacter).join('');
      assert.strictEqual(outputString, expectedString);
    });

    it('does not replace \n \t or \r', () => {
      const inputString = '\nhello world\t\r';
      const outputString = StringUtilities.replaceControlCharacters(inputString);
      assert.strictEqual(inputString, outputString);
    });
  });

  describe('countWtf8Bytes', () => {
    it('produces the correct WTF-8 byte size', () => {
      assert.strictEqual(StringUtilities.countWtf8Bytes('a'), 1);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\x7F'), 1);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\u07FF'), 2);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\uD800'), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\uDBFF'), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\uDC00'), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\uDFFF'), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\uFFFF'), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes('\u{10FFFF}'), 4);
      assert.strictEqual(StringUtilities.countWtf8Bytes('Iñtërnâtiônàlizætiøn☃💩'), 34);

      // An arbitrary lead surrogate (D800..DBFF).
      const leadSurrogate = '\uDABC';
      // An arbitrary trail surrogate (DC00..DFFF).
      const trailSurrogate = '\uDEF0';
      assert.strictEqual(StringUtilities.countWtf8Bytes(`${leadSurrogate}${trailSurrogate}`), 4);
      assert.strictEqual(StringUtilities.countWtf8Bytes(`${trailSurrogate}${leadSurrogate}`), 6);
      assert.strictEqual(StringUtilities.countWtf8Bytes(`${leadSurrogate}`), 3);
      assert.strictEqual(StringUtilities.countWtf8Bytes(`${trailSurrogate}`), 3);
    });
  });

  describe('stripLineBreaks', () => {
    it('strips linebreaks from strings', () => {
      assert.strictEqual(StringUtilities.stripLineBreaks('a\nb'), 'ab');
      assert.strictEqual(StringUtilities.stripLineBreaks('a\r\nb'), 'ab');
    });
  });
});
