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
  ExternalKind,
  IDataSegmentBody,
  IElementSegment,
  IElementSegmentBody,
  IExportEntry,
  IFunctionEntry,
  IFunctionInformation,
  IFunctionNameEntry,
  IFunctionType,
  IGlobalType,
  IGlobalVariable,
  IImportEntry,
  ILocalNameEntry,
  IMemoryAddress,
  IMemoryType,
  INameEntry,
  INaming,
  Int64,
  IOperatorInformation,
  IResizableLimits,
  ISectionInformation,
  IStartEntry,
  isTypeIndex,
  ITableType,
  NameType,
  NULL_FUNCTION_INDEX,
  OperatorCode,
  OperatorCodeNames,
  SectionCode,
  Type,
} from "./WasmParser.js";

const NAME_SECTION_NAME = "name";
const INVALID_NAME_SYMBOLS_REGEX = /[^0-9A-Za-z!#$%&'*+.:<=>?@^_`|~\/\-]/;
const INVALID_NAME_SYMBOLS_REGEX_GLOBAL = new RegExp(
  INVALID_NAME_SYMBOLS_REGEX.source,
  "g"
);

function typeToString(type: number): string {
  switch (type) {
    case Type.i32:
      return "i32";
    case Type.i64:
      return "i64";
    case Type.f32:
      return "f32";
    case Type.f64:
      return "f64";
    case Type.v128:
      return "v128";
    case Type.anyfunc:
      return "anyfunc";
    case Type.anyref:
      return "anyref";
    default:
      throw new Error(`Unexpected type ${type}`);
  }
}
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
function globalTypeToString(type: IGlobalType): string {
  const typeStr = typeToString(type.contentType);
  return type.mutability ? `(mut ${typeStr})` : typeStr;
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
}

export interface INameResolver {
  getTypeName(index: number, isRef: boolean): string;
  getTableName(index: number, isRef: boolean): string;
  getMemoryName(index: number, isRef: boolean): string;
  getGlobalName(index: number, isRef: boolean): string;
  getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
  getVariableName(funcIndex: number, index: number, isRef: boolean): string;
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

  constructor(
    functionExportNames: string[][],
    globalExportNames: string[][],
    memoryExportNames: string[][],
    tableExportNames: string[][]
  ) {
    this._functionExportNames = functionExportNames;
    this._globalExportNames = globalExportNames;
    this._memoryExportNames = memoryExportNames;
    this._tableExportNames = tableExportNames;
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
}

export class DevToolsNameResolver extends DefaultNameResolver {
  private readonly _functionNames: string[];
  private readonly _localNames: string[][];
  private readonly _memoryNames: string[];
  private readonly _tableNames: string[];
  private readonly _globalNames: string[];

  constructor(
    functionNames: string[],
    localNames: string[][],
    memoryNames: string[],
    tableNames: string[],
    globalNames: string[]
  ) {
    super();
    this._functionNames = functionNames;
    this._localNames = localNames;
    this._memoryNames = memoryNames;
    this._tableNames = tableNames;
    this._globalNames = globalNames;
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

  public getFunctionName(
    index: number,
    isImport: boolean,
    isRef: boolean
  ): string {
    const name = this._functionNames[index];
    if (!name) return super.getFunctionName(index, isImport, isRef);
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
  start?: number;
  end?: number;
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
  private _types: Array<IFunctionType>;
  private _funcIndex: number;
  private _funcTypes: Array<number>;
  private _importCount: number;
  private _globalCount: number;
  private _memoryCount: number;
  private _tableCount: number;
  private _initExpression: Array<IOperatorInformation>;
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
  private _currentFunctionBodyOffset: IFunctionBodyOffset;
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
    this._currentFunctionBodyOffset = null;
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
    this._tableCount = 0;
    this._initExpression = [];
    this._backrefLabels = null;
    this._labelIndex = 0;
  }
  public get addOffsets() {
    return this._addOffsets;
  }
  public set addOffsets(value: boolean) {
    if (this._currentPosition)
      throw new Error("Cannot switch addOffsets during processing.");
    this._addOffsets = value;
  }
  public get skipTypes() {
    return this._skipTypes;
  }
  public set skipTypes(skipTypes: boolean) {
    if (this._currentPosition)
      throw new Error("Cannot switch skipTypes during processing.");
    this._skipTypes = skipTypes;
  }
  public get labelMode() {
    return this._labelMode;
  }
  public set labelMode(value: LabelMode) {
    if (this._currentPosition)
      throw new Error("Cannot switch labelMode during processing.");
    this._labelMode = value;
  }
  public get exportMetadata() {
    return this._exportMetadata;
  }
  public set exportMetadata(exportMetadata: IExportMetadata) {
    if (this._currentPosition)
      throw new Error("Cannot switch exportMetadata during processing.");
    this._exportMetadata = exportMetadata;
  }
  public get nameResolver() {
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
      this._currentFunctionBodyOffset = {
        start: this._currentPosition,
      };
    }
  }
  private logEndOfFunctionBodyOffset() {
    if (this.addOffsets && this._currentFunctionBodyOffset) {
      this._currentFunctionBodyOffset.end = this._currentPosition;
      this._functionBodyOffsets.push(this._currentFunctionBodyOffset);
      this._currentFunctionBodyOffset = null;
    }
  }
  private printFuncType(typeIndex: number): void {
    var type = this._types[typeIndex];
    if (type.form !== Type.func) throw new Error("NYI other function form");
    if (type.params.length > 0) {
      this.appendBuffer(" (param");
      for (var i = 0; i < type.params.length; i++) {
        this.appendBuffer(" ");
        this.appendBuffer(typeToString(type.params[i]));
      }
      this.appendBuffer(")");
    }
    if (type.returns.length > 0) {
      this.appendBuffer(" (result");
      for (var i = 0; i < type.returns.length; i++) {
        this.appendBuffer(" ");
        this.appendBuffer(typeToString(type.returns[i]));
      }
      this.appendBuffer(")");
    }
  }
  private printBlockType(type: number): void {
    if (type === Type.empty_block_type) {
      return;
    }
    if (isTypeIndex(type)) {
      return this.printFuncType(type);
    }
    this.appendBuffer(" (result ");
    this.appendBuffer(typeToString(type));
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
  private useLabel(depth: number): string {
    if (!this._backrefLabels) {
      return "" + depth;
    }
    var i = this._backrefLabels.length - depth - 1;
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
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.brDepth));
        break;
      case OperatorCode.br_table:
        for (var i = 0; i < operator.brTable.length; i++) {
          this.appendBuffer(" ");
          this.appendBuffer(this.useLabel(operator.brTable[i]));
        }
        break;
      case OperatorCode.call:
      case OperatorCode.return_call:
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
      case OperatorCode.v128_store:
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
      case OperatorCode.v8x16_shuffle:
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
      case OperatorCode.elem_drop:
        this.appendBuffer(` ${operator.segmentIndex}`);
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
        if (operator.tableIndex === 0 && operator.destinationIndex === 0) break;
        const tableName = this._nameResolver.getTableName(
          operator.tableIndex,
          true
        );
        const destinationName = this._nameResolver.getTableName(
          operator.destinationIndex,
          true
        );
        this.appendBuffer(` ${destinationName} ${tableName}`);
        break;
      }
      case OperatorCode.table_init: {
        // Table index might be omitted and defaults to 0.
        if (operator.tableIndex === 0) {
          this.appendBuffer(` ${operator.segmentIndex}`);
          break;
        }
        const tableName = this._nameResolver.getTableName(
          operator.tableIndex,
          true
        );
        this.appendBuffer(` ${operator.segmentIndex} ${tableName}`);
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
              this.appendBuffer(` (export "${exportName}")`);
            }
          }
          this.appendBuffer(` ${limitsToString(memoryInfo.limits)}`);
          if (memoryInfo.shared) {
            this.appendBuffer(` shared`);
          }
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
              this.appendBuffer(` (export "${exportName}")`);
            }
          }
          this.appendBuffer(
            ` ${limitsToString(tableInfo.limits)} ${typeToString(
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
                  this.appendBuffer(` (export "${exportName}")`);
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
                  this.appendBuffer(` (export "${exportName}")`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(`) ${globalTypeToString(globalImportInfo)})`);
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
                  this.appendBuffer(` (export "${exportName}")`);
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
                  this.appendBuffer(` (export "${exportName}")`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(
                `) ${limitsToString(tableImportInfo.limits)} ${typeToString(
                  tableImportInfo.elementType
                )})`
              );
              break;
            default:
              throw new Error(`NYI other import types: ${importInfo.kind}`);
          }
          this.newLine();
          break;
        case BinaryReaderState.BEGIN_ELEMENT_SECTION_ENTRY:
          var elementSegmentInfo = <IElementSegment>reader.result;
          this.appendBuffer("  (elem ");
          break;
        case BinaryReaderState.END_ELEMENT_SECTION_ENTRY:
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.ELEMENT_SECTION_ENTRY_BODY:
          const elementSegmentBody = <IElementSegmentBody>reader.result;
          if (elementSegmentBody.elementType != Type.unspecified) {
            const typeName = typeToString(elementSegmentBody.elementType);
            this.appendBuffer(` ${typeName}`);
          }
          elementSegmentBody.elements.forEach((funcIndex) => {
            if (elementSegmentBody.asElements) {
              if (funcIndex == NULL_FUNCTION_INDEX) {
                this.appendBuffer(" (ref.null)");
              } else {
                const funcName = this._nameResolver.getFunctionName(
                  funcIndex,
                  funcIndex < this._importCount,
                  true
                );
                this.appendBuffer(` (ref.func ${funcName})`);
              }
            } else {
              const funcName = this._nameResolver.getFunctionName(
                funcIndex,
                funcIndex < this._importCount,
                true
              );
              this.appendBuffer(` ${funcName}`);
            }
          });
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
              this.appendBuffer(` (export "${exportName}")`);
            }
          }
          this.appendBuffer(` ${globalTypeToString(globalInfo.type)} `);
          break;
        case BinaryReaderState.END_GLOBAL_SECTION_ENTRY:
          this.appendBuffer(")");
          this.newLine();
          break;
        case BinaryReaderState.TYPE_SECTION_ENTRY:
          var funcType = <IFunctionType>reader.result;
          var typeIndex = this._types.length;
          this._types.push(funcType);
          if (!this._skipTypes) {
            var typeName = this._nameResolver.getTypeName(typeIndex, false);
            this.appendBuffer(`  (type ${typeName} (func`);
            this.printFuncType(typeIndex);
            this.appendBuffer("))");
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
          this.appendBuffer("  (data ");
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
          break;
        case BinaryReaderState.INIT_EXPRESSION_OPERATOR:
          this._initExpression.push(<IOperatorInformation>reader.result);
          break;
        case BinaryReaderState.END_INIT_EXPRESSION_BODY:
          this.appendBuffer("(");
          // TODO fix printing when more that one operator is used.
          this._initExpression.forEach((op, index) => {
            if (op.code === OperatorCode.end) {
              return; // do not print end
            }
            if (index > 0) {
              this.appendBuffer(" ");
            }
            this.printOperator(op);
          });
          this.appendBuffer(")");
          this._initExpression.length = 0;
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
              this.appendBuffer(` (export "${exportName}")`);
            }
          }
          for (var i = 0; i < type.params.length; i++) {
            var paramName = this._nameResolver.getVariableName(
              this._funcIndex,
              i,
              false
            );
            this.appendBuffer(
              ` (param ${paramName} ${typeToString(type.params[i])})`
            );
          }
          for (var i = 0; i < type.returns.length; i++) {
            this.appendBuffer(` (result ${typeToString(type.returns[i])})`);
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
                  ` (local ${paramName} ${typeToString(l.type)})`
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
  private _names: string[];
  private _localNames: string[][];

  constructor(names: string[], localNames: string[][]) {
    super();
    this._names = names;
    this._localNames = localNames;
  }

  getFunctionName(index: number, isImport: boolean, isRef: boolean): string {
    const name = this._names[index];
    if (!name) return `$${UNKNOWN_FUNCTION_PREFIX}${index}`;
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }

  getVariableName(funcIndex: number, index: number, isRef: boolean): string {
    const name =
      this._localNames[funcIndex] && this._localNames[funcIndex][index];
    if (!name) return super.getVariableName(funcIndex, index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
}

export class NameSectionReader {
  private _done: boolean;
  private _functionsCount: number;
  private _functionImportsCount: number;
  private _functionNames: string[];
  private _functionLocalNames: string[][];
  private _hasNames: boolean;

  constructor() {
    this._done = false;
    this._functionsCount = 0;
    this._functionImportsCount = 0;
    this._functionNames = null;
    this._functionLocalNames = null;
    this._hasNames = false;
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
          this._functionsCount = 0;
          this._functionImportsCount = 0;
          this._functionNames = [];
          this._functionLocalNames = [];
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
          var nameInfo = <INameEntry>reader.result;
          if (nameInfo.type === NameType.Function) {
            var functionNameInfo = <IFunctionNameEntry>nameInfo;
            functionNameInfo.names.forEach((naming: INaming) => {
              this._functionNames[naming.index] = bytesToString(naming.name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === NameType.Local) {
            var localNameInfo = <ILocalNameEntry>nameInfo;
            localNameInfo.funcs.forEach((localName) => {
              this._functionLocalNames[localName.index] = [];
              localName.locals.forEach((naming: INaming) => {
                this._functionLocalNames[localName.index][
                  naming.index
                ] = bytesToString(naming.name);
              });
            });
            this._hasNames = true;
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

    return new NameSectionNameResolver(functionNames, this._functionLocalNames);
  }
}

export class DevToolsNameGenerator {
  private _done = false;
  private _functionImportsCount = 0;
  private _memoryImportsCount = 0;
  private _tableImportsCount = 0;
  private _globalImportsCount = 0;

  private _functionNames: string[] = null;
  private _functionLocalNames: string[][] = null;
  private _memoryNames: string[] = null;
  private _tableNames: string[] = null;
  private _globalNames: string[] = null;

  private _functionExportNames: string[][] = null;
  private _globalExportNames: string[][] = null;
  private _memoryExportNames: string[][] = null;
  private _tableExportNames: string[][] = null;

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

          this._functionNames = [];
          this._functionLocalNames = [];
          this._memoryNames = [];
          this._tableNames = [];
          this._globalNames = [];
          this._functionExportNames = [];
          this._globalExportNames = [];
          this._memoryExportNames = [];
          this._tableExportNames = [];
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
            default:
              throw new Error(`Unsupported export ${importInfo.kind}`);
          }
          break;
        case BinaryReaderState.NAME_SECTION_ENTRY:
          var nameInfo = <INameEntry>reader.result;
          if (nameInfo.type === NameType.Function) {
            var functionNameInfo = <IFunctionNameEntry>nameInfo;
            functionNameInfo.names.forEach((naming: INaming) => {
              this._setName(
                this._functionNames,
                naming.index,
                bytesToString(naming.name),
                true
              );
            });
          } else if (nameInfo.type === NameType.Local) {
            var localNameInfo = <ILocalNameEntry>nameInfo;
            localNameInfo.funcs.forEach((localName) => {
              this._functionLocalNames[localName.index] = [];
              localName.locals.forEach((naming: INaming) => {
                this._functionLocalNames[localName.index][
                  naming.index
                ] = bytesToString(naming.name);
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
      this._tableExportNames
    );
  }

  public getNameResolver(): INameResolver {
    return new DevToolsNameResolver(
      this._functionNames,
      this._functionLocalNames,
      this._memoryNames,
      this._tableNames,
      this._globalNames
    );
  }
}
