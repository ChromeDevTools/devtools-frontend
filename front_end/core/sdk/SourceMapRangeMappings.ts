// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TokenIterator} from './SourceMap.js';

/**
 * The subset of a `SourceMapEntry` that a range mapping needs in order to interpolate:
 * where the range starts in the generated code, and which original position that start
 * maps to.
 */
export interface RangeMappingStart {
  lineNumber: number;
  columnNumber: number;
  sourceLineNumber: number;
  sourceColumnNumber: number;
}

export interface Position {
  lineNumber: number;
  columnNumber: number;
}

/**
 * Implements decoding of the `rangeMappings` field of the "range mappings" proposal.
 *
 * The field holds one entry per line of the generated code, separated by `;`. Each line is
 * a bare sequence of unsigned Base64 VLQs (no separators in between) denoting which of the
 * mappings on that line are range mappings: the first VLQ is an absolute index into the
 * line's mappings, every subsequent one an offset from the previous index. An offset of zero
 * repeats the previous index, which is tolerated rather than treated as an error.
 *
 * @returns for every line of the generated code, the sorted indices of the mappings on
 *          that line which are range mappings.
 * @throws if the field is not a well-formed sequence of unsigned VLQs and `;` separators.
 * @see https://github.com/tc39/source-map/blob/main/proposals/range-mappings.md
 */
export function decodeRangeMappings(encodedRangeMappings: string): number[][] {
  const rangeMappings: number[][] = [];
  const tokenIter = new TokenIterator(encodedRangeMappings);

  let indices: number[] = [];
  let currentIndex = 0;
  while (tokenIter.hasNext()) {
    if (tokenIter.peek() === ';') {
      tokenIter.next();
      rangeMappings.push(indices);
      indices = [];
      currentIndex = 0;
      continue;
    }

    // The first index of a line is absolute, i.e. relative to 0.
    currentIndex += tokenIter.nextUnsignedVLQ();
    indices.push(currentIndex);
  }
  rangeMappings.push(indices);

  return rangeMappings;
}

/**
 * Maps a position covered by a range mapping to its original position.
 *
 * Every character following the range mapping's start maps to the original code character
 * by character, so the offset from the start carries over. Newlines are part of that: once
 * a line boundary is crossed, both sides restart at column 0 and only the line offset
 * applies.
 *
 * @param rangeMapping where the covering range mapping starts.
 * @param lineNumber line of the position in the generated code.
 * @param columnNumber column of the position in the generated code.
 */
export function interpolateOriginalPosition(rangeMapping: RangeMappingStart, lineNumber: number,
                                            columnNumber: number): Position {
  const lineOffset = lineNumber - rangeMapping.lineNumber;
  return {
    lineNumber: rangeMapping.sourceLineNumber + lineOffset,
    columnNumber: lineOffset === 0 ? rangeMapping.sourceColumnNumber + (columnNumber - rangeMapping.columnNumber) :
                                     columnNumber,
  };
}

/**
 * The inverse of {@link interpolateOriginalPosition}: maps an original position covered by
 * a range mapping back to its position in the generated code.
 *
 * @param rangeMapping where the covering range mapping starts.
 * @param lineNumber line of the position in the original code.
 * @param columnNumber column of the position in the original code.
 */
export function interpolateGeneratedPosition(rangeMapping: RangeMappingStart, lineNumber: number,
                                             columnNumber: number): Position {
  const lineOffset = lineNumber - rangeMapping.sourceLineNumber;
  return {
    lineNumber: rangeMapping.lineNumber + lineOffset,
    columnNumber: lineOffset === 0 ? rangeMapping.columnNumber + (columnNumber - rangeMapping.sourceColumnNumber) :
                                     columnNumber,
  };
}
