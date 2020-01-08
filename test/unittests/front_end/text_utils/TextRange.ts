// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {TextRange} from '../../../../front_end/text_utils/TextRange.js';

describe('TextRange', () => {
  it('can be instantiated successfully', () => {
    const startLineTestVal = 1;
    const startColumnTestVal = 2;
    const endLineTestVal = 3;
    const endColumnTestVal = 4;
    const textRange = new TextRange(startLineTestVal, startColumnTestVal, endLineTestVal, endColumnTestVal);
    assert.equal(textRange.startLine, startLineTestVal, 'the start line was not set or retrieved correctly');
    assert.equal(textRange.startColumn, startColumnTestVal, 'the start column was not set or retrieved correctly');
    assert.equal(textRange.endLine, endLineTestVal, 'the end line was not set or retrieved correctly');
    assert.equal(textRange.endColumn, endColumnTestVal, 'the end column was not set or retrieved correctly');
  });

  // TODO continue writing tests here or use another describe block
});
