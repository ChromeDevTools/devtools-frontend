// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Formatter from '../../models/formatter/formatter.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import type * as Platform from '../platform/platform.js';

import type {CallFrame, ScopeChainEntry} from './DebuggerModel.js';
import type {SourceMap} from './SourceMap.js';
import {SourceMapScopeChainEntry} from './SourceMapScopeChainEntry.js';

export class SourceMapScopesInfo {
  readonly #sourceMap: SourceMap;
  readonly #originalScopes: Array<ScopesCodec.OriginalScope|null>;
  readonly #generatedRanges: ScopesCodec.GeneratedRange[];

  #cachedVariablesAndBindingsPresent: boolean|null = null;

  constructor(sourceMap: SourceMap, scopeInfo: ScopesCodec.ScopeInfo) {
    this.#sourceMap = sourceMap;
    this.#originalScopes = scopeInfo.scopes;
    this.#generatedRanges = scopeInfo.ranges;
  }

  /**
   * If the source map does not contain any scopes information, this factory function attempts to create scope information
   * via the script's AST combined with the mappings.
   *
   * We create the generated ranges from the scope tree and for each range we create an original scope that matches the bounds 1:1.
   */
  static createFromAst(
      sourceMap: SourceMap, scopeTree: Formatter.FormatterWorkerPool.ScopeTreeNode,
      text: TextUtils.Text.Text): SourceMapScopesInfo {
    const numSourceUrls = sourceMap.sourceURLs().length;
    const scopeBySourceUrl: ScopesCodec.OriginalScope[] = [];
    for (let i = 0; i < numSourceUrls; i++) {
      const scope: ScopesCodec.OriginalScope = {
        start: {line: 0, column: 0},
        end: {line: Number.POSITIVE_INFINITY, column: Number.POSITIVE_INFINITY},
        isStackFrame: false,
        variables: [],
        children: [],
      };
      scopeBySourceUrl.push(scope);
    }

    // Convert the entire scopeTree. Returns a root range that encompasses everything,
    // and inserts scopes by sourceIndex into the above scopeBySourceUrl.
    const {range} = convertScope(scopeTree, undefined);
    return new SourceMapScopesInfo(sourceMap, {scopes: scopeBySourceUrl, ranges: [range]});

    /**
     * Recursively finds the correct place in the tree to insert the new scope.
     * Maintains the invariant that children are sorted and contained by their parent.
     */
    function insertInScope(parent: ScopesCodec.OriginalScope, newScope: ScopesCodec.OriginalScope): void {
      // Check if the newScope fits strictly inside any of the existing children.
      for (const child of parent.children) {
        if (contains(child, newScope)) {
          insertInScope(child, newScope);
          return;
        }
      }

      // When here, newScope belongs directly in parent.
      // However, newScope might encompass some of parent's existing children (due
      // to compiler transform quirks or arbitrary insertion order). We must move
      // those children inside newScope.
      const childrenToKeep: ScopesCodec.OriginalScope[] = [];
      for (const child of parent.children) {
        if (contains(newScope, child)) {
          // child is actually inside newScope, so re-parent it.
          newScope.children.push(child);
          child.parent = newScope;
        } else {
          childrenToKeep.push(child);
        }
      }

      // Find the correct index in the remaining children to insert newScope.
      // We look for the first child that starts after the new scope.
      const insertIndex = childrenToKeep.findIndex(child => compareScopes(newScope, child) < 0);
      if (insertIndex === -1) {
        // If no child starts after, it goes at the end.
        childrenToKeep.push(newScope);
      } else {
        childrenToKeep.splice(insertIndex, 0, newScope);
      }

      // Update parent's children to only be the ones that don't belong to newScope.
      parent.children = childrenToKeep;
      newScope.parent = parent;
    }

    function contains(outer: ScopesCodec.OriginalScope, inner: ScopesCodec.OriginalScope): boolean {
      return comparePositions(outer.start, inner.start) <= 0 && comparePositions(outer.end, inner.end) >= 0;
    }

    function compareScopes(a: ScopesCodec.OriginalScope, b: ScopesCodec.OriginalScope): number {
      return comparePositions(a.start, b.start);
    }

    function comparePositions(a: ScopesCodec.Position, b: ScopesCodec.Position): number {
      if (a.line !== b.line) {
        return a.line - b.line;
      }
      return a.column - b.column;
    }

    function convertScope(
        node: Formatter.FormatterWorkerPool.ScopeTreeNode,
        parentRange: ScopesCodec.GeneratedRange|undefined): {range: ScopesCodec.GeneratedRange} {
      const start = positionFromOffset(node.start);
      const end = positionFromOffset(node.end);
      const startEntry = sourceMap.findEntry(start.line, start.column);
      const endEntry = sourceMap.findEntry(end.line, end.column);
      const sourceIndex = startEntry?.sourceIndex;
      const canMapOriginalPosition = startEntry && endEntry && sourceIndex !== undefined &&
          startEntry.sourceIndex === endEntry.sourceIndex && startEntry.sourceIndex !== undefined && sourceIndex >= 0 &&
          sourceIndex < numSourceUrls;
      const isStackFrame = node.kind === Formatter.FormatterWorkerPool.ScopeKind.FUNCTION;

      let scope: ScopesCodec.OriginalScope|undefined;
      if (canMapOriginalPosition) {
        scope = {
          start: {line: startEntry.sourceLineNumber, column: startEntry.sourceColumnNumber},
          end: {line: endEntry.sourceLineNumber, column: endEntry.sourceColumnNumber},
          name: startEntry.name,
          isStackFrame,
          variables: [],
          children: [],
        };
      }

      const range: ScopesCodec.GeneratedRange = {
        start,
        end,
        originalScope: scope,
        isStackFrame,
        isHidden: false,
        values: [],
        children: [],
      };

      parentRange?.children.push(range);
      if (canMapOriginalPosition && scope) {
        const rootScope = scopeBySourceUrl[sourceIndex];
        insertInScope(rootScope, scope);
      }

      node.children.forEach(child => convertScope(child, range));

      return {range};
    }

    function positionFromOffset(offset: number): ScopesCodec.Position {
      const location = text.positionFromOffset(offset);
      return {line: location.lineNumber, column: location.columnNumber};
    }
  }

