/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  BinaryReader,
  BinaryReaderState,
  bytesToString,
  ElementMode,
  ExternalKind,
  IDataSegmentBody,
  IElementSegment,
  IElementSegmentBody,
  IEventNameEntry,
  IEventType,
  IExportEntry,
  IFieldNameEntry,
  IFunctionEntry,
  IFunctionInformation,
  IFunctionNameEntry,
  IGlobalNameEntry,
  IGlobalType,
  IGlobalVariable,
  IImportEntry,
  ILocalNameEntry,
  IMemoryAddress,
  IMemoryNameEntry,
  IMemoryType,
  INameEntry,
  Int64,
  IOperatorInformation,
  IResizableLimits,
  ISectionInformation,
  IStartEntry,
  ITableNameEntry,
  ITableType,
  ITypeEntry,
  ITypeNameEntry,
  NameType,
  OperatorCode,
  OperatorCodeNames,
  SectionCode,
  Type,
  TypeKind,
} from "./WasmParser.js";

const NAME_SECTION_NAME = "name";
const INVALID_NAME_SYMBOLS_REGEX = /[^0-9A-Za-z!#$%&'*+.:<=>?@^_`|~\/\-]/;
const INVALID_NAME_SYMBOLS_REGEX_GLOBAL = new RegExp(
  INVALID_NAME_SYMBOLS_REGEX.source,
  "g"
);

function formatFloat32(n: number): string {
  if (n === 0) return 1 / n < 0 ? "-0.0" : "0.0";
  if (isFinite(n)) return n.toString();
  if (!isNaN(n)) return n < 0 ? "-inf" : "inf";
  var view = new DataView(new ArrayBuffer(8));
  view.setFloat32(0, n, true);
  var data = view.getInt32(0, true);
  var payload = data & 0x7fffff;
  const canonicalBits = 4194304; // 0x800..0
  if (data > 0 && payload === canonicalBits) return "nan";
  // canonical NaN;
  else if (payload === canonicalBits) return "-nan";
  return (data < 0 ? "-" : "+") + "nan:0x" + payload.toString(16);
}

function formatFloat64(n: number): string {
  if (n === 0) return 1 / n < 0 ? "-0.0" : "0.0";
  if (isFinite(n)) return n.toString();
  if (!isNaN(n)) return n < 0 ? "-inf" : "inf";
  var view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, n, true);
  var data1 = view.getUint32(0, true);
  var data2 = view.getInt32(4, true);
  var payload = data1 + (data2 & 0xfffff) * 4294967296;
  const canonicalBits = 524288 * 4294967296; // 0x800..0
  if (data2 > 0 && payload === canonicalBits) return "nan";
  // canonical NaN;
  else if (payload === canonicalBits) return "-nan";
  return (data2 < 0 ? "-" : "+") + "nan:0x" + payload.toString(16);
}

function formatI32Array(bytes, count) {
  var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var result = [];
  for (var i = 0; i < count; i++)
    result.push(`0x${formatHex(dv.getInt32(i << 2, true), 8)}`);
  return result.join(" ");
}

function formatI8Array(bytes, count) {
  var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var result = [];
  for (var i = 0; i < count; i++) result.push(`${dv.getInt8(i)}`);
  return result.join(" ");
}

function memoryAddressToString(
  address: IMemoryAddress,
  code: OperatorCode
): string {
  var defaultAlignFlags;
  switch (code) {
    case OperatorCode.v128_load:
    case OperatorCode.i16x8_load8x8_s:
    case OperatorCode.i16x8_load8x8_u:
    case OperatorCode.i32x4_load16x4_s:
    case OperatorCode.i32x4_load16x4_u:
    case OperatorCode.i64x2_load32x2_s:
    case OperatorCode.i64x2_load32x2_u:
    case OperatorCode.v8x16_load_splat:
    case OperatorCode.v16x8_load_splat:
    case OperatorCode.v32x4_load_splat:
    case OperatorCode.v64x2_load_splat:
    case OperatorCode.v128_store:
      defaultAlignFlags = 4;
      break;
    case OperatorCode.i64_load:
    case OperatorCode.i64_store:
    case OperatorCode.f64_load:
    case OperatorCode.f64_store:
    case OperatorCode.i64_atomic_wait:
    case OperatorCode.i64_atomic_load:
    case OperatorCode.i64_atomic_store:
    case OperatorCode.i64_atomic_rmw_add:
    case OperatorCode.i64_atomic_rmw_sub:
    case OperatorCode.i64_atomic_rmw_and:
    case OperatorCode.i64_atomic_rmw_or:
    case OperatorCode.i64_atomic_rmw_xor:
    case OperatorCode.i64_atomic_rmw_xchg:
    case OperatorCode.i64_atomic_rmw_cmpxchg:
    case OperatorCode.v128_load64_zero:
      defaultAlignFlags = 3;
      break;
    case OperatorCode.i32_load:
    case OperatorCode.i64_load32_s:
    case OperatorCode.i64_load32_u:
    case OperatorCode.i32_store:
    case OperatorCode.i64_store32:
    case OperatorCode.f32_load:
    case OperatorCode.f32_store:
    case OperatorCode.atomic_notify:
    case OperatorCode.i32_atomic_wait:
    case OperatorCode.i32_atomic_load:
    case OperatorCode.i64_atomic_load32_u:
    case OperatorCode.i32_atomic_store:
    case OperatorCode.i64_atomic_store32:
    case OperatorCode.i32_atomic_rmw_add:
    case OperatorCode.i64_atomic_rmw32_add_u:
    case OperatorCode.i32_atomic_rmw_sub:
    case OperatorCode.i64_atomic_rmw32_sub_u:
    case OperatorCode.i32_atomic_rmw_and:
    case OperatorCode.i64_atomic_rmw32_and_u:
    case OperatorCode.i32_atomic_rmw_or:
    case OperatorCode.i64_atomic_rmw32_or_u:
    case OperatorCode.i32_atomic_rmw_xor:
    case OperatorCode.i64_atomic_rmw32_xor_u:
    case OperatorCode.i32_atomic_rmw_xchg:
    case OperatorCode.i64_atomic_rmw32_xchg_u:
    case OperatorCode.i32_atomic_rmw_cmpxchg:
    case OperatorCode.i64_atomic_rmw32_cmpxchg_u:
    case OperatorCode.v128_load32_zero:
      defaultAlignFlags = 2;
      break;
    case OperatorCode.i32_load16_s:
    case OperatorCode.i32_load16_u:
    case OperatorCode.i64_load16_s:
    case OperatorCode.i64_load16_u:
    case OperatorCode.i32_store16:
    case OperatorCode.i64_store16:
    case OperatorCode.i32_atomic_load16_u:
    case OperatorCode.i64_atomic_load16_u:
    case OperatorCode.i32_atomic_store16:
    case OperatorCode.i64_atomic_store16:
    case OperatorCode.i32_atomic_rmw16_add_u:
    case OperatorCode.i64_atomic_rmw16_add_u:
    case OperatorCode.i32_atomic_rmw16_sub_u:
    case OperatorCode.i64_atomic_rmw16_sub_u:
    case OperatorCode.i32_atomic_rmw16_and_u:
    case OperatorCode.i64_atomic_rmw16_and_u:
    case OperatorCode.i32_atomic_rmw16_or_u:
    case OperatorCode.i64_atomic_rmw16_or_u:
    case OperatorCode.i32_atomic_rmw16_xor_u:
    case OperatorCode.i64_atomic_rmw16_xor_u:
    case OperatorCode.i32_atomic_rmw16_xchg_u:
    case OperatorCode.i64_atomic_rmw16_xchg_u:
    case OperatorCode.i32_atomic_rmw16_cmpxchg_u:
    case OperatorCode.i64_atomic_rmw16_cmpxchg_u:
      defaultAlignFlags = 1;
      break;
    case OperatorCode.i32_load8_s:
    case OperatorCode.i32_load8_u:
    case OperatorCode.i64_load8_s:
    case OperatorCode.i64_load8_u:
    case OperatorCode.i32_store8:
    case OperatorCode.i64_store8:
    case OperatorCode.i32_atomic_load8_u:
    case OperatorCode.i64_atomic_load8_u:
    case OperatorCode.i32_atomic_store8:
    case OperatorCode.i64_atomic_store8:
    case OperatorCode.i32_atomic_rmw8_add_u:
    case OperatorCode.i64_atomic_rmw8_add_u:
    case OperatorCode.i32_atomic_rmw8_sub_u:
    case OperatorCode.i64_atomic_rmw8_sub_u:
    case OperatorCode.i32_atomic_rmw8_and_u:
    case OperatorCode.i64_atomic_rmw8_and_u:
    case OperatorCode.i32_atomic_rmw8_or_u:
    case OperatorCode.i64_atomic_rmw8_or_u:
    case OperatorCode.i32_atomic_rmw8_xor_u:
    case OperatorCode.i64_atomic_rmw8_xor_u:
    case OperatorCode.i32_atomic_rmw8_xchg_u:
    case OperatorCode.i64_atomic_rmw8_xchg_u:
    case OperatorCode.i32_atomic_rmw8_cmpxchg_u:
    case OperatorCode.i64_atomic_rmw8_cmpxchg_u:
      defaultAlignFlags = 0;
      break;
  }
  if (address.flags == defaultAlignFlags)
    // hide default flags
    return !address.offset ? null : `offset=${address.offset}`;
  if (!address.offset)
    // hide default offset
    return `align=${1 << address.flags}`;
  return `offset=${address.offset | 0} align=${1 << address.flags}`;
}
function limitsToString(limits: IResizableLimits): string {
  return (
    limits.initial + (limits.maximum !== undefined ? " " + limits.maximum : "")
  );
}
var paddingCache = ["0", "00", "000"];
function formatHex(n: number, width?: number): string {
  var s = (n >>> 0).toString(16).toUpperCase();
  if (width === undefined || s.length >= width) return s;
  var paddingIndex = width - s.length - 1;
  while (paddingIndex >= paddingCache.length)
    paddingCache.push(paddingCache[paddingCache.length - 1] + "0");
  return paddingCache[paddingIndex] + s;
}
const IndentIncrement = "  ";

