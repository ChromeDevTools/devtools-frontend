// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from './platform.js';

describe('StringUtilities', () => {
  describe('escapeCharacters', () => {
    it('escapes the given characters', () => {
      const inputString = 'My string with a single quote \' in the middle';
      const charsToEscape = '\'';
      const outputString = Platform.StringUtilities.escapeCharacters(inputString, charsToEscape);

      assert.strictEqual(outputString, 'My string with a single quote \\\' in the middle');
    });

    it('leaves the string alone if the characters are not found', () => {
      const inputString = 'Just a boring string';
      const charsToEscape = '\'';
      const outputString = Platform.StringUtilities.escapeCharacters(inputString, charsToEscape);
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
            encodedString, Platform.StringUtilities.toBase64(inputString), `failed to encode ${inputString} correctly`);
      }
    });
  });

  describe('findIndexesOfSubstring', () => {
    it('finds the expected indexes', () => {
      const inputString = '111111F1111111F11111111F';
      const indexes = Platform.StringUtilities.findIndexesOfSubString(inputString, 'F');
      assert.deepEqual(indexes, [6, 14, 23]);
    });
  });

  describe('findLineEndingIndexes', () => {
    it('finds the indexes of the line endings and returns them', () => {
      const inputString = `1234
56
78
9`;
      const indexes = Platform.StringUtilities.findLineEndingIndexes(inputString);
      assert.deepEqual(indexes, [4, 7, 10, 12]);
    });
  });

  describe('isWhitespace', () => {
    it('correctly recognizes different kinds of whitespace', () => {
      assert.isTrue(Platform.StringUtilities.isWhitespace(''));
      assert.isTrue(Platform.StringUtilities.isWhitespace('  '));
      assert.isTrue(Platform.StringUtilities.isWhitespace('\t'));
      assert.isTrue(Platform.StringUtilities.isWhitespace('\n'));

      assert.isFalse(Platform.StringUtilities.isWhitespace('  foo '));
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
        assert.strictEqual(Platform.StringUtilities.trimURL(url, baseURLDomain), expected, url);
      }
    });
  });

  describe('collapseWhitespace', () => {
    it('collapses consecutive whitespace chars down to a single one', () => {
      const inputString = 'look                at this!';
      const outputString = Platform.StringUtilities.collapseWhitespace(inputString);
      assert.strictEqual(outputString, 'look at this!');
    });

    it('matches globally and collapses all whitespace sections', () => {
      const inputString = 'a     b           c';
      const outputString = Platform.StringUtilities.collapseWhitespace(inputString);
      assert.strictEqual(outputString, 'a b c');
    });
  });

  describe('reverse', () => {
    it('reverses the string', () => {
      const inputString = 'abc';
      assert.strictEqual(Platform.StringUtilities.reverse(inputString), 'cba');
    });

    it('does nothing to an empty string', () => {
      assert.strictEqual('', Platform.StringUtilities.reverse(''));
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
      const outputString = Platform.StringUtilities.replaceControlCharacters(inputString);

      const replacementCharacter = '\uFFFD';
      const expectedString = charsThatShouldBeEscaped.fill(replacementCharacter).join('');
      assert.strictEqual(outputString, expectedString);
    });

    it('does not replace \n \t or \r', () => {
      const inputString = '\nhello world\t\r';
      const outputString = Platform.StringUtilities.replaceControlCharacters(inputString);
      assert.strictEqual(inputString, outputString);
    });
  });

  describe('countWtf8Bytes', () => {
    it('produces the correct WTF-8 byte size', () => {
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('a'), 1);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\x7F'), 1);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\u07FF'), 2);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\uD800'), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\uDBFF'), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\uDC00'), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\uDFFF'), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\uFFFF'), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('\u{10FFFF}'), 4);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes('Iñtërnâtiônàlizætiøn☃💩'), 34);

      // An arbitrary lead surrogate (D800..DBFF).
      const leadSurrogate = '\uDABC';
      // An arbitrary trail surrogate (DC00..DFFF).
      const trailSurrogate = '\uDEF0';
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes(`${leadSurrogate}${trailSurrogate}`), 4);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes(`${trailSurrogate}${leadSurrogate}`), 6);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes(`${leadSurrogate}`), 3);
      assert.strictEqual(Platform.StringUtilities.countWtf8Bytes(`${trailSurrogate}`), 3);
    });
  });

  describe('stripLineBreaks', () => {
    it('strips linebreaks from strings', () => {
      assert.strictEqual(Platform.StringUtilities.stripLineBreaks('a\nb'), 'ab');
      assert.strictEqual(Platform.StringUtilities.stripLineBreaks('a\r\nb'), 'ab');
    });
  });

  describe('isExtendedKebab', () => {
    const {isExtendedKebabCase} = Platform.StringUtilities;

    it('yields `true` for kebab case strings', () => {
      assert.isTrue(isExtendedKebabCase('a-b-c'));
      assert.isTrue(isExtendedKebabCase('a-b'));
      assert.isTrue(isExtendedKebabCase('abc'));
    });

    it('yields `true` for kebab case strings with dots', () => {
      assert.isTrue(isExtendedKebabCase('quick-open.show'));
      assert.isTrue(isExtendedKebabCase('main.target.reload-page'));
    });

    it('yields `false` for broken kebab case', () => {
      assert.isFalse(isExtendedKebabCase('a-b-'));
      assert.isFalse(isExtendedKebabCase('-abc'));
      assert.isFalse(isExtendedKebabCase('a--c'));
    });

    it('yields `false` for other cases', () => {
      assert.isFalse(isExtendedKebabCase('quickOpen.show'));
      assert.isFalse(isExtendedKebabCase('inspector_main.reload'));
      assert.isFalse(isExtendedKebabCase('Main.target.ReloadPage'));
    });
  });

  describe('toTitleCase', () => {
    it('converts a string to title case', () => {
      const output = Platform.StringUtilities.toTitleCase('foo bar baz');
      assert.strictEqual(output, 'Foo bar baz');
    });
  });

  describe('removeURLFragment', () => {
    it('removes the URL fragment if found', () => {
      const input = 'http://www.example.com/foo.html#blah';
      assert.strictEqual(Platform.StringUtilities.removeURLFragment(input), 'http://www.example.com/foo.html');
    });

    it('returns the same string if there is no fragment', () => {
      const input = 'http://www.example.com/foo.html';
      assert.strictEqual(Platform.StringUtilities.removeURLFragment(input), input);
    });

    it('does not strip query parameters', () => {
      const input = 'http://www.example.com/foo.html?x=1#blah';
      assert.strictEqual(Platform.StringUtilities.removeURLFragment(input), 'http://www.example.com/foo.html?x=1');
    });
  });
  describe('filterRegex', () => {
    it('should prepend [^\\0 ]* patterns for all characters', () => {
      const regex = Platform.StringUtilities.filterRegex('bar');
      assert.strictEqual(regex.toString(), '/^(?:.*\\0)?[^\\0b]*b[^\\0a]*a[^\\0r]*r/i');
    });

    it('should escape special characters', () => {
      const regex = Platform.StringUtilities.filterRegex('{?}');
      assert.strictEqual(regex.toString(), '/^(?:.*\\0)?[^\\0\\{]*\\{[^\\0\\?]*\\?[^\\0\\}]*\\}/i');
    });

    it('should match strings that have the query characters in the same order', () => {
      const testCases = [
        {query: 'abc', pos: ['abc', 'adabxac', 'AbC', 'a\x00abc'], neg: ['ab', 'acb', 'a\x00bc']},
        {query: 'aba', pos: ['abba', 'abracadabra'], neg: ['ab', 'aab', 'baa']},
        {query: '.?a*', pos: ['x.y?ax*b'], neg: ['', 'a?a*', 'a*', '.?']},
      ];
      for (const {query, pos, neg} of testCases) {
        const regex = Platform.StringUtilities.filterRegex(query);
        assert.exists(regex, `Could not create regex from query "${query}"`);
        for (const example of pos) {
          assert.isTrue(regex.test(example), `query "${query}" should match "${example}"`);
        }
        for (const example of neg) {
          assert.isFalse(regex.test(example), `query "${query}" should not match "${example}"`);
        }
      }
    });
  });

  describe('createSearchRegex', () => {
    it('returns a case sensitive regex if the call states it is case sensitive', () => {
      const regex = Platform.StringUtilities.createSearchRegex('foo', true, false);
      assert.strictEqual(regex.ignoreCase, false);
      assert.strictEqual(regex.source, 'foo');
    });

    it('creates a regex from plain text if the given input is not already a regex', () => {
      const regex = Platform.StringUtilities.createSearchRegex('[foo]', false, false);
      assert.strictEqual(regex.source, '\\[foo\\]');
    });

    it('leaves the input be if it is already a regex', () => {
      const regex = Platform.StringUtilities.createSearchRegex('[foo]', false, true);
      assert.strictEqual(regex.source, '[foo]');
    });
  });

  describe('hashCode', () => {
    it('hashes strings', () => {
      const stringA = ' '.repeat(10000);
      const stringB = stringA + ' ';
      const hashA = Platform.StringUtilities.hashCode(stringA);
      assert.isTrue(hashA !== Platform.StringUtilities.hashCode(stringB));
      assert.isTrue(isFinite(hashA));
      assert.isTrue(hashA + 1 !== hashA);
    });
  });

  describe('compare', () => {
    it('returns 1 if the string is > the other string', () => {
      const result = Platform.StringUtilities.compare('b', 'a');
      assert.strictEqual(result, 1);
    });

    it('returns -1 if the string is < the other string', () => {
      const result = Platform.StringUtilities.compare('a', 'b');
      assert.strictEqual(result, -1);
    });

    it('returns 0 if the strings are equal', () => {
      const result = Platform.StringUtilities.compare('a', 'a');
      assert.strictEqual(result, 0);
    });
  });

  describe('trimMiddle', () => {
    const fixtures = [
      '',
      '!',
      '\u{1F648}A\u{1F648}L\u{1F648}I\u{1F648}N\u{1F648}A\u{1F648}\u{1F648}',
      'test',
    ];

    for (let i = 0; i < fixtures.length; i++) {
      const string = fixtures[i];
      it(`trims the middle of strings, fixture ${i}`, () => {
        for (let maxLength = string.length + 1; maxLength > 0; --maxLength) {
          const trimmed = Platform.StringUtilities.trimMiddle(string, maxLength);
          assert.isTrue(trimmed.length <= maxLength);
        }
      });
    }
  });

  describe('escapeForRegExp', () => {
    it('escapes regex characters', () => {
      const inputString = '^[]{}()\\.^$*+?|-';
      const outputString = Platform.StringUtilities.escapeForRegExp(inputString);
      assert.strictEqual(outputString, '\\^\\[\\]\\{\\}\\(\\)\\\\\\.\\^\\$\\*\\+\\?\\|\\-');
    });
  });

  describe('naturalOrderComparator', () => {
    it('sorts natural order', () => {
      const testArray = [
        'dup', 'a1',   'a4222',  'a91',       'a07',      'dup', 'a7',        'a007',      'abc00',     'abc0',
        'abc', 'abcd', 'abc000', 'x10y20z30', 'x9y19z29', 'dup', 'x09y19z29', 'x10y22z23', 'x10y19z43', '1',
        '10',  '11',   'dup',    '2',         '2',        '2',   '555555',    '5',         '5555',      'dup',
      ];

      for (let i = 0, n = testArray.length; i < n; ++i) {
        assert.strictEqual(
            0, Platform.StringUtilities.naturalOrderComparator(testArray[i], testArray[i]), 'comparing equal strings');
      }

      testArray.sort(Platform.StringUtilities.naturalOrderComparator);

      // Check comparator's transitivity.
      for (let i = 0, n = testArray.length; i < n; ++i) {
        for (let j = 0; j < n; ++j) {
          const a = testArray[i];
          const b = testArray[j];
          const diff = Platform.StringUtilities.naturalOrderComparator(a, b);
          if (diff === 0) {
            assert.strictEqual(a, b, 'zero diff');
          } else if (diff < 0) {
            assert.isTrue(i < j);
          } else {
            assert.isTrue(i > j);
          }
        }
      }
    });
  });

  describe('base64ToSize', () => {
    it('calculates length correctly', () => {
      const inputString = 'foo';
      const base64String = btoa(inputString);
      assert.strictEqual(Platform.StringUtilities.base64ToSize(base64String), inputString.length);
    });

    it('calculates length of null string correctly', () => {
      const inputString = null;
      assert.strictEqual(Platform.StringUtilities.base64ToSize(inputString), 0);
    });

    it('calcualtes length of string with two = at the end', () => {
      const inputString = 'fooo';
      const base64String = btoa(inputString);
      assert.strictEqual(base64String, 'Zm9vbw==');
      assert.strictEqual(Platform.StringUtilities.base64ToSize(base64String), inputString.length);
    });

    it('calcualtes length of string with one = at the end', () => {
      const inputString = 'foooo';
      const base64String = btoa(inputString);
      assert.strictEqual(base64String, 'Zm9vb28=');
      assert.strictEqual(Platform.StringUtilities.base64ToSize(base64String), inputString.length);
    });
  });

  describe('formatAsJSLiteral', () => {
    it('wraps plain string in single quotes', () => {
      const inputString = 'foo';
      assert.strictEqual(String.raw`'foo'`, Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('wraps string containing single quotes in double quotes', () => {
      const inputString = String.raw`'foo' and 'bar'`;
      assert.strictEqual(String.raw`"'foo' and 'bar'"`, Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('wraps string containing both single and double quotes in back ticks', () => {
      const inputString = String.raw`'foo' and "bar"`;
      assert.strictEqual('`\'foo\' and "bar"`', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('wraps string containing all three quotes in single quotes', () => {
      const inputString = '\'foo\' `and` "bar"';
      assert.strictEqual('\'\\\'foo\\\' `and` "bar"\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('does not use back ticks when content contains ${', () => {
      const inputString = '\'foo\' "and" ${bar}';
      assert.strictEqual('\'\\\'foo\\\' "and" ${bar}\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('should escape lone leading surrogates', () => {
      const inputString = '\uD800 \uDA00 \uDBFF';
      assert.strictEqual('\'\\uD800 \\uDA00 \\uDBFF\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('should escape lone trail surrogates', () => {
      const inputString = '\uDC00 \uDEEE \uDFFF';
      assert.strictEqual('\'\\uDC00 \\uDEEE \\uDFFF\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('should not escape valid surrogate pairs', () => {
      const inputString = '\uD800\uDC00 \uDA00\uDEEE \uDBFF\uDFFF';
      assert.strictEqual(`'${inputString}'`, Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('should escape invalid surrogate pairs', () => {
      const inputString = '\uDC00\uD800 \uDA00\uDA00 \uDEEE\uDEEE';
      const expectedString = '\'\\uDC00\\uD800 \\uDA00\\uDA00 \\uDEEE\\uDEEE\'';
      assert.strictEqual(expectedString, Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('escapes whitespace characters appropriately', () => {
      const inputString =
          '\t\n\v\f\r \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000';
      const expectedString =
          '\\t\\n\\v\\f\\r \\x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000';
      assert.strictEqual('\'' + expectedString + '\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('escapes problematic script tags', () => {
      const inputString = '<!-- <script </script';
      const expectedString = String.raw`\x3C!-- \x3Cscript \x3C/script`;
      assert.strictEqual('\'' + expectedString + '\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });

    it('escapes \\x00-\\x1F and \\x7F-\\x9F', () => {
      const inputStrings = [
        '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\b',   '\v',   '\f',   '\x0E', '\x0F',
        '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', '\x1A', '\x1B', '\x1C',
        '\x1D', '\x1E', '\x1F', '\x80', '\x81', '\x82', '\x83', '\x84', '\x85', '\x86', '\x87', '\x88', '\x89',
        '\x8A', '\x8B', '\x8C', '\x8D', '\x8E', '\x8F', '\x90', '\x91', '\x92', '\x93', '\x94', '\x95', '\x96',
        '\x97', '\x98', '\x99', '\x9A', '\x9B', '\x9C', '\x9D', '\x9E', '\x9F',
      ];
      const expectedStrings = [
        '\'\\x00\'', '\'\\x01\'', '\'\\x02\'', '\'\\x03\'', '\'\\x04\'', '\'\\x05\'', '\'\\x06\'', '\'\\x07\'',
        '\'\\b\'',   '\'\\v\'',   '\'\\f\'',   '\'\\x0E\'', '\'\\x0F\'', '\'\\x10\'', '\'\\x11\'', '\'\\x12\'',
        '\'\\x13\'', '\'\\x14\'', '\'\\x15\'', '\'\\x16\'', '\'\\x17\'', '\'\\x18\'', '\'\\x19\'', '\'\\x1A\'',
        '\'\\x1B\'', '\'\\x1C\'', '\'\\x1D\'', '\'\\x1E\'', '\'\\x1F\'', '\'\\x80\'', '\'\\x81\'', '\'\\x82\'',
        '\'\\x83\'', '\'\\x84\'', '\'\\x85\'', '\'\\x86\'', '\'\\x87\'', '\'\\x88\'', '\'\\x89\'', '\'\\x8A\'',
        '\'\\x8B\'', '\'\\x8C\'', '\'\\x8D\'', '\'\\x8E\'', '\'\\x8F\'', '\'\\x90\'', '\'\\x91\'', '\'\\x92\'',
        '\'\\x93\'', '\'\\x94\'', '\'\\x95\'', '\'\\x96\'', '\'\\x97\'', '\'\\x98\'', '\'\\x99\'', '\'\\x9A\'',
        '\'\\x9B\'', '\'\\x9C\'', '\'\\x9D\'', '\'\\x9E\'', '\'\\x9F\'',
      ];
      assert.strictEqual(expectedStrings.join(), inputStrings.map(Platform.StringUtilities.formatAsJSLiteral).join());
    });

    it('escapes backslashes', () => {
      const inputString = '\\';
      const expectedString = String.raw`\\`;
      assert.strictEqual('\'' + expectedString + '\'', Platform.StringUtilities.formatAsJSLiteral(inputString));
    });
  });

  describe('findUnclosedCssQuote', () => {
    it('correctly finds unclosed quotes', () => {
      assert.strictEqual(Platform.StringUtilities.findUnclosedCssQuote('\'de'), Platform.StringUtilities.SINGLE_QUOTE);
      assert.strictEqual(
          Platform.StringUtilities.findUnclosedCssQuote('abc\'de\'f\'g'), Platform.StringUtilities.SINGLE_QUOTE);
      assert.strictEqual(
          Platform.StringUtilities.findUnclosedCssQuote('abc\\\'de\'fg'), Platform.StringUtilities.SINGLE_QUOTE);
      assert.strictEqual(
          Platform.StringUtilities.findUnclosedCssQuote('\'ab"c\'de\\\'f\'g'), Platform.StringUtilities.SINGLE_QUOTE);
      assert.strictEqual(Platform.StringUtilities.findUnclosedCssQuote('"de'), Platform.StringUtilities.DOUBLE_QUOTE);
      assert.strictEqual(
          Platform.StringUtilities.findUnclosedCssQuote('a\\"b\\""c\'de\'f\'g'), Platform.StringUtilities.DOUBLE_QUOTE);
      assert.strictEqual(
          Platform.StringUtilities.findUnclosedCssQuote('"ab"c"de\\\'f\'g'), Platform.StringUtilities.DOUBLE_QUOTE);
      assert.strictEqual(Platform.StringUtilities.findUnclosedCssQuote('a'), '');
      assert.strictEqual(Platform.StringUtilities.findUnclosedCssQuote('"ab"c\'de\'f'), '');
      assert.strictEqual(Platform.StringUtilities.findUnclosedCssQuote('"a\\\'b"c\\\'de\'f\\\'\''), '');
    });
  });

  describe('countUnmatchedLeftParentheses', () => {
    it('correctly counts unmatched left parentheses', () => {
      assert.strictEqual(Platform.StringUtilities.countUnmatchedLeftParentheses('a(b'), 1);
      assert.strictEqual(Platform.StringUtilities.countUnmatchedLeftParentheses('a(b)'), 0);
      assert.strictEqual(Platform.StringUtilities.countUnmatchedLeftParentheses(')a(b)'), 0);
      assert.strictEqual(Platform.StringUtilities.countUnmatchedLeftParentheses(')a(()bc(d(f)('), 3);
    });
  });

  describe('sprintf', () => {
    it('correctly deals with empty format string', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf(''), '');
      assert.strictEqual(Platform.StringUtilities.sprintf('', 1), '');
    });

    it('replaces %% with %', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%%s %%d %%f'), '%s %d %f');
    });

    it('correctly substitutes %d', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%d', NaN), '0');
      assert.strictEqual(Platform.StringUtilities.sprintf('%d days', 1.5), '1 days');
    });

    it('correctly substitutes %d with precision', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%.1d', 2), '2');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2d', 3), '03');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2d', 333), '333');
    });

    it('correctly substitutes %f', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%f', NaN), '0');
      assert.strictEqual(Platform.StringUtilities.sprintf('%f', 1), '1');
    });

    it('correctly substitutes %f with precision', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2f', NaN), '0.00');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2f', 1), '1.00');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2f', 1.23456), '1.23');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.3f', 1.23456), '1.235');
    });

    it('correctly substitutes %s', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('Hello %s!', 'World'), 'Hello World!');
      assert.strictEqual(Platform.StringUtilities.sprintf('Hello %s!', '%d', 1), 'Hello %d!');
    });

    it('correctly substitutes %s with precision', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('Hello %.1s!', 'World'), 'Hello W!');
      assert.strictEqual(Platform.StringUtilities.sprintf('Hello %.10s!', 'World'), 'Hello World!');
    });

    it('triggers correct type conversion', () => {
      const obj = {
        toString() {
          return '5';
        },
        valueOf() {
          return 6;
        },
      };
      assert.strictEqual(Platform.StringUtilities.sprintf('%d', obj), '6');
      assert.strictEqual(Platform.StringUtilities.sprintf('%.2f', obj), '6.00');
      assert.strictEqual(Platform.StringUtilities.sprintf('%s', obj), '5');
    });

    it('deals with parameter indices', () => {
      assert.strictEqual(Platform.StringUtilities.sprintf('%2$s %1$s!', 'World', 'Hello'), 'Hello World!');
      assert.throws(() => Platform.StringUtilities.sprintf('%0$s', 'World'));
    });

    it('signals error when too few parameters are given', () => {
      assert.throws(() => Platform.StringUtilities.sprintf('%2$s', 'World'));
      assert.throws(() => Platform.StringUtilities.sprintf('%2$s %s!', 'World', 'Hello'));
      assert.throws(() => Platform.StringUtilities.sprintf('%s %d', 'World'));
    });
  });

  describe('LowerCaseString', () => {
    function fnExpectingLowerCaseString(lowerCaseString: Platform.StringUtilities.LowerCaseString): void {
      lowerCaseString;
    }

    // @ts-expect-error Passing a plain string when LowerCaseString is expected
    fnExpectingLowerCaseString('Foo');

    const lower = Platform.StringUtilities.toLowerCaseString('lower case string');
    fnExpectingLowerCaseString(lower);
  });

  describe('replaceLast', () => {
    it('should return the input string when the search is not found', () => {
      const output = Platform.StringUtilities.replaceLast('input', 'search', 'repl');
      assert.strictEqual(output, 'input');
    });

    it('should replace the occurrance when the search exists inside the input', () => {
      const output = Platform.StringUtilities.replaceLast('input', 'pu', 'r');
      assert.strictEqual(output, 'inrt');
    });

    it('should replace the last occurrence when there are multiple matches', () => {
      const output = Platform.StringUtilities.replaceLast('inpuput', 'pu', 'r');
      assert.strictEqual(output, 'inpurt');
    });
  });

  describe('stringifyWithPrecision', () => {
    it('should stringify with 2 precision if precision argument is not given', () => {
      assert.strictEqual('0.69', Platform.StringUtilities.stringifyWithPrecision(0.685733));
    });

    it('should stringify with given precision', () => {
      assert.strictEqual('0.686', Platform.StringUtilities.stringifyWithPrecision(0.685733, 3));
    });
  });

  describe('concatBase64', () => {
    it('correctly concatenates two base64 strings', () => {
      const str = 'This is a small sample sentence for encoding.';
      const strAsBase64 = window.btoa(str);

      for (let i = 0; i < str.length; ++i) {
        const lhs = window.btoa(str.substring(0, i));
        const rhs = window.btoa(str.substring(i));

        assert.strictEqual(Platform.StringUtilities.concatBase64(lhs, rhs), strAsBase64);
      }
    });
  });

  describe('toKebabCase', () => {
    const toKebabCase = Platform.StringUtilities.toKebabCase;
    it('should convert camelCase to kebab-case', () => {
      assert.strictEqual(toKebabCase('activeKeybindSet'), 'active-keybind-set');
    });

    it('should convert PascalCase to kebab-case', () => {
      assert.strictEqual(toKebabCase('MediaPanelSplitViewState'), 'media-panel-split-view-state');
    });

    it('should convert snake_case to kebab-case', () => {
      assert.strictEqual(toKebabCase('recorder_preferred_copy_format'), 'recorder-preferred-copy-format');
    });

    it('should convert UPPER_SNAKE_CASE to kebab-case', () => {
      assert.strictEqual(toKebabCase('REGULAR_BREAKPOINT'), 'regular-breakpoint');
    });

    it('should handle uppercase acronyms as words', () => {
      assert.strictEqual(toKebabCase('showUAShadowDOM'), 'show-ua-shadow-dom');
    });

    it('should handle uppercase acronyms as words', () => {
      assert.strictEqual(toKebabCase('showUAShadowDOM'), 'show-ua-shadow-dom');
    });

    it('should preserve \'.\' characters', () => {
      assert.strictEqual(
          toKebabCase('InspectorView.screencastSplitViewState'), 'inspector-view.screencast-split-view-state');
      assert.strictEqual(toKebabCase('version1.2.3'), 'version-1.2.3');
    });

    it('should handle numeronyms', () => {
      assert.strictEqual(toKebabCase('lighthouse.cat_a11y'), 'lighthouse.cat-a11y');
      assert.strictEqual(toKebabCase('i18n'), 'i18n');
      assert.strictEqual(toKebabCase('timeline-v8-runtime-call-stats'), 'timeline-v8-runtime-call-stats');
    });

    it('should handle numbers', () => {
      assert.strictEqual(toKebabCase('Margin: 2px'), 'margin-2px');
      assert.strictEqual(toKebabCase('Margin2px'), 'margin-2px');
      assert.strictEqual(toKebabCase('Layers 3D display'), 'layers-3d-display');
      assert.strictEqual(toKebabCase('perfmonActiveIndicators2'), 'perfmon-active-indicators-2');
      assert.strictEqual(
          toKebabCase('HideIssueByCodeSetting-Experiment-2021'), 'hide-issue-by-code-setting-experiment-2021');
    });

    it('should handle mixed cases', () => {
      assert.strictEqual(toKebabCase('CamelCase_with.DOTS123'), 'camel-case-with.dots-123');
    });
  });
});
