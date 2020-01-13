// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {SourceMapEntry} from '/front_end/sdk/SourceMap.js';

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

  // TODO continue writing tests here or use another describe block
});