function isValidName(name: string) {
  return !INVALID_NAME_SYMBOLS_REGEX.test(name);
}

export interface IExportMetadata {
  getFunctionExportNames(index: number): string[];
  getGlobalExportNames(index: number): string[];
  getMemoryExportNames(index: number): string[];
  getTableExportNames(index: number): string[];
  getEventExportNames(index: number): string[];
}

export interface INameResolver {
  getTypeName(index: number, isRef: boolean): string;
  getTableName(index: number, isRef: boolean): string;
  getMemoryName(index: number, isRef: boolean): string;
  getGlobalName(index: number, isRef: boolean): string;
  getElementName(index: number, isRef: boolean): string;
  getEventName(index: number, isRef: boolean): string;
  getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
  getVariableName(funcIndex: number, index: number, isRef: boolean): string;
  getFieldName(typeIndex: number, index: number, isRef: boolean): string;
  getLabel(index: number): string;
}
export class DefaultNameResolver implements INameResolver {
  public getTypeName(index: number, isRef: boolean): string {
    return "$type" + index;
  }
  public getTableName(index: number, isRef: boolean): string {
    return "$table" + index;
  }
  public getMemoryName(index: number, isRef: boolean): string {
    return "$memory" + index;
  }
  public getGlobalName(index: number, isRef: boolean): string {
    return "$global" + index;
  }
  public getElementName(index: number, isRef: boolean): string {
    return `$elem${index}`;
  }
  public getEventName(index: number, isRef: boolean): string {
    return `$event${index}`;
  }
  public getFunctionName(
    index: number,
    isImport: boolean,
    isRef: boolean
  ): string {
    return (isImport ? "$import" : "$func") + index;
  }
  public getVariableName(
    funcIndex: number,
    index: number,
    isRef: boolean
  ): string {
    return "$var" + index;
  }
  public getFieldName(
    typeIndex: number,
    index: number,
    isRef: boolean
  ): string {
    return "$field" + index;
  }
  public getLabel(index: number): string {
    return "$label" + index;
  }
}

const EMPTY_STRING_ARRAY: string[] = [];

class DevToolsExportMetadata implements IExportMetadata {
  private readonly _functionExportNames: string[][];
  private readonly _globalExportNames: string[][];
  private readonly _memoryExportNames: string[][];
  private readonly _tableExportNames: string[][];
  private readonly _eventExportNames: string[][];

  constructor(
    functionExportNames: string[][],
    globalExportNames: string[][],
    memoryExportNames: string[][],
    tableExportNames: string[][],
    eventExportNames: string[][]
  ) {
    this._functionExportNames = functionExportNames;
    this._globalExportNames = globalExportNames;
    this._memoryExportNames = memoryExportNames;
    this._tableExportNames = tableExportNames;
    this._eventExportNames = eventExportNames;
  }

  public getFunctionExportNames(index: number) {
    return this._functionExportNames[index] ?? EMPTY_STRING_ARRAY;
  }

  public getGlobalExportNames(index: number) {
    return this._globalExportNames[index] ?? EMPTY_STRING_ARRAY;
  }

  public getMemoryExportNames(index: number) {
    return this._memoryExportNames[index] ?? EMPTY_STRING_ARRAY;
  }

  public getTableExportNames(index: number) {
    return this._tableExportNames[index] ?? EMPTY_STRING_ARRAY;
  }

  public getEventExportNames(index: number) {
    return this._eventExportNames[index] ?? EMPTY_STRING_ARRAY;
  }
}

export class NumericNameResolver implements INameResolver {
  public getTypeName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getTableName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getMemoryName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getGlobalName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getElementName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getEventName(index: number, isRef: boolean): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getFunctionName(
    index: number,
    isImport: boolean,
    isRef: boolean
  ): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getVariableName(
    funcIndex: number,
    index: number,
    isRef: boolean
  ): string {
    return isRef ? "" + index : `(;${index};)`;
  }
  public getFieldName(
    typeIndex: number,
    index: number,
    isRef: boolean
  ): string {
    return isRef ? "" : index + `(;${index};)`;
  }
  public getLabel(index: number): string {
    return null;
  }
}

export enum LabelMode {
  Depth,
  WhenUsed,
  Always,
}

// The breakable range is [start, end).
export interface IFunctionBodyOffset {
  start: number;
  end: number;
}

export interface IDisassemblerResult {
  lines: Array<string>;
  offsets?: Array<number>;
  done: boolean;
  functionBodyOffsets?: Array<IFunctionBodyOffset>;
}

