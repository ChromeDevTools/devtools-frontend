// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {encodeSourceMap} from '../../helpers/SourceMapEncoder.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

const fakeInitiator = {
  target: null,
  frameId: '123' as Protocol.Page.FrameId,
  initiatorUrl: '',
};

describe('SourceMapEntry', () => {
  it('can be instantiated correctly', () => {
    const sourceMapEntry = new SDK.SourceMap.SourceMapEntry(1, 1, 'http://www.example.com/', 1, 1, 'example');
    assert.strictEqual(sourceMapEntry.lineNumber, 1, 'line number was not set correctly');
    assert.strictEqual(sourceMapEntry.columnNumber, 1, 'column number was not set correctly');
    assert.strictEqual(sourceMapEntry.sourceURL, 'http://www.example.com/', 'source URL was not set correctly');
    assert.strictEqual(sourceMapEntry.sourceLineNumber, 1, 'source line number was not set correctly');
    assert.strictEqual(sourceMapEntry.sourceColumnNumber, 1, 'source column number was not set correctly');
    assert.strictEqual(sourceMapEntry.name, 'example', 'name was not set correctly');
  });

  describe('comparison', () => {
    it('checks line numbers first', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(1, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 5, '<foo>', 2, 5, 'foo');
      assert.isBelow(
          SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('checks column numbers second when line numbers are equal', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 25, '<foo>', 2, 5, 'foo');
      assert.isBelow(
          SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('works for equal SourceMapEntries', () => {
      const sourceMapEntry1 = new SDK.SourceMap.SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SDK.SourceMap.SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      assert.strictEqual(SDK.SourceMap.SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0);
    });
  });
});

describe('TextSourceMap', () => {
  describe('StringCharIterator', () => {
    it('detects when it has reached the end', () => {
      const emptyIterator = new SDK.SourceMap.TextSourceMap.StringCharIterator('');
      assert.isFalse(emptyIterator.hasNext());

      const iterator = new SDK.SourceMap.TextSourceMap.StringCharIterator('foo');
      assert.isTrue(iterator.hasNext());
    });

    it('peeks the next character', () => {
      const emptyIterator = new SDK.SourceMap.TextSourceMap.StringCharIterator('');
      assert.strictEqual(emptyIterator.peek(), '');

      const iterator = new SDK.SourceMap.TextSourceMap.StringCharIterator('foo');
      assert.strictEqual(iterator.peek(), 'f');
    });

    it('advances when {next} is called', () => {
      const iterator = new SDK.SourceMap.TextSourceMap.StringCharIterator('bar');
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

    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

    assertMapping(sourceMap.findEntry(0, 9), 'example.js', 0, 9);
    assertMapping(sourceMap.findEntry(0, 13), 'example.js', 0, 13);
    assertMapping(sourceMap.findEntry(0, 15), 'example.js', 0, 25);
    assertMapping(sourceMap.findEntry(0, 18), 'example.js', 2, 4);
    assertMapping(sourceMap.findEntry(0, 25), 'example.js', 2, 11);
    assertMapping(sourceMap.findEntry(0, 27), 'example.js', 2, 24);
    assertMapping(sourceMap.findEntry(1, 0), undefined, undefined, undefined);

    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 0, 0), 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 1, 0), 0, 17);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 2, 0), 0, 18);
    assert.isNull(sourceMap.sourceLineMapping('example.js', 4, 0), 'unexpected source mapping for line 4');
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 5, 0), 0, 29);
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

    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

    // Exact match for source location.
    assert.deepEqual(sourceMap.findReverseRanges('example.js', 3, 0).map(r => r.serializeToObject()), [
      {startLine: 1, startColumn: 0, endLine: 2, endColumn: 0},
      {startLine: 5, startColumn: 0, endLine: 7, endColumn: 2},
    ]);

    // Inexact match.
    assert.deepEqual(sourceMap.findReverseRanges('example.js', 10, 0).map(r => r.serializeToObject()), [
      {startLine: 1, startColumn: 0, endLine: 2, endColumn: 0},
      {startLine: 5, startColumn: 0, endLine: 7, endColumn: 2},
    ]);

    // Match with more than two locations.
    assert.deepEqual(sourceMap.findReverseRanges('example.js', 1, 0).map(r => r.serializeToObject()), [
      {startLine: 0, startColumn: 0, endLine: 1, endColumn: 0},
      {startLine: 2, startColumn: 0, endLine: 4, endColumn: 0},
      {startLine: 7, startColumn: 2, endLine: 10, endColumn: 5},
    ]);

    // Match at the end of file.
    assert.deepEqual(sourceMap.findReverseRanges('other.js', 5, 0).map(r => r.serializeToObject()), [
      {startLine: 4, startColumn: 0, endLine: 5, endColumn: 0},
      {startLine: 10, startColumn: 5, endLine: Infinity, endColumn: 0},
    ]);

    // No match.
    assert.isEmpty(sourceMap.findReverseRanges('example.js', 0, 0));
    assert.isEmpty(sourceMap.findReverseRanges('other.js', 1, 0));

    // Also test the reverse lookup that returns points.
    assert.deepEqual(sourceMap.findReverseEntries('other.js', 5, 0).map(e => e.lineNumber), [4, 10]);
    assert.deepEqual(sourceMap.findReverseEntries('other.js', 10, 0).map(e => e.lineNumber), [4, 10]);
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

    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

    assert.deepEqual(sourceMap.findReverseRanges('example.js', 1, 0).map(r => r.serializeToObject()), [
      {startLine: 0, startColumn: 0, endLine: 1, endColumn: 0},
      {startLine: 2, startColumn: 0, endLine: 5, endColumn: 0},
      {startLine: 7, startColumn: 0, endLine: Infinity, endColumn: 0},
    ]);

    assert.deepEqual(sourceMap.findReverseRanges('example.js', 2, 1).map(r => r.serializeToObject()), [
      {startLine: 5, startColumn: 2, endLine: 5, endColumn: 6},
      {startLine: 5, startColumn: 8, endLine: 6, endColumn: 4},
    ]);
  });

  it('can parse source maps with segments that contain no mapping information', () => {
    const mappingPayload = {
      mappings: 'AAAA,C,CAAE;',
      sources: ['example.js'],
      version: 1,
      file: undefined,
      sections: undefined,
      sourceRoot: undefined,
      names: undefined,
      sourcesContent: undefined,
    };
    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

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
      sources: ['example.js'],
      version: 1,
      file: undefined,
      sections: undefined,
      sourceRoot: undefined,
      names: undefined,
      sourcesContent: undefined,
    };
    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 1, 0), 3, 1);
  });

  it('can parse the multiple sections format', () => {
    const mappingPayload = {
      mappings: '',
      sources: [],
      sections: [
        {
          offset: {line: 0, 'column': 0},
          map: {
            mappings: 'AAAA,CAEC',
            sources: ['source1.js', 'source2.js'],
            version: 1,
            file: undefined,
            sections: undefined,
            sourceRoot: undefined,
            names: undefined,
            sourcesContent: undefined,
          },
          url: undefined,
        },
        {
          offset: {line: 2, 'column': 10},
          map: {
            mappings: 'AAAA,CAEC',
            sources: ['source2.js'],
            version: 1,
            file: undefined,
            sections: undefined,
            sourceRoot: undefined,
            names: undefined,
            sourcesContent: undefined,
          },
          url: undefined,
        },
      ],
      version: 1,
      file: undefined,
      sourceRoot: undefined,
      names: undefined,
      sourcesContent: undefined,
    };
    const sourceMap = new SDK.SourceMap.TextSourceMap('compiled.js', 'source-map.json', mappingPayload, fakeInitiator);

    assert.lengthOf(sourceMap.sourceURLs(), 2, 'unexpected number of original source URLs');
    assertMapping(sourceMap.findEntry(0, 0), 'source1.js', 0, 0);
    assertMapping(sourceMap.findEntry(0, 1), 'source1.js', 2, 1);
    assertMapping(sourceMap.findEntry(2, 10), 'source2.js', 0, 0);
    assertMapping(sourceMap.findEntry(2, 11), 'source2.js', 2, 1);
  });

  describe('source URL resolution', () => {
    const cases = [
      // No sourceRoot, relative sourceURL. sourceURL is normalized and resolved relative to sourceMapURL.
      {
        sourceRoot: '',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '/./foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: '../../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },

      // No sourceRoot, absolute sourceURL. The sourceURL is normalized and then used as-is.
      {
        sourceRoot: '',
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: 'webpack://example/src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
      {
        sourceRoot: '',
        sourceURL: 'webpack://example/src/a/../b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/b/foo.ts',
      },

      // Relative sourceRoot, relative sourceURL. The sourceRoot and sourceURL paths are concatenated and normalized before resolving against the sourceMapURL.
      {
        sourceRoot: 'src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: 'src/',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'src/',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/a/src/foo.ts',
      },
      {
        sourceRoot: 'src/',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/src/foo.ts',
      },
      {
        sourceRoot: '/src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: '/src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: '/src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/b/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '../../foo.ts',
        sourceMapURL: 'http://example.com/a/b/foo.js.map',
        expected: 'http://example.com/a/foo.ts',
      },
      {
        sourceRoot: 'src',
        sourceURL: '../../../foo.ts',
        sourceMapURL: 'http://example.com/a/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },

      // Relative sourceRoot, absolute sourceURL. Ignore the sourceRoot, normalize the sourceURL.
      {
        sourceRoot: 'c/d',
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: 'c/d',
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },

      // Absolute sourceRoot, relative sourceURL. Append the sourceURL path into the sourceRoot path, normalize and use the resulting URL.
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: 'foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: 'a/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: 'a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/b/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: '/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: '/a/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: '/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/src/a/b/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
        sourceURL: '../foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'http://example.com/foo.ts',
      },
      {
        sourceRoot: 'http://example.com/src',
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
        sourceRoot: 'http://foo.com/src',
        sourceURL: 'webpack://example/src/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/foo.ts',
      },
      {
        sourceRoot: 'http://foo.com/src',
        sourceURL: 'webpack://example/../../../src/a/b/foo.ts',
        sourceMapURL: 'http://example.com/foo.js.map',
        expected: 'webpack://example/src/a/b/foo.ts',
      },
    ];

    for (const {sourceRoot, sourceURL, sourceMapURL, expected} of cases) {
      it(`can resolve sourceURL "${sourceURL}" with sourceRoot "${sourceRoot}" and sourceMapURL "${sourceMapURL}"`,
         () => {
           const mappingPayload = {
             mappings: 'AAAA;;;CACA',
             sourceRoot,
             sources: [sourceURL],
             version: 1,
             file: undefined,
             sections: undefined,
             names: undefined,
             sourcesContent: undefined,
           };
           const sourceMap =
               new SDK.SourceMap.TextSourceMap('compiled.js', sourceMapURL, mappingPayload, fakeInitiator);
           const sourceURLs = sourceMap.sourceURLs();
           assert.lengthOf(sourceURLs, 1, 'unexpected number of original source URLs');
           assert.strictEqual(sourceURLs[0], expected);
         });
    }
  });
});
