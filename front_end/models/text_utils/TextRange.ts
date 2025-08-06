/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Platform from '../../core/platform/platform.js';

const MAX_SAFE_INT32 = 2 ** 31 - 1;

export interface SerializedTextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export class TextRange {
  constructor(public startLine: number, public startColumn: number, public endLine: number, public endColumn: number) {
  }

  static createFromLocation(line: number, column: number): TextRange {
    return new TextRange(line, column, line, column);
  }

  static createUnboundedFromLocation(line: number, column: number): TextRange {
    return new TextRange(line, column, MAX_SAFE_INT32, MAX_SAFE_INT32);
  }

  static fromObject(serializedTextRange: SerializedTextRange): TextRange {
    return new TextRange(
        serializedTextRange.startLine, serializedTextRange.startColumn, serializedTextRange.endLine,
        serializedTextRange.endColumn);
  }

  static comparator(range1: TextRange, range2: TextRange): number {
    return range1.compareTo(range2);
  }

  static fromEdit(oldRange: TextRange, newText: string): TextRange {
    let endLine: number = oldRange.startLine;
    let endColumn: number = oldRange.startColumn + newText.length;

    const lineEndings = Platform.StringUtilities.findLineEndingIndexes(newText);
    if (lineEndings.length > 1) {
      endLine = oldRange.startLine + lineEndings.length - 1;
      const len = lineEndings.length;
      endColumn = lineEndings[len - 1] - lineEndings[len - 2] - 1;
    }
    return new TextRange(oldRange.startLine, oldRange.startColumn, endLine, endColumn);
  }

  isEmpty(): boolean {
    return this.startLine === this.endLine && this.startColumn === this.endColumn;
  }

  immediatelyPrecedes(range?: TextRange): boolean {
    if (!range) {
      return false;
    }
    return this.endLine === range.startLine && this.endColumn === range.startColumn;
  }

  immediatelyFollows(range?: TextRange): boolean {
    if (!range) {
      return false;
    }
    return range.immediatelyPrecedes(this);
  }

  follows(range: TextRange): boolean {
    return (range.endLine === this.startLine && range.endColumn <= this.startColumn) || range.endLine < this.startLine;
  }

  get linesCount(): number {
    return this.endLine - this.startLine;
  }

  collapseToEnd(): TextRange {
    return new TextRange(this.endLine, this.endColumn, this.endLine, this.endColumn);
  }

  collapseToStart(): TextRange {
    return new TextRange(this.startLine, this.startColumn, this.startLine, this.startColumn);
  }

  normalize(): TextRange {
    if (this.startLine > this.endLine || (this.startLine === this.endLine && this.startColumn > this.endColumn)) {
      return new TextRange(this.endLine, this.endColumn, this.startLine, this.startColumn);
    }
    return this.clone();
  }

  clone(): TextRange {
    return new TextRange(this.startLine, this.startColumn, this.endLine, this.endColumn);
  }

  serializeToObject(): {
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
  } {
    return {
      startLine: this.startLine,
      startColumn: this.startColumn,
      endLine: this.endLine,
      endColumn: this.endColumn,
    };
  }

  compareTo(other: TextRange): number {
    if (this.startLine > other.startLine) {
      return 1;
    }
    if (this.startLine < other.startLine) {
      return -1;
    }
    if (this.startColumn > other.startColumn) {
      return 1;
    }
    if (this.startColumn < other.startColumn) {
      return -1;
    }
    return 0;
  }

  compareToPosition(lineNumber: number, columnNumber: number): number {
    if (lineNumber < this.startLine || (lineNumber === this.startLine && columnNumber < this.startColumn)) {
      return -1;
    }
    if (lineNumber > this.endLine || (lineNumber === this.endLine && columnNumber > this.endColumn)) {
      return 1;
    }
    return 0;
  }

  equal(other: TextRange): boolean {
    return this.startLine === other.startLine && this.endLine === other.endLine &&
        this.startColumn === other.startColumn && this.endColumn === other.endColumn;
  }

