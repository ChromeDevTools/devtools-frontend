// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';

import {encodeSourceMap} from '../../helpers/SourceMapEncoder.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

const sourceUrlFoo = '<foo>' as Platform.DevToolsPath.UrlString;

describe('SourceMapEntry', () => {
  it('can be instantiated correctly', () => {
    const sourceMapEntry = new SDK.SourceMap.SourceMapEntry(
        1, 1, 'http://www.example.com/' as Platform.DevToolsPath.UrlString, 1, 1, 'example');
    assert.strictEqual(sourceMapEntry.lineNumber, 1, 'line number was not set correctly');
    assert.strictEqual(sourceMapEntry.columnNumber, 1, 'column number was not set correctly');
    assert.strictEqual(
        sourceMapEntry.sourceURL, 'http://www.example.com/' as Platform.DevToolsPath.UrlString,
        'source URL was not set correctly');
    assert.strictEqual(sourceMapEntry.sourceLineNumber, 1, 'source line number was not set correctly');
    assert.strictEqual(sourceMapEntry.sourceColumnNumber, 1, 'source column number was not set correctly');
    assert.strictEqual(sourceMapEntry.name, 'example', 'name was not set correctly');
  });

  describe('comparison', () => {
    it('checks line numbers first', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(1, 5, sourceUrlFoo, 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 5, sourceUrlFoo, 2, 5, 'foo');
      assert.isBelow(
          SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('checks column numbers second when line numbers are equal', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(2, 5, sourceUrlFoo, 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 25, sourceUrlFoo, 2, 5, 'foo');
      assert.isBelow(
          SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('works for equal SourceMapEntries', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(2, 5, sourceUrlFoo, 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 5, sourceUrlFoo, 1, 5, 'foo');
      assert.strictEqual(SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0);
    });
  });
});

describeWithEnvironment('SourceMap', () => {
  const compiledUrl = 'compiled.js' as Platform.DevToolsPath.UrlString;
  const sourceMapJsonUrl = 'source-map.json' as Platform.DevToolsPath.UrlString;
  const sourceUrlExample = 'example.js' as Platform.DevToolsPath.UrlString;
  const sourceUrlOther = 'other.js' as Platform.DevToolsPath.UrlString;

  describe('StringCharIterator', () => {
    it('detects when it has reached the end', () => {
      const emptyIterator = new SDK.SourceMap.SourceMap.StringCharIterator('');
      assert.isFalse(emptyIterator.hasNext());

      const iterator = new SDK.SourceMap.SourceMap.StringCharIterator('foo');
      assert.isTrue(iterator.hasNext());
    });

    it('peeks the next character', () => {
      const emptyIterator = new SDK.SourceMap.SourceMap.StringCharIterator('');
      assert.strictEqual(emptyIterator.peek(), '');

      const iterator = new SDK.SourceMap.SourceMap.StringCharIterator('foo');
      assert.strictEqual(iterator.peek(), 'f');
    });

    it('advances when {next} is called', () => {
      const iterator = new SDK.SourceMap.SourceMap.StringCharIterator('bar');
      assert.strictEqual(iterator.next(), 'b');
      assert.strictEqual(iterator.next(), 'a');
      assert.strictEqual(iterator.next(), 'r');
      assert.isFalse(iterator.hasNext());
    });
  });

  function assertMapping(
      actual: SDK.SourceMap.SourceMapEntry|null, expectedSourceURL: string|undefined,
      expectedSourceLineNumber: number|undefined, expectedSourceColumnNumber: number|undefined) {
    assertNotNullOrUndefined(actual);
    assert.strictEqual(actual.sourceURL, expectedSourceURL, 'unexpected source URL');
    assert.strictEqual(actual.sourceLineNumber, expectedSourceLineNumber, 'unexpected source line number');
    assert.strictEqual(actual.sourceColumnNumber, expectedSourceColumnNumber, 'unexpected source column number');
  }

  function assertReverseMapping(
      actual: SDK.SourceMap.SourceMapEntry|null, expectedCompiledLineNumber: number,
      expectedCompiledColumnNumber: number) {
    assertNotNullOrUndefined(actual);
    assert.strictEqual(actual.lineNumber, expectedCompiledLineNumber, 'unexpected compiled line number');
    assert.strictEqual(actual.columnNumber, expectedCompiledColumnNumber, 'unexpected compiled column number');
  }

  // FIXME(szuend): The following tests are a straight-up port from a corresponding layout test.
  //                These tests should be cleaned up, made more readable and maybe refactor
  //                the underlying code to make the individual parts more testable.

  it('can parse a simple source map', () => {
    /*
          The numbers above the respective scripts are column numbers from 0 to 35.
          example.js:
          0         1         2         3
          012345678901234567890123456789012345
          function add(variable_x, variable_y)
          {
              return variable_x + variable_y;
          }

          var global = "foo";
          ----------------------------------------
          example-compiled.js:
          0         1         2         3
          012345678901234567890123456789012345
          function add(a,b){return a+b}var global="foo";
          foo
    */
    const mappingPayload = encodeSourceMap([
      // clang-format off
      '0:0 => example.js:0:9@add',
      '0:8 => example.js:0:9@add',
      '0:12 => example.js:0:12',
      '0:13 => example.js:0:13@variable_x',
      '0:14 => example.js:0:12',
      '0:15 => example.js:0:25@variable_y',
      '0:16 => example.js:0:12',
      '0:17 => example.js:1:0',
      '0:18 => example.js:2:4',
      '0:24 => example.js:2:11@variable_x',
      '0:26 => example.js:2:4',
      '0:27 => example.js:2:24@variable_y',
      '0:28 => example.js:1:0',
      '0:29 => example.js:5:0',
      '0:33 => example.js:5:4@global',
      '0:40 => example.js:5:13',
      '1:0',
      // clang-format on
    ]);

    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assertMapping(sourceMap.findEntry(0, 9), 'example.js', 0, 9);
    assertMapping(sourceMap.findEntry(0, 13), 'example.js', 0, 13);
    assertMapping(sourceMap.findEntry(0, 15), 'example.js', 0, 25);
    assertMapping(sourceMap.findEntry(0, 18), 'example.js', 2, 4);
    assertMapping(sourceMap.findEntry(0, 25), 'example.js', 2, 11);
    assertMapping(sourceMap.findEntry(0, 27), 'example.js', 2, 24);
    assertMapping(sourceMap.findEntry(1, 0), undefined, undefined, undefined);

    assertReverseMapping(sourceMap.sourceLineMapping(sourceUrlExample, 0, 0), 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping(sourceUrlExample, 1, 0), 0, 17);
    assertReverseMapping(sourceMap.sourceLineMapping(sourceUrlExample, 2, 0), 0, 18);
    assert.isNull(sourceMap.sourceLineMapping(sourceUrlExample, 4, 0), 'unexpected source mapping for line 4');
    assertReverseMapping(sourceMap.sourceLineMapping(sourceUrlExample, 5, 0), 0, 29);
  });

  it('can do reverse lookups', () => {
    const mappingPayload = encodeSourceMap([
      // clang-format off
      '0:0 => example.js:1:0',
      '1:0 => example.js:3:0',
      '2:0 => example.js:1:0',
      '4:0 => other.js:5:0',
      '5:0 => example.js:3:0',
      '7:2 => example.js:1:0',
      '10:5 => other.js:5:0',
      // clang-format on
    ]);

    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    // Exact match for source location.
    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlExample, 3, 0).map(r => r.serializeToObject()), [
      {startLine: 1, startColumn: 0, endLine: 2, endColumn: 0},
      {startLine: 5, startColumn: 0, endLine: 7, endColumn: 2},
    ]);

    // Inexact match.
    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlExample, 10, 0).map(r => r.serializeToObject()), [
      {startLine: 1, startColumn: 0, endLine: 2, endColumn: 0},
      {startLine: 5, startColumn: 0, endLine: 7, endColumn: 2},
    ]);

    // Match with more than two locations.
    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlExample, 1, 0).map(r => r.serializeToObject()), [
      {startLine: 0, startColumn: 0, endLine: 1, endColumn: 0},
      {startLine: 2, startColumn: 0, endLine: 4, endColumn: 0},
      {startLine: 7, startColumn: 2, endLine: 10, endColumn: 5},
    ]);

    // Match at the end of file.
    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlOther, 5, 0).map(r => r.serializeToObject()), [
      {startLine: 4, startColumn: 0, endLine: 5, endColumn: 0},
      {startLine: 10, startColumn: 5, endLine: 2 ** 31 - 1, endColumn: 2 ** 31 - 1},
    ]);

    // No match.
    assert.isEmpty(sourceMap.findReverseRanges(sourceUrlExample, 0, 0));
    assert.isEmpty(sourceMap.findReverseRanges(sourceUrlOther, 1, 0));

    // Also test the reverse lookup that returns points.
    assert.deepEqual(sourceMap.findReverseEntries(sourceUrlOther, 5, 0).map(e => e.lineNumber), [4, 10]);
    assert.deepEqual(sourceMap.findReverseEntries(sourceUrlOther, 10, 0).map(e => e.lineNumber), [4, 10]);
  });

  it('can do reverse lookups with merging', () => {
    const mappingPayload = encodeSourceMap([
      // clang-format off
      '0:0 => example.js:1:0',
      '1:0 => example.js:3:0',
      '2:0 => example.js:1:0',
      '3:0 => example.js:1:0',
      '4:0 => example.js:1:0',
      '5:0 => example.js:2:0',
      '5:2 => example.js:2:1',
      '5:4 => example.js:2:1',
      '5:6 => example.js:2:2',
      '5:8 => example.js:2:1',
      '6:2 => example.js:2:1',
      '6:4 => example.js:2:2',
      '7:0 => example.js:1:0',
      '8:0 => example.js:1:0',
      // clang-format on
    ]);

    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlExample, 1, 0).map(r => r.serializeToObject()), [
      {startLine: 0, startColumn: 0, endLine: 1, endColumn: 0},
      {startLine: 2, startColumn: 0, endLine: 5, endColumn: 0},
      {startLine: 7, startColumn: 0, endLine: 2 ** 31 - 1, endColumn: 2 ** 31 - 1},
    ]);

    assert.deepEqual(sourceMap.findReverseRanges(sourceUrlExample, 2, 1).map(r => r.serializeToObject()), [
      {startLine: 5, startColumn: 2, endLine: 5, endColumn: 6},
      {startLine: 5, startColumn: 8, endLine: 6, endColumn: 4},
    ]);
  });

  it('can parse source maps with segments that contain no mapping information', () => {
    const mappingPayload = {
      mappings: 'AAAA,C,CAAE;',
      sources: [sourceUrlExample],
      version: 3,
    };
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 0);
    assertMapping(sourceMap.findEntry(0, 2), 'example.js', 0, 2);

    const emptyEntry = sourceMap.findEntry(0, 1);
    assertNotNullOrUndefined(emptyEntry);
    assert.isUndefined(emptyEntry.sourceURL, 'unexpected url present for empty segment');
    assert.isUndefined(emptyEntry.sourceLineNumber, 'unexpected source line number for empty segment');
    assert.isUndefined(emptyEntry.sourceColumnNumber, 'unexpected source line number for empty segment');
  });

  it('can parse source maps with empty lines', () => {
    const mappingPayload = {
      mappings: 'AAAA;;;CACA',
      sources: [sourceUrlExample],
      version: 3,
    };
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping(sourceUrlExample, 1, 0), 3, 1);
  });

  it('can parse source maps with mappings in reverse direction', () => {
    /*
        example.js:
        ABCD

        compiled.js:
        DCBA
     */
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, {
      // mappings go in reversed direction.
      mappings: 'GAAA,DAAC,DAAC,DAAC',
      sources: ['example.js'],
      version: 3,
    });

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 3);
    assertMapping(sourceMap.findEntry(0, 1), 'example.js', 0, 2);
    assertMapping(sourceMap.findEntry(0, 2), 'example.js', 0, 1);
    assertMapping(sourceMap.findEntry(0, 3), 'example.js', 0, 0);
  });

  it('can parse the multiple sections format', () => {
    const mappingPayload: SDK.SourceMap.SourceMapV3 = {
      sections: [
        {
          offset: {line: 0, column: 0},
          map: {
            mappings: 'AAAA,CAEC',
            sources: ['source1.js', 'source2.js'],
            version: 3,
          },
        },
        {
          offset: {line: 2, column: 10},
          map: {
            mappings: 'AAAA,CAEC',
            sources: ['source3.js'],
            version: 3,
          },
        },
      ],
      version: 3,
    };
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assert.lengthOf(sourceMap.sourceURLs(), 3, 'unexpected number of original source URLs');
    assertMapping(sourceMap.findEntry(0, 0), 'source1.js', 0, 0);
    assertMapping(sourceMap.findEntry(0, 1), 'source1.js', 2, 1);
    assertMapping(sourceMap.findEntry(2, 10), 'source3.js', 0, 0);
    assertMapping(sourceMap.findEntry(2, 11), 'source3.js', 2, 1);
  });

  it('can parse source maps with ClosureScript names', () => {
    /*
      ------------------------------------------------------------------------------------
      chrome_issue_611738.clj:
      (ns devtools-sample.chrome-issue-611738)

      (defmacro m []
        `(let [generated# "value2"]))
      ------------------------------------------------------------------------------------
      chrome_issue_611738.cljs:
      (ns devtools-sample.chrome-issue-611738
      (:require-macros [devtools-sample.chrome-issue-611738 :refer [m]]))

      (let [name1 "value1"]
        (m))
      ------------------------------------------------------------------------------------
      chrome_issue_611738.js:
      // Compiled by ClojureScript 1.9.89 {}
      goog.provide('devtools_sample.chrome_issue_611738');
      goog.require('cljs.core');
      var name1_31466 = "value1";
      var generated31465_31467 = "value2";

      //# sourceMappingURL=chrome_issue_611738.js.map
      ------------------------------------------------------------------------------------
      chrome_issue_611738.js.map:
      {"version":3,"file":"\/Users\/darwin\/code\/cljs-devtools-sample\/resources\/public\/_compiled\/demo\/devtools_sample\/chrome_issue_611738.js","sources":["chrome_issue_611738.cljs"],"lineCount":7,"mappings":";AAAA;;AAGA,kBAAA,dAAMA;AAAN,AACE,IAAAC,uBAAA;AAAA,AAAA","names":["name1","generated31465"]}
      ------------------------------------------------------------------------------------
    */
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, {
      version: 3,
      sources: ['chrome_issue_611738.cljs'],
      mappings: ';AAAA;;AAGA,kBAAA,dAAMA;AAAN,AACE,IAAAC,uBAAA;AAAA,AAAA',
      names: ['name1', 'generated31465'],
    });

    assert.propertyVal(sourceMap.findEntry(1, 0), 'name', undefined);
    assert.propertyVal(sourceMap.findEntry(3, 0), 'name', undefined);
    assert.propertyVal(sourceMap.findEntry(3, 4), 'name', 'name1');
    assert.propertyVal(sourceMap.findEntry(3, 18), 'name', undefined);
    assert.propertyVal(sourceMap.findEntry(4, 0), 'name', undefined);
    assert.propertyVal(sourceMap.findEntry(4, 4), 'name', 'generated31465');
    assert.propertyVal(sourceMap.findEntry(4, 27), 'name', undefined);
    assert.propertyVal(sourceMap.findEntry(5, 0), 'name', undefined);
  });

  it('resolves duplicate canonical urls', () => {
    const mappingPayload = encodeSourceMap(
        [
          // clang-format off
          '0:0 => example.js:1:0',
          '1:0 => ./example.js:3:0',
          '2:0 => example.js:1:0',
          '4:0 => other.js:5:0',
          '5:0 => example.js:3:0',
          '7:2 => example.js:1:0',
          '10:5 => other.js:5:0',
          // clang-format on
        ],
        'wp:///' /* sourceRoot */);

    const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
    const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

    assertMapping(sourceMap.findEntry(1, 0), 'wp:///example.js', 3, 0);
    assertMapping(sourceMap.findEntry(4, 0), 'wp:///other.js', 5, 0);
  });

  describe('compatibleForURL', () => {
    const compiledURL = 'http://example.com/foo.js' as Platform.DevToolsPath.UrlString;
    const sourceMappingURL = `${compiledURL}.map` as Platform.DevToolsPath.UrlString;
    const sourceRoot = 'webpack:///src';
    const sourceURL = `${sourceRoot}/foo.ts` as Platform.DevToolsPath.UrlString;

    it('correctly identifies equal sourcemaps with content', () => {
      const payload = {
        mappings: '',
        sourceRoot,
        sources: ['foo.ts'],
        sourcesContent: ['function foo() {\n  console.log("Hello world!");\n}'],
        version: 3,
      };
      const sourceMap1 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload);
      const sourceMap2 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload);
      assert.isTrue(sourceMap1.compatibleForURL(sourceURL, sourceMap2));
      assert.isTrue(sourceMap2.compatibleForURL(sourceURL, sourceMap1));
    });

    it('correctly identifies equal sourcemaps without content', () => {
      const payload = {
        mappings: '',
        sourceRoot,
        sources: ['foo.ts'],
        version: 3,
      };
      const sourceMap1 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload);
      const sourceMap2 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload);
      assert.isTrue(sourceMap1.compatibleForURL(sourceURL, sourceMap2));
      assert.isTrue(sourceMap2.compatibleForURL(sourceURL, sourceMap1));
    });

    it('correctly differentiates based on content', () => {
      const sourceMap1 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, {
        mappings: '',
        sourceRoot,
        sources: ['foo.ts'],
        sourcesContent: ['function foo() {\n  console.log("Hello from first!");\n}'],
        version: 3,
      });
      const sourceMap2 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, {
        mappings: '',
        sourceRoot,
        sources: ['foo.ts'],
        sourcesContent: ['function foo() {\n  console.log("Hello from second!");\n}'],
        version: 3,
      });
      assert.isFalse(sourceMap1.compatibleForURL(sourceURL, sourceMap2));
      assert.isFalse(sourceMap2.compatibleForURL(sourceURL, sourceMap1));
    });

    it('correctly differentiates based on ignore-list hint', () => {
      const payload1 = {
        mappings: '',
        sourceRoot,
        sources: ['foo.ts'],
        sourcesContent: ['function foo() {\n  console.log("Hello world!");\n}'],
        version: 3,
      };
      const payload2 = {
        ...payload1,
        'ignoreList': [0],
      };
      const sourceMap1 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload1);
      const sourceMap2 = new SDK.SourceMap.SourceMap(compiledURL, sourceMappingURL, payload2);
      assert.isFalse(sourceMap1.compatibleForURL(sourceURL, sourceMap2));
      assert.isFalse(sourceMap2.compatibleForURL(sourceURL, sourceMap1));
    });
  });

  describe('source URL resolution', () => {
    const noSourceRoot = '';
    const absoluteSourceRootExample = 'http://example.com/src';
    const absoluteSourceRootFoo = 'http://foo.com/src';
    const relativeSourceRootSrc = 'src';
    const relativeSourceRootSlashSrc = '/src';
    const relativeSourceRootSrcSlash = 'src/';
    const relativeSourceRootCSlashD = 'c/d';
    const cases = [
      // No sourceRoot, relative sourceURL. sourceURL is normalized and resolved relative to sourceMapURL.
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: '../../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },

      // No sourceRoot, absolute sourceURL. The sourceURL is normalized and then used as-is.
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'webpack://example/src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'webpack://example/src/a/../b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/b/foo.ts',
      },

      // Relative sourceRoot, relative sourceURL. The sourceRoot and sourceURL paths are concatenated and normalized before resolving against the sourceMapURL.
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrcSlash,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrcSlash,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrcSlash,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSlashSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSlashSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSlashSrc,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootSrc,
        sourceURL: '../../../foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },

      // Relative sourceRoot, absolute sourceURL. Ignore the sourceRoot, normalize the sourceURL.
      {
        sourceRoot: relativeSourceRootCSlashD,
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: relativeSourceRootCSlashD,
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },

      // Absolute sourceRoot, relative sourceURL. Append the sourceURL path into the sourceRoot path, normalize and use the resulting URL.
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: 'a/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: 'a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/b/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: '/a/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: '/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/b/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootExample,
        sourceURL: '../../foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src/a/b',
        sourceURL: '../../../foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },

      // Absolute sourceRoot, absolute sourceURL. Ignore the sourceRoot, normalize the sourceURL.
      {
        sourceRoot: absoluteSourceRootFoo,
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: absoluteSourceRootFoo,
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'file.ts',
        sourceMapURL: 'https://example.com/some///random/file.js.map',
        expected: 'https://example.com/some///random/file.ts',
      },
      {
        sourceRoot: noSourceRoot,
        sourceURL: 'https://example.com/some///random/file.ts',
        sourceMapURL: 'https://example.com/some///random/file.js.map',
        expected: 'https://example.com/some///random/file.ts',
      },
    ];

    for (const {sourceRoot, sourceURL, sourceMapURL, expected} of cases) {
      it(`can resolve sourceURL "${sourceURL}" with sourceRoot "${sourceRoot}" and sourceMapURL "${sourceMapURL}"`,
         () => {
           const mappingPayload = {mappings: 'AAAA;;;CACA', sourceRoot, sources: [sourceURL], version: 3};
           const sourceMap = new SDK.SourceMap.SourceMap(
               compiledUrl, sourceMapURL as Platform.DevToolsPath.UrlString, mappingPayload);
           const sourceURLs = sourceMap.sourceURLs();
           assert.lengthOf(sourceURLs, 1, 'unexpected number of original source URLs');
           assert.strictEqual(sourceURLs[0], expected);
         });
    }

    it('does not touch sourceURLs that conflict with the compiled URL', () => {
      const sourceURL = 'http://localhost:12345/index.js' as Platform.DevToolsPath.UrlString;
      const sourceMappingURL = `${sourceURL}.map` as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(sourceURL, sourceMappingURL, {
        version: 3,
        sources: [sourceURL],
        sourcesContent: ['console.log(42)'],
        mappings: '',
      });
      const sourceURLs = sourceMap.sourceURLs();
      assert.lengthOf(sourceURLs, 1);
      assert.strictEqual(sourceURLs[0], sourceURL);
    });
  });

  describe('automatic ignore-listing', () => {
    it('parses the known third parties from the `ignoreList` section', () => {
      const mappingPayload = encodeSourceMap(
          [
            // clang-format off
            '0:0 => vendor.js:1:0',
            '1:0 => main.js:1:0',
            '2:0 => example.js:1:0',
            '3:0 => other.js:1:0',
            // clang-format on
          ],
          'wp:///' /* sourceRoot */);

      mappingPayload.ignoreList = [0 /* vendor.js */, 3 /* other.js */];

      const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///main.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///example.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///other.js' as Platform.DevToolsPath.UrlString), true);
    });

    it('parses the known third parties from the deprecated `x_google_ignoreList` section if `ignoreList` is not present',
       () => {
         const mappingPayload = encodeSourceMap(
             [
               // clang-format off
               '0:0 => vendor.js:1:0',
               '1:0 => main.js:1:0',
               '2:0 => example.js:1:0',
               '3:0 => other.js:1:0',
               // clang-format on
             ],
             'wp:///' /* sourceRoot */);

         mappingPayload.x_google_ignoreList = [0 /* vendor.js */, 3 /* other.js */];

         const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
         const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor.js' as Platform.DevToolsPath.UrlString), true);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///main.js' as Platform.DevToolsPath.UrlString), false);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///example.js' as Platform.DevToolsPath.UrlString), false);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///other.js' as Platform.DevToolsPath.UrlString), true);
       });

    it('parses the known third parties from the `ignoreList` section and ignores deprecated `x_google_ignoreList`',
       () => {
         const mappingPayload = encodeSourceMap(
             [
               // clang-format off
               '0:0 => vendor.js:1:0',
               '1:0 => main.js:1:0',
               '2:0 => example.js:1:0',
               '3:0 => other.js:1:0',
               // clang-format on
             ],
             'wp:///' /* sourceRoot */);

         mappingPayload.ignoreList = [0 /* vendor.js */, 3 /* other.js */];
         mappingPayload.x_google_ignoreList = [1 /* main.js */, 2 /* example.js */];

         const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
         const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor.js' as Platform.DevToolsPath.UrlString), true);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///main.js' as Platform.DevToolsPath.UrlString), false);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///example.js' as Platform.DevToolsPath.UrlString), false);
         assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///other.js' as Platform.DevToolsPath.UrlString), true);
       });

    it('computes ranges for third party code in a simple case', () => {
      const mappingPayload = encodeSourceMap(
          [
            // clang-format off
            '0:0 => vendor1.js:1:0',
            '1:0 => vendor2.js:1:0',
            '2:0 => vendor3.js:1:0',
            '3:0 => foo.js:1:0', // known end
            // clang-format on
          ],
          'wp:///' /* sourceRoot */);

      mappingPayload.ignoreList = [0 /* vendor1.js */, 1 /* vendor2.js */, 2 /* vendor3.js */];

      const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///foo.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor1.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor2.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor3.js' as Platform.DevToolsPath.UrlString), true);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url)) as [], [
        {
          'startLine': 0,
          'startColumn': 0,
          'endLine': 3,
          'endColumn': 0,
        },
      ]);
    });

    it('computes ranges for third party code when parts of the script are third-party', () => {
      const mappingPayload = encodeSourceMap(
          [
            // clang-format off
            '10:9 => foo.js:1:0',
            '11:8 => vendor1.js:1:0',
            '12:7 => vendor1.js:1:0',
            '13:6 => bar.js:1:0',
            '14:5 => vendor1.js:1:0',
            '15:4 => vendor2.js:1:0',
            '16:3 => vendor1.js:1:0',
            '17:2 => foo.js:1:0',
            '18:1 => baz.js:1:0',
            '19:0 => vendor3.js:1:0', // unknown end
            // clang-format on
          ],
          'wp:///' /* sourceRoot */);

      mappingPayload.ignoreList = [1 /* vendor1.js */, 3 /* vendor2.js */, 5 /* vendor3.js */];

      const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///foo.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///bar.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///baz.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor1.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor2.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor3.js' as Platform.DevToolsPath.UrlString), true);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url)) as [], [
        {
          'startLine': 11,
          'startColumn': 8,
          'endLine': 13,
          'endColumn': 6,
        },
        {
          'startLine': 14,
          'startColumn': 5,
          'endLine': 17,
          'endColumn': 2,
        },
        {
          'startLine': 19,
          'startColumn': 0,
          'endLine': 2147483647,
          'endColumn': 2147483647,
        },
      ]);
    });

    it('computes ranges when the first mapping is for third-party code that is not on the first char', () => {
      const mappingPayload = encodeSourceMap(
          [
            // clang-format off
            '10:9 => vendor1.js:1:0', // initial mapping not at 0:0
            '11:8 => vendor2.js:1:0',
            '12:7 => vendor3.js:1:0',
            '13:6 => foo.js:1:0', // known end
            // clang-format on
          ],
          'wp:///' /* sourceRoot */);

      mappingPayload.ignoreList = [0 /* vendor1.js */, 1 /* vendor2.js */, 2 /* vendor3.js */];

      const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///foo.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor1.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor2.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor3.js' as Platform.DevToolsPath.UrlString), true);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url)) as [], [
        {
          'startLine': 10,   // By default, unmapped code (before 10:9) is not considered
          'startColumn': 9,  // special, and will therefore not be included in the range.
          'endLine': 13,
          'endColumn': 6,
        },
      ]);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url), {isStartMatching: true}) as [], [
        {
          'startLine': 0,    // Starting at 0:0 instead of 10:9 because all the code until
          'startColumn': 0,  // the initial mapping is now assumed to match the predicate.
          'endLine': 13,
          'endColumn': 6,
        },
      ]);
    });

    it('computes ranges when the first mapping is for first-party code that is not on the first char', () => {
      const mappingPayload = encodeSourceMap(
          [
            // clang-format off
            '5:5 => foo.js:1:0', // initial mapping not at 0:0
            '10:9 => vendor1.js:1:0',
            '11:8 => vendor2.js:1:0',
            '12:7 => vendor3.js:1:0',
            '13:6 => foo.js:1:0', // known end
            // clang-format on
          ],
          'wp:///' /* sourceRoot */);

      mappingPayload.ignoreList = [1 /* vendor1.js */, 2 /* vendor2.js */, 3 /* vendor3.js */];

      const sourceMapJsonUrl = 'wp://test/source-map.json' as Platform.DevToolsPath.UrlString;
      const sourceMap = new SDK.SourceMap.SourceMap(compiledUrl, sourceMapJsonUrl, mappingPayload);

      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///foo.js' as Platform.DevToolsPath.UrlString), false);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor1.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor2.js' as Platform.DevToolsPath.UrlString), true);
      assert.strictEqual(sourceMap.hasIgnoreListHint('wp:///vendor3.js' as Platform.DevToolsPath.UrlString), true);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url)) as [], [
        {
          'startLine': 10,   // By default, unmapped code (before 5:5) is not considered
          'startColumn': 9,  // special, and will therefore not be included in the range.
          'endLine': 13,
          'endColumn': 6,
        },
      ]);

      assert.deepEqual(sourceMap.findRanges(url => sourceMap.hasIgnoreListHint(url), {isStartMatching: true}) as [], [
        {
          'startLine': 0,    // Starting at 0:0 instead of 10:9 because all the code until
          'startColumn': 0,  // the initial mapping is now assumed to match the predicate.
          'endLine': 5,      // And because the first source url is not hinted as being on
          'endColumn': 5,    // the ignore-list, there's now an extra initial range.
        },
        {
          'startLine': 10,
          'startColumn': 9,
          'endLine': 13,
          'endColumn': 6,
        },
      ]);
    });
  });

  describe('loadSourceMap', () => {
    const payload: SDK.SourceMap.SourceMapV3 = {version: 3, sources: [], mappings: ''};
    const {parseSourceMap} = SDK.SourceMap;

    it('can parse sourcemap with BOM at the beginning of the file', () => {
      const content = '\uFEFF' + JSON.stringify(payload);
      assert.deepEqual(parseSourceMap(content), payload);
    });

    it('skips over first line when file starts with )]}', () => {
      const content = ')]} {"version": 2}\n' + JSON.stringify(payload);
      assert.deepEqual(parseSourceMap(content), payload);
    });
  });

  describe('reverseMapTextRanges', () => {
    const {SourceMap} = SDK.SourceMap;
    const {TextRange} = TextUtils.TextRange;

    it('yields an empty array for unknown source URLs', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap(['0:0 => example.js:0:0']));
      assert.isEmpty(sourceMap.reverseMapTextRanges(sourceUrlOther, new TextRange(0, 0, 1, 1)));
    });

    it('yields a single range for trivial single-line, fully contained mappings', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '0:0 => example.js:0:0',
                                        '0:5 => example.js:0:6',
                                        '1:0 => other.js:0:0',
                                        '1:8 => other.js:0:9',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 0, 0, 6));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(0, 0, 0, 5));

      const otherRanges = sourceMap.reverseMapTextRanges(sourceUrlOther, new TextRange(0, 4, 0, 7));
      assert.lengthOf(otherRanges, 1, 'expected a single range');
      assert.deepEqual(otherRanges[0], new TextRange(1, 0, 1, 8));
    });

    it('yields a combined range for adjacent single-line mappings', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '0:0 => example.js:0:0',
                                        '0:5 => example.js:0:5',
                                        '0:9 => example.js:0:9',
                                        '5:0 => other.js:1:1',
                                        '5:1 => other.js:1:4',
                                        '5:8 => other.js:1:8',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 1, 0, 6));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(0, 0, 0, 9));

      const otherRanges = sourceMap.reverseMapTextRanges(sourceUrlOther, new TextRange(1, 1, 1, 7));
      assert.lengthOf(otherRanges, 1, 'expected a single range');
      assert.deepEqual(otherRanges[0], new TextRange(5, 0, 5, 8));
    });

    it('yields a combined range for adjacent multi-line mappings', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '0:0 => example.js:0:0',
                                        '2:5 => example.js:1:5',
                                        '9:9 => example.js:1:9',
                                      ]));

      let exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 0, 1, 6));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(0, 0, 9, 9));

      exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 0, 1, 9));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(0, 0, 9, 9));
    });

    it('correctly handles exact range matches', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '0:0 => example.js:0:0',
                                        '0:1 => example.js:0:3',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 0, 0, 3));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(0, 0, 0, 1));
    });

    it('correctly handles un-mapped prefixes in source files', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '1:2 => example.js:4:0',
                                        '3:4 => example.js:4:5',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(0, 0, 4, 1));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], new TextRange(1, 2, 3, 4));
    });

    it('correctly handles un-mapped suffixes in source files', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '1:2 => example.js:4:0',
                                        '3:4 => example.js:4:5',
                                      ]));

      let exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 0, 10, 0));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], TextRange.createUnboundedFromLocation(1, 2));

      exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 1, 10, 0));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], TextRange.createUnboundedFromLocation(1, 2));

      exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 5, 10, 0));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], TextRange.createUnboundedFromLocation(3, 4));

      exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 8, 10, 0));
      assert.lengthOf(exampleRanges, 1, 'expected a single range');
      assert.deepEqual(exampleRanges[0], TextRange.createUnboundedFromLocation(3, 4));
    });

    it('correctly handles single-line mappings with holes', () => {
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '1:0 => example.js:4:0',
                                        '1:1 => other.js:6:0',
                                        '1:4 => example.js:4:5',
                                        '1:5 => example.js:4:8',
                                        '1:6 => example.js:1:0',
                                        '1:7 => example.js:4:9',
                                      ]));

      let exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 1, 4, 6));
      assert.lengthOf(exampleRanges, 2, 'expected two distinct ranges');
      assert.deepEqual(exampleRanges[0], new TextRange(1, 0, 1, 1));
      assert.deepEqual(exampleRanges[1], new TextRange(1, 4, 1, 5));

      exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(4, 1, 4, 9));
      assert.lengthOf(exampleRanges, 2, 'expected two distinct ranges');
      assert.deepEqual(exampleRanges[0], new TextRange(1, 0, 1, 1));
      assert.deepEqual(exampleRanges[1], new TextRange(1, 4, 1, 6));
    });

    it('correctly handles overlapping mappings', () => {
      // This presents a really weird example, which we believe is unlikely to be relevant
      // in practice. But just in case, this test case serves as a documentation for how
      // DevTools will currently resolve this case: It will purely go by the reverse
      // mapping to figure out which chunks belong together and then afterwards will
      // try to combine mappings in the order in which the reverse mappings are sorted.
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '1:0 => example.js:1:0',
                                        '1:4 => example.js:1:5',
                                        '1:5 => example.js:1:8',
                                        '2:6 => example.js:1:1',
                                        '2:7 => example.js:1:9',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(1, 2, 1, 7));
      assert.lengthOf(exampleRanges, 2, 'expected two distinct ranges');
      assert.deepEqual(exampleRanges[0], new TextRange(1, 4, 1, 5));
      assert.deepEqual(exampleRanges[1], new TextRange(2, 6, 2, 7));
    });

    it('correctly sorts and merges adjacent mappings even if source map is unsorted', () => {
      // This is a slight variation of the previous test. We want to ensure that
      // no matter how crazy the source map, we always yield a maximally merged
      // and sorted result.
      const sourceMap = new SourceMap(compiledUrl, sourceMapJsonUrl, encodeSourceMap([
                                        '1:0 => example.js:1:0',
                                        '1:5 => example.js:1:8',
                                        '2:6 => example.js:1:1',
                                        '2:7 => example.js:1:9',
                                      ]));

      const exampleRanges = sourceMap.reverseMapTextRanges(sourceUrlExample, new TextRange(1, 0, 1, 9));
      assert.lengthOf(exampleRanges, 1, 'expected a single maximally merged range');
      assert.deepEqual(exampleRanges[0], new TextRange(1, 0, 2, 7));
    });
  });
});
