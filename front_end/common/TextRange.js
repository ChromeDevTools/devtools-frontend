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

/**
 * @unrestricted
 */
Common.TextRange = class {
  /**
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   */
  constructor(startLine, startColumn, endLine, endColumn) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }

  /**
   * @param {number} line
   * @param {number} column
   * @return {!Common.TextRange}
   */
  static createFromLocation(line, column) {
    return new Common.TextRange(line, column, line, column);
  }

  /**
   * @param {!Object} serializedTextRange
   * @return {!Common.TextRange}
   */
  static fromObject(serializedTextRange) {
    return new Common.TextRange(
        serializedTextRange.startLine, serializedTextRange.startColumn, serializedTextRange.endLine,
        serializedTextRange.endColumn);
  }

  /**
   * @param {!Common.TextRange} range1
   * @param {!Common.TextRange} range2
   * @return {number}
   */
  static comparator(range1, range2) {
    return range1.compareTo(range2);
  }

  /**
   * @param {!Common.TextRange} oldRange
   * @param {string} newText
   * @return {!Common.TextRange}
   */
  static fromEdit(oldRange, newText) {
    var endLine = oldRange.startLine;
    var endColumn = oldRange.startColumn + newText.length;
    var lineEndings = newText.computeLineEndings();
    if (lineEndings.length > 1) {
      endLine = oldRange.startLine + lineEndings.length - 1;
      var len = lineEndings.length;
      endColumn = lineEndings[len - 1] - lineEndings[len - 2] - 1;
    }
    return new Common.TextRange(oldRange.startLine, oldRange.startColumn, endLine, endColumn);
  }

  /**
   * @return {boolean}
   */
  isEmpty() {
    return this.startLine === this.endLine && this.startColumn === this.endColumn;
  }

  /**
   * @param {!Common.TextRange} range
   * @return {boolean}
   */
  immediatelyPrecedes(range) {
    if (!range)
      return false;
    return this.endLine === range.startLine && this.endColumn === range.startColumn;
  }

  /**
   * @param {!Common.TextRange} range
   * @return {boolean}
   */
  immediatelyFollows(range) {
    if (!range)
      return false;
    return range.immediatelyPrecedes(this);
  }

  /**
   * @param {!Common.TextRange} range
   * @return {boolean}
   */
  follows(range) {
    return (range.endLine === this.startLine && range.endColumn <= this.startColumn) || range.endLine < this.startLine;
  }

  /**
   * @return {number}
   */
  get linesCount() {
    return this.endLine - this.startLine;
  }

  /**
   * @return {!Common.TextRange}
   */
  collapseToEnd() {
    return new Common.TextRange(this.endLine, this.endColumn, this.endLine, this.endColumn);
  }

  /**
   * @return {!Common.TextRange}
   */
  collapseToStart() {
    return new Common.TextRange(this.startLine, this.startColumn, this.startLine, this.startColumn);
  }

  /**
   * @return {!Common.TextRange}
   */
  normalize() {
    if (this.startLine > this.endLine || (this.startLine === this.endLine && this.startColumn > this.endColumn))
      return new Common.TextRange(this.endLine, this.endColumn, this.startLine, this.startColumn);
    else
      return this.clone();
  }

  /**
   * @return {!Common.TextRange}
   */
  clone() {
    return new Common.TextRange(this.startLine, this.startColumn, this.endLine, this.endColumn);
  }

  /**
   * @return {!{startLine: number, startColumn: number, endLine: number, endColumn: number}}
   */
  serializeToObject() {
    var serializedTextRange = {};
    serializedTextRange.startLine = this.startLine;
    serializedTextRange.startColumn = this.startColumn;
    serializedTextRange.endLine = this.endLine;
    serializedTextRange.endColumn = this.endColumn;
    return serializedTextRange;
  }

  /**
   * @param {!Common.TextRange} other
   * @return {number}
   */
  compareTo(other) {
    if (this.startLine > other.startLine)
      return 1;
    if (this.startLine < other.startLine)
      return -1;
    if (this.startColumn > other.startColumn)
      return 1;
    if (this.startColumn < other.startColumn)
      return -1;
    return 0;
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {number}
   */
  compareToPosition(lineNumber, columnNumber) {
    if (lineNumber < this.startLine || (lineNumber === this.startLine && columnNumber < this.startColumn))
      return -1;
    if (lineNumber > this.endLine || (lineNumber === this.endLine && columnNumber > this.endColumn))
      return 1;
    return 0;
  }

  /**
   * @param {!Common.TextRange} other
   * @return {boolean}
   */
  equal(other) {
    return this.startLine === other.startLine && this.endLine === other.endLine &&
        this.startColumn === other.startColumn && this.endColumn === other.endColumn;
  }

  /**
   * @param {number} line
   * @param {number} column
   * @return {!Common.TextRange}
   */
  relativeTo(line, column) {
    var relative = this.clone();

    if (this.startLine === line)
      relative.startColumn -= column;
    if (this.endLine === line)
      relative.endColumn -= column;

    relative.startLine -= line;
    relative.endLine -= line;
    return relative;
  }

  /**
   * @param {!Common.TextRange} originalRange
   * @param {!Common.TextRange} editedRange
   * @return {!Common.TextRange}
   */
  rebaseAfterTextEdit(originalRange, editedRange) {
    console.assert(originalRange.startLine === editedRange.startLine);
    console.assert(originalRange.startColumn === editedRange.startColumn);
    var rebase = this.clone();
    if (!this.follows(originalRange))
      return rebase;
    var lineDelta = editedRange.endLine - originalRange.endLine;
    var columnDelta = editedRange.endColumn - originalRange.endColumn;
    rebase.startLine += lineDelta;
    rebase.endLine += lineDelta;
    if (rebase.startLine === editedRange.endLine)
      rebase.startColumn += columnDelta;
    if (rebase.endLine === editedRange.endLine)
      rebase.endColumn += columnDelta;
    return rebase;
  }

  /**
   * @override
   * @return {string}
   */
  toString() {
    return JSON.stringify(this);
  }

  /**
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {boolean}
   */
  containsLocation(lineNumber, columnNumber) {
    if (this.startLine === this.endLine)
      return this.startLine === lineNumber && this.startColumn <= columnNumber && columnNumber <= this.endColumn;
    if (this.startLine === lineNumber)
      return this.startColumn <= columnNumber;
    if (this.endLine === lineNumber)
      return columnNumber <= this.endColumn;
    return this.startLine < lineNumber && lineNumber < this.endLine;
  }
};


/**
 * @unrestricted
 */
Common.SourceRange = class {
  /**
   * @param {number} offset
   * @param {number} length
   */
  constructor(offset, length) {
    this.offset = offset;
    this.length = length;
  }
};

/**
 * @unrestricted
 */
Common.SourceEdit = class {
  /**
   * @param {string} sourceURL
   * @param {!Common.TextRange} oldRange
   * @param {string} newText
   */
  constructor(sourceURL, oldRange, newText) {
    this.sourceURL = sourceURL;
    this.oldRange = oldRange;
    this.newText = newText;
  }

  /**
   * @param {!Common.SourceEdit} edit1
   * @param {!Common.SourceEdit} edit2
   * @return {number}
   */
  static comparator(edit1, edit2) {
    return Common.TextRange.comparator(edit1.oldRange, edit2.oldRange);
  }

  /**
   * @return {!Common.TextRange}
   */
  newRange() {
    return Common.TextRange.fromEdit(this.oldRange, this.newText);
  }
};
