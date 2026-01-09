// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {
  Binding,
  GeneratedRange,
  OriginalPosition,
  OriginalScope,
  ScopeInfo,
} from "../scopes.ts";

/**
 * Small utility class to build scope and range trees.
 *
 * This class allows construction of scope/range trees that will be rejected by the encoder.
 * Use this class if you guarantee proper nesting yourself and don't want to pay for the
 * checks, otherwise use the `SafeScopeInfoBuilder`.
 *
 * This class will also silently ignore calls that would fail otherwise. E.g. calling
 * `end*` without a matching `start*`.
 */
export class ScopeInfoBuilder {
  #scopes: (OriginalScope | null)[] = [];
  #ranges: GeneratedRange[] = [];

  #scopeStack: OriginalScope[] = [];
  #rangeStack: GeneratedRange[] = [];

  #knownScopes = new Set<OriginalScope>();
  #keyToScope = new Map<ScopeKey, OriginalScope>();
  #lastScope: OriginalScope | null = null;

  addNullScope(): this {
    this.#scopes.push(null);
    return this;
  }

  startScope(
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
    const scope: OriginalScope = {
      start: { line, column },
      end: { line, column },
      variables: options?.variables?.slice(0) ?? [],
      children: [],
      isStackFrame: Boolean(options?.isStackFrame),
    };

    if (options?.name !== undefined) scope.name = options.name;
    if (options?.kind !== undefined) scope.kind = options.kind;

    if (this.#scopeStack.length > 0) {
      scope.parent = this.#scopeStack.at(-1);
    }
    this.#scopeStack.push(scope);
    this.#knownScopes.add(scope);
    if (options?.key !== undefined) this.#keyToScope.set(options.key, scope);

    return this;
  }

  setScopeName(name: string): this {
    const scope = this.#scopeStack.at(-1);
    if (scope) scope.name = name;
    return this;
  }

  setScopeKind(kind: string): this {
    const scope = this.#scopeStack.at(-1);
    if (scope) scope.kind = kind;
    return this;
  }

  setScopeStackFrame(isStackFrame: boolean): this {
    const scope = this.#scopeStack.at(-1);
    if (scope) scope.isStackFrame = isStackFrame;
    return this;
  }

  setScopeVariables(variables: string[]): this {
    const scope = this.#scopeStack.at(-1);
    if (scope) scope.variables = variables.slice(0);

    return this;
  }

  endScope(line: number, column: number): this {
    const scope = this.#scopeStack.pop();
    if (!scope) return this;

    scope.end = { line, column };

    if (this.#scopeStack.length === 0) {
      this.#scopes.push(scope);
    } else {
      this.#scopeStack.at(-1)!.children.push(scope);
    }
    this.#lastScope = scope;

    return this;
  }

  /**
   * @returns The OriginalScope opened with the most recent `startScope` call, but not yet closed.
   */
  currentScope(): OriginalScope | null {
    return this.#scopeStack.at(-1) ?? null;
  }

  /**
   * @returns The most recent OriginalScope closed with `endScope`.
   */
  lastScope(): OriginalScope | null {
    return this.#lastScope;
  }

  /**
   * @param option The definition 'scope' of this range can either be the "OriginalScope" directly
   * (produced by this builder) or the scope's key set while building the scope.
   */
  startRange(
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
    const range: GeneratedRange = {
      start: { line, column },
      end: { line, column },
      isStackFrame: Boolean(options?.isStackFrame),
      isHidden: Boolean(options?.isHidden),
      values: options?.values ?? [],
      children: [],
    };

    if (this.#rangeStack.length > 0) {
      range.parent = this.#rangeStack.at(-1);
    }

    if (options?.scope !== undefined) {
      range.originalScope = options.scope;
    } else if (options?.scopeKey !== undefined) {
      range.originalScope = this.#keyToScope.get(options.scopeKey);
    }

    if (options?.callSite) {
      range.callSite = options.callSite;
    }

    this.#rangeStack.push(range);

    return this;
  }

  setRangeDefinitionScope(scope: OriginalScope): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.originalScope = scope;
    return this;
  }

  setRangeDefinitionScopeKey(scopeKey: ScopeKey): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.originalScope = this.#keyToScope.get(scopeKey);
    return this;
  }

  setRangeStackFrame(isStackFrame: boolean): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.isStackFrame = isStackFrame;

    return this;
  }

  setRangeHidden(isHidden: boolean): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.isHidden = isHidden;

    return this;
  }

  setRangeValues(values: Binding[]): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.values = values;

    return this;
  }

  setRangeCallSite(callSite: OriginalPosition): this {
    const range = this.#rangeStack.at(-1);
    if (range) range.callSite = callSite;

    return this;
  }

  endRange(line: number, column: number): this {
    const range = this.#rangeStack.pop();
    if (!range) return this;

    range.end = { line, column };

    if (this.#rangeStack.length === 0) {
      this.#ranges.push(range);
    } else {
      this.#rangeStack.at(-1)!.children.push(range);
    }

    return this;
  }

  build(): ScopeInfo {
    const info: ScopeInfo = { scopes: this.#scopes, ranges: this.#ranges };

    this.#scopes = [];
    this.#ranges = [];
    this.#knownScopes.clear();

    return info;
  }

  protected get scopeStack(): ReadonlyArray<OriginalScope> {
    return this.#scopeStack;
  }

  protected get rangeStack(): ReadonlyArray<GeneratedRange> {
    return this.#rangeStack;
  }

  protected isKnownScope(scope: OriginalScope): boolean {
    return this.#knownScopes.has(scope);
  }

  protected isValidScopeKey(key: ScopeKey): boolean {
    return this.#keyToScope.has(key);
  }

  protected getScopeByValidKey(key: ScopeKey): OriginalScope {
    return this.#keyToScope.get(key)!;
  }
}

/**
 * Users of the {@link ScopeInfoBuilder} can provide their own keys to uniquely identify a scope,
 * and use the key later when building the corresponding range to connect them.
 *
 * The only requirement for ScopeKey is that it can be used as a key in a `Map`.
 */
export type ScopeKey = unknown;
