// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import {TextCursor} from './TextCursor.js';
import {SourceRange, TextRange} from './TextRange.js';

export class Text {
  private valueInternal: string;
  private lineEndingsInternal?: number[];

  constructor(value: string) {
    this.valueInternal = value;
  }

  lineEndings(): number[] {
    if (!this.lineEndingsInternal) {
      this.lineEndingsInternal = Platform.StringUtilities.findLineEndingIndexes(this.valueInternal);
    }
    return this.lineEndingsInternal;
  }

  value(): string {
    return this.valueInternal;
  }

  lineCount(): number {
    const lineEndings = this.lineEndings();
    return lineEndings.length;
  }

  offsetFromPosition(lineNumber: number, columnNumber: number): number {
    return (lineNumber ? this.lineEndings()[lineNumber - 1] + 1 : 0) + columnNumber;
  }

  positionFromOffset(offset: number): Position {
    const lineEndings = this.lineEndings();
    const lineNumber =
        Platform.ArrayUtilities.lowerBound(lineEndings, offset, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    return {lineNumber: lineNumber, columnNumber: offset - (lineNumber && (lineEndings[lineNumber - 1] + 1))};
  }

  lineAt(lineNumber: number): string {
    const lineEndings = this.lineEndings();
    const lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
    const lineEnd = lineEndings[lineNumber];
    let lineContent = this.valueInternal.substring(lineStart, lineEnd);
    if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === '\r') {
      lineContent = lineContent.substring(0, lineContent.length - 1);
    }
    return lineContent;
  }

  toSourceRange(range: TextRange): SourceRange {
    const start = this.offsetFromPosition(range.startLine, range.startColumn);
    const end = this.offsetFromPosition(range.endLine, range.endColumn);
    return new SourceRange(start, end - start);
  }

  toTextRange(sourceRange: SourceRange): TextRange {
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

  replaceRange(range: TextRange, replacement: string): string {
    const sourceRange = this.toSourceRange(range);
    return this.valueInternal.substring(0, sourceRange.offset) + replacement +
        this.valueInternal.substring(sourceRange.offset + sourceRange.length);
  }

  extract(range: TextRange): string {
    const sourceRange = this.toSourceRange(range);
    return this.valueInternal.substr(sourceRange.offset, sourceRange.length);
  }
}
export interface Position {
  lineNumber: number;
  columnNumber: number;
}
