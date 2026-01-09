// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  EncodedTag,
  GeneratedRangeFlags,
  OriginalScopeFlags,
} from "../codec.js";
import type { GeneratedRange, OriginalScope, ScopeInfo } from "../scopes.ts";
import { encodeSigned, encodeUnsigned } from "../vlq.js";
import { comparePositions } from "../util.js";

const DEFAULT_SCOPE_STATE = {
  line: 0,
  column: 0,
  name: 0,
  kind: 0,
  variable: 0,
};

const DEFAULT_RANGE_STATE = {
  line: 0,
  column: 0,
  defScopeIdx: 0,
};

export class Encoder {
  readonly #info: ScopeInfo;
  readonly #names: string[];

  // Hash map to resolve indices of strings in the "names" array. Otherwise we'd have
  // to use 'indexOf' for every name we want to encode.
  readonly #namesToIndex = new Map<string, number>();

  readonly #scopeState = { ...DEFAULT_SCOPE_STATE };
  readonly #rangeState = { ...DEFAULT_RANGE_STATE };
  #encodedItems: string[] = [];
  #currentItem: string = "";

  #scopeToCount = new Map<OriginalScope, number>();
  #scopeCounter = 0;

  constructor(info: ScopeInfo, names: string[]) {
    this.#info = info;
    this.#names = names;

    for (let i = 0; i < names.length; ++i) {
      this.#namesToIndex.set(names[i], i);
    }
  }

