// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';

import type {CallFrame, ScopeChainEntry} from './DebuggerModel.js';
import type {SourceMap, SourceMapV3Object} from './SourceMap.js';
import {SourceMapScopeChainEntry} from './SourceMapScopeChainEntry.js';
import {
  decodeGeneratedRanges,
  decodeOriginalScopes,
  type GeneratedRange,
  type OriginalPosition,
  type OriginalScope,
} from './SourceMapScopes.js';

export class SourceMapScopesInfo {
  /* eslint-disable-next-line no-unused-private-class-members */
  readonly #sourceMap: SourceMap;
  readonly #originalScopes: OriginalScope[];
  readonly #generatedRanges: GeneratedRange[];

  #cachedVariablesAndBindingsPresent: boolean|null = null;

  constructor(sourceMap: SourceMap, originalScopes: OriginalScope[], generatedRanges: GeneratedRange[]) {
    this.#sourceMap = sourceMap;
    this.#originalScopes = originalScopes;
    this.#generatedRanges = generatedRanges;
  }

  static parseFromMap(
      sourceMap: SourceMap,
      sourceMapJson: Pick<SourceMapV3Object, 'names'|'originalScopes'|'generatedRanges'>): SourceMapScopesInfo {
    if (!sourceMapJson.originalScopes || !sourceMapJson.generatedRanges) {
      throw new Error('Cant create SourceMapScopesInfo without encoded scopes');
    }
    const scopeTrees = decodeOriginalScopes(sourceMapJson.originalScopes, sourceMapJson.names ?? []);
    const originalScopes = scopeTrees.map(tree => tree.root);
    const generatedRanges = decodeGeneratedRanges(sourceMapJson.generatedRanges, scopeTrees, sourceMapJson.names ?? []);
    return new SourceMapScopesInfo(sourceMap, originalScopes, generatedRanges);
  }

  /**
   * Given a generated position, returns the original name of the surrounding function as well as
   * all the original function names that got inlined into the surrounding generated function and their
   * respective callsites in the original code (ordered from inner to outer).
   *
   * @returns a list with inlined functions. Every entry in the list has a callsite in the orignal code,
   * except the last function (since the last function didn't get inlined).
   */
  findInlinedFunctions(generatedLine: number, generatedColumn: number): InlineInfo {
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);
    const result: InlineInfo = {
      inlinedFunctions: [],
      originalFunctionName: '',
    };

    // Walk the generated ranges from the innermost containing range outwards as long as we don't
    // encounter a range that is a scope in the generated code and a function scope originally.
    for (let i = rangeChain.length - 1; i >= 0; --i) {
      const range = rangeChain[i];

      if (range.callsite) {
        // Record the name and call-site if the range corresponds to an inlined function.
        result.inlinedFunctions.push({name: range.originalScope?.name ?? '', callsite: range.callsite});
      }
      if (range.isFunctionScope) {
        // We arrived at an actual generated JS function, don't go further.
        // The corresponding original scope could not actually be a function
        // (e.g. a block scope transpiled down to a JS function), but we'll
        // filter that out later.
        result.originalFunctionName = range.originalScope?.name ?? '';
        break;
      }
    }

