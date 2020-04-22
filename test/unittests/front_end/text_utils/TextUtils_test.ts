// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {FilterParser, BalancedJSONTokenizer, isMinified, Utils} from '../../../../front_end/text_utils/TextUtils.js';

describe('Utils Object', () => {
  describe('isStopChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isStopChar('\0'), false, 'null was a stop char');
      assert.strictEqual(Utils.isStopChar(' '), false, 'space was a stop char');
      assert.strictEqual(Utils.isStopChar('!'), true, '! was not a stop char');
      assert.strictEqual(Utils.isStopChar('/'), true, '/ was not a stop char');
      assert.strictEqual(Utils.isStopChar('0'), false, '0 was a stop char');
      assert.strictEqual(Utils.isStopChar('9'), false, '9 was a stop char');
      assert.strictEqual(Utils.isStopChar('@'), true, '@ was not a stop char');
      assert.strictEqual(Utils.isStopChar('A'), false, 'A was a stop char');
      assert.strictEqual(Utils.isStopChar('B'), false, 'B was a stop char');
      assert.strictEqual(Utils.isStopChar('Z'), false, 'Z was a stop char');
      assert.strictEqual(Utils.isStopChar('['), true, '[ was not a stop char');
      assert.strictEqual(Utils.isStopChar('_'), false, '_ was a stop char');
      assert.strictEqual(Utils.isStopChar('`'), true, '` was not a stop char');
      assert.strictEqual(Utils.isStopChar('a'), false, 'a was a stop char');
      assert.strictEqual(Utils.isStopChar('b'), false, 'b was a stop char');
      assert.strictEqual(Utils.isStopChar('z'), false, 'z was a stop char');
      assert.strictEqual(Utils.isStopChar('{'), true, '{ was not a stop char');
    });
  });
  describe('isWordChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isWordChar(' '), false, 'space was a word char');
      assert.strictEqual(Utils.isWordChar('\t'), false, 'tab was a word char');
      assert.strictEqual(Utils.isWordChar('a'), true, 'a was not a word char');
      assert.strictEqual(Utils.isWordChar('A'), true, 'A was not a word char');
      assert.strictEqual(Utils.isWordChar('_'), true, '_ was not a word char');
    });
  });
  describe('isSpaceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isSpaceChar(' '), true, 'space was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\t'), true, 'tab was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\f'), true, 'formfeed was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\r'), true, 'return was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\v'), true, 'vertical tab was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\xA0'), true, 'non-breaking space was not a space char');
      assert.strictEqual(Utils.isSpaceChar('\0'), false, 'null was a space char');
      assert.strictEqual(Utils.isSpaceChar('a'), false, 'a was a space char');
      assert.strictEqual(Utils.isSpaceChar('A'), false, 'A was a space char');
    });
  });
  describe('isWord', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isWord(''), true, 'empty string was not a word');
      assert.strictEqual(Utils.isWord('_'), true, '_ string was not a word');
      assert.strictEqual(Utils.isWord('a'), true, 'a string was not a word');
      assert.strictEqual(Utils.isWord('abc'), true, 'abc string was not a word');
      assert.strictEqual(Utils.isWord('a{'), false, 'a{ string was a word');
      assert.strictEqual(Utils.isWord('a`'), false, 'a` string was a word');
      assert.strictEqual(Utils.isWord(' '), false, 'space string was a word');
    });
  });
  describe('isOpeningBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isOpeningBraceChar('{'), true, '{ was not an opening brace');
      assert.strictEqual(Utils.isOpeningBraceChar('('), true, '( was not an opening brace');
      assert.strictEqual(Utils.isOpeningBraceChar('['), false, '[ was an opening brace');
      assert.strictEqual(Utils.isOpeningBraceChar('<'), false, '< was an opening brace');
      assert.strictEqual(Utils.isOpeningBraceChar('}'), false, '} was an opening brace');
      assert.strictEqual(Utils.isOpeningBraceChar(')'), false, ') was an opening brace');
    });
  });
  describe('isClosingBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isClosingBraceChar('}'), true, '} was not a closing brace');
      assert.strictEqual(Utils.isClosingBraceChar(')'), true, ') was not a closing brace');
      assert.strictEqual(Utils.isClosingBraceChar(']'), false, '] was a closing brace');
      assert.strictEqual(Utils.isClosingBraceChar('>'), false, '> was a closing brace');
      assert.strictEqual(Utils.isClosingBraceChar('{'), false, '{} was a closing brace');
      assert.strictEqual(Utils.isClosingBraceChar('('), false, '() was a closing brace');
    });
  });
  describe('isBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isBraceChar('{'), true, '{ was not a brace');
      assert.strictEqual(Utils.isBraceChar('('), true, '( was not a brace');
      assert.strictEqual(Utils.isBraceChar('}'), true, '} was not a brace');
      assert.strictEqual(Utils.isBraceChar(')'), true, ') was not a brace');
      assert.strictEqual(Utils.isBraceChar('['), false, '[ was a brace');
      assert.strictEqual(Utils.isBraceChar('<'), false, '< was a brace');
      assert.strictEqual(Utils.isBraceChar(']'), false, '] was a brace');
      assert.strictEqual(Utils.isBraceChar('>'), false, '> was a brace');
    });
  });
  describe('textToWords', () => {
    it('returns the correct result for various inputs', () => {
      const isWordChar = Utils.isWordChar;
      const words: string[] = [];
      const callback = (word: string) => {
        words.push(word);
      };
      Utils.textToWords('', isWordChar, callback);
      assert.strictEqual(words.length, 0, 'words was not empty');
      Utils.textToWords(' a', isWordChar, callback);
      assert.strictEqual(words.length, 1, 'words had wrong length');
      assert.strictEqual(words[0], 'a');
      Utils.textToWords(' a _', isWordChar, callback);
      assert.strictEqual(words.length, 3, 'words had wrong length');
      assert.strictEqual(words[1], 'a');
      assert.strictEqual(words[2], '_');
    });
  });
  describe('lineIndent', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.lineIndent(''), '', 'indent was not empty');
      assert.strictEqual(Utils.lineIndent('\tabc'), '\t', 'indent should have one tab');
      assert.strictEqual(Utils.lineIndent(' \t abc'), ' \t ', 'indent was wrong');
    });
  });
  describe('isUpperCase', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isUpperCase('a'), false, 'a was upper case');
      assert.strictEqual(Utils.isUpperCase('A'), true, 'A was not upper case');
      assert.strictEqual(Utils.isUpperCase('_'), true, '_ was not upper case');
      assert.strictEqual(Utils.isUpperCase('!'), true, '! was not upper case');
      assert.strictEqual(Utils.isUpperCase('@'), true, '@ was not upper case');
    });
  });
  describe('isLowerCase', () => {
    it('returns the correct result for various inputs', () => {
      assert.strictEqual(Utils.isLowerCase('a'), true, 'a was lower case');
      assert.strictEqual(Utils.isLowerCase('A'), false, 'A was not lower case');
      assert.strictEqual(Utils.isLowerCase('_'), true, '_ was not lower case');
      assert.strictEqual(Utils.isLowerCase('!'), true, '! was not lower case');
      assert.strictEqual(Utils.isLowerCase('@'), true, '@ was not lower case');
    });
  });
  describe('splitStringByRegexes', () => {
    it('returns the correct result for a single regex', () => {
      let result = Utils.splitStringByRegexes('', [/a/]);
      assert.strictEqual(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/]);
      assert.strictEqual(result.length, 1, 'length was wrong');
      assert.strictEqual(result[0].value, 'a', 'value was wrong');
      assert.strictEqual(result[0].position, 0, 'position was wrong');
      assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

      result = Utils.splitStringByRegexes('ba b', [/a/]);
      assert.strictEqual(result.length, 3, 'length was wrong');
      assert.strictEqual(result[0].value, 'b', 'value was wrong');
      assert.strictEqual(result[0].position, 0, 'position was wrong');
      assert.strictEqual(result[0].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
      assert.strictEqual(result[1].value, 'a', 'value was wrong');
      assert.strictEqual(result[1].position, 1, 'position was wrong');
      assert.strictEqual(result[1].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[1].captureGroups, [], 'capture groups was not empty');
      assert.strictEqual(result[2].value, ' b', 'value was wrong');
      assert.strictEqual(result[2].position, 2, 'position was wrong');
      assert.strictEqual(result[2].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[2].captureGroups, [], 'capture groups was not empty');
    });
    it('returns the correct result for a multiple regexs', () => {
      let result = Utils.splitStringByRegexes('', [/a/, /b/]);
      assert.strictEqual(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/, /b/]);
      assert.strictEqual(result.length, 1, 'length was wrong');
      assert.strictEqual(result[0].value, 'a', 'value was wrong');
      assert.strictEqual(result[0].position, 0, 'position was wrong');
      assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

      result = Utils.splitStringByRegexes('ba b', [/a/, /b/]);
      assert.strictEqual(result.length, 4, 'length was wrong');
      assert.strictEqual(result[0].value, 'b', 'value was wrong');
      assert.strictEqual(result[0].position, 0, 'position was wrong');
      assert.strictEqual(result[0].regexIndex, 1, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
      assert.strictEqual(result[1].value, 'a', 'value was wrong');
      assert.strictEqual(result[1].position, 1, 'position was wrong');
      assert.strictEqual(result[1].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[1].captureGroups, [], 'capture groups was not empty');
      assert.strictEqual(result[2].value, ' ', 'value was wrong');
      assert.strictEqual(result[2].position, 2, 'position was wrong');
      assert.strictEqual(result[2].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[2].captureGroups, [], 'capture groups was not empty');
      assert.strictEqual(result[3].value, 'b', 'value was wrong');
      assert.strictEqual(result[3].position, 3, 'position was wrong');
      assert.strictEqual(result[3].regexIndex, 1, 'regex index was wrong');
      assert.deepEqual(result[3].captureGroups, [], 'capture groups was not empty');
    });
    it('returns the correct result for global regexs', () => {
      let result = Utils.splitStringByRegexes('', [/a/g, /b/g]);
      assert.strictEqual(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/g, /b/g]);
      assert.strictEqual(result.length, 1, 'length was wrong');
      assert.strictEqual(result[0].value, 'a', 'value was wrong');
      assert.strictEqual(result[0].position, 0, 'position was wrong');
      assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
    });
  });
});

