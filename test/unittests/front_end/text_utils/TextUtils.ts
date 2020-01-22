// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {FilterParser, BalancedJSONTokenizer, isMinified, Utils} from '/front_end/text_utils/TextUtils.js';

describe('Utils Object', () => {
  describe('isStopChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isStopChar('\0'), false, 'null was a stop char');
      assert.equal(Utils.isStopChar(' '), false, 'space was a stop char');
      assert.equal(Utils.isStopChar('!'), true, '! was not a stop char');
      assert.equal(Utils.isStopChar('/'), true, '/ was not a stop char');
      assert.equal(Utils.isStopChar('0'), false, '0 was a stop char');
      assert.equal(Utils.isStopChar('9'), false, '9 was a stop char');
      assert.equal(Utils.isStopChar('@'), true, '@ was not a stop char');
      assert.equal(Utils.isStopChar('A'), false, 'A was a stop char');
      assert.equal(Utils.isStopChar('B'), false, 'B was a stop char');
      assert.equal(Utils.isStopChar('Z'), false, 'Z was a stop char');
      assert.equal(Utils.isStopChar('['), true, '[ was not a stop char');
      assert.equal(Utils.isStopChar('_'), false, '_ was a stop char');
      assert.equal(Utils.isStopChar('`'), true, '` was not a stop char');
      assert.equal(Utils.isStopChar('a'), false, 'a was a stop char');
      assert.equal(Utils.isStopChar('b'), false, 'b was a stop char');
      assert.equal(Utils.isStopChar('z'), false, 'z was a stop char');
      assert.equal(Utils.isStopChar('{'), true, '{ was not a stop char');
    });
  });
  describe('isWordChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isWordChar(' '), false, 'space was a word char');
      assert.equal(Utils.isWordChar('\t'), false, 'tab was a word char');
      assert.equal(Utils.isWordChar('a'), true, 'a was not a word char');
      assert.equal(Utils.isWordChar('A'), true, 'A was not a word char');
      assert.equal(Utils.isWordChar('_'), true, '_ was not a word char');
    });
  });
  describe('isSpaceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isSpaceChar(' '), true, 'space was not a space char');
      assert.equal(Utils.isSpaceChar('\t'), true, 'tab was not a space char');
      assert.equal(Utils.isSpaceChar('\f'), true, 'formfeed was not a space char');
      assert.equal(Utils.isSpaceChar('\r'), true, 'return was not a space char');
      assert.equal(Utils.isSpaceChar('\v'), true, 'vertical tab was not a space char');
      assert.equal(Utils.isSpaceChar('\xA0'), true, 'non-breaking space was not a space char');
      assert.equal(Utils.isSpaceChar('\0'), false, 'null was a space char');
      assert.equal(Utils.isSpaceChar('a'), false, 'a was a space char');
      assert.equal(Utils.isSpaceChar('A'), false, 'A was a space char');
    });
  });
  describe('isWord', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isWord(''), true, 'empty string was not a word');
      assert.equal(Utils.isWord('_'), true, '_ string was not a word');
      assert.equal(Utils.isWord('a'), true, 'a string was not a word');
      assert.equal(Utils.isWord('abc'), true, 'abc string was not a word');
      assert.equal(Utils.isWord('a{'), false, 'a{ string was a word');
      assert.equal(Utils.isWord('a`'), false, 'a` string was a word');
      assert.equal(Utils.isWord(' '), false, 'space string was a word');
    });
  });
  describe('isOpeningBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isOpeningBraceChar('{'), true, '{ was not an opening brace');
      assert.equal(Utils.isOpeningBraceChar('('), true, '( was not an opening brace');
      assert.equal(Utils.isOpeningBraceChar('['), false, '[ was an opening brace');
      assert.equal(Utils.isOpeningBraceChar('<'), false, '< was an opening brace');
      assert.equal(Utils.isOpeningBraceChar('}'), false, '} was an opening brace');
      assert.equal(Utils.isOpeningBraceChar(')'), false, ') was an opening brace');
    });
  });
  describe('isClosingBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isClosingBraceChar('}'), true, '} was not a closing brace');
      assert.equal(Utils.isClosingBraceChar(')'), true, ') was not a closing brace');
      assert.equal(Utils.isClosingBraceChar(']'), false, '] was a closing brace');
      assert.equal(Utils.isClosingBraceChar('>'), false, '> was a closing brace');
      assert.equal(Utils.isClosingBraceChar('{'), false, '{} was a closing brace');
      assert.equal(Utils.isClosingBraceChar('('), false, '() was a closing brace');
    });
  });
  describe('isBraceChar', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isBraceChar('{'), true, '{ was not a brace');
      assert.equal(Utils.isBraceChar('('), true, '( was not a brace');
      assert.equal(Utils.isBraceChar('}'), true, '} was not a brace');
      assert.equal(Utils.isBraceChar(')'), true, ') was not a brace');
      assert.equal(Utils.isBraceChar('['), false, '[ was a brace');
      assert.equal(Utils.isBraceChar('<'), false, '< was a brace');
      assert.equal(Utils.isBraceChar(']'), false, '] was a brace');
      assert.equal(Utils.isBraceChar('>'), false, '> was a brace');
    });
  });
  describe('textToWords', () => {
    it('returns the correct result for various inputs', () => {
      const isWordChar = Utils.isWordChar;
      const words = [];
      const callback = (word: string) => {
        words.push(word);
      };
      Utils.textToWords('', isWordChar, callback);
      assert.equal(words.length, 0, 'words was not empty');
      Utils.textToWords(' a', isWordChar, callback);
      assert.equal(words.length, 1, 'words had wrong length');
      assert.equal(words[0], 'a');
      Utils.textToWords(' a _', isWordChar, callback);
      assert.equal(words.length, 3, 'words had wrong length');
      assert.equal(words[1], 'a');
      assert.equal(words[2], '_');
    });
  });
  describe('lineIndent', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.lineIndent(''), '', 'indent was not empty');
      assert.equal(Utils.lineIndent('\tabc'), '\t', 'indent should have one tab');
      assert.equal(Utils.lineIndent(' \t abc'), ' \t ', 'indent was wrong');
    });
  });
  describe('isUpperCase', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isUpperCase('a'), false, 'a was upper case');
      assert.equal(Utils.isUpperCase('A'), true, 'A was not upper case');
      assert.equal(Utils.isUpperCase('_'), true, '_ was not upper case');
      assert.equal(Utils.isUpperCase('!'), true, '! was not upper case');
      assert.equal(Utils.isUpperCase('@'), true, '@ was not upper case');
    });
  });
  describe('isLowerCase', () => {
    it('returns the correct result for various inputs', () => {
      assert.equal(Utils.isLowerCase('a'), true, 'a was lower case');
      assert.equal(Utils.isLowerCase('A'), false, 'A was not lower case');
      assert.equal(Utils.isLowerCase('_'), true, '_ was not lower case');
      assert.equal(Utils.isLowerCase('!'), true, '! was not lower case');
      assert.equal(Utils.isLowerCase('@'), true, '@ was not lower case');
    });
  });
  describe('splitStringByRegexes', () => {
    it('returns the correct result for a single regex', () => {
      let result = Utils.splitStringByRegexes('', [/a/]);
      assert.equal(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/]);
      assert.equal(result.length, 1, 'length was wrong');
      assert.equal(result[0].value, 'a', 'value was wrong');
      assert.equal(result[0].position, 0, 'position was wrong');
      assert.equal(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

      result = Utils.splitStringByRegexes('ba b', [/a/]);
      assert.equal(result.length, 3, 'length was wrong');
      assert.equal(result[0].value, 'b', 'value was wrong');
      assert.equal(result[0].position, 0, 'position was wrong');
      assert.equal(result[0].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
      assert.equal(result[1].value, 'a', 'value was wrong');
      assert.equal(result[1].position, 1, 'position was wrong');
      assert.equal(result[1].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[1].captureGroups, [], 'capture groups was not empty');
      assert.equal(result[2].value, ' b', 'value was wrong');
      assert.equal(result[2].position, 2, 'position was wrong');
      assert.equal(result[2].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[2].captureGroups, [], 'capture groups was not empty');
    });
    it('returns the correct result for a multiple regexs', () => {
      let result = Utils.splitStringByRegexes('', [/a/, /b/]);
      assert.equal(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/, /b/]);
      assert.equal(result.length, 1, 'length was wrong');
      assert.equal(result[0].value, 'a', 'value was wrong');
      assert.equal(result[0].position, 0, 'position was wrong');
      assert.equal(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

      result = Utils.splitStringByRegexes('ba b', [/a/, /b/]);
      assert.equal(result.length, 4, 'length was wrong');
      assert.equal(result[0].value, 'b', 'value was wrong');
      assert.equal(result[0].position, 0, 'position was wrong');
      assert.equal(result[0].regexIndex, 1, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
      assert.equal(result[1].value, 'a', 'value was wrong');
      assert.equal(result[1].position, 1, 'position was wrong');
      assert.equal(result[1].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[1].captureGroups, [], 'capture groups was not empty');
      assert.equal(result[2].value, ' ', 'value was wrong');
      assert.equal(result[2].position, 2, 'position was wrong');
      assert.equal(result[2].regexIndex, -1, 'regex index was wrong');
      assert.deepEqual(result[2].captureGroups, [], 'capture groups was not empty');
      assert.equal(result[3].value, 'b', 'value was wrong');
      assert.equal(result[3].position, 3, 'position was wrong');
      assert.equal(result[3].regexIndex, 1, 'regex index was wrong');
      assert.deepEqual(result[3].captureGroups, [], 'capture groups was not empty');
    });
    it('returns the correct result for global regexs', () => {
      let result = Utils.splitStringByRegexes('', [/a/g, /b/g]);
      assert.equal(result.length, 0, 'length was wrong');

      result = Utils.splitStringByRegexes('a', [/a/g, /b/g]);
      assert.equal(result.length, 1, 'length was wrong');
      assert.equal(result[0].value, 'a', 'value was wrong');
      assert.equal(result[0].position, 0, 'position was wrong');
      assert.equal(result[0].regexIndex, 0, 'regex index was wrong');
      assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
    });
  });
});