    return result;
  }

  /**
   * Takes a V8 provided call frame and expands any inlined frames into virtual call frames.
   *
   * For call frames where nothing was inlined, the result contains only a single element,
   * the provided frame but with the original name.
   *
   * For call frames where we are paused in inlined code, this function returns a list of
   * call frames from "inner to outer". This is the call frame at index 0
   * signifies the top of this stack trace fragment.
   *
   * The rest are "virtual" call frames and will have an "inlineFrameIndex" set in ascending
   * order, so the condition `result[index] === result[index].inlineFrameIndex` always holds.
   */
  expandCallFrame(callFrame: CallFrame): CallFrame[] {
    const {originalFunctionName, inlinedFunctions} =
        this.findInlinedFunctions(callFrame.location().lineNumber, callFrame.location().columnNumber);
    const result: CallFrame[] = [];
    for (const [index, fn] of inlinedFunctions.entries()) {
      result.push(callFrame.createVirtualCallFrame(index, fn.name));
    }
    result.push(callFrame.createVirtualCallFrame(result.length, originalFunctionName));
    return result;
  }

  /**
   * Given a generated position, this returns all the surrounding generated ranges from outer
   * to inner.
   */
  #findGeneratedRangeChain(line: number, column: number): GeneratedRange[] {
    const result: GeneratedRange[] = [];

    (function walkRanges(ranges: GeneratedRange[]) {
      for (const range of ranges) {
        if (!contains(range, line, column)) {
          continue;
        }
        result.push(range);
        walkRanges(range.children);
      }
    })(this.#generatedRanges);

    return result;
  }

  /**
   * @returns true if we have enough info (i.e. variable and binding expressions) to build
   * a scope view.
   */
  hasVariablesAndBindings(): boolean {
    if (this.#cachedVariablesAndBindingsPresent === null) {
      this.#cachedVariablesAndBindingsPresent = this.#areVariablesAndBindingsPresent();
    }
    return this.#cachedVariablesAndBindingsPresent;
  }

  #areVariablesAndBindingsPresent(): boolean {
    // We check whether any original scope has a non-empty list of variables, and
    // generated ranges with a non-empty binding list.

    function walkTree(nodes: OriginalScope[]|GeneratedRange[]): boolean {
      for (const node of nodes) {
        if ('variables' in node && node.variables.length > 0) {
          return true;
        }

        if ('values' in node && node.values.some(v => v !== undefined)) {
          return true;
        }

        if (walkTree(node.children)) {
          return true;
        }
      }
      return false;
    }
    return walkTree(this.#originalScopes) && walkTree(this.#generatedRanges);
  }

  /**
   * Constructs a scope chain based on the CallFrame's paused position.
   *
   * The algorithm to obtain the original scope chain is straight-forward:
   *
   *   1) Find the inner-most generated range that contains the CallFrame's
   *      paused position.
   *
   *   2) Does the found range have an associated original scope?
   *
   *      2a) If no, return null. This is a "hidden" range and technically
   *          we shouldn't be pausing here in the first place. This code doesn't
   *          correspond to anything in the authored code.
   *
   *      2b) If yes, the associated original scope is the inner-most
   *          original scope in the resulting scope chain.
   *
   *   3) Walk the parent chain of the found original scope outwards. This is
   *      our scope view. For each original scope we also try to find a
   *      corresponding generated range that contains the CallFrame's
   *      paused position. We need the generated range to resolve variable
   *      values.
   */
  resolveMappedScopeChain(callFrame: CallFrame): ScopeChainEntry[]|null {
    const rangeChain = this.#findGeneratedRangeChainForFrame(callFrame);
    const innerMostOriginalScope = rangeChain.at(-1)?.originalScope;
    if (innerMostOriginalScope === undefined) {
      return null;
    }

    // TODO(crbug.com/40277685): Add a sanity check here where we map the paused position using
    //         the source map's mappings, find the inner-most original scope with that mapped paused
    //         position and compare that result with `innerMostOriginalScope`. If they don't match we
    //         should emit a warning about the broken source map as mappings and scopes are inconsistent
    //         w.r.t. each other.

    let seenFunctionScope = false;
    const result: SourceMapScopeChainEntry[] = [];
    // Walk the original scope chain outwards and try to find the corresponding generated range along the way.
    for (let originalScope = rangeChain.at(-1)?.originalScope; originalScope; originalScope = originalScope.parent) {
      const range = rangeChain.findLast(r => r.originalScope === originalScope);
      const isFunctionScope = originalScope.kind === 'function';
      const isInnerMostFunction = isFunctionScope && !seenFunctionScope;
      const returnValue = isInnerMostFunction ? callFrame.returnValue() : null;
      result.push(
          new SourceMapScopeChainEntry(callFrame, originalScope, range, isInnerMostFunction, returnValue ?? undefined));
      seenFunctionScope ||= isFunctionScope;
    }

    // If we are paused on a return statement, we need to drop inner block scopes. This is because V8 only emits a
    // single return bytecode and "gotos" at the functions' end, where we are now paused.
    if (callFrame.returnValue() !== null) {
      while (result.length && result[0].type() !== Protocol.Debugger.ScopeType.Local) {
        result.shift();
      }
    }

    return result;
  }

  /** Similar to #findGeneratedRangeChain, but takes inlineFrameIndex of virtual call frames into account */
  #findGeneratedRangeChainForFrame(callFrame: CallFrame): GeneratedRange[] {
    const rangeChain =
        this.#findGeneratedRangeChain(callFrame.location().lineNumber, callFrame.location().columnNumber);
    if (callFrame.inlineFrameIndex === 0) {
      return rangeChain;
    }

    // Drop ranges in the chain until we reach our desired inlined range.
    for (let inlineIndex = 0; inlineIndex < callFrame.inlineFrameIndex;) {
      const range = rangeChain.pop();
      if (range?.callsite) {
        ++inlineIndex;
      }
    }

    return rangeChain;
  }
}

/**
 * Represents the inlining information for a given generated position.
 *
 * It contains a list of all the inlined original functions at the generated position
 * as well as the original function name of the generated position's surrounding
 * function.
 *
 * The inlined functions are sorted from inner to outer (or top to bottom on the stack).
 */
export interface InlineInfo {
  inlinedFunctions: {name: string, callsite: OriginalPosition}[];
  originalFunctionName: string;
}

export function contains(range: Pick<GeneratedRange, 'start'|'end'>, line: number, column: number): boolean {
  if (range.start.line > line || (range.start.line === line && range.start.column > column)) {
    return false;
  }

  if (range.end.line < line || (range.end.line === line && range.end.column <= column)) {
    return false;
  }

  return true;
}
