// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {
  Binding,
  OriginalPosition,
  OriginalScope,
  Position,
  ScopeInfo,
} from "../scopes.ts";
import { comparePositions } from "../util.js";
import { ScopeInfoBuilder, type ScopeKey } from "./builder.js";

/**
 * Similar to `ScopeInfoBuilder`, but with checks that scopes/ranges are well
 * nested and don't partially overlap.
 */
export class SafeScopeInfoBuilder extends ScopeInfoBuilder {
  override addNullScope(): this {
    this.#verifyEmptyScopeStack("add null scope");
    this.#verifyEmptyRangeStack("add null scope");

    super.addNullScope();
    return this;
  }

  override startScope(
    line: number,
    column: number,
    options?: {
      name?: string;
      kind?: string;
      isStackFrame?: boolean;
      variables?: string[];
      key?: ScopeKey;
    },
  ): this {
    this.#verifyEmptyRangeStack("start scope");

    const parent = this.scopeStack.at(-1);

    if (parent && comparePositions(parent.start, { line, column }) > 0) {
      throw new Error(
        `Scope start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`,
      );
    }

    const precedingSibling = parent?.children.at(-1);
    if (
      precedingSibling &&
      comparePositions(precedingSibling.end, { line, column }) > 0
    ) {
      throw new Error(
        `Scope start (${line}, ${column}) must not precede preceding siblings' end (${precedingSibling
          .end.line,
          precedingSibling.end.column})`,
      );
    }

    super.startScope(line, column, options);
    return this;
  }

  override setScopeName(name: string): this {
    this.#verifyScopePresent("setScopeName");
    this.#verifyEmptyRangeStack("setScopeName");

    super.setScopeName(name);
    return this;
  }

  override setScopeKind(kind: string): this {
    this.#verifyScopePresent("setScopeKind");
    this.#verifyEmptyRangeStack("setScopeKind");

    super.setScopeKind(kind);
    return this;
  }

  override setScopeStackFrame(isStackFrame: boolean): this {
    this.#verifyScopePresent("setScopeStackFrame");
    this.#verifyEmptyRangeStack("setScopeStackFrame");

    super.setScopeStackFrame(isStackFrame);
    return this;
  }

  override setScopeVariables(variables: string[]): this {
    this.#verifyScopePresent("setScopeVariables");
    this.#verifyEmptyRangeStack("setScopeVariables");

    super.setScopeVariables(variables);
    return this;
  }

  override endScope(line: number, column: number): this {
    this.#verifyEmptyRangeStack("end scope");

    if (this.scopeStack.length === 0) {
      throw new Error("No scope to end");
    }

    const scope = this.scopeStack.at(-1) as OriginalScope;
    if (comparePositions(scope.start, { line, column }) > 0) {
      throw new Error(
        `Scope end (${line}, ${column}) must not precede scope start (${scope.start.line}, ${scope.start.column})`,
      );
    }

    super.endScope(line, column);
    return this;
  }

  override startRange(
    line: number,
    column: number,
    options?: {
      scope?: OriginalScope;
      scopeKey?: ScopeKey;
      isStackFrame?: boolean;
      isHidden?: boolean;
      values?: Binding[];
      callSite?: OriginalPosition;
    },
  ): this {
    this.#verifyEmptyScopeStack("starRange");

    const parent = this.rangeStack.at(-1);
    if (parent && comparePositions(parent.start, { line, column }) > 0) {
      throw new Error(
        `Range start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`,
      );
    }

    const precedingSibling = parent?.children.at(-1);
    if (
      precedingSibling &&
      comparePositions(precedingSibling.end, { line, column }) > 0
    ) {
      throw new Error(
        `Range start (${line}, ${column}) must not precede preceding siblings' end (${precedingSibling
          .end.line,
          precedingSibling.end.column})`,
      );
    }

    if (
      options?.scopeKey !== undefined &&
      !this.isValidScopeKey(options.scopeKey)
    ) {
      throw new Error(
        `${options.scopeKey} does not reference a valid OriginalScope`,
      );
    }
    if (options?.scope && !this.isKnownScope(options.scope)) {
      throw new Error(
        "The provided definition scope was not produced by this builder!",
      );
    }

    if (
      options?.values?.length && options?.scope === undefined &&
      options?.scopeKey === undefined
    ) {
      throw new Error("Provided bindings without providing an OriginalScope");
    } else if (
      options?.values?.length && options?.scope &&
      options.values.length !== options.scope.variables.length
    ) {
      throw new Error(
        "Provided bindings don't match up with OriginalScope.variables",
      );
    } else if (options?.values?.length && options?.scopeKey !== undefined) {
      const scope = this.getScopeByValidKey(options.scopeKey);
      if (options.values.length !== scope.variables.length) {
        throw new Error(
          "Provided bindings don't match up with OriginalScope.variables",
        );
      }
    }

    super.startRange(line, column, options);
    return this;
  }

