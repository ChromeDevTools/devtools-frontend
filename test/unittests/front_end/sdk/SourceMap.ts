// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {SourceMapEntry,TextSourceMap} from '/front_end/sdk/SourceMap.js';

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

  it('can parse a simple source map', () => {
    // FIXME(szuend): Clean this test up once all test cases from the web test are ported over
    //                and we refactored the underlying code.
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
});