  relativeTo(line: number, column: number): TextRange {
    const relative = this.clone();

    if (this.startLine === line) {
      relative.startColumn -= column;
    }
    if (this.endLine === line) {
      relative.endColumn -= column;
    }

    relative.startLine -= line;
    relative.endLine -= line;
    return relative;
  }

  relativeFrom(line: number, column: number): TextRange {
    const relative = this.clone();

    if (this.startLine === 0) {
      relative.startColumn += column;
    }
    if (this.endLine === 0) {
      relative.endColumn += column;
    }

    relative.startLine += line;
    relative.endLine += line;
    return relative;
  }

  rebaseAfterTextEdit(originalRange: TextRange, editedRange: TextRange): TextRange {
    console.assert(originalRange.startLine === editedRange.startLine);
    console.assert(originalRange.startColumn === editedRange.startColumn);
    const rebase = this.clone();
    if (!this.follows(originalRange)) {
      return rebase;
    }
    const lineDelta = editedRange.endLine - originalRange.endLine;
    const columnDelta = editedRange.endColumn - originalRange.endColumn;
    rebase.startLine += lineDelta;
    rebase.endLine += lineDelta;
    if (rebase.startLine === editedRange.endLine) {
      rebase.startColumn += columnDelta;
    }
    if (rebase.endLine === editedRange.endLine) {
      rebase.endColumn += columnDelta;
    }
    return rebase;
  }

  toString(): string {
    return JSON.stringify(this);
  }

  /**
   * Checks whether this {@link TextRange} contains the location identified by the
   * {@link lineNumber} and {@link columnNumber}. The beginning of the text range is
   * considered inclusive while the end of the text range is considered exclusive
   * for this comparison, meaning that for example a range `(0,1)-(1,4)` contains the
   * location `(0,1)` but does not contain the location `(1,4)`.
   *
   * @param lineNumber the location's line offset.
   * @param columnNumber the location's column offset.
   * @returns `true` if the location identified by {@link lineNumber} and {@link columnNumber}
   *          is contained within this text range.
   */
  containsLocation(lineNumber: number, columnNumber: number): boolean {
    if (this.startLine === this.endLine) {
      return this.startLine === lineNumber && this.startColumn <= columnNumber && columnNumber < this.endColumn;
    }
    if (this.startLine === lineNumber) {
      return this.startColumn <= columnNumber;
    }
    if (this.endLine === lineNumber) {
      return columnNumber < this.endColumn;
    }
    return this.startLine < lineNumber && lineNumber < this.endLine;
  }

  get start(): {lineNumber: number, columnNumber: number} {
    return {lineNumber: this.startLine, columnNumber: this.startColumn};
  }

  get end(): {lineNumber: number, columnNumber: number} {
    return {lineNumber: this.endLine, columnNumber: this.endColumn};
  }

  /**
   * Checks whether this and `that` {@link TextRange} overlap and if they do, computes the
   * intersection range. If they don't overlap an empty text range is returned instead (for
   * which {@link #isEmpty()} yields `true`).
   *
   * The beginning of text ranges is considered to be includes while the end of the text
   * ranges is considered exclusive for the intersection, meaning that for example intersecting
   * `(0,1)-(1,4)` and `(1,4)-(1,6)` yields an empty range.
   *
   * @param that the other text range.
   * @returns the intersection of this and `that` text range, which might be empty if their don't
   *          overlap.
   */
  intersection(that: TextRange): TextRange {
    let {startLine, startColumn} = this;
    if (startLine < that.startLine) {
      startLine = that.startLine;
      startColumn = that.startColumn;
    } else if (startLine === that.startLine) {
      startColumn = Math.max(startColumn, that.startColumn);
    }
    let {endLine, endColumn} = this;
    if (endLine > that.endLine) {
      endLine = that.endLine;
      endColumn = that.endColumn;
    } else if (endLine === that.endLine) {
      endColumn = Math.min(endColumn, that.endColumn);
    }
    if (startLine > endLine || (startLine === endLine && startColumn >= endColumn)) {
      return new TextRange(0, 0, 0, 0);
    }
    return new TextRange(startLine, startColumn, endLine, endColumn);
  }
}

export class SourceRange {
  constructor(public offset: number, public length: number) {
  }
}
