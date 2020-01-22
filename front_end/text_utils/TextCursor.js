// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class TextCursor {
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
    while (this._lineNumber < this._lineEndings.length && this._lineEndings[this._lineNumber] < this._offset) {
      ++this._lineNumber;
    }
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
}
