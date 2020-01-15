// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {SourceMapEntry,TextSourceMap} from '/front_end/sdk/SourceMap.js';
import {source} from 'third_party/axe-core/axe';

describe('SourceMapEntry', () => {
  it('can be instantiated correctly', () => {
    const sourceMapEntry = new SourceMapEntry(1, 1, 'http://www.example.com/', 1, 1, 'example');
    assert.equal(sourceMapEntry.lineNumber, 1,'line number was not set correctly');
    assert.equal(sourceMapEntry.columnNumber, 1,'column number was not set correctly');
    assert.equal(sourceMapEntry.sourceURL, 'http://www.example.com/','source URL was not set correctly');
    assert.equal(sourceMapEntry.sourceLineNumber, 1,'source line number was not set correctly');
    assert.equal(sourceMapEntry.sourceColumnNumber, 1,'source column number was not set correctly');
    assert.equal(sourceMapEntry.name, 'example','name was not set correctly');
  });

  describe('comparison', () => {
    it('checks line numbers first', () => {
      const sourceMapEntry1 = new SourceMapEntry(1, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SourceMapEntry(2, 5, '<foo>', 2, 5, 'foo');
      assert.isBelow(SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('checks column numbers second when line numbers are equal', () => {
      const sourceMapEntry1 = new SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SourceMapEntry(2, 25, '<foo>', 2, 5, 'foo');
      assert.isBelow(SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0, 'first entry is not smaller');
    });

    it('works for equal SourceMapEntries', () => {
      const sourceMapEntry1 = new SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      const sourceMapEntry2 = new SourceMapEntry(2, 5, '<foo>', 1, 5, 'foo');
      assert.equal(SourceMapEntry.compare(sourceMapEntry1, sourceMapEntry2), 0);
    });
  });
});

describe('TextSourceMap', () => {
  describe('StringCharIterator', () => {
    it('detects when it has reached the end', () => {
      const empty_iterator = new TextSourceMap.StringCharIterator('');
      assert.isFalse(empty_iterator.hasNext());

      const iterator = new TextSourceMap.StringCharIterator('foo');
      assert.isTrue(iterator.hasNext());
    });

    it('peeks the next character', () => {
      const empty_iterator = new TextSourceMap.StringCharIterator('');
      assert.equal(empty_iterator.peek(), '');

      const iterator = new TextSourceMap.StringCharIterator('foo');
      assert.equal(iterator.peek(), 'f');
    });

    it('advances when {next} is called', () => {
      const iterator = new TextSourceMap.StringCharIterator('bar');
      assert.equal(iterator.next(), 'b');
      assert.equal(iterator.next(), 'a');
      assert.equal(iterator.next(), 'r');
      assert.isFalse(iterator.hasNext());
    });
  });

  function assertMapping(
      actual: SourceMapEntry, expectedSourceURL: string, expectedSourceLineNumber: number,
      expectedSourceColumnNumber: number) {
    assert.isNotNull(actual, 'expected SourceMapEntry to be present');
    assert.equal(actual.sourceURL, expectedSourceURL, 'unexpected source URL');
    assert.equal(actual.sourceLineNumber, expectedSourceLineNumber, 'unexpected source line number');
    assert.equal(actual.sourceColumnNumber, expectedSourceColumnNumber, 'unexpected source column number');
  }

  function assertReverseMapping(
      actual: SourceMapEntry, expectedCompiledLineNumber: number, expectedCompiledColumnNumber: number) {
    assert.isNotNull(actual, 'expected SourceMapEntry to be present');
    assert.equal(actual.lineNumber, expectedCompiledLineNumber, 'unexpected compiled line number');
    assert.equal(actual.columnNumber, expectedCompiledColumnNumber, 'unexpected compiled column number');
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
    const mappingPayload = {
      'mappings': 'AAASA,QAAAA,IAAG,CAACC,CAAD,CAAaC,CAAb,CACZ,CACI,MAAOD,EAAP,CAAoBC,CADxB,CAIA,IAAIC,OAAS;A',
      'sources': ['example.js'],
    };
    const sourceMap = new TextSourceMap('compiled.js', 'source-map.json', mappingPayload);

    assertMapping(sourceMap.findEntry(0, 9), 'example.js', 0, 9);
    assertMapping(sourceMap.findEntry(0, 13), 'example.js', 0, 13);
    assertMapping(sourceMap.findEntry(0, 15), 'example.js', 0, 25);
    assertMapping(sourceMap.findEntry(0, 18), 'example.js', 2, 4);
    assertMapping(sourceMap.findEntry(0, 25), 'example.js', 2, 11);
    assertMapping(sourceMap.findEntry(0, 27), 'example.js', 2, 24);
    assertMapping(sourceMap.findEntry(1, 0), undefined, undefined, undefined);

    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 0), 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 1), 0, 17);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 2), 0, 18);
    assert.isNull(sourceMap.sourceLineMapping('example.js', 4), 'unexpected source mapping for line 4');
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 5), 0, 29);
  });

  it('can parse source maps with segments that contain no mapping information', () => {
    const mappingPayload = {'mappings': 'AAAA,C,CAAE;', 'sources': ['example.js']};
    const sourceMap = new TextSourceMap('compiled.js', 'source-map.json', mappingPayload);

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 0);
    assertMapping(sourceMap.findEntry(0, 2), 'example.js', 0, 2);

    const emptyEntry = sourceMap.findEntry(0, 1);
    assert.isUndefined(emptyEntry.sourceURL, 'unexpected url present for empty segment');
    assert.isUndefined(emptyEntry.sourceLineNumber, 'unexpected source line number for empty segment');
    assert.isUndefined(emptyEntry.sourceColumnNumber, 'unexpected source line number for empty segment');
  });

  it('can parse source maps with empty lines', () => {
    const mappingPayload = {'mappings': 'AAAA;;;CACA', 'sources': ['example.js']};
    const sourceMap = new TextSourceMap('compiled.js', 'source-map.json', mappingPayload);

    assertMapping(sourceMap.findEntry(0, 0), 'example.js', 0, 0);
    assertReverseMapping(sourceMap.sourceLineMapping('example.js', 1), 3, 1);
  });

  it('can parse the multiple sections format', () => {
    const mappingPayload = {
      'sections': [
        {'offset': {'line': 0, 'column': 0}, 'map': {'mappings': 'AAAA,CAEC', 'sources': ['source1.js', 'source2.js']}},
        {'offset': {'line': 2, 'column': 10}, 'map': {'mappings': 'AAAA,CAEC', 'sources': ['source2.js']}}
      ]
    };
    const sourceMap = new TextSourceMap('compiled.js', 'source-map.json', mappingPayload);

    assert.lengthOf(sourceMap.sourceURLs(), 2, 'unexpected number of original source URLs');
    assertMapping(sourceMap.findEntry(0, 0), 'source1.js', 0, 0);
    assertMapping(sourceMap.findEntry(0, 1), 'source1.js', 2, 1);
    assertMapping(sourceMap.findEntry(2, 10), 'source2.js', 0, 0);
    assertMapping(sourceMap.findEntry(2, 11), 'source2.js', 2, 1);
  });
});
