// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { comparePositions } from "../util.js";
import { ScopeInfoBuilder } from "./builder.js";
/**
 * Similar to `ScopeInfoBuilder`, but with checks that scopes/ranges are well
 * nested and don't partially overlap.
 */ export class SafeScopeInfoBuilder extends ScopeInfoBuilder {
  addNullScope() {
    this.#verifyEmptyScopeStack("add null scope");
    this.#verifyEmptyRangeStack("add null scope");
    super.addNullScope();
    return this;
  }
  startScope(line, column, options) {
    this.#verifyEmptyRangeStack("start scope");
    const parent = this.scopeStack.at(-1);
    if (parent && comparePositions(parent.start, {
      line,
      column
    }) > 0) {
      throw new Error(`Scope start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`);
    }
    const precedingSibling = parent?.children.at(-1);
    if (precedingSibling && comparePositions(precedingSibling.end, {
      line,
      column
    }) > 0) {
      throw new Error(`Scope start (${line}, ${column}) must not precede preceding siblings' end (${(precedingSibling.end.line, precedingSibling.end.column)})`);
    }
    super.startScope(line, column, options);
    return this;
  }
  setScopeName(name) {
    this.#verifyScopePresent("setScopeName");
    this.#verifyEmptyRangeStack("setScopeName");
    super.setScopeName(name);
    return this;
  }
  setScopeKind(kind) {
    this.#verifyScopePresent("setScopeKind");
    this.#verifyEmptyRangeStack("setScopeKind");
    super.setScopeKind(kind);
    return this;
  }
  setScopeStackFrame(isStackFrame) {
    this.#verifyScopePresent("setScopeStackFrame");
    this.#verifyEmptyRangeStack("setScopeStackFrame");
    super.setScopeStackFrame(isStackFrame);
    return this;
  }
  setScopeVariables(variables) {
    this.#verifyScopePresent("setScopeVariables");
    this.#verifyEmptyRangeStack("setScopeVariables");
    super.setScopeVariables(variables);
    return this;
  }
  endScope(line, column) {
    this.#verifyEmptyRangeStack("end scope");
    if (this.scopeStack.length === 0) {
      throw new Error("No scope to end");
    }
    const scope = this.scopeStack.at(-1);
    if (comparePositions(scope.start, {
      line,
      column
    }) > 0) {
      throw new Error(`Scope end (${line}, ${column}) must not precede scope start (${scope.start.line}, ${scope.start.column})`);
    }
    super.endScope(line, column);
    return this;
  }
  startRange(line, column, options) {
    this.#verifyEmptyScopeStack("starRange");
    const parent = this.rangeStack.at(-1);
    if (parent && comparePositions(parent.start, {
      line,
      column
    }) > 0) {
      throw new Error(`Range start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`);
    }
    const precedingSibling = parent?.children.at(-1);
    if (precedingSibling && comparePositions(precedingSibling.end, {
      line,
      column
    }) > 0) {
      throw new Error(`Range start (${line}, ${column}) must not precede preceding siblings' end (${(precedingSibling.end.line, precedingSibling.end.column)})`);
    }
    if (options?.scopeKey !== undefined && !this.isValidScopeKey(options.scopeKey)) {
      throw new Error(`${options.scopeKey} does not reference a valid OriginalScope`);
    }
    if (options?.scope && !this.isKnownScope(options.scope)) {
      throw new Error("The provided definition scope was not produced by this builder!");
    }
    if (options?.values?.length && options?.scope === undefined && options?.scopeKey === undefined) {
      throw new Error("Provided bindings without providing an OriginalScope");
    } else if (options?.values?.length && options?.scope && options.values.length !== options.scope.variables.length) {
      throw new Error("Provided bindings don't match up with OriginalScope.variables");
    } else if (options?.values?.length && options?.scopeKey !== undefined) {
      const scope = this.getScopeByValidKey(options.scopeKey);
      if (options.values.length !== scope.variables.length) {
        throw new Error("Provided bindings don't match up with OriginalScope.variables");
      }
    }
    super.startRange(line, column, options);
    return this;
  }
  setRangeDefinitionScope(scope) {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");
    if (!this.isKnownScope(scope)) {
      throw new Error("The provided definition scope was not produced by this builder!");
    }
    super.setRangeDefinitionScope(scope);
    return this;
  }
  setRangeDefinitionScopeKey(scopeKey) {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");
    if (!this.isValidScopeKey(scopeKey)) {
      throw new Error(`The provided scope key ${scopeKey} is not know nto the builder!`);
    }
    super.setRangeDefinitionScopeKey(scopeKey);
    return this;
  }
  setRangeStackFrame(isStackFrame) {
    this.#verifyEmptyScopeStack("setRangeStackFrame");
    this.#verifyRangePresent("setRangeStackFrame");
    super.setRangeStackFrame(isStackFrame);
    return this;
  }
  setRangeHidden(isHidden) {
    this.#verifyEmptyScopeStack("setRangeHidden");
    this.#verifyRangePresent("setRangeHidden");
    super.setRangeHidden(isHidden);
    return this;
  }
  setRangeValues(values) {
    this.#verifyEmptyScopeStack("setRangeValues");
    this.#verifyRangePresent("setRangeValues");
    const range = this.rangeStack.at(-1);
    if (!range.originalScope) {
      throw new Error("Setting an OriginalScope for a range is required before value bindings can be provided!");
    } else if (range.originalScope.variables.length !== values.length) {
      throw new Error("Provided bindings don't match up with OriginalScope.variables");
    }
    super.setRangeValues(values);
    return this;
  }
  setRangeCallSite(callSite) {
    this.#verifyEmptyScopeStack("setRangeCallSite");
    this.#verifyRangePresent("setRangeCallSite");
    super.setRangeCallSite(callSite);
    return this;
  }
  endRange(line, column) {
    this.#verifyEmptyScopeStack("endRange");
    if (this.rangeStack.length === 0) {
      throw new Error("No range to end");
    }
    const range = this.rangeStack.at(-1);
    if (comparePositions(range.start, {
      line,
      column
    }) > 0) {
      throw new Error(`Range end (${line}, ${column}) must not precede range start (${range.start.line}, ${range.start.column})`);
    }
    super.endRange(line, column);
    return this;
  }
  build() {
    if (this.scopeStack.length > 0) {
      throw new Error("Can't build ScopeInfo while an OriginalScope is unclosed.");
    }
    this.#verifyEmptyRangeStack("build ScopeInfo");
    return super.build();
  }
  #verifyEmptyScopeStack(op) {
    if (this.scopeStack.length > 0) {
      throw new Error(`Can't ${op} while a OriginalScope is unclosed.`);
    }
  }
  #verifyEmptyRangeStack(op) {
    if (this.rangeStack.length > 0) {
      throw new Error(`Can't ${op} while a GeneratedRange is unclosed.`);
    }
  }
  #verifyScopePresent(op) {
    if (this.scopeStack.length === 0) {
      throw new Error(`Can't ${op} while no OriginalScope is on the stack.`);
    }
  }
  #verifyRangePresent(op) {
    if (this.rangeStack.length === 0) {
      throw new Error(`Can't ${op} while no GeneratedRange is on the stack.`);
    }
  }
}
//# sourceMappingURL=safe_builder.js.map