describe('FilterParser', () => {
  it('can be instantiated successfully', () => {
    const testVal = 'TestVal1';
    const filterParser = new FilterParser(['TestVal1']);
    const result = filterParser.parse(testVal);
    assert.strictEqual(result[0].text, testVal, 'text value was not returned correctly');
    assert.strictEqual(result[0].negative, false, 'negative value was not returned correctly');
  });
});

describe('BalancedJSONTokenizer', () => {
  it('can be instantiated successfully', () => {
    const callback = () => {};
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);
    assert.strictEqual(tokenizer.remainder(), '', 'remainder was not empty');
  });

  it('can balance simple patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    let result = tokenizer.write('a');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback was called');

    result = tokenizer.write('{}');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['a{}'], 'callback had unexpected results');
  });

  it('can find simple unbalanced patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('{}}');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['{}'], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '}', 'remainder was incorrect');
  });

  it('can find simple unbalanced quote patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('"""');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '"""', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with }', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('}}');
    assert.strictEqual(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '}}', 'remainder was incorrect');
  });

  describe('parse', () => {
    it('returns empty for empty string', () => {
      const testVal = '';
      const filterParser = new FilterParser(['TestVal1']);
      const result = filterParser.parse(testVal);
      assert.deepEqual(result, [], 'result was not empty');
    });

    // Ported from a web test: http/tests/devtools/unit/parse-filter-query.js
    it('returns correct results for a range of inputs', () => {
      const filterParser = new FilterParser(['key1', 'key2']);

      const parse = (text: string) => {
        return filterParser.parse(text) as {key?: string, text?: string, regex?: RegExp, negative: boolean}[];
      };

      let result = parse('text');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

      result = parse('spaced text');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'spaced', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

      result = parse('-');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: '-', negative: false}, 'result was incorrect');

      result = parse('-text');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'text', negative: true}, 'result was incorrect');

      result = parse('//');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: '//', negative: false}, 'result was incorrect');

      result = parse('/regex/');
      assert.deepEqual(
          result[0], {key: undefined, regex: /regex/i, text: undefined, negative: false}, 'result was incorrect');

      result = parse('/regex/ /another/');
      assert.deepEqual(
          result[0], {key: undefined, regex: /regex/i, text: undefined, negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: /another/i, text: undefined, negative: false}, 'result was incorrect');

      result = parse('/complex\/regex/');
      assert.deepEqual(
          result[0], {key: undefined, regex: /complex\/regex/i, text: undefined, negative: false},
          'result was incorrect');

      result = parse('/regex/ text');
      assert.deepEqual(
          result[0], {key: undefined, regex: /regex/i, text: undefined, negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

      result = parse('key1:foo');
      assert.deepEqual(
          result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');

      result = parse('-key1:foo');
      assert.deepEqual(result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');

      result = parse('key1:foo key2:bar');
      assert.deepEqual(
          result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key2', regex: undefined, text: 'bar', negative: false}, 'result was incorrect');

      result = parse('-key1:foo key2:bar');
      assert.deepEqual(result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key2', regex: undefined, text: 'bar', negative: false}, 'result was incorrect');

      result = parse('key1:foo -key2:bar');
      assert.deepEqual(
          result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', regex: undefined, text: 'bar', negative: true}, 'result was incorrect');

      result = parse('-key1:foo -key2:bar');
      assert.deepEqual(result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', regex: undefined, text: 'bar', negative: true}, 'result was incorrect');

      result = parse('key1:/regex/');
      assert.deepEqual(
          result[0], {key: 'key1', regex: undefined, text: '/regex/', negative: false}, 'result was incorrect');

      result = parse('key1:foo innerText key2:bar');
      assert.deepEqual(
          result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: 'innerText', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: 'key2', regex: undefined, text: 'bar', negative: false}, 'result was incorrect');

      result = parse('bar key1 foo');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: 'key1', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'foo', negative: false}, 'result was incorrect');

      result = parse('bar key1:foo');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');

      result = parse('bar key1:foo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');

      result = parse('bar key1:foo yek:roo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'yek:roo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[3], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');

      result = parse('bar key1:foo -yek:roo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'yek:roo', negative: true}, 'result was incorrect');
      assert.deepEqual(
          result[3], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');

      result = parse('bar baz key1:foo goo zoo');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[3], {key: undefined, regex: undefined, text: 'goo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[4], {key: undefined, regex: undefined, text: 'zoo', negative: false}, 'result was incorrect');

      result = parse('bar key1:key1:foo');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: 'key1:foo', negative: false}, 'result was incorrect');

      result = parse('bar :key1:foo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: ':key1:foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');

      result = parse('bar -:key1:foo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: undefined, regex: undefined, text: '-:key1:foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');

      result = parse('bar key1:-foo baz');
      assert.deepEqual(
          result[0], {key: undefined, regex: undefined, text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[1], {key: 'key1', regex: undefined, text: '-foo', negative: false}, 'result was incorrect');
      assert.deepEqual(
          result[2], {key: undefined, regex: undefined, text: 'baz', negative: false}, 'result was incorrect');
    });
  });

  it('cloneFilter gives a correct copy', () => {
    const filter = {key: 'a', text: 'b', regex: /a/, negative: true};
    const cloned = FilterParser.cloneFilter(filter);

    assert.strictEqual(cloned.key, 'a', 'key was incorrect');
    assert.strictEqual(cloned.text, 'b', 'text was incorrect');
    assert.deepEqual(cloned.regex, /a/, 'regex was incorrect');
    assert.strictEqual(cloned.negative, true, 'negative was incorrect');
  });
});

describe('BalancedJSONTokenizer', () => {
  it('can be instantiated successfully', () => {
    const callback = () => {};
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);
    assert.strictEqual(tokenizer.remainder(), '', 'remainder was not empty');
  });

  it('can balance simple patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    let result = tokenizer.write('a');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback was called');

    result = tokenizer.write('{}');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['a{}'], 'callback had unexpected results');
  });

  it('can find simple unbalanced patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('{}}');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['{}'], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '}', 'remainder was incorrect');
  });

  it('can find simple unbalanced quote patterns', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('"""');
    assert.strictEqual(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '"""', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with }', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('}}');
    assert.strictEqual(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), '}}', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with ]', () => {
    const callbackResults: string[] = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write(']]');
    assert.strictEqual(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.strictEqual(tokenizer.remainder(), ']]', 'remainder was incorrect');
  });
});

describe('isMinified', () => {
  it('handles empty string', () => {
    const result = isMinified('');
    assert.strictEqual(result, false, 'was minified');
  });

  it('handles 500+ char string', () => {
    const result = isMinified('a'.repeat(501) + '\n');
    assert.strictEqual(result, true, 'was not minified');
  });

  it('handles big multiline string with 500+ char string at end', () => {
    const result = isMinified('a\n'.repeat(20) + 'b'.repeat(501) + '\n');
    assert.strictEqual(result, true, 'was not minified');
  });
});