describe('FilterParser', () => {
  it('can be instantiated successfully', () => {
    const testVal = 'TestVal1';
    const filterParser = new FilterParser(['TestVal1']);
    const result = filterParser.parse(testVal);
    assert.equal(result[0].text, testVal, 'text value was not returned correctly');
    assert.equal(result[0].negative, false, 'negative value was not returned correctly');
  });
});

describe('BalancedJSONTokenizer', () => {
  it('can be instantiated successfully', () => {
    const callback = () => {};
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);
    assert.equal(tokenizer.remainder(), '', 'remainder was not empty');
  });

  it('can balance simple patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    let result = tokenizer.write('a');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback was called');

    result = tokenizer.write('{}');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['a{}'], 'callback had unexpected results');
  });

  it('can find simple unbalanced patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('{}}');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['{}'], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '}', 'remainder was incorrect');
  });

  it('can find simple unbalanced quote patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('"""');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '"""', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with }', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('}}');
    assert.equal(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '}}', 'remainder was incorrect');
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

      let result = filterParser.parse('text');
      assert.deepEqual(result[0], {text: 'text', negative: false}, 'result was incorrect');

      result = filterParser.parse('spaced text');
      assert.deepEqual(result[0], {text: 'spaced', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: 'text', negative: false}, 'result was incorrect');

      result = filterParser.parse('-');
      assert.deepEqual(result[0], {text: '-', negative: false}, 'result was incorrect');

      result = filterParser.parse('-text');
      assert.deepEqual(result[0], {text: 'text', negative: true}, 'result was incorrect');

      result = filterParser.parse('//');
      assert.deepEqual(result[0], {text: '//', negative: false}, 'result was incorrect');

      result = filterParser.parse('/regex/');
      assert.deepEqual(result[0], {regex: /regex/i, negative: false}, 'result was incorrect');

      result = filterParser.parse('/regex/ /another/');
      assert.deepEqual(result[0], {regex: /regex/i, negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {regex: /another/i, negative: false}, 'result was incorrect');

      result = filterParser.parse('/complex\/regex/');
      assert.deepEqual(result[0], {regex: /complex\/regex/i, negative: false}, 'result was incorrect');

      result = filterParser.parse('/regex/ text');
      assert.deepEqual(result[0], {regex: /regex/i, negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: 'text', negative: false}, 'result was incorrect');

      result = filterParser.parse('key1:foo');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');

      result = filterParser.parse('-key1:foo');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: true}, 'result was incorrect');

      result = filterParser.parse('key1:foo key2:bar');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', text: 'bar', negative: false}, 'result was incorrect');

      result = filterParser.parse('-key1:foo key2:bar');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: true}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', text: 'bar', negative: false}, 'result was incorrect');

      result = filterParser.parse('key1:foo -key2:bar');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', text: 'bar', negative: true}, 'result was incorrect');

      result = filterParser.parse('-key1:foo -key2:bar');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: true}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key2', text: 'bar', negative: true}, 'result was incorrect');

      result = filterParser.parse('key1:/regex/');
      assert.deepEqual(result[0], {key: 'key1', text: '/regex/', negative: false}, 'result was incorrect');

      result = filterParser.parse('key1:foo innerText key2:bar');
      assert.deepEqual(result[0], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: 'innerText', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {key: 'key2', text: 'bar', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1 foo');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: 'key1', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'foo', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:foo');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:foo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'baz', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:foo yek:roo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'yek:roo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[3], {text: 'baz', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:foo -yek:roo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'yek:roo', negative: true}, 'result was incorrect');
      assert.deepEqual(result[3], {text: 'baz', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar baz key1:foo goo zoo');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: 'baz', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {key: 'key1', text: 'foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[3], {text: 'goo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[4], {text: 'zoo', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:key1:foo');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: 'key1:foo', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar :key1:foo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: ':key1:foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'baz', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar -:key1:foo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {text: '-:key1:foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'baz', negative: false}, 'result was incorrect');

      result = filterParser.parse('bar key1:-foo baz');
      assert.deepEqual(result[0], {text: 'bar', negative: false}, 'result was incorrect');
      assert.deepEqual(result[1], {key: 'key1', text: '-foo', negative: false}, 'result was incorrect');
      assert.deepEqual(result[2], {text: 'baz', negative: false}, 'result was incorrect');
    });
  });

  it('cloneFilter gives a correct copy', () => {
    const filter = {key: 'a', text: 'b', regex: /a/, negative: true};
    const cloned = FilterParser.cloneFilter(filter);

    assert.equal(cloned.key, 'a', 'key was incorrect');
    assert.equal(cloned.text, 'b', 'text was incorrect');
    assert.deepEqual(cloned.regex, /a/, 'regex was incorrect');
    assert.equal(cloned.negative, true, 'negative was incorrect');
  });
});

