// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type SourceMapV3Object} from './SourceMap.js';
import {
  decodeGeneratedRanges,
  decodeOriginalScopes,
  type GeneratedRange,
  type OriginalScope,
} from './SourceMapScopes.js';

export class SourceMapScopesInfo {
  /* eslint-disable-next-line no-unused-private-class-members */
  readonly #originalScopes: OriginalScope[];
  readonly #generatedRanges: GeneratedRange;

  constructor(originalScopes: OriginalScope[], generatedRanges: GeneratedRange) {
    this.#originalScopes = originalScopes;
    this.#generatedRanges = generatedRanges;
  }

  static parseFromMap(sourceMap: Pick<SourceMapV3Object, 'names'|'originalScopes'|'generatedRanges'>):
      SourceMapScopesInfo {
    if (!sourceMap.originalScopes || !sourceMap.generatedRanges) {
      throw new Error('Cant create SourceMapScopesInfo without encoded scopes');
    }
    const scopeTrees = decodeOriginalScopes(sourceMap.originalScopes, sourceMap.names ?? []);
    const originalScopes = scopeTrees.map(tree => tree.root);
    const generatedRanges = decodeGeneratedRanges(sourceMap.generatedRanges, scopeTrees, sourceMap.names ?? []);
    return new SourceMapScopesInfo(originalScopes, generatedRanges);
  }

  /**
   * Given a generated position, returns the original name of the surrounding function as well as
   * all the original function names that got inlined into the surrounding generated function.
   * (Ordered by inner to outer)
   */
  findInlinedFunctionNames(generatedLine: number, generatedColumn: number): string[] {
    const result: string[] = [];
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);

    // Walk the generated ranges from the innermost containing range outwards as long as we don't
    // encounter a range that is a scope in the generated code and a function scope originally.
    for (let i = rangeChain.length - 1; i >= 0; --i) {
      const range = rangeChain[i];
      const originalScope = range.originalScope;

      // Record the name if the range corresponds to a function scope in the authored code. And it's either a scope in the
      // generated code as well or it has a callsite info (which indicates inlining).
      if (originalScope?.kind === 'function' && (range.isScope || range.callsite)) {
        result.push(originalScope.name ?? '');

        if (range.isScope) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Given a generated position, this returns all the surrounding generated ranges from outer
   * to inner.
   */
  #findGeneratedRangeChain(line: number, column: number): GeneratedRange[] {
    const result: GeneratedRange[] = [];

    (function walkRange(range: GeneratedRange) {
      if (!contains(range, line, column)) {
        return;
      }
      result.push(range);
      for (const childRange of range.children) {
        walkRange(childRange);
      }
    })(this.#generatedRanges);

    return result;
  }
}

function contains(range: GeneratedRange, line: number, column: number): boolean {
  if (range.start.line > line || (range.start.line === line && range.start.column > column)) {
    return false;
  }

  if (range.end.line < line || (range.end.line === line && range.end.column <= column)) {
    return false;
  }

  return true;
}
