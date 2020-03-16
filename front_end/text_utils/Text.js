// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import {TextCursor} from './TextCursor.js';
import {SourceRange, TextRange} from './TextRange.js';

/**
 * @unrestricted
 */
export class Text {
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
    if (!this._lineEndings) {
      this._lineEndings = Platform.StringUtilities.findLineEndingIndexes(this._value);
    }
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
    const lineEndings = this.lineEndings();
    return lineEndings.length;
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {number}
   */
  offsetFromPosition(lineNumber, columnNumber) {
    return (lineNumber ? this.lineEndings()[lineNumber - 1] + 1 : 0) + columnNumber;
  }

  /**
   * @param {number} offset
   * @return {!Position}
   */
  positionFromOffset(offset) {
    const lineEndings = this.lineEndings();
    const lineNumber = lineEndings.lowerBound(offset);
    return {lineNumber: lineNumber, columnNumber: offset - (lineNumber && (lineEndings[lineNumber - 1] + 1))};
  }

  /**
   * @param {number} lineNumber
   * @return {string}
   */
  lineAt(lineNumber) {
    const lineEndings = this.lineEndings();
    const lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
    const lineEnd = lineEndings[lineNumber];
    let lineContent = this._value.substring(lineStart, lineEnd);
    if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === '\r') {
      lineContent = lineContent.substring(0, lineContent.length - 1);
    }
    return lineContent;
  }

  /**
   * @param {!TextRange} range
   * @return {!SourceRange}
   */
  toSourceRange(range) {
    const start = this.offsetFromPosition(range.startLine, range.startColumn);
    const end = this.offsetFromPosition(range.endLine, range.endColumn);
    return new SourceRange(start, end - start);
  }

  /**
   * @param {!SourceRange} sourceRange
   * @return {!TextRange}
   */
  toTextRange(sourceRange) {
    const cursor = new TextCursor(this.lineEndings());
    const result = TextRange.createFromLocation(0, 0);

    cursor.resetTo(sourceRange.offset);
    result.startLine = cursor.lineNumber();
    result.startColumn = cursor.columnNumber();

    cursor.advance(sourceRange.offset + sourceRange.length);
    result.endLine = cursor.lineNumber();
    result.endColumn = cursor.columnNumber();
    return result;
  }

  /**
   * @param {!TextRange} range
   * @param {string} replacement
   * @return {string}
   */
  replaceRange(range, replacement) {
    const sourceRange = this.toSourceRange(range);
    return this._value.substring(0, sourceRange.offset) + replacement +
        this._value.substring(sourceRange.offset + sourceRange.length);
  }

  /**
   * @param {!TextRange} range
   * @return {string}
   */
  extract(range) {
    const sourceRange = this.toSourceRange(range);
    return this._value.substr(sourceRange.offset, sourceRange.length);
  }
}

/** @typedef {{lineNumber: number, columnNumber: number}} */
// @ts-ignore typedef
export let Position;
