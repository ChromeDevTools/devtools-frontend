// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SnapshotTester} from '../../testing/SnapshotTester.js';

import * as TextUtils from './text_utils.js';

type SplitByRegexExpected = Array<[string, number, number]>;

interface SplitByRegexTestCase {
  testString: string;
  testName: string;
  regexes: RegExp[];
  expected: SplitByRegexExpected;
}

function assertResults(
    results: Array<{
      value: string,
      position: number,
      regexIndex: number,
      captureGroups: Array<string|undefined>,
    }>,
    expected: Array<[string, number, number]>) {
  if (results.length !== expected.length) {
    throw new Error('error they should match');
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const expect = expected[i];

    assert.strictEqual(result.value, expect[0]);
    assert.strictEqual(result.position, expect[1]);
    assert.strictEqual(result.regexIndex, expect[2]);
  }
}

describe('TextUtils', () => {
  describe('Utils', () => {
    describe('isSpaceChar', () => {
      it('returns the correct result for various inputs', () => {
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar(' '), 'space was not a space char');
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar('\t'), 'tab was not a space char');
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar('\f'), 'formfeed was not a space char');
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar('\r'), 'return was not a space char');
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar('\v'), 'vertical tab was not a space char');
        assert.isTrue(TextUtils.TextUtils.Utils.isSpaceChar('\xA0'), 'non-breaking space was not a space char');
        assert.isFalse(TextUtils.TextUtils.Utils.isSpaceChar('\0'), 'null was a space char');
        assert.isFalse(TextUtils.TextUtils.Utils.isSpaceChar('a'), 'a was a space char');
        assert.isFalse(TextUtils.TextUtils.Utils.isSpaceChar('A'), 'A was a space char');
      });
    });

    describe('lineIndent', () => {
      it('returns the correct result for various inputs', () => {
        assert.strictEqual(TextUtils.TextUtils.Utils.lineIndent(''), '', 'indent was not empty');
        assert.strictEqual(TextUtils.TextUtils.Utils.lineIndent('\tabc'), '\t', 'indent should have one tab');
        assert.strictEqual(TextUtils.TextUtils.Utils.lineIndent(' \t abc'), ' \t ', 'indent was wrong');
      });
    });
    describe('splitStringByRegexes', () => {
      it('returns the correct result for a single regex', () => {
        let result = TextUtils.TextUtils.Utils.splitStringByRegexes('', [/a/]);
        assert.lengthOf(result, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/]);
        assert.lengthOf(result, 1, 'length was wrong');
        assert.strictEqual(result[0].value, 'a', 'value was wrong');
        assert.strictEqual(result[0].position, 0, 'position was wrong');
        assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
        assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('ba b', [/a/]);
        assert.lengthOf(result, 3, 'length was wrong');
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
        let result = TextUtils.TextUtils.Utils.splitStringByRegexes('', [/a/, /b/]);
        assert.lengthOf(result, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/, /b/]);
        assert.lengthOf(result, 1, 'length was wrong');
        assert.strictEqual(result[0].value, 'a', 'value was wrong');
        assert.strictEqual(result[0].position, 0, 'position was wrong');
        assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
        assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('ba b', [/a/, /b/]);
        assert.lengthOf(result, 4, 'length was wrong');
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
        let result = TextUtils.TextUtils.Utils.splitStringByRegexes('', [/a/g, /b/g]);
        assert.lengthOf(result, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/g, /b/g]);
        assert.lengthOf(result, 1, 'length was wrong');
        assert.strictEqual(result[0].value, 'a', 'value was wrong');
        assert.strictEqual(result[0].position, 0, 'position was wrong');
        assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
        assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');
      });

      const splitByRegexTestCases: SplitByRegexTestCase[] = [
        {
          testName: 'returns splitted strings by regex',
          testString: 'hello123hello123',
          regexes: [/hello/g, /[0-9]+/g],
          expected: [
            ['hello', 0, 0],
            ['123', 5, 1],
            ['hello', 8, 0],
            ['123', 13, 1],
          ]
        },
        {
          testName: 'returns splitted string with match at start',
          testString: 'yes thank you',
          regexes: [/yes/g],
          expected: [
            ['yes', 0, 0],
            [' thank you', 3, -1],
          ]
        },
        {
          testName: 'returns splitted string with match at end',
          testString: 'yes thank you',
          regexes: [/you/g],
          expected: [
            ['yes thank ', 0, -1],
            ['you', 10, 0],
          ]
        },
        {
          testName: 'returns splitted string avoiding inner match',
          testString: 'image: url("red.com")',
          regexes: [/url\("red\.com"\)/g, /red/g],
          expected: [
            ['image: ', 0, -1],
            ['url("red.com")', 7, 0],
          ]
        },
        {
          testName: 'returns input for single regex without match',
          testString: 'nothing',
          regexes: [/something/g],
          expected: [
            ['nothing', 0, -1],
          ]
        },
        {
          testName: 'returns input for multiple regex without match',
          testString: 'nothing',
          regexes: [/something/g, /123/g, /abc/g],
          expected: [
            ['nothing', 0, -1],
          ]
        },
        {
          testName: 'complex case',
          testString: 'Start. (okay) kit-kat okay (kale) ka( ) okay. End',
          regexes: [/\(([^)]+)\)/g, /okay/g, /ka/g],
          expected: [
            ['Start. ', 0, -1],
            ['(okay)', 7, 0],
            [' kit-', 13, -1],
            ['ka', 18, 2],
            ['t ', 20, -1],
            ['okay', 22, 1],
            [' ', 26, -1],
            ['(kale)', 27, 0],
            [' ', 33, -1],
            ['ka', 34, 2],
            ['( )', 36, 0],
            [' ', 39, -1],
            ['okay', 40, 1],
            ['. End', 44, -1],
          ]
        }
      ];

      for (const testCase of splitByRegexTestCases) {
        it(testCase.testName, () => {
          const results = TextUtils.TextUtils.Utils.splitStringByRegexes(testCase.testString, testCase.regexes);
          assertResults(results, testCase.expected);
        });
      }
    });
  });

  describe('FilterParser', () => {
    it('can be instantiated successfully', () => {
      const testVal = 'TestVal1';
      const filterParser = new TextUtils.TextUtils.FilterParser(['TestVal1']);
      const result = filterParser.parse(testVal);
      assert.strictEqual(result[0].text, testVal, 'text value was not returned correctly');
      assert.isFalse(result[0].negative, 'negative value was not returned correctly');
    });

    describe('parse', () => {
      it('returns empty for empty string', () => {
        const testVal = '';
        const filterParser = new TextUtils.TextUtils.FilterParser(['TestVal1']);
        const result = filterParser.parse(testVal);
        assert.deepEqual(result, [], 'result was not empty');
      });

      // Ported from a web test: http/tests/devtools/unit/parse-filter-query.js
      it('returns correct results for a range of inputs', () => {
        const filterParser = new TextUtils.TextUtils.FilterParser(['key1', 'key2']);

        const parse = (text: string) => {
          return filterParser.parse(text) as Array<{negative: boolean, key?: string, text?: string, regex?: RegExp}>;
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
            result[0], {key: undefined, regex: /regex/im, text: undefined, negative: false}, 'result was incorrect');

        result = parse('/regex/ /another/');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex/im, text: undefined, negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: undefined, regex: /another/im, text: undefined, negative: false}, 'result was incorrect');

        result = parse(String.raw`/complex\/regex/`);
        assert.deepEqual(
            result[0], {key: undefined, regex: /complex\/regex/im, text: undefined, negative: false},
            'result was incorrect');

        result = parse(String.raw`/regex\?/`);
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex\?/im, text: undefined, negative: false}, 'result was incorrect');

        result = parse(String.raw`/regex\//`);
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex\//im, text: undefined, negative: false}, 'result was incorrect');

        result = parse(String.raw`/regex\?/ text`);
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex\?/im, text: undefined, negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

        result = parse('/regex with spaces/');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex with spaces/im, text: undefined, negative: false},
            'result was incorrect');

        result = parse('/regex/ text');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex/im, text: undefined, negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

        result = parse('/regex with spaces/ text');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex with spaces/im, text: undefined, negative: false},
            'result was incorrect');
        assert.deepEqual(
            result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

        result = parse('key1:foo');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');

        result = parse('-key1:foo');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');

        result = parse('key1:foo key2:bar');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: 'key2', regex: undefined, text: 'bar', negative: false}, 'result was incorrect');

        result = parse('-key1:foo key2:bar');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: 'key2', regex: undefined, text: 'bar', negative: false}, 'result was incorrect');

        result = parse('key1:foo -key2:bar');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: 'key2', regex: undefined, text: 'bar', negative: true}, 'result was incorrect');

        result = parse('-key1:foo -key2:bar');
        assert.deepEqual(
            result[0], {key: 'key1', regex: undefined, text: 'foo', negative: true}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: 'key2', regex: undefined, text: 'bar', negative: true}, 'result was incorrect');

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
      const cloned = TextUtils.TextUtils.FilterParser.cloneFilter(filter);

      assert.strictEqual(cloned.key, 'a', 'key was incorrect');
      assert.strictEqual(cloned.text, 'b', 'text was incorrect');
      assert.deepEqual(cloned.regex, /a/, 'regex was incorrect');
      assert.isTrue(cloned.negative, 'negative was incorrect');
    });
  });

  describe('BalancedJSONTokenizer', function() {
    it('can be instantiated successfully', () => {
      const callback = () => {};
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);
      assert.strictEqual(tokenizer.remainder(), '', 'remainder was not empty');
    });

    it('can balance simple patterns', () => {
      const callbackResults: string[] = [];
      const callback = (str: string) => {
        callbackResults.push(str);
      };
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      let result = tokenizer.write('a');
      assert.isTrue(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, [], 'callback was called');

      result = tokenizer.write('{}');
      assert.isTrue(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, ['a{}'], 'callback had unexpected results');
    });

    it('can find simple unbalanced patterns', () => {
      const callbackResults: string[] = [];
      const callback = (str: string) => {
        callbackResults.push(str);
      };
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      const result = tokenizer.write('{}}');
      assert.isTrue(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, ['{}'], 'callback had unexpected results');
      assert.strictEqual(tokenizer.remainder(), '}', 'remainder was incorrect');
    });

    it('can find simple unbalanced quote patterns', () => {
      const callbackResults: string[] = [];
      const callback = (str: string) => {
        callbackResults.push(str);
      };
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      const result = tokenizer.write('"""');
      assert.isTrue(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, [], 'callback had unexpected results');
      assert.strictEqual(tokenizer.remainder(), '"""', 'remainder was incorrect');
    });

    it('can find unbalanced patterns that start with }', () => {
      const callbackResults: string[] = [];
      const callback = (str: string) => {
        callbackResults.push(str);
      };
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      const result = tokenizer.write('}}');
      assert.isFalse(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, [], 'callback had unexpected results');
      assert.strictEqual(tokenizer.remainder(), '}}', 'remainder was incorrect');
    });

    it('can find unbalanced patterns that start with ]', () => {
      const callbackResults: string[] = [];
      const callback = (str: string) => {
        callbackResults.push(str);
      };
      const findMultiple = false;
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      const result = tokenizer.write(']]');
      assert.isFalse(result, 'return value was incorrect');
      assert.deepEqual(callbackResults, [], 'callback had unexpected results');
      assert.strictEqual(tokenizer.remainder(), ']]', 'remainder was incorrect');
    });

    const snapshotTester = new SnapshotTester(this, import.meta);

    it('matches quotes', function() {
      const testStrings = [
        {'odd back slashes with text around': 'tes\\"t'},
        {'escaped double quotes': '"test"'},
        {'escaped back slash before double quote': 'test\\'},
        {1: 2},
        {'': ''},
        {'nested brackets': {}},
        {'nested brackets with double quotes': {'': ''}},
        {etc: {'\\': '"'}},
        {etc: {'\\\\': '\\'}},
        {etc: {'\\\\"': '\\\\"'}},
      ];
      const results: string[] = [];
      const callback = (str: string) => results.push(str);

      for (const testString of testStrings) {
        const jsonString = JSON.stringify(testString);
        results.push('Parsing ' + jsonString);
        const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback);
        const result = tokenizer.write(jsonString);
        assert.isTrue(result, `tokenizer.write() returned ${result}, true expected`);
      }
      snapshotTester.assert(this, results.join('\n'));
    });

    it('matches sequence using one shot', function() {
      const testData = [
        {one: 'one'},
        [{one: 'one'}, {two: 'two'}],
        [{one: 'one'}, {two: 'two'}, {three: 'three'}],
      ];
      const results: string[] = [];
      const callback = (str: string) => results.push(str);

      for (const data of testData) {
        const jsonString = JSON.stringify(data);
        results.push('Parsing ' + jsonString);
        const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback);
        const result = tokenizer.write(jsonString);
        assert.isDefined(result, `tokenizer.write() returned ${result}, true expected`);
      }
      snapshotTester.assert(this, results.join('\n'));
    });

    it('matches sequence using multiple', function() {
      const testData = [
        {one: 'one'},
        [{one: 'one'}, {two: 'two'}],
        [{one: 'one'}, {two: 'two'}, {three: 'three'}],
      ];
      const results: string[] = [];
      const callback = (str: string) => results.push(str);

      for (const data of testData) {
        const jsonString = JSON.stringify(data);
        results.push('Parsing ' + jsonString);
        const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, true);
        const result = tokenizer.write(jsonString);
        const expectedResult = !(data instanceof Array);
        assert.strictEqual(result, expectedResult, `tokenizer.write() returned ${result}, ${expectedResult} expected`);
      }
      snapshotTester.assert(this, results.join('\n'));
    });

    it('incremental writes', function() {
      const testStrings = [
        {'odd back slashes with text around': 'tes\\"t'},
        {'escaped double quotes': '"test"'},
        {'escaped back slash before double quote': 'test\\'},
        {1: 2},
        {'': ''},
        {'nested brackets': {}},
        {'nested brackets with double quotes': {'': ''}},
        {etc: {'\\': '"'}},
        {etc: {'\\\\': '\\'}},
        {etc: {'\\\\"': '\\\\"'}},
      ];
      const results: string[] = [];
      const callback = (str: string) => results.push(str);
      const jsonString = JSON.stringify(testStrings);
      let tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, true);

      results.push('Running at once:');
      const result = tokenizer.write(jsonString);
      assert.isDefined(result, `tokenizer.write() returned ${result}, false expected`);

      for (const sample of [3, 15, 50]) {
        tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, true);
        results.push('Running by ' + sample + ':');
        for (let i = 0; i < jsonString.length; i += sample) {
          const result = tokenizer.write(jsonString.substring(i, i + sample));
          const expectedResult = (i + sample < jsonString.length);
          assert.strictEqual(
              !!result, expectedResult, `tokenizer.write() returned ${result}, ${expectedResult} expected`);
        }
      }
      snapshotTester.assert(this, results.join('\n'));
    });

    it('garbage after object', function() {
      const testString = '[{a: \'b\'}], {\'x\': {a: \'b\'}}';
      const results: string[] = [];
      const callback = (str: string) => results.push(str);

      results.push('Parsing ' + testString);
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, true);
      const result = tokenizer.write(testString);
      assert.isFalse(result, `tokenizer.write() returned ${result}, false expected`);

      snapshotTester.assert(this, results.join('\n'));
    });
  });

  describe('isMinified', () => {
    const {isMinified} = TextUtils.TextUtils;

    it('handles empty string', () => {
      const result = isMinified('');
      assert.isFalse(result, 'was minified');
    });

    it('correctly detects a minified HTML document', () => {
      const text = `
<!DOCTYPE html>
<html><head><title>Amazing document</title></head><body>${'<p>Some paragraph</p>'.repeat(100)}</body>
<script>function something() {}</script>
<style>* { color: black; }</style>
</html>
`;
      assert.isTrue(isMinified(text));
    });

    it('correctly detects minified Closure-style modules', () => {
      const text = `try{
export class BalancedJSONTokenizer{constructor(e,t){this.callback=e,this.index=0,this.balance=0,this.buffer="",this.findMultiple=t||!1,this.closingDoubleQuoteRegex=/[^\\](?:\\\\)*"/g}
write(e){this.buffer+=e;const t=this.buffer.length,i=this.buffer;let n;for(n=this.index;n<t;++n){const e=i[n];if('"'===e){if(this.closingDoubleQuoteRegex.lastIndex=n,!this.closingDoubleQuoteRegex.test(i))break;n=this.closingDoubleQuoteRegex.lastIndex-1}else if("{"===e)++this.balance;else if("}"===e){if(--this.balance,this.balance<0)return this.reportBalanced(),!1;if(!this.balance&&(this.lastBalancedIndex=n+1,!this.findMultiple))break}else if("]"===e&&!this.balance)return this.reportBalanced(),!1}return this.index=n,this.reportBalanced(),!0}
reportBalanced(){this.lastBalancedIndex&&(this.callback(this.buffer.slice(0,this.lastBalancedIndex)),this.buffer=this.buffer.slice(this.lastBalancedIndex),this.index-=this.lastBalancedIndex,this.lastBalancedIndex=0)}remainder(){return this.buffer}};
}catch(e){_._DumpException(e)}

try {

export const isMinified=function(e){let t=0;for(let i=0;i<e.length;++t){let t=e.indexOf("\n",i);
t<0&&(t=e.length),i=t+1}return(e.length-t)/t>=80};export const performSearchInContent=function(e,t,i,n){const s=Platform.StringUtilities.createSearchRegex(t,i,n),l=new Text(e),a=[];
for(let e=0;e<l.lineCount();++e){const t=l.lineAt(e);s.lastIndex=0;const i=s.exec(t);i&&a.push(new SearchMatch(e,t,i.index))}return a};
}catch(e){_._DumpException(e)}
//# sourceMappingURL=http://some.staging-system.some-company.com/path/to/my/amazing/sourcemap/for/this/file.js.map
// Some Company.`;
      assert.isTrue(isMinified(text));
    });

    it('doesn\'t detect JavaScript with one very long line in the end as minified', () => {
      let functions = 'const foo = 1;\n', exports = 'export {foo';
      for (let i = 0; i < 100; ++i) {
        functions += `function aSomewhatLongFunctionName${i}(x) {
  return x + ${i};
}
`;
        exports += `, aSomewhatLongFunctionName${i} as func${i}`;
      }
      exports += '};\n';
      const text = `${functions}${exports}`;
      assert.isFalse(isMinified(text));
    });
  });

  describe('detectIndentation', () => {
    const {detectIndentation} = TextUtils.TextUtils;

    it('returns `null` when no lines are given', () => {
      assert.isNull(detectIndentation([]));
    });

    it('returns `null` when all lines are empty', () => {
      assert.isNull(detectIndentation([
        '',
        '        ',
        '        ',
        '  ',
        '',
      ]));
    });

    it('correctly detects tab indentation', () => {
      assert.strictEqual(detectIndentation(['\ta', '\t\tb', 'c', 'd', '\t\t\tf']), '\t');
      assert.strictEqual(detectIndentation(['hello():', '\tworld();', '\treturn;']), '\t');
      assert.strictEqual(
          detectIndentation(`/**
 * Heuristic to check whether a given text was likely minified. Intended to
 * be used for HTML, CSS, and JavaScript inputs.
 *
 * A text is considered to be the result of minification if the average
 * line length for the whole text is 80 characters or more.
 *
 * @param text The input text to check.
 * @returns
 */
function isMinified(text) {
\tlet lineCount = 0;
\tfor (let lastIndex = 0; lastIndex < text.length; ++lineCount) {
\t\tlet eolIndex = text.indexOf('\n', lastIndex);
\t\tif (eolIndex < 0) {
\t\t\teolIndex = text.length;
\t\t}
\t\tlastIndex = eolIndex + 1;
\t}
\treturn (text.length - lineCount) / lineCount >= 80;
}`.split('\n')),
          '\t');
    });

    it('correctly detects 1-space indentation', () => {
      assert.strictEqual(
          detectIndentation(`/**
 * Heuristic to check whether a given text was likely minified. Intended to
 * be used for HTML, CSS, and JavaScript inputs.
 *
 * A text is considered to be the result of minification if the average
 * line length for the whole text is 80 characters or more.
 *
 * @param text The input text to check.
 * @returns
 */
function isMinified(text) {
 let lineCount = 0;
 for (let lastIndex = 0; lastIndex < text.length; ++lineCount) {
  let eolIndex = text.indexOf('\n', lastIndex);
  if (eolIndex < 0) {
   eolIndex = text.length;
  }
  lastIndex = eolIndex + 1;
 }
 return (text.length - lineCount) / lineCount >= 80;
}`.split('\n')),
          ' ');
    });

    it('correctly detects 2-space indentation', () => {
      assert.strictEqual(
          detectIndentation(`/**
 * Heuristic to check whether a given text was likely minified. Intended to
 * be used for HTML, CSS, and JavaScript inputs.
 *
 * A text is considered to be the result of minification if the average
 * line length for the whole text is 80 characters or more.
 *
 * @param text The input text to check.
 * @returns
 */
function isMinified(text) {
  let lineCount = 0;
  for (let lastIndex = 0; lastIndex < text.length; ++lineCount) {
    let eolIndex = text.indexOf('\n', lastIndex);
    if (eolIndex < 0) {
      eolIndex = text.length;
    }
    lastIndex = eolIndex + 1;
  }
  return (text.length - lineCount) / lineCount >= 80;
}`.split('\n')),
          '  ');
    });

    it('correctly detects 4-space indentation', () => {
      assert.strictEqual(detectIndentation(['hello():', '    world();', '    return;']), '    ');
      assert.strictEqual(
          detectIndentation(`/**
 * Heuristic to check whether a given text was likely minified. Intended to
 * be used for HTML, CSS, and JavaScript inputs.
 *
 * A text is considered to be the result of minification if the average
 * line length for the whole text is 80 characters or more.
 *
 * @param text The input text to check.
 * @returns
 */
function isMinified(text) {
    let lineCount = 0;
    for (let lastIndex = 0; lastIndex < text.length; ++lineCount) {
        let eolIndex = text.indexOf('\n', lastIndex);
        if (eolIndex < 0) {
            eolIndex = text.length;
        }
        lastIndex = eolIndex + 1;
    }
    return (text.length - lineCount) / lineCount >= 80;
}`.split('\n')),
          '    ');

      // Below is the problematic example explicitly called out
      // in go/chrome-devtools:indentation-markers-proposal
      assert.strictEqual(
          detectIndentation(`import { HOOK_PLUGIN_SETTINGS_SET } from './const.js';
import { now } from './time.js';
export class ApiProxy {
    constructor(plugin, hook) {
        this.target = null;
        this.targetQueue = [];
        this.onQueue = [];
        this.plugin = plugin;
        this.hook = hook;
        const defaultSettings = {};
        if (plugin.settings) {
            for (const id in plugin.settings) {
                const item = plugin.settings[id];
                defaultSettings[id] = item.defaultValue;
            }
        }
        const localSettingsSaveId = \`__vue-devtools-plugin-settings__\${plugin.id}\`;
        let currentSettings = Object.assign({}, defaultSettings);
        try {
            const raw = localStorage.getItem(localSettingsSaveId);
            const data = JSON.parse(raw);
            Object.assign(currentSettings, data);
        }
        catch (e) {
            // noop
        }
        this.fallbacks = {
            getSettings() {
                return currentSettings;
            },
            setSettings(value) {
                try {
                    localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
                }
                catch (e) {
                    // noop
                }
                currentSettings = value;
            },
            now() {
                return now();
            },
        };
        if (hook) {
            hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
                if (pluginId === this.plugin.id) {
                    this.fallbacks.setSettings(value);
                }
            });
        }
        this.proxiedOn = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target.on[prop];
                }
                else {
                    return (...args) => {
                        this.onQueue.push({
                            method: prop,
                            args,
                        });
                    };
                }
            },
        });
        this.proxiedTarget = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target[prop];
                }
                else if (prop === 'on') {
                    return this.proxiedOn;
                }
                else if (Object.keys(this.fallbacks).includes(prop)) {
                    return (...args) => {
                        this.targetQueue.push({
                            method: prop,
                            args,
                            resolve: () => { },
                        });
                        return this.fallbacks[prop](...args);
                    };
                }
                else {
                    return (...args) => {
                        return new Promise(resolve => {
                            this.targetQueue.push({
                                method: prop,
                                args,
                                resolve,
                            });
                        });
                    };
                }
            },
        });
    }
}`.split('\n')),
          '    ');
    });
  });

  describe('performExtendedSearchInContent', () => {
    it('returns an entry for each match on the same line', () => {
      const lines = ['The first line with a second "the".', 'The second line.'];

      const result =
          TextUtils.TextUtils.performSearchInContent(new TextUtils.Text.Text(lines.join('\n')), 'the', false, false);

      assert.deepEqual(result, [
        new TextUtils.ContentProvider.SearchMatch(0, lines[0], 0, 3),
        new TextUtils.ContentProvider.SearchMatch(0, lines[0], 30, 3),
        new TextUtils.ContentProvider.SearchMatch(1, lines[1], 0, 3),
      ]);
    });
  });

  describe('performExtendedSearchInSearchMatches', () => {
    it('returns an entry for each match on the same line', () => {
      const lines = ['The first line with a second "the".', 'The second line.'];
      const searchMatches = [
        {lineContent: lines[0], lineNumber: 5},
        {lineContent: lines[1], lineNumber: 42},
      ];

      const result = TextUtils.TextUtils.performSearchInSearchMatches(searchMatches, 'the', false, false);

      assert.deepEqual(result, [
        new TextUtils.ContentProvider.SearchMatch(5, lines[0], 0, 3),
        new TextUtils.ContentProvider.SearchMatch(5, lines[0], 30, 3),
        new TextUtils.ContentProvider.SearchMatch(42, lines[1], 0, 3),
      ]);
    });
  });

  describe('getOverlap', () => {
    it('should find the correct overlap between two strings', () => {
      assert.strictEqual(TextUtils.TextUtils.getOverlap('abcde', 'cdefg'), 'cde');
    });

    it('should return null if there is no overlap', () => {
      assert.isNull(TextUtils.TextUtils.getOverlap('abc', 'def'));
    });

    it('should handle identical strings', () => {
      assert.strictEqual(TextUtils.TextUtils.getOverlap('abc', 'abc'), 'abc');
    });

    it('should return null for empty strings', () => {
      assert.isNull(TextUtils.TextUtils.getOverlap('', 'abc'));
      assert.isNull(TextUtils.TextUtils.getOverlap('abc', ''));
      assert.isNull(TextUtils.TextUtils.getOverlap('', ''));
    });

    it('should find a single character overlap', () => {
      assert.strictEqual(TextUtils.TextUtils.getOverlap('abc', 'cde'), 'c');
    });

    it('should find the longest possible overlap', () => {
      assert.strictEqual(TextUtils.TextUtils.getOverlap('banana', 'ananas'), 'anana');
    });

    it('should be case-sensitive', () => {
      assert.strictEqual(TextUtils.TextUtils.getOverlap('aBc', 'Bcd'), 'Bc');
      assert.isNull(TextUtils.TextUtils.getOverlap('aBc', 'bcd'));
    });
  });
});