  addOriginalScopes(scopes: Array<ScopesCodec.OriginalScope|null>): void {
    for (const scope of scopes) {
      this.#originalScopes.push(scope);
    }
  }

  addGeneratedRanges(ranges: ScopesCodec.GeneratedRange[]): void {
    for (const range of ranges) {
      this.#generatedRanges.push(range);
    }
  }

  hasOriginalScopes(sourceIdx: number): boolean {
    return Boolean(this.#originalScopes[sourceIdx]);
  }

  isEmpty(): boolean {
    return !this.#originalScopes.length && !this.#generatedRanges.length;
  }

  addOriginalScopesAtIndex(sourceIdx: number, scope: ScopesCodec.OriginalScope): void {
    if (!this.#originalScopes[sourceIdx]) {
      this.#originalScopes[sourceIdx] = scope;
    } else {
      throw new Error(`Trying to re-augment existing scopes for source at index: ${sourceIdx}`);
    }
  }

  /**
   * @returns true, iff the function surrounding the provided position is marked as "hidden".
   */
  isOutlinedFrame(generatedLine: number, generatedColumn: number): boolean {
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);
    return this.#isOutlinedFrame(rangeChain);
  }

  #isOutlinedFrame(rangeChain: ScopesCodec.GeneratedRange[]): boolean {
    for (let i = rangeChain.length - 1; i >= 0; --i) {
      if (rangeChain[i].isStackFrame) {
        return rangeChain[i].isHidden;
      }
    }
    return false;
  }

  /**
   * @returns true, iff the range surrounding the provided position contains multiple
   * inlined original functions.
   */
  hasInlinedFrames(generatedLine: number, generatedColumn: number): boolean {
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);
    for (let i = rangeChain.length - 1; i >= 0; --i) {
      if (rangeChain[i].isStackFrame) {
        // We stop looking for inlined original functions once we reach the current frame.
        return false;
      }
      if (rangeChain[i].callSite) {
        return true;
      }
    }
    return false;
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

      if (range.callSite) {
        // Record the name and call-site if the range corresponds to an inlined function.
        result.inlinedFunctions.push({
          name: range.originalScope?.name ?? '',
          callsite: {...range.callSite, sourceURL: this.#sourceMap.sourceURLForSourceIndex(range.callSite.sourceIndex)}
        });
      }
      if (range.isStackFrame) {
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
  #findGeneratedRangeChain(line: number, column: number): ScopesCodec.GeneratedRange[] {
    const result: ScopesCodec.GeneratedRange[] = [];

    (function walkRanges(ranges: ScopesCodec.GeneratedRange[]) {
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

    function walkTree(nodes: Array<ScopesCodec.OriginalScope|null>|ScopesCodec.GeneratedRange[]): boolean {
      for (const node of nodes) {
        if (!node) {
          continue;
        }

        if ('variables' in node && node.variables.length > 0) {
          return true;
        }

        if ('values' in node && node.values.some(v => v !== null)) {
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
  #findGeneratedRangeChainForFrame(callFrame: CallFrame): ScopesCodec.GeneratedRange[] {
    const rangeChain =
        this.#findGeneratedRangeChain(callFrame.location().lineNumber, callFrame.location().columnNumber);
    if (callFrame.inlineFrameIndex === 0) {
      return rangeChain;
    }

    // Drop ranges in the chain until we reach our desired inlined range.
    for (let inlineIndex = 0; inlineIndex < callFrame.inlineFrameIndex;) {
      const range = rangeChain.pop();
      if (range?.callSite) {
        ++inlineIndex;
      }
    }

    return rangeChain;
  }

  /**
   * Returns the authored function name of the function containing the provided generated position.
   */
  findOriginalFunctionName(position: ScopesCodec.Position): string|null {
    const originalInnerMostScope = this.findOriginalFunctionScope(position)?.scope ?? undefined;
    return this.#findFunctionNameInOriginalScopeChain(originalInnerMostScope);
  }

  /**
   * Returns the authored function scope of the function containing the provided generated position.
   */
  findOriginalFunctionScope({line, column}: ScopesCodec.Position):
      {scope: ScopesCodec.OriginalScope, url?: Platform.DevToolsPath.UrlString}|null {
    // There are 2 approaches:
    //   1) Find the inner-most generated range containing the provided generated position
    //      and use it's OriginalScope (then walk it outwards until we hit a function).
    //   2) Use the mappings to turn the generated position into an original position.
    //      Then find the inner-most original scope containing that original position.
    //      Then walk it outwards until we hit a function.
    //
    // Both approaches should yield the same result (assuming the mappings are spec compliant
    // w.r.t. generated ranges). But in the case of "pasta" scopes and extension provided
    // scope info, we only have the OriginalScope parts and mappings without GeneratedRanges.

    let originalInnerMostScope: ScopesCodec.OriginalScope|undefined;

    if (this.#generatedRanges.length > 0) {
      const rangeChain = this.#findGeneratedRangeChain(line, column);
      originalInnerMostScope = rangeChain.at(-1)?.originalScope;
    } else {
      // No GeneratedRanges. Try to use mappings.
      const entry = this.#sourceMap.findEntry(line, column);
      if (entry?.sourceIndex === undefined) {
        return null;
      }
      originalInnerMostScope =
          this.#findOriginalScopeChain(
                  {sourceIndex: entry.sourceIndex, line: entry.sourceLineNumber, column: entry.sourceColumnNumber})
              .at(-1);
    }

    if (!originalInnerMostScope) {
      return null;
    }

    const functionScope = this.#findFunctionScopeInOriginalScopeChain(originalInnerMostScope);
    if (!functionScope) {
      return null;
    }

    // Find the root scope for some given original source, to get the source url.
    let rootScope: ScopesCodec.OriginalScope = functionScope;
    while (rootScope.parent) {
      rootScope = rootScope.parent;
    }
    const sourceIndex = this.#originalScopes.indexOf(rootScope);
    const url = sourceIndex !== -1 ? this.#sourceMap.sourceURLForSourceIndex(sourceIndex) : undefined;

    return functionScope ? {scope: functionScope, url} : null;
  }

  /**
   * Given an original position, this returns all the surrounding original scopes from outer
   * to inner.
   */
  #findOriginalScopeChain({sourceIndex, line, column}: ScopesCodec.OriginalPosition): ScopesCodec.OriginalScope[] {
    const scope = this.#originalScopes[sourceIndex];
    if (!scope) {
      return [];
    }

    const result: ScopesCodec.OriginalScope[] = [];
    (function walkScopes(scopes: ScopesCodec.OriginalScope[]) {
      for (const scope of scopes) {
        if (!contains(scope, line, column)) {
          continue;
        }
        result.push(scope);
        walkScopes(scope.children);
      }
    })([scope]);

    return result;
  }

  #findFunctionScopeInOriginalScopeChain(innerOriginalScope: ScopesCodec.OriginalScope|undefined):
      ScopesCodec.OriginalScope|null {
    for (let originalScope = innerOriginalScope; originalScope; originalScope = originalScope.parent) {
      if (originalScope.isStackFrame) {
        return originalScope;
      }
    }
    return null;
  }

  #findFunctionNameInOriginalScopeChain(innerOriginalScope: ScopesCodec.OriginalScope|undefined): string|null {
    const functionScope = this.#findFunctionScopeInOriginalScopeChain(innerOriginalScope);
    if (!functionScope) {
      return null;
    }

    return functionScope.name ?? '';
  }

  /**
   * Returns one or more original stack frames for this single "raw frame" or call-site.
   *
   * @returns An empty array if no mapping at the call-site was found, or the resulting frames
   * in top-to-bottom order in case of inlining.
   * @throws If this range is marked "hidden". Outlining needs to be handled externally as
   * outlined function segments in stack traces can span across bundles.
   */
  translateCallSite(generatedLine: number, generatedColumn: number): TranslatedFrame[] {
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);
    if (this.#isOutlinedFrame(rangeChain)) {
      throw new Error('SourceMapScopesInfo is unable to translate an outlined function by itself');
    }

    const mapping = this.#sourceMap.findEntry(generatedLine, generatedColumn);
    if (mapping?.sourceIndex === undefined) {
      return [];
    }

    // The top-most frame is translated the same even if we have inlined functions.
    const result: TranslatedFrame[] = [{
      line: mapping.sourceLineNumber,
      column: mapping.sourceColumnNumber,
      name: this.findOriginalFunctionName({line: generatedLine, column: generatedColumn}) ?? undefined,
      url: mapping.sourceURL,
    }];

    // Walk the range chain inside out until we find a generated function and for each inlined function add a frame.
    for (let i = rangeChain.length - 1; i >= 0 && !rangeChain[i].isStackFrame; --i) {
      const range = rangeChain[i];
      if (!range.callSite) {
        continue;
      }

      const originalScopeChain = this.#findOriginalScopeChain(range.callSite);
      result.push({
        line: range.callSite.line,
        column: range.callSite.column,
        name: this.#findFunctionNameInOriginalScopeChain(originalScopeChain.at(-1)) ?? undefined,
        url: this.#sourceMap.sourceURLForSourceIndex(range.callSite.sourceIndex),
      });
    }

    return result;
  }
}

/**
 * Represents a stack frame in original terms. It closely aligns with StackTrace.StackTrace.Frame,
 * but since we can't import that type here we mirror it here somewhat.
 *
 * Equivalent to Pick<StackTrace.StackTrace.Frame, 'line'|'column'|'name'|'url'>.
 */
export interface TranslatedFrame {
  line: number;
  column: number;
  name?: string;
  url?: Platform.DevToolsPath.UrlString;
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
  inlinedFunctions: Array<{
    name: string,
    callsite: {
      line: number,
      column: number,
      sourceIndex: number,
      sourceURL?: Platform.DevToolsPath.UrlString,
    },
  }>;
  originalFunctionName: string;
}

export function contains(
    range: Pick<ScopesCodec.GeneratedRange, 'start'|'end'>, line: number, column: number): boolean {
  if (range.start.line > line || (range.start.line === line && range.start.column > column)) {
    return false;
  }

  if (range.end.line < line || (range.end.line === line && range.end.column <= column)) {
    return false;
  }

  return true;
}
