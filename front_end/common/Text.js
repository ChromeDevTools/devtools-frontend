// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

self['Common'] = self['Common'] || {};

/**
 * @unrestricted
 */
Common.Text = class {
  /**
   * @param {string} value
   */
  constructor(value) {
    this._value = value;
  }

  /**
   * @return {!Array<number>}
   */
  lineEndings() {
    if (!this._lineEndings)
      this._lineEndings = this._value.computeLineEndings();
    return this._lineEndings;
  }

  /**
   * @return {string}
   */
  value() {
    return this._value;
  }

  /**
   * @return {number}
   */
  lineCount() {
    var lineEndings = this.lineEndings();
    return lineEndings.length;
  }

  /**
   * @param {number} lineNumber
   * @param {number} columNumber
   * @return {number}
   */
  offsetFromPosition(lineNumber, columNumber) {
    return (lineNumber ? this.lineEndings()[lineNumber - 1] + 1 : 0) + columNumber;
  }

  /**
   * @return {string}
   */
  lineAt(lineNumber) {
    var lineEndings = this.lineEndings();
    var lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
    var lineEnd = lineEndings[lineNumber];
    var lineContent = this._value.substring(lineStart, lineEnd);
    if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === '\r')
      lineContent = lineContent.substring(0, lineContent.length - 1);
    return lineContent;
  }

  /**
   * @param {!Common.TextRange} range
   * @return {!Common.SourceRange}
   */
  toSourceRange(range) {
    var start = this.offsetFromPosition(range.startLine, range.startColumn);
    var end = this.offsetFromPosition(range.endLine, range.endColumn);
    return new Common.SourceRange(start, end - start);
  }

  /**
   * @param {!Common.SourceRange} sourceRange
   * @return {!Common.TextRange}
   */
  toTextRange(sourceRange) {
    var cursor = new Common.TextCursor(this.lineEndings());
    var result = Common.TextRange.createFromLocation(0, 0);

    cursor.resetTo(sourceRange.offset);
    result.startLine = cursor.lineNumber();
    result.startColumn = cursor.columnNumber();

    cursor.advance(sourceRange.offset + sourceRange.length);
    result.endLine = cursor.lineNumber();
    result.endColumn = cursor.columnNumber();
    return result;
  }

  /**
   * @param {!Common.TextRange} range
   * @param {string} replacement
   * @return {string}
   */
  replaceRange(range, replacement) {
    var sourceRange = this.toSourceRange(range);
    return this._value.substring(0, sourceRange.offset) + replacement +
        this._value.substring(sourceRange.offset + sourceRange.length);
  }

  /**
   * @param {!Common.TextRange} range
   * @return {string}
   */
  extract(range) {
    var sourceRange = this.toSourceRange(range);
    return this._value.substr(sourceRange.offset, sourceRange.length);
  }
};

/**
 * @unrestricted
 */
Common.TextCursor = class {
  /**
   * @param {!Array<number>} lineEndings
   */
  constructor(lineEndings) {
    this._lineEndings = lineEndings;
    this._offset = 0;
    this._lineNumber = 0;
    this._columnNumber = 0;
  }

  /**
   * @param {number} offset
   */
  advance(offset) {
    this._offset = offset;
    while (this._lineNumber < this._lineEndings.length && this._lineEndings[this._lineNumber] < this._offset)
      ++this._lineNumber;
    this._columnNumber = this._lineNumber ? this._offset - this._lineEndings[this._lineNumber - 1] - 1 : this._offset;
  }

  /**
   * @return {number}
   */
  offset() {
    return this._offset;
  }

  /**
   * @param {number} offset
   */
  resetTo(offset) {
    this._offset = offset;
    this._lineNumber = this._lineEndings.lowerBound(offset);
    this._columnNumber = this._lineNumber ? this._offset - this._lineEndings[this._lineNumber - 1] - 1 : this._offset;
  }

  /**
   * @return {number}
   */
  lineNumber() {
    return this._lineNumber;
  }

  /**
   * @return {number}
   */
  columnNumber() {
    return this._columnNumber;
  }
};