describe('BalancedJSONTokenizer', () => {
  it('can be instantiated successfully', () => {
    const callback = () => {};
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);
    assert.equal(tokenizer.remainder(), '', 'remainder was not empty');
  });

  it('can balance simple patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    let result = tokenizer.write('a');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback was called');

    result = tokenizer.write('{}');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['a{}'], 'callback had unexpected results');
  });

  it('can find simple unbalanced patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('{}}');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, ['{}'], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '}', 'remainder was incorrect');
  });

  it('can find simple unbalanced quote patterns', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('"""');
    assert.equal(result, true, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '"""', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with }', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write('}}');
    assert.equal(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), '}}', 'remainder was incorrect');
  });

  it('can find unbalanced patterns that start with ]', () => {
    const callbackResults = [];
    const callback = (str: string) => {
      callbackResults.push(str);
    };
    const findMultiple = false;
    const tokenizer = new BalancedJSONTokenizer(callback, findMultiple);

    const result = tokenizer.write(']]');
    assert.equal(result, false, 'return value was incorrect');
    assert.deepEqual(callbackResults, [], 'callback had unexpected results');
    assert.equal(tokenizer.remainder(), ']]', 'remainder was incorrect');
  });
});

describe('isMinified', () => {
  it('handles empty string', () => {
    const result = isMinified('');
    assert.equal(result, false, 'was minified');
  });

  it('handles 500+ char string', () => {
    const result = isMinified('a'.repeat(501) + '\n');
    assert.equal(result, true, 'was not minified');
  });

  it('handles big multiline string with 500+ char string at end', () => {
    const result = isMinified('a\n'.repeat(20) + 'b'.repeat(501) + '\n');
    assert.equal(result, true, 'was not minified');
  });
});
