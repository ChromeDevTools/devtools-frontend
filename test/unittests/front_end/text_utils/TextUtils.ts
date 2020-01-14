// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {FilterParser, BalancedJSONTokenizer, isMinified} from '/front_end/text_utils/TextUtils.js';

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
