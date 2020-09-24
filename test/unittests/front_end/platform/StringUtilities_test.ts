// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {StringUtilities} from '../../../../front_end/platform/platform.js';
import {FORMATTER_TOKEN} from '../../../../front_end/platform/string-utilities.js';

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

  describe('tokenizeFormatString', () => {
    it('deals with tokenizers that return undefined', () => {
      const tokens = StringUtilities.tokenizeFormatString('%c%s', {
        c: () => {},
        s: () => {},
      });
      assert.deepEqual(tokens, [
        {
          value: undefined,
          precision: -1,
          specifier: 'c',
          substitutionIndex: 0,
          type: 'specifier',
        },
        {
          value: undefined,
          precision: -1,
          specifier: 's',
          substitutionIndex: 1,
          type: 'specifier',
        },
      ]);
    });

    it('deals with ANSI colors', () => {
      const types = [3, 9, 4, 10];
      const colors = [];
      for (const type of types) {
        for (let i = 0; i < 10; ++i) {
          colors.push(type * 10 + i);
        }
      }

      const tokens = StringUtilities.tokenizeFormatString(colors.map(c => `\u001b[${c}m`).join(''), {c: () => {}});

      const expectedTokens: FORMATTER_TOKEN[] = [
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: black',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: red',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: green',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: yellow',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: blue',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: magenta',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: cyan',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightGray',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: default',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: darkGray',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightRed',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightGreen',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightYellow',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightBlue',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightMagenta',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: lightCyan',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'color: white',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : black',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : red',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : green',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : yellow',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : blue',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : magenta',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : cyan',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightGray',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : default',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : darkGray',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightRed',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightGreen',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightYellow',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightBlue',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightMagenta',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : lightCyan',
          },
        },
        {
          precision: undefined,
          substitutionIndex: undefined,
          specifier: 'c',
          type: 'specifier',
          value: {
            description: 'background : white',
          },
        },
      ];

      assert.deepEqual(tokens, expectedTokens);
    });
  });

  describe('toTitleCase', () => {
    it('converts a string to title case', () => {
      const output = StringUtilities.toTitleCase('foo bar baz');
      assert.strictEqual(output, 'Foo bar baz');
    });
  });

  describe('removeURLFragment', () => {
    it('removes the URL fragment if found', () => {
      const input = 'http://www.example.com/foo.html#blah';
      assert.strictEqual(StringUtilities.removeURLFragment(input), 'http://www.example.com/foo.html');
    });

    it('returns the same string if there is no fragment', () => {
      const input = 'http://www.example.com/foo.html';
      assert.strictEqual(StringUtilities.removeURLFragment(input), input);
    });

    it('does not strip query parameters', () => {
      const input = 'http://www.example.com/foo.html?x=1#blah';
      assert.strictEqual(StringUtilities.removeURLFragment(input), 'http://www.example.com/foo.html?x=1');
    });
  });
  describe('filterRegex', () => {
    it('should do nothing for single non-special character', () => {
      const regex = StringUtilities.filterRegex('f');
      assert.strictEqual(regex.toString(), '/f/i');
    });

    it('should prepend [^\\0 ]* patterns for following characters', () => {
      const regex = StringUtilities.filterRegex('bar');
      assert.strictEqual(regex.toString(), '/b[^\\0a]*a[^\\0r]*r/i');
    });

    it('should espace special characters', () => {
      const regex = StringUtilities.filterRegex('{?}');
      assert.strictEqual(regex.toString(), '/\\{[^\\0\\?]*\\?[^\\0\\}]*\\}/i');
    });
  });

  describe('createSearchRegex', () => {
    it('returns a case sensitive regex if the call states it is case sensitive', () => {
      const regex = StringUtilities.createSearchRegex('foo', true, false);
      assert.strictEqual(regex.ignoreCase, false);
      assert.strictEqual(regex.source, 'foo');
    });

    it('creates a regex from plain text if the given input is not already a regex', () => {
      const regex = StringUtilities.createSearchRegex('[foo]', false, false);
      assert.strictEqual(regex.source, '\\[foo\\]');
    });

    it('leaves the input be if it is already a regex', () => {
      const regex = StringUtilities.createSearchRegex('[foo]', false, true);
      assert.strictEqual(regex.source, '[foo]');
    });
  });
});
