// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface EmbindObject {
  new(): this;
  delete(): void;
}

export interface Vector<T> extends EmbindObject {
  size(): number;
  get(index: number): T;
  push_back(value: T): void;
}

export interface ErrorCode extends EmbindObject {}

export interface Error extends EmbindObject {
  code: ErrorCode;
  message: string;
}

export interface RawLocationRange extends EmbindObject {
  rawModuleId: string;
  startOffset: number;
  endOffset: number;
}

export interface RawLocation extends EmbindObject {
  rawModuleId: string;
  codeOffset: number;
  inlineFrameIndex: number;
}

export interface SourceLocation extends EmbindObject {
  rawModuleId: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
}

export interface VariableScope extends EmbindObject {}

export interface Variable extends EmbindObject {
  scope: VariableScope;
  name: string;
  type: string;
  typedefs: Vector<string>;
}

export interface FieldInfo extends EmbindObject {
  name: string|undefined;
  offset: number;
  typeId: string;
}

export interface Enumerator extends EmbindObject {
  name: string;
  value: bigint;
  typeId: string;
}

export interface TypeInfo extends EmbindObject {
  typeNames: Vector<string>;
  typeId: string;
  alignment: number;
  size: number;
  canExpand: boolean;
  hasValue: boolean;
  arraySize: number|undefined;
  isPointer: boolean;
  members: Vector<FieldInfo>;
  enumerators: Vector<Enumerator>;
}

export interface AddRawModuleResponse extends EmbindObject {
  sources: Vector<string>;
  dwos: Vector<string>;
  error: Error|undefined;
}

export interface SourceLocationToRawLocationResponse extends EmbindObject {
  rawLocationRanges: Vector<RawLocationRange>;
  error: Error|undefined;
}

export interface RawLocationToSourceLocationResponse extends EmbindObject {
  sourceLocation: Vector<SourceLocation>;
  error: Error|undefined;
}

export interface ListVariablesInScopeResponse extends EmbindObject {
  variable: Vector<Variable>;
  error: Error|undefined;
}

export interface GetFunctionInfoResponse extends EmbindObject {
  functionNames: Vector<string>;
  missingSymbolFiles: Vector<string>;
  error: Error|undefined;
}

export interface GetInlinedFunctionRangesResponse extends EmbindObject {
  rawLocationRanges: Vector<RawLocationRange>;
  error: Error|undefined;
}

export interface GetInlinedCalleesRangesResponse extends EmbindObject {
  rawLocationRanges: Vector<RawLocationRange>;
  error: Error|undefined;
}

export interface GetMappedLinesResponse extends EmbindObject {
  MappedLines: Vector<number>;
  error: Error|undefined;
}

export interface EvaluateExpressionResponse extends EmbindObject {
  typeInfos: Vector<TypeInfo>;
  root: TypeInfo;
  displayValue: string|undefined;
  location: number|undefined;
  memoryAddress: number|undefined;
  data: Vector<number>|undefined;
  error: Error|undefined;
}

export interface DWARFSymbolsPlugin extends EmbindObject {
  AddRawModule(rawModuleId: string, path: string): AddRawModuleResponse;
  RemoveRawModule(rawModuleId: string): void;
  SourceLocationToRawLocation(rawModuleId: string, sourceFileURL: string, lineNumber: number, columnNumber: number):
      SourceLocationToRawLocationResponse;
  RawLocationToSourceLocation(rawModuleId: string, codeOffset: number, inlineFrameIndex: number):
      RawLocationToSourceLocationResponse;
  ListVariablesInScope(rawModuleId: string, codeOffset: number, inlineFrameIndex: number): ListVariablesInScopeResponse;
  GetFunctionInfo(rawModuleId: string, codeOffset: number): GetFunctionInfoResponse;
  GetInlinedFunctionRanges(rawModuleId: string, codeOffset: number): GetInlinedFunctionRangesResponse;
  GetInlinedCalleesRanges(rawModuleId: string, codeOffset: number): GetInlinedCalleesRangesResponse;
  GetMappedLines(rawModuleId: string, sourceFileURL: string): GetMappedLinesResponse;
  EvaluateExpression(location: RawLocation, expression: string, debugProxy: unknown): EvaluateExpressionResponse;
}

export interface Module extends EmscriptenModule {
  FS: typeof FS;
  DWARFSymbolsPlugin: DWARFSymbolsPlugin;
  StringArray: Vector<string>;
  RawLocationRangeArray: Vector<RawLocationRange>;
  SourceLocationArray: Vector<SourceLocation>;
  VariableArray: Vector<Variable>;
  Int32_TArray: Vector<number>;
  TypeInfoArray: Vector<TypeInfo>;
  FieldInfoArray: Vector<FieldInfo>;
  EnumeratorArray: Vector<Enumerator>;
  ErrorCode:
      {INTERNAL_ERROR: ErrorCode; PROTOCOL_ERROR: ErrorCode; MODULE_NOT_FOUND_ERROR: ErrorCode; EVAL_ERROR: ErrorCode;};
  Error: Error;
  RawLocationRange: RawLocationRange;
  RawLocation: RawLocation;
  SourceLocation: SourceLocation;
  VariableScope: {LOCAL: VariableScope; PARAMETER: VariableScope; GLOBAL: VariableScope;};
  Variable: Variable;
  FieldInfo: FieldInfo;
  Enumerator: Enumerator;
  TypeInfo: TypeInfo;
  AddRawModuleResponse: AddRawModuleResponse;
  SourceLocationToRawLocationResponse: SourceLocationToRawLocationResponse;
  RawLocationToSourceLocationResponse: RawLocationToSourceLocationResponse;
  ListVariablesInScopeResponse: ListVariablesInScopeResponse;
  GetFunctionInfoResponse: GetFunctionInfoResponse;
  GetInlinedFunctionRangesResponse: GetInlinedFunctionRangesResponse;
  GetInlinedCalleesRangesResponse: GetInlinedCalleesRangesResponse;
  GetMappedLinesResponse: GetMappedLinesResponse;
  EvaluateExpressionResponse: EvaluateExpressionResponse;
}

declare var createSymbolsBackend: EmscriptenModuleFactory<Module>;
export default createSymbolsBackend;