export class WasmDisassembler {
  private _lines: Array<string>;
  private _offsets: Array<number>;
  private _buffer: string;
  private _types: Array<ITypeEntry>;
  private _funcIndex: number;
  private _funcTypes: Array<number>;
  private _importCount: number;
  private _globalCount: number;
  private _memoryCount: number;
  private _eventCount: number;
  private _tableCount: number;
  private _elementCount: number;
  private _expression: Array<IOperatorInformation>;
  private _backrefLabels: Array<{
    line: number;
    position: number;
    useLabel: boolean;
    label: string;
  }>;
  private _labelIndex: number;
  private _indent: string;
  private _indentLevel: number;
  private _addOffsets: boolean;
  private _skipTypes = true;
  private _done: boolean;
  private _currentPosition: number;
  private _nameResolver: INameResolver;
  private _exportMetadata: IExportMetadata = null;
  private _labelMode: LabelMode;
  private _functionBodyOffsets: Array<IFunctionBodyOffset>;
  private _currentFunctionBodyOffset: number;
  private _currentSectionId: SectionCode;
  private _logFirstInstruction: boolean;
  constructor() {
    this._lines = [];
    this._offsets = [];
    this._buffer = "";
    this._indent = null;
    this._indentLevel = 0;
    this._addOffsets = false;
    this._done = false;
    this._currentPosition = 0;
    this._nameResolver = new DefaultNameResolver();
    this._labelMode = LabelMode.WhenUsed;
    this._functionBodyOffsets = [];
    this._currentFunctionBodyOffset = 0;
    this._currentSectionId = SectionCode.Unknown;
    this._logFirstInstruction = false;

    this._reset();
  }
  private _reset(): void {
    this._types = [];
    this._funcIndex = 0;
    this._funcTypes = [];
    this._importCount = 0;
    this._globalCount = 0;
    this._memoryCount = 0;
    this._eventCount = 0;
    this._tableCount = 0;
    this._elementCount = 0;
    this._expression = [];
    this._backrefLabels = null;
    this._labelIndex = 0;
  }
  public get addOffsets(): boolean {
    return this._addOffsets;
  }
  public set addOffsets(value: boolean) {
    if (this._currentPosition)
      throw new Error("Cannot switch addOffsets during processing.");
    this._addOffsets = value;
  }
  public get skipTypes(): boolean {
    return this._skipTypes;
  }
  public set skipTypes(skipTypes: boolean) {
    if (this._currentPosition)
      throw new Error("Cannot switch skipTypes during processing.");
    this._skipTypes = skipTypes;
  }
  public get labelMode(): LabelMode {
    return this._labelMode;
  }
  public set labelMode(value: LabelMode) {
    if (this._currentPosition)
      throw new Error("Cannot switch labelMode during processing.");
    this._labelMode = value;
  }
  public get exportMetadata(): IExportMetadata {
    return this._exportMetadata;
  }
  public set exportMetadata(exportMetadata: IExportMetadata) {
    if (this._currentPosition)
      throw new Error("Cannot switch exportMetadata during processing.");
    this._exportMetadata = exportMetadata;
  }
  public get nameResolver(): INameResolver {
    return this._nameResolver;
  }
  public set nameResolver(resolver: INameResolver) {
    if (this._currentPosition)
      throw new Error("Cannot switch nameResolver during processing.");
    this._nameResolver = resolver;
  }
  private appendBuffer(s: string) {
    this._buffer += s;
  }
  private newLine() {
    if (this.addOffsets) this._offsets.push(this._currentPosition);
    this._lines.push(this._buffer);
    this._buffer = "";
  }
  private logStartOfFunctionBodyOffset() {
    if (this.addOffsets) {
      this._currentFunctionBodyOffset = this._currentPosition;
    }
  }
  private logEndOfFunctionBodyOffset() {
    if (this.addOffsets) {
      this._functionBodyOffsets.push({
        start: this._currentFunctionBodyOffset,
        end: this._currentPosition,
      });
    }
  }
  private typeIndexToString(typeIndex: number): string {
    if (typeIndex >= 0) return this._nameResolver.getTypeName(typeIndex, true);
    switch (typeIndex) {
      case TypeKind.funcref:
        return "func";
      case TypeKind.externref:
        return "extern";
      case TypeKind.anyref:
        return "any";
      case TypeKind.eqref:
        return "eq";
      case TypeKind.i31ref:
        return "i31";
      case TypeKind.dataref:
        return "data";
    }
  }
  private typeToString(type: Type): string {
    switch (type.kind) {
      case TypeKind.i32:
        return "i32";
      case TypeKind.i64:
        return "i64";
      case TypeKind.f32:
        return "f32";
      case TypeKind.f64:
        return "f64";
      case TypeKind.v128:
        return "v128";
      case TypeKind.i8:
        return "i8";
      case TypeKind.i16:
        return "i16";
      case TypeKind.funcref:
        return "funcref";
      case TypeKind.externref:
        return "externref";
      case TypeKind.anyref:
        return "anyref";
      case TypeKind.eqref:
        return "eqref";
      case TypeKind.i31ref:
        return "i31ref";
      case TypeKind.dataref:
        return "dataref";
      case TypeKind.ref:
        return `(ref ${this.typeIndexToString(type.index)})`;
      case TypeKind.optref:
        return `(ref null ${this.typeIndexToString(type.index)})`;
      case TypeKind.rtt:
        return `(rtt ${this.typeIndexToString(type.index)})`;
      case TypeKind.rtt_d:
        return `(rtt ${type.depth} ${this.typeIndexToString(type.index)})`;
      default:
        throw new Error(`Unexpected type ${JSON.stringify(type)}`);
    }
  }
  private maybeMut(type: string, mutability: boolean): string {
    return mutability ? `(mut ${type})` : type;
  }
  private globalTypeToString(type: IGlobalType): string {
    const typeStr = this.typeToString(type.contentType);
    return this.maybeMut(typeStr, !!type.mutability);
  }
  private printFuncType(typeIndex: number): void {
    var type = this._types[typeIndex];
    if (type.params.length > 0) {
      this.appendBuffer(" (param");
      for (var i = 0; i < type.params.length; i++) {
        this.appendBuffer(" ");
        this.appendBuffer(this.typeToString(type.params[i]));
      }
      this.appendBuffer(")");
    }
    if (type.returns.length > 0) {
      this.appendBuffer(" (result");
      for (var i = 0; i < type.returns.length; i++) {
        this.appendBuffer(" ");
        this.appendBuffer(this.typeToString(type.returns[i]));
      }
      this.appendBuffer(")");
    }
  }
  private printStructType(typeIndex: number): void {
    var type = this._types[typeIndex];
    if (type.fields.length === 0) return;
    for (var i = 0; i < type.fields.length; i++) {
      const fieldType = this.maybeMut(
        this.typeToString(type.fields[i]),
        type.mutabilities[i]
      );
      const fieldName = this._nameResolver.getFieldName(typeIndex, i, false);
      this.appendBuffer(` (field ${fieldName} ${fieldType})`);
    }
  }
  private printArrayType(typeIndex: number): void {
    var type = this._types[typeIndex];
    this.appendBuffer(" (field ");
    this.appendBuffer(
      this.maybeMut(this.typeToString(type.elementType), type.mutability)
    );
  }
  private printBlockType(type: Type): void {
    if (type.kind === TypeKind.empty_block_type) {
      return;
    }
    if (type.kind === TypeKind.unspecified) {
      return this.printFuncType(type.index);
    }
    this.appendBuffer(" (result ");
    this.appendBuffer(this.typeToString(type));
    this.appendBuffer(")");
  }
  private printString(b: Uint8Array): void {
    this.appendBuffer('"');
    for (var i = 0; i < b.length; i++) {
      var byte = b[i];
      if (
        byte < 0x20 ||
        byte >= 0x7f ||
        byte == /* " */ 0x22 ||
        byte == /* \ */ 0x5c
      ) {
        this.appendBuffer(
          "\\" + (byte >> 4).toString(16) + (byte & 15).toString(16)
        );
      } else {
        this.appendBuffer(String.fromCharCode(byte));
      }
    }
    this.appendBuffer('"');
  }
  private printExpression(expression: IOperatorInformation[]): void {
    for (const operator of expression) {
      this.appendBuffer("(");
      this.printOperator(operator);
      this.appendBuffer(")");
    }
  }
  // extraDepthOffset is used by "delegate" instructions.
  private useLabel(depth: number, extraDepthOffset = 0): string {
    if (!this._backrefLabels) {
      return "" + depth;
    }
    var i = this._backrefLabels.length - depth - 1 - extraDepthOffset;
    if (i < 0) {
      return "" + depth;
    }
    var backrefLabel = this._backrefLabels[i];
    if (!backrefLabel.useLabel) {
      backrefLabel.useLabel = true;
      backrefLabel.label = this._nameResolver.getLabel(this._labelIndex);
      var line = this._lines[backrefLabel.line];
      this._lines[backrefLabel.line] =
        line.substring(0, backrefLabel.position) +
        " " +
        backrefLabel.label +
        line.substring(backrefLabel.position);
      this._labelIndex++;
    }
    return backrefLabel.label || "" + depth;
  }
  private printOperator(operator: IOperatorInformation): void {
    var code = operator.code;
    this.appendBuffer(OperatorCodeNames[code]);
    switch (code) {
      case OperatorCode.block:
      case OperatorCode.loop:
      case OperatorCode.if:
      case OperatorCode.try:
        if (this._labelMode !== LabelMode.Depth) {
          const backrefLabel = {
            line: this._lines.length,
            position: this._buffer.length,
            useLabel: false,
            label: null,
          };
          if (this._labelMode === LabelMode.Always) {
            backrefLabel.useLabel = true;
            backrefLabel.label = this._nameResolver.getLabel(
              this._labelIndex++
            );
            if (backrefLabel.label) {
              this.appendBuffer(" ");
              this.appendBuffer(backrefLabel.label);
            }
          }
          this._backrefLabels.push(backrefLabel);
        }
        this.printBlockType(operator.blockType);
        break;
      case OperatorCode.end:
        if (this._labelMode === LabelMode.Depth) {
          break;
        }
        const backrefLabel = this._backrefLabels.pop();
        if (backrefLabel.label) {
          this.appendBuffer(" ");
          this.appendBuffer(backrefLabel.label);
        }
        break;
      case OperatorCode.br:
      case OperatorCode.br_if:
      case OperatorCode.br_on_null:
      case OperatorCode.br_on_non_null:
      case OperatorCode.br_on_cast:
      case OperatorCode.br_on_cast_fail:
      case OperatorCode.br_on_func:
      case OperatorCode.br_on_non_func:
      case OperatorCode.br_on_data:
      case OperatorCode.br_on_non_data:
      case OperatorCode.br_on_i31:
      case OperatorCode.br_on_non_i31:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.brDepth));
        break;
      case OperatorCode.br_on_cast_static:
      case OperatorCode.br_on_cast_static_fail: {
        const label = this.useLabel(operator.brDepth);
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        this.appendBuffer(` ${label} ${refType}`);
        break;
      }
      case OperatorCode.br_table:
        for (var i = 0; i < operator.brTable.length; i++) {
          this.appendBuffer(" ");
          this.appendBuffer(this.useLabel(operator.brTable[i]));
        }
        break;
      case OperatorCode.rethrow:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.relativeDepth));
        break;
      case OperatorCode.delegate:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.relativeDepth, 1));
        break;
      case OperatorCode.catch:
      case OperatorCode.throw:
        var eventName = this._nameResolver.getEventName(
          operator.eventIndex,
          true
        );
        this.appendBuffer(` ${eventName}`);
        break;
      case OperatorCode.ref_null:
        this.appendBuffer(" ");
        this.appendBuffer(this.typeIndexToString(operator.refType));
        break;
      case OperatorCode.call:
      case OperatorCode.return_call:
      case OperatorCode.ref_func:
        var funcName = this._nameResolver.getFunctionName(
          operator.funcIndex,
          operator.funcIndex < this._importCount,
          true
        );
        this.appendBuffer(` ${funcName}`);
        break;
      case OperatorCode.call_indirect:
      case OperatorCode.return_call_indirect:
        this.printFuncType(operator.typeIndex);
        break;
      case OperatorCode.select_with_type: {
        const selectType = this.typeToString(operator.selectType);
        this.appendBuffer(` ${selectType}`);
        break;
      }
      case OperatorCode.local_get:
      case OperatorCode.local_set:
      case OperatorCode.local_tee:
        var paramName = this._nameResolver.getVariableName(
          this._funcIndex,
          operator.localIndex,
          true
        );
        this.appendBuffer(` ${paramName}`);
        break;
      case OperatorCode.global_get:
      case OperatorCode.global_set:
        var globalName = this._nameResolver.getGlobalName(
          operator.globalIndex,
          true
        );
        this.appendBuffer(` ${globalName}`);
        break;
      case OperatorCode.i32_load:
      case OperatorCode.i64_load:
      case OperatorCode.f32_load:
      case OperatorCode.f64_load:
      case OperatorCode.i32_load8_s:
      case OperatorCode.i32_load8_u:
      case OperatorCode.i32_load16_s:
      case OperatorCode.i32_load16_u:
      case OperatorCode.i64_load8_s:
      case OperatorCode.i64_load8_u:
      case OperatorCode.i64_load16_s:
      case OperatorCode.i64_load16_u:
      case OperatorCode.i64_load32_s:
      case OperatorCode.i64_load32_u:
      case OperatorCode.i32_store:
      case OperatorCode.i64_store:
      case OperatorCode.f32_store:
      case OperatorCode.f64_store:
      case OperatorCode.i32_store8:
      case OperatorCode.i32_store16:
      case OperatorCode.i64_store8:
      case OperatorCode.i64_store16:
      case OperatorCode.i64_store32:
      case OperatorCode.atomic_notify:
      case OperatorCode.i32_atomic_wait:
      case OperatorCode.i64_atomic_wait:
      case OperatorCode.i32_atomic_load:
      case OperatorCode.i64_atomic_load:
      case OperatorCode.i32_atomic_load8_u:
      case OperatorCode.i32_atomic_load16_u:
      case OperatorCode.i64_atomic_load8_u:
      case OperatorCode.i64_atomic_load16_u:
      case OperatorCode.i64_atomic_load32_u:
      case OperatorCode.i32_atomic_store:
      case OperatorCode.i64_atomic_store:
      case OperatorCode.i32_atomic_store8:
      case OperatorCode.i32_atomic_store16:
      case OperatorCode.i64_atomic_store8:
      case OperatorCode.i64_atomic_store16:
      case OperatorCode.i64_atomic_store32:
      case OperatorCode.i32_atomic_rmw_add:
      case OperatorCode.i64_atomic_rmw_add:
      case OperatorCode.i32_atomic_rmw8_add_u:
      case OperatorCode.i32_atomic_rmw16_add_u:
      case OperatorCode.i64_atomic_rmw8_add_u:
      case OperatorCode.i64_atomic_rmw16_add_u:
      case OperatorCode.i64_atomic_rmw32_add_u:
      case OperatorCode.i32_atomic_rmw_sub:
      case OperatorCode.i64_atomic_rmw_sub:
      case OperatorCode.i32_atomic_rmw8_sub_u:
      case OperatorCode.i32_atomic_rmw16_sub_u:
      case OperatorCode.i64_atomic_rmw8_sub_u:
      case OperatorCode.i64_atomic_rmw16_sub_u:
      case OperatorCode.i64_atomic_rmw32_sub_u:
      case OperatorCode.i32_atomic_rmw_and:
      case OperatorCode.i64_atomic_rmw_and:
      case OperatorCode.i32_atomic_rmw8_and_u:
      case OperatorCode.i32_atomic_rmw16_and_u:
      case OperatorCode.i64_atomic_rmw8_and_u:
      case OperatorCode.i64_atomic_rmw16_and_u:
      case OperatorCode.i64_atomic_rmw32_and_u:
      case OperatorCode.i32_atomic_rmw_or:
      case OperatorCode.i64_atomic_rmw_or:
      case OperatorCode.i32_atomic_rmw8_or_u:
      case OperatorCode.i32_atomic_rmw16_or_u:
      case OperatorCode.i64_atomic_rmw8_or_u:
      case OperatorCode.i64_atomic_rmw16_or_u:
      case OperatorCode.i64_atomic_rmw32_or_u:
      case OperatorCode.i32_atomic_rmw_xor:
      case OperatorCode.i64_atomic_rmw_xor:
      case OperatorCode.i32_atomic_rmw8_xor_u:
      case OperatorCode.i32_atomic_rmw16_xor_u:
      case OperatorCode.i64_atomic_rmw8_xor_u:
      case OperatorCode.i64_atomic_rmw16_xor_u:
      case OperatorCode.i64_atomic_rmw32_xor_u:
      case OperatorCode.i32_atomic_rmw_xchg:
      case OperatorCode.i64_atomic_rmw_xchg:
      case OperatorCode.i32_atomic_rmw8_xchg_u:
      case OperatorCode.i32_atomic_rmw16_xchg_u:
      case OperatorCode.i64_atomic_rmw8_xchg_u:
      case OperatorCode.i64_atomic_rmw16_xchg_u:
      case OperatorCode.i64_atomic_rmw32_xchg_u:
      case OperatorCode.i32_atomic_rmw_cmpxchg:
      case OperatorCode.i64_atomic_rmw_cmpxchg:
      case OperatorCode.i32_atomic_rmw8_cmpxchg_u:
      case OperatorCode.i32_atomic_rmw16_cmpxchg_u:
      case OperatorCode.i64_atomic_rmw8_cmpxchg_u:
      case OperatorCode.i64_atomic_rmw16_cmpxchg_u:
      case OperatorCode.i64_atomic_rmw32_cmpxchg_u:
      case OperatorCode.v128_load:
      case OperatorCode.i16x8_load8x8_s:
      case OperatorCode.i16x8_load8x8_u:
      case OperatorCode.i32x4_load16x4_s:
      case OperatorCode.i32x4_load16x4_u:
      case OperatorCode.i64x2_load32x2_s:
      case OperatorCode.i64x2_load32x2_u:
      case OperatorCode.v8x16_load_splat:
      case OperatorCode.v16x8_load_splat:
      case OperatorCode.v32x4_load_splat:
      case OperatorCode.v64x2_load_splat:
      case OperatorCode.v128_store:
      case OperatorCode.v128_load32_zero:
      case OperatorCode.v128_load64_zero:
        var memoryAddress = memoryAddressToString(
          operator.memoryAddress,
          operator.code
        );
        if (memoryAddress !== null) {
          this.appendBuffer(" ");
          this.appendBuffer(memoryAddress);
        }
        break;
      case OperatorCode.current_memory:
      case OperatorCode.grow_memory:
        break;
      case OperatorCode.i32_const:
        this.appendBuffer(` ${(<number>operator.literal).toString()}`);
        break;
      case OperatorCode.i64_const:
        this.appendBuffer(` ${(<Int64>operator.literal).toString()}`);
        break;
      case OperatorCode.f32_const:
        this.appendBuffer(` ${formatFloat32(<number>operator.literal)}`);
        break;
      case OperatorCode.f64_const:
        this.appendBuffer(` ${formatFloat64(<number>operator.literal)}`);
        break;
      case OperatorCode.v128_const:
        this.appendBuffer(` i32x4 ${formatI32Array(operator.literal, 4)}`);
        break;
      case OperatorCode.i8x16_shuffle:
        this.appendBuffer(` ${formatI8Array(operator.lines, 16)}`);
        break;
      case OperatorCode.i8x16_extract_lane_s:
      case OperatorCode.i8x16_extract_lane_u:
      case OperatorCode.i8x16_replace_lane:
      case OperatorCode.i16x8_extract_lane_s:
      case OperatorCode.i16x8_extract_lane_u:
      case OperatorCode.i16x8_replace_lane:
      case OperatorCode.i32x4_extract_lane:
      case OperatorCode.i32x4_replace_lane:
      case OperatorCode.f32x4_extract_lane:
      case OperatorCode.f32x4_replace_lane:
      case OperatorCode.i64x2_extract_lane:
      case OperatorCode.i64x2_replace_lane:
      case OperatorCode.f64x2_extract_lane:
      case OperatorCode.f64x2_replace_lane:
        this.appendBuffer(` ${operator.lineIndex}`);
        break;
      case OperatorCode.memory_init:
      case OperatorCode.data_drop:
        this.appendBuffer(` ${operator.segmentIndex}`);
        break;
      case OperatorCode.elem_drop:
        const elementName = this._nameResolver.getElementName(
          operator.segmentIndex,
          true
        );
        this.appendBuffer(` ${elementName}`);
        break;
      case OperatorCode.table_set:
      case OperatorCode.table_get:
      case OperatorCode.table_fill: {
        const tableName = this._nameResolver.getTableName(
          operator.tableIndex,
          true
        );
        this.appendBuffer(` ${tableName}`);
        break;
      }
      case OperatorCode.table_copy: {
        // Table index might be omitted and defaults to 0.
        if (operator.tableIndex !== 0 || operator.destinationIndex !== 0) {
          const tableName = this._nameResolver.getTableName(
            operator.tableIndex,
            true
          );
          const destinationName = this._nameResolver.getTableName(
            operator.destinationIndex,
            true
          );
          this.appendBuffer(` ${destinationName} ${tableName}`);
        }
        break;
      }
      case OperatorCode.table_init: {
        // Table index might be omitted and defaults to 0.
        if (operator.tableIndex !== 0) {
          const tableName = this._nameResolver.getTableName(
            operator.tableIndex,
            true
          );
          this.appendBuffer(` ${tableName}`);
        }
        const elementName = this._nameResolver.getElementName(
          operator.segmentIndex,
          true
        );
        this.appendBuffer(` ${elementName}`);
        break;
      }
      case OperatorCode.struct_get:
      case OperatorCode.struct_get_s:
      case OperatorCode.struct_get_u:
      case OperatorCode.struct_set: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        const fieldName = this._nameResolver.getFieldName(
          operator.refType,
          operator.fieldIndex,
          true
        );
        this.appendBuffer(` ${refType} ${fieldName}`);
        break;
      }
      case OperatorCode.rtt_canon:
      case OperatorCode.rtt_sub:
      case OperatorCode.rtt_fresh_sub:
      case OperatorCode.ref_test_static:
      case OperatorCode.ref_cast_static:
      case OperatorCode.struct_new_default:
      case OperatorCode.struct_new_default_with_rtt:
      case OperatorCode.struct_new:
      case OperatorCode.struct_new_with_rtt:
      case OperatorCode.array_new_default:
      case OperatorCode.array_new_default_with_rtt:
      case OperatorCode.array_new:
      case OperatorCode.array_new_with_rtt:
      case OperatorCode.array_get:
      case OperatorCode.array_get_s:
      case OperatorCode.array_get_u:
      case OperatorCode.array_set:
      case OperatorCode.array_len: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        this.appendBuffer(` ${refType}`);
        break;
      }
      case OperatorCode.array_copy: {
        const dstType = this._nameResolver.getTypeName(operator.refType, true);
        const srcType = this._nameResolver.getTypeName(operator.srcType, true);
        this.appendBuffer(` ${dstType} ${srcType}`);
        break;
      }
      case OperatorCode.array_init:
      case OperatorCode.array_init_static: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        const length = operator.brDepth; // Overloaded field.
        this.appendBuffer(` ${refType} ${length}`);
        break;
      }
    }
  }
  private printImportSource(info: IImportEntry): void {
    this.printString(info.module);
    this.appendBuffer(" ");
    this.printString(info.field);
  }
  private increaseIndent(): void {
    this._indent += IndentIncrement;
    this._indentLevel++;
  }
  private decreaseIndent(): void {
    this._indent = this._indent.slice(0, -IndentIncrement.length);
    this._indentLevel--;
  }
  public disassemble(reader: BinaryReader): string {
    const done = this.disassembleChunk(reader);
    if (!done) return null;
    let lines = this._lines;
    if (this._addOffsets) {
      lines = lines.map((line, index) => {
        var position = formatHex(this._offsets[index], 4);
        return line + " ;; @" + position;
      });
    }
    lines.push(""); // we need '\n' after last line
    const result = lines.join("\n");
    this._lines.length = 0;
    this._offsets.length = 0;
    this._functionBodyOffsets.length = 0;
    return result;
  }
  public getResult(): IDisassemblerResult {
    let linesReady = this._lines.length;
    if (this._backrefLabels && this._labelMode === LabelMode.WhenUsed) {
      this._backrefLabels.some((backrefLabel) => {
        if (backrefLabel.useLabel) return false;
        linesReady = backrefLabel.line;
        return true;
      });
    }
    if (linesReady === 0) {
      return {
        lines: [],
        offsets: this._addOffsets ? [] : undefined,
        done: this._done,
        functionBodyOffsets: this._addOffsets ? [] : undefined,
      };
    }
    if (linesReady === this._lines.length) {
      const result = {
        lines: this._lines,
        offsets: this._addOffsets ? this._offsets : undefined,
        done: this._done,
        functionBodyOffsets: this._addOffsets
          ? this._functionBodyOffsets
          : undefined,
      };
      this._lines = [];
      if (this._addOffsets) {
        this._offsets = [];
        this._functionBodyOffsets = [];
      }
      return result;
    }
    const result = {
      lines: this._lines.splice(0, linesReady),
      offsets: this._addOffsets
        ? this._offsets.splice(0, linesReady)
        : undefined,
      done: false,
      functionBodyOffsets: this._addOffsets
        ? this._functionBodyOffsets
        : undefined,
    };
    if (this._backrefLabels) {
      this._backrefLabels.forEach((backrefLabel) => {
        backrefLabel.line -= linesReady;
      });
    }
    return result;
  }
  public disassembleChunk(reader: BinaryReader, offsetInModule = 0): boolean {
    if (this._done)
      throw new Error(
        "Invalid state: disassembly process was already finished."
      );
    while (true) {
      this._currentPosition = reader.position + offsetInModule;
      if (!reader.read()) return false;
      switch (reader.state) {
        case BinaryReaderState.END_WASM:
          this.appendBuffer(")");
          this.newLine();
          this._reset();
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case BinaryReaderState.ERROR:
          throw reader.error;
        case BinaryReaderState.BEGIN_WASM:
          this.appendBuffer("(module");
          this.newLine();
          break;
        case BinaryReaderState.END_SECTION:
          this._currentSectionId = SectionCode.Unknown;
          break;
        case BinaryReaderState.BEGIN_SECTION:
          var sectionInfo = <ISectionInformation>reader.result;
          switch (sectionInfo.id) {
            case SectionCode.Type:
            case SectionCode.Import:
            case SectionCode.Export:
            case SectionCode.Global:
            case SectionCode.Function:
            case SectionCode.Start:
            case SectionCode.Code:
            case SectionCode.Memory:
            case SectionCode.Data:
            case SectionCode.Table:
            case SectionCode.Element:
            case SectionCode.Event:
              this._currentSectionId = sectionInfo.id;
              break; // reading known section;
            default:
              reader.skipSection();
              break;
          }
          break;
        case BinaryReaderState.MEMORY_SECTION_ENTRY:
          var memoryInfo = <IMemoryType>reader.result;
          var memoryIndex = this._memoryCount++;
          var memoryName = this._nameResolver.getMemoryName(memoryIndex, false);
          this.appendBuffer(`  (memory ${memoryName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getMemoryExportNames(
              memoryIndex
            )) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.appendBuffer(` ${limitsToString(memoryInfo.limits)}`);
          if (memoryInfo.shared) {
            this.appendBuffer(` shared`);
          }
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.EVENT_SECTION_ENTRY:
          var eventInfo = <IEventType>reader.result;
          var eventIndex = this._eventCount++;
          var eventName = this._nameResolver.getEventName(eventIndex, false);
          this.appendBuffer(`  (event ${eventName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getEventExportNames(
              eventIndex
            )) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.printFuncType(eventInfo.typeIndex);
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.TABLE_SECTION_ENTRY:
          var tableInfo = <ITableType>reader.result;
          var tableIndex = this._tableCount++;
          var tableName = this._nameResolver.getTableName(tableIndex, false);
          this.appendBuffer(`  (table ${tableName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getTableExportNames(
              tableIndex
            )) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.appendBuffer(
            ` ${limitsToString(tableInfo.limits)} ${this.typeToString(
              tableInfo.elementType
            )})`
          );
          this.newLine();
          break;
        case BinaryReaderState.EXPORT_SECTION_ENTRY:
          // Skip printing exports here when we have export metadata
          // which we can use to print export information inline.
          if (this._exportMetadata === null) {
            var exportInfo = <IExportEntry>reader.result;
            this.appendBuffer("  (export ");
            this.printString(exportInfo.field);
            this.appendBuffer(" ");
            switch (exportInfo.kind) {
              case ExternalKind.Function:
                var funcName = this._nameResolver.getFunctionName(
                  exportInfo.index,
                  exportInfo.index < this._importCount,
                  true
                );
                this.appendBuffer(`(func ${funcName})`);
                break;
              case ExternalKind.Table:
                var tableName = this._nameResolver.getTableName(
                  exportInfo.index,
                  true
                );
                this.appendBuffer(`(table ${tableName})`);
                break;
              case ExternalKind.Memory:
                var memoryName = this._nameResolver.getMemoryName(
                  exportInfo.index,
                  true
                );
                this.appendBuffer(`(memory ${memoryName})`);
                break;
              case ExternalKind.Global:
                var globalName = this._nameResolver.getGlobalName(
                  exportInfo.index,
                  true
                );
                this.appendBuffer(`(global ${globalName})`);
                break;
              case ExternalKind.Event:
                var eventName = this._nameResolver.getEventName(
                  exportInfo.index,
                  true
                );
                this.appendBuffer(`(event ${eventName})`);
                break;
              default:
                throw new Error(`Unsupported export ${exportInfo.kind}`);
            }
            this.appendBuffer(")");
            this.newLine();
          }
          break;
        case BinaryReaderState.IMPORT_SECTION_ENTRY:
          var importInfo = <IImportEntry>reader.result;
          switch (importInfo.kind) {
            case ExternalKind.Function:
              this._importCount++;
              var funcIndex = this._funcIndex++;
              var funcName = this._nameResolver.getFunctionName(
                funcIndex,
                true,
                false
              );
              this.appendBuffer(`  (func ${funcName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getFunctionExportNames(
                  funcIndex
                )) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(")");
              this.printFuncType(importInfo.funcTypeIndex);
              this.appendBuffer(")");
              break;
            case ExternalKind.Global:
              var globalImportInfo = <IGlobalType>importInfo.type;
              var globalIndex = this._globalCount++;
              var globalName = this._nameResolver.getGlobalName(
                globalIndex,
                false
              );
              this.appendBuffer(`  (global ${globalName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getGlobalExportNames(
                  globalIndex
                )) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(
                `) ${this.globalTypeToString(globalImportInfo)})`
              );
              break;
            case ExternalKind.Memory:
              var memoryImportInfo = <IMemoryType>importInfo.type;
              var memoryIndex = this._memoryCount++;
              var memoryName = this._nameResolver.getMemoryName(
                memoryIndex,
                false
              );
              this.appendBuffer(`  (memory ${memoryName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getMemoryExportNames(
                  memoryIndex
                )) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(`) ${limitsToString(memoryImportInfo.limits)}`);
              if (memoryImportInfo.shared) {
                this.appendBuffer(` shared`);
              }
              this.appendBuffer(")");
              break;
            case ExternalKind.Table:
              var tableImportInfo = <ITableType>importInfo.type;
              var tableIndex = this._tableCount++;
              var tableName = this._nameResolver.getTableName(
                tableIndex,
                false
              );
              this.appendBuffer(`  (table ${tableName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getTableExportNames(
                  tableIndex
                )) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(
                `) ${limitsToString(
                  tableImportInfo.limits
                )} ${this.typeToString(tableImportInfo.elementType)})`
              );
              break;
            case ExternalKind.Event:
              var eventImportInfo = <IEventType>importInfo.type;
              var eventIndex = this._eventCount++;
              var eventName = this._nameResolver.getEventName(
                eventIndex,
                false
              );
              this.appendBuffer(`  (event ${eventName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getEventExportNames(
                  eventIndex
                )) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(")");
              this.printFuncType(eventImportInfo.typeIndex);
              this.appendBuffer(")");
              break;
            default:
              throw new Error(`NYI other import types: ${importInfo.kind}`);
          }
          this.newLine();
          break;
        case BinaryReaderState.BEGIN_ELEMENT_SECTION_ENTRY:
          var elementSegment = <IElementSegment>reader.result;
          var elementIndex = this._elementCount++;
          var elementName = this._nameResolver.getElementName(
            elementIndex,
            false
          );
          this.appendBuffer(`  (elem ${elementName}`);
          switch (elementSegment.mode) {
            case ElementMode.Active:
              if (elementSegment.tableIndex !== 0) {
                const tableName = this._nameResolver.getTableName(
                  elementSegment.tableIndex,
                  false
                );
                this.appendBuffer(` (table ${tableName})`);
              }
              break;
            case ElementMode.Passive:
              break;
            case ElementMode.Declarative:
              this.appendBuffer(" declare");
              break;
          }
          break;
        case BinaryReaderState.END_ELEMENT_SECTION_ENTRY:
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.ELEMENT_SECTION_ENTRY_BODY:
          const elementSegmentBody = <IElementSegmentBody>reader.result;
          this.appendBuffer(
            ` ${this.typeToString(elementSegmentBody.elementType)}`
          );
          break;
        case BinaryReaderState.BEGIN_GLOBAL_SECTION_ENTRY:
          var globalInfo = <IGlobalVariable>reader.result;
          var globalIndex = this._globalCount++;
          var globalName = this._nameResolver.getGlobalName(globalIndex, false);
          this.appendBuffer(`  (global ${globalName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getGlobalExportNames(
              globalIndex
            )) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.appendBuffer(` ${this.globalTypeToString(globalInfo.type)}`);
          break;
        case BinaryReaderState.END_GLOBAL_SECTION_ENTRY:
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.TYPE_SECTION_ENTRY:
          var typeEntry = <ITypeEntry>reader.result;
          var typeIndex = this._types.length;
          this._types.push(typeEntry);
          if (!this._skipTypes) {
            var typeName = this._nameResolver.getTypeName(typeIndex, false);
            var superTypeName = undefined;
            if (typeEntry.supertype !== undefined) {
              superTypeName = this.typeIndexToString(typeEntry.supertype);
            }
            if (typeEntry.form === TypeKind.func) {
              this.appendBuffer(`  (type ${typeName} (func`);
              this.printFuncType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === TypeKind.func_subtype) {
              this.appendBuffer(`  (type ${typeName} (func_subtype`);
              this.printFuncType(typeIndex);
              this.appendBuffer(` (supertype ${superTypeName})))`);
            } else if (typeEntry.form === TypeKind.struct) {
              this.appendBuffer(`  (type ${typeName} (struct`);
              this.printStructType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === TypeKind.struct_subtype) {
              this.appendBuffer(`  (type ${typeName} (struct_subtype`);
              this.printStructType(typeIndex);
              this.appendBuffer(` (supertype ${superTypeName})))`);
            } else if (typeEntry.form === TypeKind.array) {
              this.appendBuffer(`  (type ${typeName} (array`);
              this.printArrayType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === TypeKind.array_subtype) {
              this.appendBuffer(`  (type ${typeName} (array_subtype`);
              this.printArrayType(typeIndex);
              this.appendBuffer(`) (supertype ${superTypeName})))`);
            } else {
              throw new Error(`Unknown type form: ${typeEntry.form}`);
            }
            this.newLine();
          }
          break;
        case BinaryReaderState.START_SECTION_ENTRY:
          var startEntry = <IStartEntry>reader.result;
          var funcName = this._nameResolver.getFunctionName(
            startEntry.index,
            startEntry.index < this._importCount,
            true
          );
          this.appendBuffer(`  (start ${funcName})`);
          this.newLine();
          break;
        case BinaryReaderState.BEGIN_DATA_SECTION_ENTRY:
          this.appendBuffer("  (data");
          break;
        case BinaryReaderState.DATA_SECTION_ENTRY_BODY:
          var body = <IDataSegmentBody>reader.result;
          this.appendBuffer(" ");
          this.printString(body.data);
          break;
        case BinaryReaderState.END_DATA_SECTION_ENTRY:
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.BEGIN_INIT_EXPRESSION_BODY:
        case BinaryReaderState.BEGIN_OFFSET_EXPRESSION_BODY:
          this._expression = [];
          break;
        case BinaryReaderState.INIT_EXPRESSION_OPERATOR:
        case BinaryReaderState.OFFSET_EXPRESSION_OPERATOR:
          var operator = <IOperatorInformation>reader.result;
          if (operator.code !== OperatorCode.end) {
            this._expression.push(operator);
          }
          break;
        case BinaryReaderState.END_OFFSET_EXPRESSION_BODY:
          if (this._expression.length > 1) {
            this.appendBuffer(" (offset ");
            this.printExpression(this._expression);
            this.appendBuffer(")");
          } else {
            this.appendBuffer(" ");
            this.printExpression(this._expression);
          }
          this._expression = [];
          break;
        case BinaryReaderState.END_INIT_EXPRESSION_BODY:
          if (
            this._expression.length > 1 &&
            this._currentSectionId === SectionCode.Element
          ) {
            this.appendBuffer(" (item ");
            this.printExpression(this._expression);
            this.appendBuffer(")");
          } else {
            this.appendBuffer(" ");
            this.printExpression(this._expression);
          }
          this._expression = [];
          break;
        case BinaryReaderState.FUNCTION_SECTION_ENTRY:
          this._funcTypes.push((<IFunctionEntry>reader.result).typeIndex);
          break;
        case BinaryReaderState.BEGIN_FUNCTION_BODY:
          var func = <IFunctionInformation>reader.result;
          var type = this._types[
            this._funcTypes[this._funcIndex - this._importCount]
          ];
          this.appendBuffer("  (func ");
          this.appendBuffer(
            this._nameResolver.getFunctionName(this._funcIndex, false, false)
          );
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getFunctionExportNames(
              this._funcIndex
            )) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          for (var i = 0; i < type.params.length; i++) {
            var paramName = this._nameResolver.getVariableName(
              this._funcIndex,
              i,
              false
            );
            this.appendBuffer(
              ` (param ${paramName} ${this.typeToString(type.params[i])})`
            );
          }
          for (var i = 0; i < type.returns.length; i++) {
            this.appendBuffer(
              ` (result ${this.typeToString(type.returns[i])})`
            );
          }
          this.newLine();
          var localIndex = type.params.length;
          if (func.locals.length > 0) {
            this.appendBuffer("   ");
            for (var l of func.locals) {
              for (var i = 0; i < l.count; i++) {
                var paramName = this._nameResolver.getVariableName(
                  this._funcIndex,
                  localIndex++,
                  false
                );
                this.appendBuffer(
                  ` (local ${paramName} ${this.typeToString(l.type)})`
                );
              }
            }
            this.newLine();
          }
          this._indent = "    ";
          this._indentLevel = 0;
          this._labelIndex = 0;
          this._backrefLabels = this._labelMode === LabelMode.Depth ? null : [];
          this._logFirstInstruction = true;
          break;
        case BinaryReaderState.CODE_OPERATOR:
          if (this._logFirstInstruction) {
            this.logStartOfFunctionBodyOffset();
            this._logFirstInstruction = false;
          }
          var operator = <IOperatorInformation>reader.result;
          if (operator.code == OperatorCode.end && this._indentLevel == 0) {
            // reached of the function, closing function body
            this.appendBuffer(`  )`);
            this.newLine();
            break;
          }
          switch (operator.code) {
            case OperatorCode.end:
            case OperatorCode.else:
            case OperatorCode.catch:
            case OperatorCode.catch_all:
            case OperatorCode.unwind:
            case OperatorCode.delegate:
              this.decreaseIndent();
              break;
          }
          this.appendBuffer(this._indent);
          this.printOperator(operator);
          this.newLine();
          switch (operator.code) {
            case OperatorCode.if:
            case OperatorCode.block:
            case OperatorCode.loop:
            case OperatorCode.else:
            case OperatorCode.try:
            case OperatorCode.catch:
            case OperatorCode.catch_all:
            case OperatorCode.unwind:
              this.increaseIndent();
              break;
          }
          break;
        case BinaryReaderState.END_FUNCTION_BODY:
          this._funcIndex++;
          this._backrefLabels = null;
          this.logEndOfFunctionBodyOffset();
          // See case BinaryReaderState.CODE_OPERATOR for closing of body
          break;
        default:
          throw new Error(`Expectected state: ${reader.state}`);
      }
    }
  }
}

const UNKNOWN_FUNCTION_PREFIX = "unknown";

class NameSectionNameResolver extends DefaultNameResolver {
  protected readonly _functionNames: string[];
  protected readonly _localNames: string[][];
  protected readonly _eventNames: string[];
  protected readonly _typeNames: string[];
  protected readonly _tableNames: string[];
  protected readonly _memoryNames: string[];
  protected readonly _globalNames: string[];
  protected readonly _fieldNames: string[][];

  constructor(
    functionNames: string[],
    localNames: string[][],
    eventNames: string[],
    typeNames: string[],
    tableNames: string[],
    memoryNames: string[],
    globalNames: string[],
    fieldNames: string[][]
  ) {
    super();
    this._functionNames = functionNames;
    this._localNames = localNames;
    this._eventNames = eventNames;
    this._typeNames = typeNames;
    this._tableNames = tableNames;
    this._memoryNames = memoryNames;
    this._globalNames = globalNames;
    this._fieldNames = fieldNames;
  }

  public getTypeName(index: number, isRef: boolean): string {
    const name = this._typeNames[index];
    if (!name) return super.getTypeName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getTableName(index: number, isRef: boolean): string {
    const name = this._tableNames[index];
    if (!name) return super.getTableName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getMemoryName(index: number, isRef: boolean): string {
    const name = this._memoryNames[index];
    if (!name) return super.getMemoryName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getGlobalName(index: number, isRef: boolean): string {
    const name = this._globalNames[index];
    if (!name) return super.getGlobalName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getEventName(index: number, isRef: boolean): string {
    const name = this._eventNames[index];
    if (!name) return super.getEventName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getFunctionName(
    index: number,
    isImport: boolean,
    isRef: boolean
  ): string {
    const name = this._functionNames[index];
    if (!name) return `$${UNKNOWN_FUNCTION_PREFIX}${index}`;
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getVariableName(
    funcIndex: number,
    index: number,
    isRef: boolean
  ): string {
    const name =
      this._localNames[funcIndex] && this._localNames[funcIndex][index];
    if (!name) return super.getVariableName(funcIndex, index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  public getFieldName(
    typeIndex: number,
    index: number,
    isRef: boolean
  ): string {
    const name =
      this._fieldNames[typeIndex] && this._fieldNames[typeIndex][index];
    if (!name) return super.getFieldName(typeIndex, index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
}

export class NameSectionReader {
  private _done = false;
  private _functionsCount = 0;
  private _functionImportsCount = 0;
  private _functionNames: string[] = null;
  private _functionLocalNames: string[][] = null;
  private _eventNames: string[] = null;
  private _typeNames: string[] = null;
  private _tableNames: string[] = null;
  private _memoryNames: string[] = null;
  private _globalNames: string[] = null;
  private _fieldNames: string[][] = null;
  private _hasNames = false;

  public read(reader: BinaryReader): boolean {
    if (this._done)
      throw new Error(
        "Invalid state: disassembly process was already finished."
      );
    while (true) {
      if (!reader.read()) return false;
      switch (reader.state) {
        case BinaryReaderState.END_WASM:
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case BinaryReaderState.ERROR:
          throw reader.error;
        case BinaryReaderState.BEGIN_WASM:
          this._functionsCount = 0;
          this._functionImportsCount = 0;
          this._functionNames = [];
          this._functionLocalNames = [];
          this._eventNames = [];
          this._typeNames = [];
          this._tableNames = [];
          this._memoryNames = [];
          this._globalNames = [];
          this._fieldNames = [];
          this._hasNames = false;
          break;
        case BinaryReaderState.END_SECTION:
          break;
        case BinaryReaderState.BEGIN_SECTION:
          var sectionInfo = <ISectionInformation>reader.result;
          if (
            sectionInfo.id === SectionCode.Custom &&
            bytesToString(sectionInfo.name) === NAME_SECTION_NAME
          ) {
            break;
          }
          if (
            sectionInfo.id === SectionCode.Function ||
            sectionInfo.id === SectionCode.Import
          ) {
            break;
          }
          reader.skipSection();
          break;
        case BinaryReaderState.IMPORT_SECTION_ENTRY:
          var importInfo = <IImportEntry>reader.result;
          if (importInfo.kind === ExternalKind.Function)
            this._functionImportsCount++;
          break;
        case BinaryReaderState.FUNCTION_SECTION_ENTRY:
          this._functionsCount++;
          break;
        case BinaryReaderState.NAME_SECTION_ENTRY:
          const nameInfo = <INameEntry>reader.result;
          if (nameInfo.type === NameType.Function) {
            const { names } = <IFunctionNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._functionNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Local) {
            const { funcs } = <ILocalNameEntry>nameInfo;
            funcs.forEach(({ index, locals }) => {
              const localNames = (this._functionLocalNames[index] = []);
              locals.forEach(({ index, name }) => {
                localNames[index] = bytesToString(name);
              });
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Event) {
            const { names } = <IEventNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._eventNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Type) {
            const { names } = <ITypeNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._typeNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Table) {
            const { names } = <ITableNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._tableNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Memory) {
            const { names } = <IMemoryNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._memoryNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Global) {
            const { names } = <IGlobalNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._globalNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Field) {
            const { types } = <IFieldNameEntry>nameInfo;
            types.forEach(({ index, fields }) => {
              const fieldNames = (this._fieldNames[index] = []);
              fields.forEach(({ index, name }) => {
                fieldNames[index] = bytesToString(name);
              });
            });
          }
          break;
        default:
          throw new Error(`Expectected state: ${reader.state}`);
      }
    }
  }

  public hasValidNames(): boolean {
    return this._hasNames;
  }

  public getNameResolver(): INameResolver {
    if (!this.hasValidNames()) throw new Error("Has no valid name section");

    // Fix bad names.
    const functionNamesLength =
      this._functionImportsCount + this._functionsCount;
    const functionNames = this._functionNames.slice(0, functionNamesLength);
    const usedNameAt = Object.create(null);
    for (let i = 0; i < functionNames.length; i++) {
      const name = functionNames[i];
      if (!name) continue;
      const goodName =
        !(name in usedNameAt) &&
        isValidName(name) &&
        name.indexOf(UNKNOWN_FUNCTION_PREFIX) !== 0;
      if (!goodName) {
        if (usedNameAt[name] >= 0) {
          // Remove all non-unique names.
          functionNames[usedNameAt[name]] = null;
          usedNameAt[name] = -1;
        }
        functionNames[i] = null;
        continue;
      }
      usedNameAt[name] = i;
    }

    return new NameSectionNameResolver(
      functionNames,
      this._functionLocalNames,
      this._eventNames,
      this._typeNames,
      this._tableNames,
      this._memoryNames,
      this._globalNames,
      this._fieldNames
    );
  }
}

export class DevToolsNameResolver extends NameSectionNameResolver {
  constructor(
    functionNames: string[],
    localNames: string[][],
    eventNames: string[],
    typeNames: string[],
    tableNames: string[],
    memoryNames: string[],
    globalNames: string[],
    fieldNames: string[][]
  ) {
    super(
      functionNames,
      localNames,
      eventNames,
      typeNames,
      tableNames,
      memoryNames,
      globalNames,
      fieldNames
    );
  }

  public getFunctionName(
    index: number,
    isImport: boolean,
    isRef: boolean
  ): string {
    const name = this._functionNames[index];
    if (!name) return isImport ? `$import${index}` : `$func${index}`;
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
}

export class DevToolsNameGenerator {
  private _done = false;
  private _functionImportsCount = 0;
  private _memoryImportsCount = 0;
  private _tableImportsCount = 0;
  private _globalImportsCount = 0;
  private _eventImportsCount = 0;

  private _functionNames: string[] = null;
  private _functionLocalNames: string[][] = null;
  private _eventNames: string[] = null;
  private _memoryNames: string[] = null;
  private _typeNames: string[] = null;
  private _tableNames: string[] = null;
  private _globalNames: string[] = null;
  private _fieldNames: string[][] = null;

  private _functionExportNames: string[][] = null;
  private _globalExportNames: string[][] = null;
  private _memoryExportNames: string[][] = null;
  private _tableExportNames: string[][] = null;
  private _eventExportNames: string[][] = null;

  private _addExportName(exportNames: string[][], index: number, name: string) {
    const names = exportNames[index];
    if (names) {
      names.push(name);
    } else {
      exportNames[index] = [name];
    }
  }

  private _setName(
    names: string[],
    index: number,
    name: string,
    isNameSectionName: boolean
  ) {
    if (!name) return;
    if (isNameSectionName) {
      if (!isValidName(name)) return;
      names[index] = name;
    } else if (!names[index]) {
      names[index] = name.replace(INVALID_NAME_SYMBOLS_REGEX_GLOBAL, "_");
    }
  }

  public read(reader: BinaryReader): boolean {
    if (this._done)
      throw new Error(
        "Invalid state: disassembly process was already finished."
      );
    while (true) {
      if (!reader.read()) return false;
      switch (reader.state) {
        case BinaryReaderState.END_WASM:
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case BinaryReaderState.ERROR:
          throw reader.error;
        case BinaryReaderState.BEGIN_WASM:
          this._functionImportsCount = 0;
          this._memoryImportsCount = 0;
          this._tableImportsCount = 0;
          this._globalImportsCount = 0;
          this._eventImportsCount = 0;

          this._functionNames = [];
          this._functionLocalNames = [];
          this._eventNames = [];
          this._memoryNames = [];
          this._typeNames = [];
          this._tableNames = [];
          this._globalNames = [];
          this._fieldNames = [];
          this._functionExportNames = [];
          this._globalExportNames = [];
          this._memoryExportNames = [];
          this._tableExportNames = [];
          this._eventExportNames = [];
          break;
        case BinaryReaderState.END_SECTION:
          break;
        case BinaryReaderState.BEGIN_SECTION:
          var sectionInfo = <ISectionInformation>reader.result;

          if (
            sectionInfo.id === SectionCode.Custom &&
            bytesToString(sectionInfo.name) === NAME_SECTION_NAME
          ) {
            break;
          }
          switch (sectionInfo.id) {
            case SectionCode.Import:
            case SectionCode.Export:
              break; // reading known section;
            default:
              reader.skipSection();
              break;
          }
          break;
        case BinaryReaderState.IMPORT_SECTION_ENTRY:
          var importInfo = <IImportEntry>reader.result;
          const importName = `${bytesToString(
            importInfo.module
          )}.${bytesToString(importInfo.field)}`;
          switch (importInfo.kind) {
            case ExternalKind.Function:
              this._setName(
                this._functionNames,
                this._functionImportsCount++,
                importName,
                false
              );
              break;
            case ExternalKind.Table:
              this._setName(
                this._tableNames,
                this._tableImportsCount++,
                importName,
                false
              );
              break;
            case ExternalKind.Memory:
              this._setName(
                this._memoryNames,
                this._memoryImportsCount++,
                importName,
                false
              );
              break;
            case ExternalKind.Global:
              this._setName(
                this._globalNames,
                this._globalImportsCount++,
                importName,
                false
              );
              break;
            case ExternalKind.Event:
              this._setName(
                this._eventNames,
                this._eventImportsCount++,
                importName,
                false
              );
            default:
              throw new Error(`Unsupported export ${importInfo.kind}`);
          }
          break;
        case BinaryReaderState.NAME_SECTION_ENTRY:
          const nameInfo = <INameEntry>reader.result;
          if (nameInfo.type === NameType.Function) {
            const { names } = <IFunctionNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(
                this._functionNames,
                index,
                bytesToString(name),
                true
              );
            });
          } else if (nameInfo.type === NameType.Local) {
            const { funcs } = <ILocalNameEntry>nameInfo;
            funcs.forEach(({ index, locals }) => {
              const localNames = (this._functionLocalNames[index] = []);
              locals.forEach(({ index, name }) => {
                localNames[index] = bytesToString(name);
              });
            });
          } else if (nameInfo.type === NameType.Event) {
            const { names } = <IEventNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._eventNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === NameType.Type) {
            const { names } = <ITypeNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._typeNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === NameType.Table) {
            const { names } = <ITableNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._tableNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === NameType.Memory) {
            const { names } = <IMemoryNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(
                this._memoryNames,
                index,
                bytesToString(name),
                true
              );
            });
          } else if (nameInfo.type === NameType.Global) {
            const { names } = <IGlobalNameEntry>nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(
                this._globalNames,
                index,
                bytesToString(name),
                true
              );
            });
          } else if (nameInfo.type === NameType.Field) {
            const { types } = <IFieldNameEntry>nameInfo;
            types.forEach(({ index, fields }) => {
              const fieldNames = (this._fieldNames[index] = []);
              fields.forEach(({ index, name }) => {
                fieldNames[index] = bytesToString(name);
              });
            });
          }
          break;
        case BinaryReaderState.EXPORT_SECTION_ENTRY:
          var exportInfo = <IExportEntry>reader.result;
          const exportName = bytesToString(exportInfo.field);
          switch (exportInfo.kind) {
            case ExternalKind.Function:
              this._addExportName(
                this._functionExportNames,
                exportInfo.index,
                exportName
              );
              this._setName(
                this._functionNames,
                exportInfo.index,
                exportName,
                false
              );
              break;
            case ExternalKind.Global:
              this._addExportName(
                this._globalExportNames,
                exportInfo.index,
                exportName
              );
              this._setName(
                this._globalNames,
                exportInfo.index,
                exportName,
                false
              );
              break;
            case ExternalKind.Memory:
              this._addExportName(
                this._memoryExportNames,
                exportInfo.index,
                exportName
              );
              this._setName(
                this._memoryNames,
                exportInfo.index,
                exportName,
                false
              );
              break;
            case ExternalKind.Table:
              this._addExportName(
                this._tableExportNames,
                exportInfo.index,
                exportName
              );
              this._setName(
                this._tableNames,
                exportInfo.index,
                exportName,
                false
              );
              break;
            case ExternalKind.Event:
              this._addExportName(
                this._eventExportNames,
                exportInfo.index,
                exportName
              );
              this._setName(
                this._eventNames,
                exportInfo.index,
                exportName,
                false
              );
              break;
            default:
              throw new Error(`Unsupported export ${exportInfo.kind}`);
          }
          break;
        default:
          throw new Error(`Expectected state: ${reader.state}`);
      }
    }
  }

  public getExportMetadata(): IExportMetadata {
    return new DevToolsExportMetadata(
      this._functionExportNames,
      this._globalExportNames,
      this._memoryExportNames,
      this._tableExportNames,
      this._eventExportNames
    );
  }

  public getNameResolver(): INameResolver {
    return new DevToolsNameResolver(
      this._functionNames,
      this._functionLocalNames,
      this._eventNames,
      this._typeNames,
      this._tableNames,
      this._memoryNames,
      this._globalNames,
      this._fieldNames
    );
  }
}