  encode(): string {
    this.#encodedItems = [];
    this.#info.scopes.forEach((scope) => {
      this.#scopeState.line = 0;
      this.#scopeState.column = 0;
      this.#encodeOriginalScope(scope);
    });
    this.#info.ranges.forEach((range) => {
      this.#encodeGeneratedRange(range);
    });

    return this.#encodedItems.join(",");
  }

  #encodeOriginalScope(scope: OriginalScope | null): void {
    if (scope === null) {
      this.#encodedItems.push(EncodedTag.EMPTY);
      return;
    }

    this.#encodeOriginalScopeStart(scope);
    this.#encodeOriginalScopeVariables(scope);
    scope.children.forEach((child) => this.#encodeOriginalScope(child));
    this.#encodeOriginalScopeEnd(scope);
  }

  #encodeOriginalScopeStart(scope: OriginalScope) {
    const { line, column } = scope.start;
    this.#verifyPositionWithScopeState(line, column);

    let flags = 0;
    const encodedLine = line - this.#scopeState.line;
    const encodedColumn = encodedLine === 0
      ? column - this.#scopeState.column
      : column;
    this.#scopeState.line = line;
    this.#scopeState.column = column;

    let encodedName: number | undefined;
    if (scope.name !== undefined) {
      flags |= OriginalScopeFlags.HAS_NAME;
      const nameIdx = this.#resolveNamesIdx(scope.name);
      encodedName = nameIdx - this.#scopeState.name;
      this.#scopeState.name = nameIdx;
    }

    let encodedKind: number | undefined;
    if (scope.kind !== undefined) {
      flags |= OriginalScopeFlags.HAS_KIND;
      const kindIdx = this.#resolveNamesIdx(scope.kind);
      encodedKind = kindIdx - this.#scopeState.kind;
      this.#scopeState.kind = kindIdx;
    }

    if (scope.isStackFrame) flags |= OriginalScopeFlags.IS_STACK_FRAME;

    this.#encodeTag(EncodedTag.ORIGINAL_SCOPE_START).#encodeUnsigned(flags)
      .#encodeUnsigned(encodedLine).#encodeUnsigned(encodedColumn);
    if (encodedName !== undefined) this.#encodeSigned(encodedName);
    if (encodedKind !== undefined) this.#encodeSigned(encodedKind);
    this.#finishItem();

    this.#scopeToCount.set(scope, this.#scopeCounter++);
  }

  #encodeOriginalScopeVariables(scope: OriginalScope) {
    if (scope.variables.length === 0) return;

    this.#encodeTag(EncodedTag.ORIGINAL_SCOPE_VARIABLES);

    for (const variable of scope.variables) {
      const idx = this.#resolveNamesIdx(variable);
      this.#encodeSigned(idx - this.#scopeState.variable);
      this.#scopeState.variable = idx;
    }

    this.#finishItem();
  }

  #encodeOriginalScopeEnd(scope: OriginalScope) {
    const { line, column } = scope.end;
    this.#verifyPositionWithScopeState(line, column);

    const encodedLine = line - this.#scopeState.line;
    const encodedColumn = encodedLine === 0
      ? column - this.#scopeState.column
      : column;

    this.#scopeState.line = line;
    this.#scopeState.column = column;

    this.#encodeTag(EncodedTag.ORIGINAL_SCOPE_END).#encodeUnsigned(encodedLine)
      .#encodeUnsigned(encodedColumn).#finishItem();
  }

  #encodeGeneratedRange(range: GeneratedRange): void {
    this.#encodeGeneratedRangeStart(range);
    this.#encodeGeneratedRangeBindings(range);
    this.#encodeGeneratedRangeSubRangeBindings(range);
    this.#encodeGeneratedRangeCallSite(range);
    range.children.forEach((child) => this.#encodeGeneratedRange(child));
    this.#encodeGeneratedRangeEnd(range);
  }

  #encodeGeneratedRangeStart(range: GeneratedRange) {
    const { line, column } = range.start;
    this.#verifyPositionWithRangeState(line, column);

    let flags = 0;
    const encodedLine = line - this.#rangeState.line;
    let encodedColumn = column - this.#rangeState.column;
    if (encodedLine > 0) {
      flags |= GeneratedRangeFlags.HAS_LINE;
      encodedColumn = column;
    }

    this.#rangeState.line = line;
    this.#rangeState.column = column;

    let encodedDefinition;
    if (range.originalScope) {
      const definitionIdx = this.#scopeToCount.get(range.originalScope);
      if (definitionIdx === undefined) {
        throw new Error("Unknown OriginalScope for definition!");
      }

      flags |= GeneratedRangeFlags.HAS_DEFINITION;

      encodedDefinition = definitionIdx - this.#rangeState.defScopeIdx;
      this.#rangeState.defScopeIdx = definitionIdx;
    }

    if (range.isStackFrame) flags |= GeneratedRangeFlags.IS_STACK_FRAME;
    if (range.isHidden) flags |= GeneratedRangeFlags.IS_HIDDEN;

    this.#encodeTag(EncodedTag.GENERATED_RANGE_START).#encodeUnsigned(flags);
    if (encodedLine > 0) this.#encodeUnsigned(encodedLine);
    this.#encodeUnsigned(encodedColumn);
    if (encodedDefinition !== undefined) this.#encodeSigned(encodedDefinition);
    this.#finishItem();
  }

  #encodeGeneratedRangeSubRangeBindings(range: GeneratedRange) {
    if (range.values.length === 0) return;

    for (let i = 0; i < range.values.length; ++i) {
      const value = range.values[i];
      if (!Array.isArray(value) || value.length <= 1) {
        continue;
      }

      this.#encodeTag(EncodedTag.GENERATED_RANGE_SUBRANGE_BINDING)
        .#encodeUnsigned(i);

      let lastLine = range.start.line;
      let lastColumn = range.start.column;
      for (let j = 1; j < value.length; ++j) {
        const subRange = value[j];
        const prevSubRange = value[j - 1];

        if (comparePositions(prevSubRange.to, subRange.from) !== 0) {
          throw new Error("Sub-range bindings must not have gaps");
        }

        const encodedLine = subRange.from.line - lastLine;
        const encodedColumn = encodedLine === 0
          ? subRange.from.column - lastColumn
          : subRange.from.column;
        if (encodedLine < 0 || encodedColumn < 0) {
          throw new Error("Sub-range bindings must be sorted");
        }

        lastLine = subRange.from.line;
        lastColumn = subRange.from.column;

        const binding = subRange.value === undefined
          ? 0
          : this.#resolveNamesIdx(subRange.value) + 1;
        this.#encodeUnsigned(binding).#encodeUnsigned(encodedLine)
          .#encodeUnsigned(encodedColumn);
      }
      this.#finishItem();
    }
  }

  #encodeGeneratedRangeBindings(range: GeneratedRange) {
    if (range.values.length === 0) return;

    if (!range.originalScope) {
      throw new Error("Range has binding expressions but no OriginalScope");
    } else if (range.originalScope.variables.length !== range.values.length) {
      throw new Error(
        "Range's binding expressions don't match OriginalScopes' variables",
      );
    }

    this.#encodeTag(EncodedTag.GENERATED_RANGE_BINDINGS);
    for (const val of range.values) {
      if (val === null || val === undefined) {
        this.#encodeUnsigned(0);
      } else if (typeof val === "string") {
        this.#encodeUnsigned(this.#resolveNamesIdx(val) + 1);
      } else {
        const initialValue = val[0];
        const binding = initialValue.value === undefined
          ? 0
          : this.#resolveNamesIdx(initialValue.value) + 1;
        this.#encodeUnsigned(binding);
      }
    }
    this.#finishItem();
  }

  #encodeGeneratedRangeCallSite(range: GeneratedRange) {
    if (!range.callSite) return;
    const { sourceIndex, line, column } = range.callSite;

    // TODO: Throw if stackFrame flag is set or OriginalScope index is invalid or no generated range is here.

    this.#encodeTag(EncodedTag.GENERATED_RANGE_CALL_SITE).#encodeUnsigned(
      sourceIndex,
    ).#encodeUnsigned(line).#encodeUnsigned(column).#finishItem();
  }

  #encodeGeneratedRangeEnd(range: GeneratedRange) {
    const { line, column } = range.end;
    this.#verifyPositionWithRangeState(line, column);

    let flags = 0;
    const encodedLine = line - this.#rangeState.line;
    let encodedColumn = column - this.#rangeState.column;
    if (encodedLine > 0) {
      flags |= GeneratedRangeFlags.HAS_LINE;
      encodedColumn = column;
    }

    this.#rangeState.line = line;
    this.#rangeState.column = column;

    this.#encodeTag(EncodedTag.GENERATED_RANGE_END);
    if (encodedLine > 0) this.#encodeUnsigned(encodedLine);
    this.#encodeUnsigned(encodedColumn).#finishItem();
  }

  #resolveNamesIdx(name: string): number {
    const index = this.#namesToIndex.get(name);
    if (index !== undefined) return index;

    const addedIndex = this.#names.length;
    this.#names.push(name);
    this.#namesToIndex.set(name, addedIndex);
    return addedIndex;
  }

  #verifyPositionWithScopeState(line: number, column: number) {
    if (
      this.#scopeState.line > line ||
      (this.#scopeState.line === line && this.#scopeState.column > column)
    ) {
      throw new Error(
        `Attempting to encode scope item (${line}, ${column}) that precedes the last encoded scope item (${this.#scopeState.line}, ${this.#scopeState.column})`,
      );
    }
  }

  #verifyPositionWithRangeState(line: number, column: number) {
    if (
      this.#rangeState.line > line ||
      (this.#rangeState.line === line && this.#rangeState.column > column)
    ) {
      throw new Error(
        `Attempting to encode range item that precedes the last encoded range item (${line}, ${column})`,
      );
    }
  }

  #encodeTag(tag: EncodedTag): this {
    this.#currentItem += tag;
    return this;
  }

  #encodeSigned(n: number): this {
    this.#currentItem += encodeSigned(n);
    return this;
  }

  #encodeUnsigned(n: number): this {
    this.#currentItem += encodeUnsigned(n);
    return this;
  }

  #finishItem(): void {
    this.#encodedItems.push(this.#currentItem);
    this.#currentItem = "";
  }
}
