import type { Binding, OriginalPosition, OriginalScope, ScopeInfo } from "../scopes.js";
import { ScopeInfoBuilder, type ScopeKey } from "./builder.js";
/**
 * Similar to `ScopeInfoBuilder`, but with checks that scopes/ranges are well
 * nested and don't partially overlap.
 */ export declare class SafeScopeInfoBuilder extends ScopeInfoBuilder {
  override addNullScope(): this;
  override startScope(line: number, column: number, options?: {
    name?: string;
    kind?: string;
    isStackFrame?: boolean;
    variables?: string[];
    key?: ScopeKey;
  }): this;
  override setScopeName(name: string): this;
  override setScopeKind(kind: string): this;
  override setScopeStackFrame(isStackFrame: boolean): this;
  override setScopeVariables(variables: string[]): this;
  override endScope(line: number, column: number): this;
  override startRange(line: number, column: number, options?: {
    scope?: OriginalScope;
    scopeKey?: ScopeKey;
    isStackFrame?: boolean;
    isHidden?: boolean;
    values?: Binding[];
    callSite?: OriginalPosition;
  }): this;
  override setRangeDefinitionScope(scope: OriginalScope): this;
  override setRangeDefinitionScopeKey(scopeKey: ScopeKey): this;
  override setRangeStackFrame(isStackFrame: boolean): this;
  override setRangeHidden(isHidden: boolean): this;
  override setRangeValues(values: Binding[]): this;
  override setRangeCallSite(callSite: OriginalPosition): this;
  override endRange(line: number, column: number): this;
  override build(): ScopeInfo;
}
//# sourceMappingURL=safe_builder.d.ts.map