  override setRangeDefinitionScope(scope: OriginalScope): this {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");

    if (!this.isKnownScope(scope)) {
      throw new Error(
        "The provided definition scope was not produced by this builder!",
      );
    }

    super.setRangeDefinitionScope(scope);
    return this;
  }

  override setRangeDefinitionScopeKey(scopeKey: ScopeKey): this {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");

    if (!this.isValidScopeKey(scopeKey)) {
      throw new Error(
        `The provided scope key ${scopeKey} is not know nto the builder!`,
      );
    }

    super.setRangeDefinitionScopeKey(scopeKey);
    return this;
  }

  override setRangeStackFrame(isStackFrame: boolean): this {
    this.#verifyEmptyScopeStack("setRangeStackFrame");
    this.#verifyRangePresent("setRangeStackFrame");

    super.setRangeStackFrame(isStackFrame);
    return this;
  }

  override setRangeHidden(isHidden: boolean): this {
    this.#verifyEmptyScopeStack("setRangeHidden");
    this.#verifyRangePresent("setRangeHidden");

    super.setRangeHidden(isHidden);
    return this;
  }

  override setRangeValues(values: Binding[]): this {
    this.#verifyEmptyScopeStack("setRangeValues");
    this.#verifyRangePresent("setRangeValues");

    const range = this.rangeStack.at(-1)!;
    if (!range.originalScope) {
      throw new Error(
        "Setting an OriginalScope for a range is required before value bindings can be provided!",
      );
    } else if (range.originalScope.variables.length !== values.length) {
      throw new Error(
        "Provided bindings don't match up with OriginalScope.variables",
      );
    }

    super.setRangeValues(values);
    return this;
  }

  override setRangeCallSite(callSite: OriginalPosition): this {
    this.#verifyEmptyScopeStack("setRangeCallSite");
    this.#verifyRangePresent("setRangeCallSite");

    super.setRangeCallSite(callSite);
    return this;
  }

  override endRange(line: number, column: number): this {
    this.#verifyEmptyScopeStack("endRange");

    if (this.rangeStack.length === 0) {
      throw new Error("No range to end");
    }

    const range = this.rangeStack.at(-1)!;
    if (comparePositions(range.start, { line, column }) > 0) {
      throw new Error(
        `Range end (${line}, ${column}) must not precede range start (${range.start.line}, ${range.start.column})`,
      );
    }

    this.#verifyRangeValues(range, { line, column });
    super.endRange(line, column);
    return this;
  }

  override build(): ScopeInfo {
    if (this.scopeStack.length > 0) {
      throw new Error(
        "Can't build ScopeInfo while an OriginalScope is unclosed.",
      );
    }
    this.#verifyEmptyRangeStack("build ScopeInfo");

    return super.build();
  }

  #verifyEmptyScopeStack(op: string): void {
    if (this.scopeStack.length > 0) {
      throw new Error(`Can't ${op} while a OriginalScope is unclosed.`);
    }
  }

  #verifyEmptyRangeStack(op: string): void {
    if (this.rangeStack.length > 0) {
      throw new Error(`Can't ${op} while a GeneratedRange is unclosed.`);
    }
  }

  #verifyScopePresent(op: string): void {
    if (this.scopeStack.length === 0) {
      throw new Error(`Can't ${op} while no OriginalScope is on the stack.`);
    }
  }

  #verifyRangePresent(op: string): void {
    if (this.rangeStack.length === 0) {
      throw new Error(`Can't ${op} while no GeneratedRange is on the stack.`);
    }
  }

  #verifyRangeValues(
    range: { start: Position; values: Binding[] },
    end: Position,
  ): void {
    for (const value of range.values) {
      if (!Array.isArray(value)) {
        continue;
      }

      const subRanges = value;
      if (subRanges.length === 0) {
        continue;
      }

      const first = subRanges.at(0)!;
      if (comparePositions(first.from, range.start) !== 0) {
        throw new Error(
          `Sub-range bindings must start at the generated range's start. Expected ${range.start.line}:${range.start.column}, but got ${first.from.line}:${first.from.column}`,
        );
      }

      const last = subRanges.at(-1)!;
      if (comparePositions(last.to, end) !== 0) {
        throw new Error(
          `Sub-range bindings must end at the generated range's end. Expected ${end.line}:${end.column}, but got ${last.to.line}:${last.to.column}`,
        );
      }

      for (let i = 0; i < subRanges.length; ++i) {
        const current = subRanges[i];
        if (comparePositions(current.from, current.to) >= 0) {
          throw new Error(
            `Sub-range binding 'from' (${current.from.line}:${current.from.column}) must precede 'to' (${current.to.line}:${current.to.column})`,
          );
        }

        if (i > 0) {
          const prev = subRanges[i - 1];
          if (comparePositions(prev.to, current.from) !== 0) {
            throw new Error(
              `Sub-range bindings must be sorted and not overlap. Found gap between ${prev.to.line}:${prev.to.column} and ${current.from.line}:${current.from.column}`,
            );
          }
        }
      }
    }
  }
}
