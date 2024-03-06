// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview This file implements the current state of the "Scopes" proposal
 * for the source map spec.
 *
 * See https://github.com/tc39/source-map-rfc/blob/main/proposals/scopes.md.
 *
 * The proposal is still being worked on so we expect the implementation details
 * in this file to change frequently.
 */

import {TokenIterator} from './SourceMap.js';

/**
 * A scope in the authored source.
 */
export interface OriginalScope {
  start: Position;
  end: Position;
  kind: ScopeKind;
  name?: string;
  variables: string[];
  children: OriginalScope[];
}

/**
 * A range (can be a scope) in the generated JavaScript.
 */
export interface GeneratedRange {
  start: Position;
  end: Position;
  originalScope?: OriginalScope;

  /**
   * If this `GeneratedRange` is the result of inlining `originalScope`, then `callsite`
   * refers to where `originalScope` was called in the original ("authored") code.
   */
  callsite?: OriginalPosition;

  /**
   * Expressions that compute the values of the variables of this OriginalScope. The length
   * of `values` must match the length of `originalScope.variables`.
   *
   * For each variable this can either be a single expression (valid for the full `GeneratedRange`),
   * or an array of `BindingRange`s, e.g. if computing the value requires different expressions
   * throughout the range or if the variable is only available in parts of the `GeneratedRange`.
   */
  values?: (string|BindingRange[])[];
}

export type ScopeKind = 'global'|'class'|'function'|'block';

export interface BindingRange {
  value?: string;
  from: Position;
  to: Position;
}

export interface Position {
  line: number;
  column: number;
}

export interface OriginalPosition extends Position {
  sourceIndex: number;
}

export function decodeOriginalScopes(encodedOriginalScopes: string[], names: string[]): OriginalScope[] {
  return encodedOriginalScopes.map(scope => decodeOriginalScope(scope, names));
}

function decodeOriginalScope(encodedOriginalScope: string, names: string[]): OriginalScope {
  const scopeStack: OriginalScope[] = [];
  let line = 0;

  for (const item of decodeOriginalScopeItems(encodedOriginalScope)) {
    line += item.line;
    const {column} = item;
    if (isStart(item)) {
      const kind = decodeKind(item.kind);
      const name = resolveName(item.name, names);
      const variables = item.variables.map(idx => names[idx]);
      scopeStack.push({start: {line, column}, end: {line, column}, kind, name, variables, children: []});
    } else {
      const scope = scopeStack.pop();
      if (!scope) {
        throw new Error('Scope items not nested properly: encountered "end" item without "start" item');
      }
      scope.end = {line, column};

      if (scopeStack.length === 0) {
        // We are done. There might be more top-level scopes but we only allow one.
        return scope;
      }
      scopeStack[scopeStack.length - 1].children.push(scope);
    }
  }
  throw new Error('Malformed original scope encoding');
}

interface EncodedOriginalScopeStart {
  line: number;
  column: number;
  kind: number;
  flags: number;
  name?: number;
  variables: number[];
}

interface EncodedOriginalScopeEnd {
  line: number;
  column: number;
}

function isStart(item: EncodedOriginalScopeStart|EncodedOriginalScopeEnd): item is EncodedOriginalScopeStart {
  return 'kind' in item;
}

function*
    decodeOriginalScopeItems(encodedOriginalScope: string):
        Generator<EncodedOriginalScopeStart|EncodedOriginalScopeEnd> {
  const iter = new TokenIterator(encodedOriginalScope);
  let prevColumn = 0;

  while (iter.hasNext()) {
    if (iter.peek() === ',') {
      iter.next();  // Consume ','.
    }

    const [line, column] = [iter.nextVLQ(), iter.nextVLQ()];
    if (line === 0 && column < prevColumn) {
      throw new Error('Malformed original scope encoding: start/end items must be ordered w.r.t. source positions');
    }
    prevColumn = column;

    if (!iter.hasNext() || iter.peek() === ',') {
      yield {line, column};
      continue;
    }

    const startItem: EncodedOriginalScopeStart = {
      line,
      column,
      kind: iter.nextVLQ(),
      flags: iter.nextVLQ(),
      variables: [],
    };

    if (startItem.flags & 0x1) {
      startItem.name = iter.nextVLQ();
    }

    if (startItem.flags & 0x2) {
      const count = iter.nextVLQ();
      for (let i = 0; i < count; ++i) {
        startItem.variables.push(iter.nextVLQ());
      }
    }

    yield startItem;
  }
}

function resolveName(idx: number|undefined, names: string[]): string|undefined {
  if (idx === undefined || idx < 0) {
    return undefined;
  }
  return names[idx];
}

function decodeKind(kind: number): ScopeKind {
  switch (kind) {
    case 0x1:
      return 'global';
    case 0x2:
      return 'function';
    case 0x3:
      return 'class';
    case 0x4:
      return 'block';
    default:
      throw new Error(`Unknown scope kind ${kind}`);
  }
}
