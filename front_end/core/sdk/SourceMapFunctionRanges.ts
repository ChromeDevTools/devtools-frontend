// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {comparePositions, type OriginalScope, type Position} from './SourceMapScopes.js';

export interface NamedFunctionRange {
  start: Position;
  end: Position;
  name: string;
}

/**
 * Turns a list of {@link NamedFunctionRange}s into a single {@link OriginalScope} tree nested
 * according to the start/end position. Each range is turned into a OriginalScope with the `isStackFrame`
 * bit set to denote it as a function and a generic "Function" label.
 *
 * We nest all these function scopes underneath a single global scope that always starts at (0, 0) and
 * reaches to the largest end position.
 *
 * `ranges` can be unsorted but will be sorted in-place.
 *
 * @throws if the ranges are not nested properly. Concretely: start < end for each range, and no
 * "straddling" (i.e. partially overlapping ranges).
 */
export function buildOriginalScopes(ranges: NamedFunctionRange[]): OriginalScope {
  validateStartBeforeEnd(ranges);

  // 1. Sort ranges by ascending start position.
  //    If two ranges have the same start position, we sort the one
  //    with the higher end position first, because it's the parent.
  ranges.sort((a, b) => comparePositions(a.start, b.start) || comparePositions(b.end, a.end));

  const root: OriginalScope = {
    start: {line: 0, column: 0},
    end: {line: Number.POSITIVE_INFINITY, column: Number.POSITIVE_INFINITY},
    kind: 'Global',
    isStackFrame: false,
    children: [],
    variables: [],
  };

  // 2. Build the tree from the ranges.
  const stack: OriginalScope[] = [root];
  for (const range of ranges) {
    // Pop all scopes that precede the current entry (to find the right parent).
    let stackTop = stack.at(-1) as OriginalScope;
    while (true) {
      if (comparePositions(stackTop.end, range.start) <= 0) {
        stack.pop();
        stackTop = stack.at(-1) as OriginalScope;
      } else {
        break;
      }
    }

    /*
     * Check for partially overlapping ranges:
     *
     * --- A
     *  |  --- B
     * ---  |
     *     ---
     *
     *i.e.: B.start < A.end < B.end
     */
    if (comparePositions(range.start, stackTop.end) < 0 && comparePositions(stackTop.end, range.end) < 0) {
      throw new Error(`Range ${JSON.stringify(range)} and ${JSON.stringify(stackTop)} partially overlap.`);
    }

    const scope = createScopeFrom(range);
    stackTop.children.push(scope);
    stack.push(scope);
  }

  // 3. Update root.end.
  const lastChild = root.children.at(-1);
  if (lastChild) {
    root.end = lastChild.end;
  }

  return root;
}

function validateStartBeforeEnd(ranges: NamedFunctionRange[]): void {
  for (const range of ranges) {
    if (comparePositions(range.start, range.end) >= 0) {
      throw new Error(`Invalid range. End before start: ${JSON.stringify(range)}`);
    }
  }
}

function createScopeFrom(range: NamedFunctionRange): OriginalScope {
  return {
    ...range,
    kind: 'Function',
    isStackFrame: true,
    children: [],
    variables: [],
  };
}
