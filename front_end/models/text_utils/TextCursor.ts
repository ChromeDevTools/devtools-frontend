// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Platform from '../../core/platform/platform.js';

export class TextCursor {
  _lineEndings: number[];
  _offset: number;
  _lineNumber: number;
  _columnNumber: number;

  constructor(lineEndings: number[]) {
    this._lineEndings = lineEndings;
    this._offset = 0;
    this._lineNumber = 0;
    this._columnNumber = 0;
  }

  advance(offset: number): void {
    this._offset = offset;
    while (this._lineNumber < this._lineEndings.length && this._lineEndings[this._lineNumber] < this._offset) {
      ++this._lineNumber;
    }
    this._columnNumber = this._lineNumber ? this._offset - this._lineEndings[this._lineNumber - 1] - 1 : this._offset;
  }

  offset(): number {
    return this._offset;
  }

  resetTo(offset: number): void {
    this._offset = offset;
    this._lineNumber =
        Platform.ArrayUtilities.lowerBound(this._lineEndings, offset, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    this._columnNumber = this._lineNumber ? this._offset - this._lineEndings[this._lineNumber - 1] - 1 : this._offset;
  }

  lineNumber(): number {
    return this._lineNumber;
  }

  columnNumber(): number {
    return this._columnNumber;
  }
}
