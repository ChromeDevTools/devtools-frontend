// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import * as Formatter from '../../models/formatter/formatter.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import type * as Platform from '../platform/platform.js';
import type * as TextUtils from '../text_utils/text_utils.js';

import type {CallFrame, Location, Scope, ScopeChainEntry} from './DebuggerModel.js';
import type {SourceMap} from './SourceMap.js';
import {SourceMapScopeChainEntry} from './SourceMapScopeChainEntry.js';

export class SourceMapScopesInfo {
  readonly #sourceMap: SourceMap;
  readonly #originalScopes: Array<ScopesCodec.OriginalScope[]|null>;
  readonly #generatedRanges: ScopesCodec.GeneratedRange[];
  /** Whether the scope information was derived from the AST and mappings (see {@link createFromAst}). */
  readonly #isFromAst: boolean;

  #cachedVariablesAndBindingsPresent: boolean|null = null;

  constructor(sourceMap: SourceMap, scopeInfo: ScopesCodec.ScopeInfo, {isFromAst = false}: {isFromAst?: boolean} = {}) {
    this.#sourceMap = sourceMap;
    this.#originalScopes = scopeInfo.scopes;
    this.#generatedRanges = scopeInfo.ranges;
    this.#isFromAst = isFromAst;
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
    const scopesBySourceUrl: ScopesCodec.OriginalScope[][] = Array.from({length: numSourceUrls}, () => []);

    // Convert the entire scopeTree. Returns a root range that encompasses everything,
    // and inserts scopes by sourceIndex into the above scopesBySourceUrl.
    const stack: Array<{
      node: Formatter.FormatterWorkerPool.ScopeTreeNode,
      parentRange?: ScopesCodec.GeneratedRange,
      parentScopeHint?: ScopesCodec.OriginalScope,
    }> = [{node: scopeTree}];

    let rootRange: ScopesCodec.GeneratedRange|undefined = undefined;

    while (stack.length > 0) {
      const popped = stack.pop();
      if (!popped) {
        break;
      }
      const {node, parentRange, parentScopeHint} = popped;

      const start = positionFromOffset(node.start);
      const end = positionFromOffset(node.end);
      const startEntry = sourceMap.findEntry(start.line, start.column);
      const endEntry = sourceMap.findEntry(end.line, end.column);
      const sourceIndex = startEntry?.sourceIndex;
      const canMapOriginalPosition = startEntry && endEntry && sourceIndex !== undefined &&
          startEntry.sourceIndex === endEntry.sourceIndex && startEntry.sourceIndex !== undefined && sourceIndex >= 0 &&
          sourceIndex < numSourceUrls;
      const isStackFrame = node.kind === Formatter.FormatterWorkerPool.ScopeKind.FUNCTION ||
          node.kind === Formatter.FormatterWorkerPool.ScopeKind.ARROW_FUNCTION;
      let name: string|undefined = undefined;
      for (const offset of node.nameMappingLocations ?? []) {
        const position = positionFromOffset(offset);
        const entry = sourceMap.findEntryExact(position.line, position.column);
        if (entry?.name !== undefined) {
          // Only consider named mappings.
          name = entry.name;
          break;
        }
      }

      let scope: ScopesCodec.OriginalScope|undefined;
      if (canMapOriginalPosition) {
        scope = {
          start: {line: startEntry.sourceLineNumber, column: startEntry.sourceColumnNumber},
          end: {line: endEntry.sourceLineNumber, column: endEntry.sourceColumnNumber},
          name: name ?? node.name,
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

      if (!rootRange) {
        rootRange = range;
      }
      parentRange?.children.push(range);

      let nextParentScopeHint = parentScopeHint;
      if (canMapOriginalPosition && scope) {
        const startParent = (parentScopeHint && containsOriginal(parentScopeHint, scope)) ? parentScopeHint : undefined;
        insertInScope(sourceIndex, startParent, scope);
        nextParentScopeHint = scope;
      }

      for (let i = node.children.length - 1; i >= 0; --i) {
        stack.push({node: node.children[i], parentRange: range, parentScopeHint: nextParentScopeHint});
      }
    }

    return new SourceMapScopesInfo(sourceMap, {scopes: scopesBySourceUrl, ranges: rootRange ? [rootRange] : []},
                                   {isFromAst: true});

    /**
     * Finds the correct place in the tree to insert the new scope.
     * Maintains the invariant that children are sorted and contained by their parent.
     */
    function insertInScope(sourceIndex: number, parent: ScopesCodec.OriginalScope|undefined,
                           newScope: ScopesCodec.OriginalScope): void {
      let children = parent ? parent.children : scopesBySourceUrl[sourceIndex];
      // Check if the newScope fits strictly inside any of the existing children.
      // We iterate to find the deepest parent to avoid Maximum Call Stack Size Exceeded
      // errors on highly nested scripts.
      while (true) {
        let deeperParent: ScopesCodec.OriginalScope|null = null;
        for (const child of children) {
          if (containsOriginal(child, newScope)) {
            deeperParent = child;
            break;
          }
        }
        if (deeperParent) {
          parent = deeperParent;
          children = deeperParent.children;
        } else {
          break;
        }
      }

      // When here, newScope belongs directly in parent (or at the root of the source file).
      // However, newScope might encompass some of the existing children (due
      // to compiler transform quirks or arbitrary insertion order). We must move
      // those children inside newScope.
      const childrenToKeep: ScopesCodec.OriginalScope[] = [];
      for (const child of children) {
        if (containsOriginal(newScope, child)) {
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

      // Update parent's children (or root scopes) to only be the ones that don't belong to newScope.
      if (parent) {
        parent.children = childrenToKeep;
      } else {
        scopesBySourceUrl[sourceIndex] = childrenToKeep;
      }
      newScope.parent = parent;
    }

    function containsOriginal(outer: ScopesCodec.OriginalScope, inner: ScopesCodec.OriginalScope): boolean {
      return comparePositions(outer.start, inner.start) <= 0 && comparePositions(outer.end, inner.end) >= 0;
    }

    function compareScopes(a: ScopesCodec.OriginalScope, b: ScopesCodec.OriginalScope): number {
      return comparePositions(a.start, b.start);
    }

    function positionFromOffset(offset: number): ScopesCodec.Position {
      const location = text.positionFromOffset(offset);
      return {line: location.lineNumber, column: location.columnNumber};
    }
  }

  addOriginalScopes(scopes: Array<ScopesCodec.OriginalScope[]|null>): void {
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
    return Boolean(this.#originalScopes[sourceIdx]?.length);
  }

  isEmpty(): boolean {
    const noScopes = this.#originalScopes.every(scopes => scopes === null || scopes.length === 0);
    return noScopes && !this.#generatedRanges.length;
  }

  addOriginalScopesAtIndex(sourceIdx: number, scopes: ScopesCodec.OriginalScope[]): void {
    if (!this.#originalScopes[sourceIdx]?.length) {
      this.#originalScopes[sourceIdx] = scopes;
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

  #generatedFrameKind(rangeChain: ScopesCodec.GeneratedRange[]): GeneratedFrameKind {
    const functionRange = rangeChain.findLast(range => range.isStackFrame);
    if (!functionRange) {
      // Top-level code.
      return GeneratedFrameKind.VISIBLE;
    }
    if (!functionRange.originalScope) {
      // For scope information derived from the AST, we merely failed to map the function.
      return this.#isFromAst ? GeneratedFrameKind.VISIBLE : GeneratedFrameKind.HIDDEN;
    }
    return functionRange.isHidden ? GeneratedFrameKind.OUTLINED : GeneratedFrameKind.VISIBLE;
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
   * Given a generated position, this returns all the surrounding generated ranges from outer
   * to inner. When `inlineFrameIndex > 0`, drops inner ranges up to the specified virtual
   * call frame.
   */
  #findGeneratedRangeChain(line: number, column: number, inlineFrameIndex = 0): ScopesCodec.GeneratedRange[] {
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

    // Drop ranges in the chain until we reach our desired inlined range.
    for (let inlineIndex = 0; inlineIndex < inlineFrameIndex;) {
      const range = result.pop();
      if (!range) {
        break;
      }
      if (range.callSite) {
        ++inlineIndex;
      }
    }

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

    function walkTree(nodes: ScopesCodec.OriginalScope[]|ScopesCodec.GeneratedRange[]): boolean {
      for (const node of nodes) {
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
    return this.#originalScopes.some(scopes => scopes !== null && walkTree(scopes)) && walkTree(this.#generatedRanges);
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
    const result: ScopeChainEntry[] = [];
    // Walk the original scope chain outwards and try to find the corresponding generated range along the way.
    for (let originalScope: ScopesCodec.OriginalScope|null|undefined = innerMostOriginalScope; originalScope;
         originalScope = originalScope.parent) {
      const range = rangeChain.findLast(r => r.originalScope === originalScope);
      // `kind` is just a label for scope UI views and has no semantic significance, so `isStackFrame`
      // decides whether this scope is a function scope.
      const isFunctionScope = originalScope.isStackFrame;
      const isInnerMostFunction = isFunctionScope && !seenFunctionScope;
      const returnValue = isInnerMostFunction ? callFrame.returnValue() : null;
      const scopeNumber = range ? findMatchingScopeNumber(callFrame, range) : undefined;
      result.push(new SourceMapScopeChainEntry(callFrame, originalScope, range, isInnerMostFunction,
                                               returnValue ?? undefined, scopeNumber));
      seenFunctionScope ||= isFunctionScope;
    }

    const globalScope = callFrame.scopeChain()?.find(s => s.type() === Protocol.Debugger.ScopeType.Global);
    if (globalScope) {
      result.push(globalScope);
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

  #findGeneratedRangeChainForFrame(callFrame: CallFrame): ScopesCodec.GeneratedRange[] {
    const {line, column} = scriptRelativePosition(callFrame.location());
    return this.#findGeneratedRangeChain(line, column, callFrame.inlineFrameIndex);
  }

  resolveMappedVariablesAtPosition(line: number, column: number, ignoreInnerBlockScopes = false,
                                   inlineFrameIndex = 0): Array<Map<string, string|null>>|null {
    const rangeChain = this.#findGeneratedRangeChain(line, column, inlineFrameIndex);
    const startScope = rangeChain.at(-1)?.originalScope;
    const innerMostScope =
        (startScope && ignoreInnerBlockScopes && this.#findFunctionScopeInOriginalScopeChain(startScope)) || startScope;
    const result: Array<Map<string, string|null>> = [];
    for (let scope = innerMostScope; scope; scope = scope.parent) {
      const range = rangeChain.findLast(r => r.originalScope === scope);
      result.push(new Map(scope.variables.map((v, i) => [v, findExpression(range, i, line, column)])));
    }
    return innerMostScope ? result : null;
  }

  /**
   * Returns the authored function name of the function containing the provided generated position.
   */
  findOriginalFunctionName(position: ScopesCodec.Position): string|null {
    const originalInnerMostScope = this.findOriginalFunctionScope(position)?.scope;
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
    const sourceIndex = this.#originalScopes.findIndex(scopes => scopes?.includes(rootScope));
    const url = sourceIndex !== -1 ? this.#sourceMap.sourceURLForSourceIndex(sourceIndex) : undefined;

    return functionScope ? {scope: functionScope, url} : null;
  }

  /**
   * Given an original position, this returns all the surrounding original scopes from outer
   * to inner.
   */
  #findOriginalScopeChain({sourceIndex, line, column}: ScopesCodec.OriginalPosition): ScopesCodec.OriginalScope[] {
    const scopes = this.#originalScopes[sourceIndex];
    if (!scopes) {
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
    })(scopes);

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

    const frame = this.#translateTopFrame(generatedLine, generatedColumn);
    return frame ? [frame, ...this.#translateInlinedCallers(rangeChain)] : [];
  }

  /**
   * Translates a single "raw frame" or call-site, including outlined functions. It's the caller's responsibility to
   * merge outlined frames with their caller(s) (see {@link GeneratedFrameKind}).
   */
  translateRawFrame(generatedLine: number, generatedColumn: number): RawFrameTranslation {
    const rangeChain = this.#findGeneratedRangeChain(generatedLine, generatedColumn);
    const kind = this.#generatedFrameKind(rangeChain);
    if (kind === GeneratedFrameKind.HIDDEN) {
      return {kind, frames: []};
    }
    const frame = this.#translateTopFrame(generatedLine, generatedColumn);
    return {kind, frames: frame ? [frame, ...this.#translateInlinedCallers(rangeChain)] : []};
  }

  /**
   * The top-most frame is translated the same, regardless of whether we have inlined functions: The name is the
   * original function surrounding the generated position, and the location is the mapped generated position.
   */
  #translateTopFrame(generatedLine: number, generatedColumn: number): TranslatedFrame|null {
    const mapping = this.#sourceMap.findEntry(generatedLine, generatedColumn);
    if (mapping?.sourceIndex === undefined) {
      return null;
    }

    return {
      line: mapping.sourceLineNumber,
      column: mapping.sourceColumnNumber,
      name: this.findOriginalFunctionName({line: generatedLine, column: generatedColumn}) ?? undefined,
      url: mapping.sourceURL,
    };
  }

  /**
   * Walk the range chain inside out until we find a generated function and for each inlined function add a frame.
   */
  #translateInlinedCallers(rangeChain: ScopesCodec.GeneratedRange[]): TranslatedFrame[] {
    const result: TranslatedFrame[] = [];
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
 * Describes how the generated function surrounding a generated position shows up in stack traces.
 *
 * Compilers tend to introduce functions (and calls to them) that don't exist in the authored code. The scopes
 * proposal distinguishes two cases:
 *
 *   1) The generated function contains authored code, e.g. a block scope that was turned into a function. The
 *      generated range is marked "hidden", but links to the original scope via its definition. We can pause
 *      in such a function, but the frame is merged with its caller(s) in stack traces: The outlined code
 *      logically belongs to the (authored) function that transitively calls it.
 *
 *   2) The generated function doesn't represent any authored code, e.g. a compiler helper. The generated range
 *      has no definition. The scopes spec is being updated to say that such a range can be ignored in stack
 *      traces, so we drop these frames.
 */
export const enum GeneratedFrameKind {
  /** A regular (possibly with inlined functions) generated function, or top-level code. */
  VISIBLE = 'VISIBLE',
  /** A generated function marked as "hidden" that has a definition (case 1). */
  OUTLINED = 'OUTLINED',
  /** A generated function without a definition (case 2). */
  HIDDEN = 'HIDDEN',
}

/** See {@link SourceMapScopesInfo.translateRawFrame}. */
export interface RawFrameTranslation {
  kind: GeneratedFrameKind;
  /**
   * [top, ...inlinedCallers] in top-to-bottom order. Empty for {@link GeneratedFrameKind.HIDDEN} frames, or if the
   * generated position is not mapped.
   *
   * For {@link GeneratedFrameKind.OUTLINED} frames, the top frame is named after the authored function the outlined
   * code belongs to.
   */
  frames: TranslatedFrame[];
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

export function findExpression(range: ScopesCodec.GeneratedRange|undefined, index: number, line = 0,
                               column = 0): string|null {
  const val = range?.values[index];
  return (typeof val === 'string' ? val : val?.find(r => contains({start: r.from, end: r.to}, line, column))?.value) ??
      null;
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

export function comparePositions(a: ScopesCodec.Position, b: ScopesCodec.Position): number {
  if (a.line !== b.line) {
    return a.line - b.line;
  }
  return a.column - b.column;
}

/**
 * Converts a raw V8 {@link location} into a generated position relative to the start of its script.
 *
 * Positions in source maps (mappings and generated ranges) are relative to the start of the script,
 * while V8 reports locations in inline `<script>`s (without `//# sourceURL`) relative to the start of
 * the surrounding document.
 */
export function scriptRelativePosition(location: Location): ScopesCodec.Position {
  const {lineNumber, columnNumber} = location.script()?.rawLocationToRelativeLocation(location) ?? location;
  return {line: lineNumber, column: columnNumber};
}

function positionRange(callFrame: CallFrame, scope: Scope): {start: ScopesCodec.Position, end: ScopesCodec.Position}|
    null {
  const range = scope.range();
  if (range === null || range.start.scriptId !== callFrame.location().scriptId ||
      range.end.scriptId !== callFrame.location().scriptId) {
    return null;
  }
  return {
    start: scriptRelativePosition(range.start),
    end: scriptRelativePosition(range.end),
  };
}

/**
 * Finds the V8 scope that corresponds to the source map's generated `range`.
 *
 * We need this to evaluate a scope's binding expressions in the right V8 scope. `evaluateOnCallFrame`
 * defaults to the inner-most scope, where declarations shadow the outer variables we actually want to read.
 *
 * V8's scope ranges and the source map's generated ranges don't have to agree (in particular with
 * inlining), so besides an exact match we accept the outer-most V8 scope contained in `range` (a generated
 * range for a function spans the whole function text, while V8's scope only covers params + body), or
 * failing that the inner-most V8 scope containing `range`.
 *
 * @returns The scope number, or `undefined` if nothing matched. Callers should then omit `scopeNumber`
 *          and let CDP default to the inner-most scope.
 */
export function findMatchingScopeNumber(callFrame: CallFrame, range: ScopesCodec.GeneratedRange): number|undefined {
  const scopeChain = callFrame.scopeChain();

  const exactMatch = scopeChain.find(scope => {
    const scopeRange = positionRange(callFrame, scope);
    return scopeRange !== null && comparePositions(scopeRange.start, range.start) === 0 &&
        comparePositions(scopeRange.end, range.end) === 0;
  });
  if (exactMatch !== undefined) {
    return exactMatch.ordinal();
  }

  // A stack frame must correspond to a V8 function scope. Inlined ranges make it easy to accidentally
  // land on an unrelated block/catch/with scope, so search the function scopes first.
  if (range.isStackFrame) {
    const functionScopes = scopeChain.filter(scope => scope.type() === Protocol.Debugger.ScopeType.Local ||
                                                 scope.type() === Protocol.Debugger.ScopeType.Closure);
    const functionScope = findBestScope(callFrame, functionScopes, range);
    if (functionScope !== undefined) {
      return functionScope.ordinal();
    }
  }

  return findBestScope(callFrame, scopeChain, range)?.ordinal();
}

/**
 * @param scopes Ordered inner-most to outer-most.
 * @returns The outer-most scope contained in `range`, or if there is none, the inner-most scope
 *          containing `range`.
 */
function findBestScope(callFrame: CallFrame, scopes: Scope[], range: ScopesCodec.GeneratedRange): Scope|undefined {
  let outerMostContainedScope: Scope|undefined;
  let innerMostContainingScope: Scope|undefined;

  for (const scope of scopes) {
    const scopeRange = positionRange(callFrame, scope);
    if (scopeRange === null) {
      continue;
    }
    const rangeContainsScope =
        comparePositions(range.start, scopeRange.start) <= 0 && comparePositions(scopeRange.end, range.end) <= 0;
    const scopeContainsRange =
        comparePositions(scopeRange.start, range.start) <= 0 && comparePositions(range.end, scopeRange.end) <= 0;
    if (rangeContainsScope) {
      outerMostContainedScope = scope;
    } else if (scopeContainsRange) {
      innerMostContainingScope ??= scope;
    }
  }

  return outerMostContainedScope ?? innerMostContainingScope;
}
