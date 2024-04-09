// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from './text_utils.js';

describe('Text', () => {
  it('can be instantiated successfully', () => {
    const testVal = 'Test Value';
    const text = new TextUtils.Text.Text(testVal);
    assert.strictEqual(text.value(), testVal);
  });

  it('has a list of line ending offsets including the end of the string', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.deepEqual(text.lineEndings(), [0, 7, 14, 15]);
  });

  it('should count the number of line endings', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.strictEqual(text.lineCount(), 4);
  });

  it('should return an offset when given a linenumber and column', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.strictEqual(text.offsetFromPosition(2, 4), 12);
  });

  it('should return NaN if the linenumber is out of range when trying to retrieve the offset', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.isNaN(text.offsetFromPosition(10, 0));
  });

  it('should return an offset of zero when given a linenumber of 0 and column of 0 ', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.strictEqual(text.offsetFromPosition(0, 0), 0);
  });

  it('should handle an out of range column number when returning the offset', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.strictEqual(text.offsetFromPosition(2, 10), 18);
  });

  it('should return linenumber and column for an offset', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const {lineNumber, columnNumber} = text.positionFromOffset(10);
    assert.strictEqual(lineNumber, 2, 'linenumber should be 2');
    assert.strictEqual(columnNumber, 2, 'columnnumber should be 2');
  });

  it('should return a given line', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    assert.strictEqual(text.lineAt(2), 'Line 3');
  });

  it('should not include the carriage return when returning a given line', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\r\n');
    assert.strictEqual(text.lineAt(2), 'Line 3');
  });

  it('should be able to return line 0', () => {
    const text = new TextUtils.Text.Text('Line 1\nLine 2\nLine 3\n');
    assert.strictEqual(text.lineAt(0), 'Line 1');
  });

  it('should return a source range for a given text range', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const textRange = new TextUtils.TextRange.TextRange(1, 0, 2, 6);
    const sourceRange = text.toSourceRange(textRange);
    assert.strictEqual(sourceRange.offset, 1, 'offset was not set correctly');
    assert.strictEqual(sourceRange.length, 13, 'length was not set correctly');
  });

  it('should return a source range with an offset and length of NaN if the startLine is out of range', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const textRange = new TextUtils.TextRange.TextRange(10, 0, 12, 6);
    const sourceRange = text.toSourceRange(textRange);
    assert.isNaN(sourceRange.offset, 'offset should be NaN');
    assert.isNaN(sourceRange.length, 'length should be NaN');
  });

  it('should return a text range for a given source range', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const sourceRange = new TextUtils.TextRange.SourceRange(1, 13);
    const textRange = text.toTextRange(sourceRange);
    assert.strictEqual(textRange.startLine, 1, 'startLine was not set correctly');
    assert.strictEqual(textRange.startColumn, 0, 'startColumn was not set correctly');
    assert.strictEqual(textRange.endLine, 2, 'endLine was not set correctly');
    assert.strictEqual(textRange.endColumn, 6, 'endColumn was not set correctly');
  });

  it('should replace a given range with a new string', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const textRange = new TextUtils.TextRange.TextRange(1, 0, 2, 0);
    assert.strictEqual(text.replaceRange(textRange, 'New Text'), '\nNew TextLine 3\n');
  });

  it('should extract a string given a range', () => {
    const text = new TextUtils.Text.Text('\nLine 2\nLine 3\n');
    const textRange = new TextUtils.TextRange.TextRange(1, 0, 2, 0);
    assert.strictEqual(text.extract(textRange), 'Line 2\n');
  });
});
