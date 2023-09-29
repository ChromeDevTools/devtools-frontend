// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';

describe('TextUtils', () => {
  describe('Utils', () => {
    describe('isSpaceChar', () => {
      it('returns the correct result for various inputs', () => {
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar(' '), true, 'space was not a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('\t'), true, 'tab was not a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('\f'), true, 'formfeed was not a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('\r'), true, 'return was not a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('\v'), true, 'vertical tab was not a space char');
        assert.strictEqual(
            TextUtils.TextUtils.Utils.isSpaceChar('\xA0'), true, 'non-breaking space was not a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('\0'), false, 'null was a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('a'), false, 'a was a space char');
        assert.strictEqual(TextUtils.TextUtils.Utils.isSpaceChar('A'), false, 'A was a space char');
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
        assert.strictEqual(result.length, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/]);
        assert.strictEqual(result.length, 1, 'length was wrong');
        assert.strictEqual(result[0].value, 'a', 'value was wrong');
        assert.strictEqual(result[0].position, 0, 'position was wrong');
        assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
        assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('ba b', [/a/]);
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
        let result = TextUtils.TextUtils.Utils.splitStringByRegexes('', [/a/, /b/]);
        assert.strictEqual(result.length, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/, /b/]);
        assert.strictEqual(result.length, 1, 'length was wrong');
        assert.strictEqual(result[0].value, 'a', 'value was wrong');
        assert.strictEqual(result[0].position, 0, 'position was wrong');
        assert.strictEqual(result[0].regexIndex, 0, 'regex index was wrong');
        assert.deepEqual(result[0].captureGroups, [], 'capture groups was not empty');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('ba b', [/a/, /b/]);
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
        let result = TextUtils.TextUtils.Utils.splitStringByRegexes('', [/a/g, /b/g]);
        assert.strictEqual(result.length, 0, 'length was wrong');

        result = TextUtils.TextUtils.Utils.splitStringByRegexes('a', [/a/g, /b/g]);
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
      const filterParser = new TextUtils.TextUtils.FilterParser(['TestVal1']);
      const result = filterParser.parse(testVal);
      assert.strictEqual(result[0].text, testVal, 'text value was not returned correctly');
      assert.strictEqual(result[0].negative, false, 'negative value was not returned correctly');
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

        result = parse(String.raw`/complex\/regex/`);
        assert.deepEqual(
            result[0], {key: undefined, regex: /complex\/regex/i, text: undefined, negative: false},
            'result was incorrect');

        result = parse('/regex with spaces/');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex with spaces/i, text: undefined, negative: false},
            'result was incorrect');

        result = parse('/regex/ text');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex/i, text: undefined, negative: false}, 'result was incorrect');
        assert.deepEqual(
            result[1], {key: undefined, regex: undefined, text: 'text', negative: false}, 'result was incorrect');

        result = parse('/regex with spaces/ text');
        assert.deepEqual(
            result[0], {key: undefined, regex: /regex with spaces/i, text: undefined, negative: false},
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
      assert.strictEqual(cloned.negative, true, 'negative was incorrect');
    });
  });

  describe('BalancedJSONTokenizer', () => {
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
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

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
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

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
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

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
      const tokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(callback, findMultiple);

      const result = tokenizer.write(']]');
      assert.strictEqual(result, false, 'return value was incorrect');
      assert.deepEqual(callbackResults, [], 'callback had unexpected results');
      assert.strictEqual(tokenizer.remainder(), ']]', 'remainder was incorrect');
    });
  });

  describe('isMinified', () => {
    const {isMinified} = TextUtils.TextUtils;

    it('handles empty string', () => {
      const result = isMinified('');
      assert.strictEqual(result, false, 'was minified');
    });

    it('correctly detects a minified HTML document', () => {
      const text = `
<!DOCTYPE html>
<html><head><title>Amazing document</title></head><body>${'<p>Some paragraph</p>'.repeat(100)}</body>
<script>function something() {}</script>
<style>* { color: black; }</style>
</html>
`;
      assert.strictEqual(isMinified(text), true);
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
      assert.strictEqual(isMinified(text), true);
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
      assert.strictEqual(isMinified(text), false);
    });
  });

  describe('performExtendedSearchInContent', () => {
    it('returns an entry for each match on the same line', () => {
      const lines = ['The first line with a second "the".', 'The second line.'];

      const result = TextUtils.TextUtils.performSearchInContent(lines.join('\n'), 'the', false, false);

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
});
