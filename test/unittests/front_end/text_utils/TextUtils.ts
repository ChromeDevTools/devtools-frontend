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

    let result = tokenizer.write('{}}');
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

    let result = tokenizer.write('"""');
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

    let result = tokenizer.write('}}');
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

    let result = tokenizer.write(']]');
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
