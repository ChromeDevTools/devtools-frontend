// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {TextCursor} from '../../../../front_end/text_utils/TextCursor.js';

describe('TextCursor', () => {
  it('can be instantiated successfully', () => {
    const cursor = new TextCursor([0, 5, 10, 15]);
    assert.strictEqual(cursor.lineNumber(), 0, 'lineNumber should be initialised to 0');
    assert.strictEqual(cursor.columnNumber(), 0, 'columnNumber should be initialised to 0');
  });

  it('can be advanced by a certain offset', () => {
    const cursor = new TextCursor([5, 10, 15]);
    cursor.advance(8);
    assert.strictEqual(cursor.lineNumber(), 1, 'lineNumber should be correct');
    assert.strictEqual(cursor.columnNumber(), 2, 'columnNumber should be correct');
  });

  it('should handle an advance to 0', () => {
    const cursor = new TextCursor([5, 10, 15]);
    cursor.advance(0);
    assert.strictEqual(cursor.lineNumber(), 0, 'lineNumber should be correct');
    assert.strictEqual(cursor.columnNumber(), 0, 'columnNumber should be correct');
  });

  it('should return the current offset', () => {
    const cursor = new TextCursor([5, 10, 15]);
    cursor.advance(8);
    cursor.advance(8);
    assert.strictEqual(cursor.offset(), 8);
  });

  it('should jump to a certain offset', () => {
    const cursor = new TextCursor([5, 10, 15]);
    cursor.resetTo(8);
    assert.strictEqual(cursor.lineNumber(), 1, 'lineNumber should be correct');
    assert.strictEqual(cursor.columnNumber(), 2, 'columnNumber should be correct');
  });

  it('should be able to jump to an offset of 0', () => {
    const cursor = new TextCursor([5, 10, 15]);
    cursor.resetTo(0);
    assert.strictEqual(cursor.lineNumber(), 0, 'lineNumber should be correct');
    assert.strictEqual(cursor.columnNumber(), 0, 'columnNumber should be correct');
  });
});
