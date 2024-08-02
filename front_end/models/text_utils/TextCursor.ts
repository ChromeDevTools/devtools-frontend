// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

export class TextCursor {
  readonly #lineEndings: number[];

  #offset: number = 0;
  #lineNumber: number = 0;
  #columnNumber: number = 0;

  constructor(lineEndings: number[]) {
    this.#lineEndings = lineEndings;
  }

  advance(offset: number): void {
    this.#offset = offset;
    while (this.#lineNumber < this.#lineEndings.length && this.#lineEndings[this.#lineNumber] < this.#offset) {
      ++this.#lineNumber;
    }
    this.#columnNumber = this.#lineNumber ? this.#offset - this.#lineEndings[this.#lineNumber - 1] - 1 : this.#offset;
  }

  offset(): number {
    return this.#offset;
  }

  resetTo(offset: number): void {
    this.#offset = offset;
    this.#lineNumber =
        Platform.ArrayUtilities.lowerBound(this.#lineEndings, offset, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    this.#columnNumber = this.#lineNumber ? this.#offset - this.#lineEndings[this.#lineNumber - 1] - 1 : this.#offset;
  }

  lineNumber(): number {
    return this.#lineNumber;
  }

  columnNumber(): number {
    return this.#columnNumber;
  }
}
