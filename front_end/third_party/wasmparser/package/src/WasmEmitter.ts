/* Copyright 2017 Mozilla Foundation
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
  BinaryReaderResult,
  BinaryReaderState,
  bytesToString,
  ExternalKind,
  IBinaryReaderData,
  IDataSegment,
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
  ILinkingEntry,
  ILocalNameEntry,
  IMemoryAddress,
  IMemoryType,
  IModuleHeader,
  IModuleNameEntry,
  INameEntry,
  INaming,
  Int64,
  IOperatorInformation,
  IRelocEntry,
  IRelocHeader,
  IResizableLimits,
  ISectionInformation,
  ISourceMappingURL,
  ITableType,
  LinkingType,
  NameType,
  OperatorCode,
  RelocType,
  SectionCode,
} from "./WasmParser.js";

enum EmitterState {
  Initial,
  Error,
  Wasm,
  CustomSecton,
  TypeSection,
  ImportSection,
  FunctionSection,
  TableSection,
  MemorySection,
  GlobalSection,
  ExportSection,
  StartSection,
  ElementSection,
  CodeSection,
  DataSection,
  FunctionBody,
  DataSectionEntry,
  DataSectionEntryBody,
  DataSectionEntryEnd,
  InitExpression,
  ElementSectionEntry,
  ElementSectionEntryBody,
  ElementSectionEntryEnd,
  GlobalSectionEntry,
  GlobalSectionEntryEnd,
  RawDataSection,
  NameEntry,
  RelocHeader,
  RelocEntry,
  LinkingEntry,
  SourceMappingURL,
  SourceMappingURLEnd,
}

export class Emitter {
  private _buffer: number[];
  private _state: EmitterState;
  private _sectionStart: number;
  private _sectionSizeBytes: number;
  private _sectionEntiesCount: number;
  private _sectionEntiesCountBytes: number;
  private _bodyStart: number;
  private _bodySizeBytes: number;
  private _data: Uint8Array;
  private _endWritten: boolean; // TODO replace by block indent level
  private _initExpressionAfterState: EmitterState;

  public constructor() {
    this._buffer = [];
    this._state = EmitterState.Initial;
    this._sectionStart = 0;
    this._sectionSizeBytes = 0;
    this._sectionEntiesCount = 0;
    this._sectionEntiesCountBytes = 0;
    this._bodyStart = 0;
    this._bodySizeBytes = 0;
    this._data = null;
    this._endWritten = false;
    this._initExpressionAfterState = EmitterState.Initial;
  }

  public get data(): Uint8Array {
    return this._data;
  }

  public write(reader: BinaryReader): void {
    this.writeStateAndResult(reader.state, reader.result);
  }

  public writeData(data: IBinaryReaderData): void {
    this.writeStateAndResult(data.state, data.result || null);
  }

  private writeStateAndResult(
    state: BinaryReaderState,
    result: BinaryReaderResult
  ): void {
    switch (state) {
      case BinaryReaderState.BEGIN_WASM:
        this.writeBeginWasm(<IModuleHeader>result);
        break;
      case BinaryReaderState.END_WASM:
        this.writeEndWasm();
        break;
      case BinaryReaderState.BEGIN_SECTION:
        this.writeBeginSection(<ISectionInformation>result);
        break;
      case BinaryReaderState.END_SECTION:
        this.writeEndSection();
        break;
      case BinaryReaderState.TYPE_SECTION_ENTRY:
        this.writeTypeSectionEntry(<IFunctionType>result);
        break;
      case BinaryReaderState.IMPORT_SECTION_ENTRY:
        this.writeImportSectionEntry(<IImportEntry>result);
        break;
      case BinaryReaderState.FUNCTION_SECTION_ENTRY:
        this.writeFunctionSectionEntry(<IFunctionEntry>result);
        break;
      case BinaryReaderState.EXPORT_SECTION_ENTRY:
        this.writeExportSectionEntry(<IExportEntry>result);
        break;
      case BinaryReaderState.BEGIN_FUNCTION_BODY:
        this.writeBeginFunctionBody(<IFunctionInformation>result);
        break;
      case BinaryReaderState.END_FUNCTION_BODY:
        this.writeEndFunctionBody();
        break;
      case BinaryReaderState.MEMORY_SECTION_ENTRY:
        this.writeMemorySectionEntry(<IMemoryType>result);
        break;
      case BinaryReaderState.INIT_EXPRESSION_OPERATOR:
      case BinaryReaderState.CODE_OPERATOR:
        this.writeOperator(<IOperatorInformation>result);
        break;
      case BinaryReaderState.BEGIN_DATA_SECTION_ENTRY:
        this.writeBeginDataSectionEntry(<IDataSegment>result);
        break;
      case BinaryReaderState.DATA_SECTION_ENTRY_BODY:
        this.writeDataSectionBody(<IDataSegmentBody>result);
        break;
      case BinaryReaderState.END_DATA_SECTION_ENTRY:
        this.writeEndDataSectionEntry();
        break;
      case BinaryReaderState.BEGIN_INIT_EXPRESSION_BODY:
        this.writeBeginInitExpression();
        break;
      case BinaryReaderState.END_INIT_EXPRESSION_BODY:
        this.writeEndInitExpression();
        break;
      case BinaryReaderState.TABLE_SECTION_ENTRY:
        this.writeTableSectionEntry(<ITableType>result);
        break;
      case BinaryReaderState.BEGIN_ELEMENT_SECTION_ENTRY:
        this.writeBeginElementSectionEntry(<IElementSegment>result);
        break;
      case BinaryReaderState.END_ELEMENT_SECTION_ENTRY:
        this.writeEndElementSectionEntry();
        break;
      case BinaryReaderState.ELEMENT_SECTION_ENTRY_BODY:
        this.writeElementSectionBody(<IElementSegmentBody>result);
        break;
      case BinaryReaderState.BEGIN_GLOBAL_SECTION_ENTRY:
        this.writeBeginGlobalSectionEntry(<IGlobalVariable>result);
        break;
      case BinaryReaderState.END_GLOBAL_SECTION_ENTRY:
        this.writeEndGlobalSectionEntry();
        break;
      case BinaryReaderState.SECTION_RAW_DATA:
        this.writeSectionRawData(<Uint8Array>result);
        break;
      case BinaryReaderState.NAME_SECTION_ENTRY:
        this.writeNameEntry(<INameEntry>result);
        break;
      case BinaryReaderState.RELOC_SECTION_HEADER:
        this.writeRelocHeader(<IRelocHeader>result);
        break;
      case BinaryReaderState.RELOC_SECTION_ENTRY:
        this.writeRelocEntry(<IRelocEntry>result);
        break;
      case BinaryReaderState.LINKING_SECTION_ENTRY:
        this.writeLinkingSection(<ILinkingEntry>result);
        break;
      case BinaryReaderState.SOURCE_MAPPING_URL:
        this.writeSourceMappingURL(<ISourceMappingURL>result);
        break;
      default:
        throw new Error(`Invalid state: ${state}`);
    }
  }

  private writeByte(byte: number): void {
    this._buffer.push(byte);
  }

  private writeMutiple(...bytes: number[]): void {
    this._buffer.push(...bytes);
  }

  private get _position(): number {
    return this._buffer.length;
  }

  private patchByte(pos: number, byte: number): void {
    this._buffer[pos] = byte;
  }

  private writeVarUint(n: number): void {
    while (n & ~0x7f) {
      this.writeByte(0x80 | (n & 0x7f));
      n >>>= 7;
    }
    this.writeByte(n);
  }

  private writeVarInt(n: number): void {
    n |= 0;
    var test = n >> 31;
    while (n >> 6 != test) {
      this.writeByte(0x80 | (n & 0x7f));
      n >>= 7;
    }
    this.writeByte(n & 0x7f);
  }

  private writePatchableVarUint32(): number {
    var pos = this._position;
    this.writeMutiple(0x80, 0x80, 0x80, 0x80, 0x00);
    return pos;
  }

  private writePatchableSectionEntriesCount(): void {
    this._sectionEntiesCountBytes = this.writePatchableVarUint32();
    this._sectionEntiesCount = 0;
  }

  private writeBytes(bytes: Uint8Array, start: number, end: number): void {
    for (var i = start; i < end; i++) this.writeByte(bytes[i]);
  }

  private writeString(str: Uint8Array): void {
    this.writeVarUint(str.length);
    this.writeBytes(str, 0, str.length);
  }

  private patchVarUint32(pos: number, n: number): void {
    this.patchByte(pos, 0x80 | (n & 0x7f));
    this.patchByte(pos + 1, 0x80 | ((n >>> 7) & 0x7f));
    this.patchByte(pos + 2, 0x80 | ((n >>> 14) & 0x7f));
    this.patchByte(pos + 3, 0x80 | ((n >>> 21) & 0x7f));
    this.patchByte(pos + 4, (n >>> 28) & 0x7f);
  }

  private ensureState(state: EmitterState): void {
    if (this._state !== state)
      throw new Error(`Unexpected state: ${this._state} (expected ${state}).`);
  }

  private ensureEitherState(states: EmitterState[]): void {
    if (states.indexOf(this._state) < 0)
      throw new Error(
        `Unexpected state: ${this._state} (expected one of ${states}).`
      );
  }

  private ensureEndOperatorWritten(): void {
    if (!this._endWritten)
      throw new Error("End as a last written operator is expected.");
  }

  public writeBeginWasm(header?: IModuleHeader): void {
    this.ensureState(EmitterState.Initial);
    this.writeMutiple(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
    this._state = EmitterState.Wasm;
  }

  public writeEndWasm(): void {
    this.ensureState(EmitterState.Wasm);
    this._state = EmitterState.Initial;
    this._data = new Uint8Array(this._buffer);
    this._buffer.length = 0;
  }

  public writeBeginSection(section: ISectionInformation): void {
    this.ensureState(EmitterState.Wasm);
    this.writeVarUint(section.id);
    this._sectionSizeBytes = this.writePatchableVarUint32();
    this._sectionStart = this._position;
    switch (section.id) {
      case SectionCode.Custom:
        this.writeString(section.name);
        var sectionName = bytesToString(section.name);
        if (sectionName === "name") {
          this._state = EmitterState.NameEntry;
          break;
        }
        if (sectionName.indexOf("reloc.") === 0) {
          this._state = EmitterState.RelocHeader;
          break;
        }
        if (sectionName === "linking") {
          this._state = EmitterState.LinkingEntry;
          break;
        }
        if (sectionName === "sourceMappingURL") {
          this._state = EmitterState.SourceMappingURL;
          break;
        }
        this._state = EmitterState.RawDataSection;
        break;
      default:
        this._state = EmitterState.Error;
        throw new Error(`Unexpected section ${section.id}`);
      case SectionCode.Type:
        this._state = EmitterState.TypeSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Import:
        this._state = EmitterState.ImportSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Function:
        this._state = EmitterState.FunctionSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Export:
        this._state = EmitterState.ExportSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Code:
        this._state = EmitterState.CodeSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Memory:
        this._state = EmitterState.MemorySection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Global:
        this._state = EmitterState.GlobalSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Data:
        this._state = EmitterState.DataSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Table:
        this._state = EmitterState.TableSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Element:
        this._state = EmitterState.ElementSection;
        this.writePatchableSectionEntriesCount();
        break;
      case SectionCode.Global:
        this._state = EmitterState.GlobalSection;
        this.writePatchableSectionEntriesCount();
        break;
    }
  }

  public writeBeginSectionRawData(section: ISectionInformation): void {
    this.ensureState(EmitterState.Wasm);
    this.writeVarUint(section.id);
    if (section.id == SectionCode.Custom) {
      this.writeString(section.name);
    }
    this._state = EmitterState.RawDataSection;
  }

  private writeSectionRawData(bytes: Uint8Array): void {
    this.ensureState(EmitterState.RawDataSection);
    this.writeBytes(bytes, 0, bytes.length);
  }

  private writeFuncType(type: IFunctionType): void {
    this.writeVarInt(type.form);
    this.writeVarUint(type.params.length);
    for (var i = 0; i < type.params.length; i++)
      this.writeVarInt(type.params[i]);
    this.writeVarUint(type.returns.length);
    for (var i = 0; i < type.returns.length; i++)
      this.writeVarInt(type.returns[i]);
  }

  public writeTypeSectionEntry(type: IFunctionType): void {
    this.ensureState(EmitterState.TypeSection);
    this._sectionEntiesCount++;
    this.writeFuncType(type);
  }

  private writeResizableLimits(limits: IResizableLimits): void {
    var flags = limits.maximum == undefined ? 0 : 1;
    this.writeVarUint(flags);
    this.writeVarUint(limits.initial);
    if (flags) this.writeVarUint(limits.maximum);
  }

  private writeTableType(type: ITableType): void {
    this.writeVarInt(type.elementType);
    this.writeResizableLimits(type.limits);
  }

  private writeMemoryType(type: IMemoryType): void {
    this.writeResizableLimits(type.limits);
  }

  private writeGlobalType(type: IGlobalType): void {
    this.writeVarInt(type.contentType);
    this.writeVarUint(type.mutability);
  }

  public writeImportSectionEntry(entry: IImportEntry): void {
    this.ensureState(EmitterState.ImportSection);
    this._sectionEntiesCount++;
    this.writeString(entry.module);
    this.writeString(entry.field);
    this.writeByte(entry.kind);
    switch (entry.kind) {
      case ExternalKind.Function:
        this.writeVarUint(entry.funcTypeIndex);
        break;
      case ExternalKind.Table:
        this.writeTableType(<ITableType>entry.type);
        break;
      case ExternalKind.Memory:
        this.writeMemoryType(<IMemoryType>entry.type);
        break;
      case ExternalKind.Global:
        this.writeGlobalType(<IGlobalType>entry.type);
        break;
      default:
        throw new Error(`Invalid import kind: ${entry.kind}`);
    }
  }

  public writeFunctionSectionEntry(entry: IFunctionEntry): void {
    this.ensureState(EmitterState.FunctionSection);
    this._sectionEntiesCount++;
    this.writeVarUint(entry.typeIndex);
  }

  public writeExportSectionEntry(entry: IExportEntry): void {
    this.ensureState(EmitterState.ExportSection);
    this._sectionEntiesCount++;
    this.writeString(entry.field);
    this.writeByte(entry.kind);
    this.writeVarUint(entry.index);
  }

  public writeBeginFunctionBody(functionInfo: IFunctionInformation): void {
    this.ensureState(EmitterState.CodeSection);
    this._sectionEntiesCount++;
    this._bodySizeBytes = this.writePatchableVarUint32();
    this._bodyStart = this._position;
    this._endWritten = false;
    this._state = EmitterState.FunctionBody;
    this.writeVarUint(functionInfo.locals.length);
    for (var i = 0; i < functionInfo.locals.length; i++) {
      this.writeVarUint(functionInfo.locals[i].count);
      this.writeVarInt(functionInfo.locals[i].type);
    }
  }

  public writeEndFunctionBody(): void {
    this.ensureState(EmitterState.FunctionBody);
    this.ensureEndOperatorWritten();
    var bodySize = this._position - this._bodyStart;
    this.patchVarUint32(this._bodySizeBytes, bodySize);
    this._state = EmitterState.CodeSection;
  }

  public writeBeginDataSectionEntry(entry: IDataSegment): void {
    this.ensureState(EmitterState.DataSection);
    this._sectionEntiesCount++;
    this.writeVarUint(entry.index);
    this._state = EmitterState.DataSectionEntry;
  }

  public writeDataSectionBody(body: IDataSegmentBody): void {
    this.ensureState(EmitterState.DataSectionEntryBody);
    this.writeString(body.data);
    this._state = EmitterState.DataSectionEntryEnd;
  }

  public writeEndDataSectionEntry(): void {
    this.ensureState(EmitterState.DataSectionEntryEnd);
    this._state = EmitterState.DataSection;
  }

  public writeTableSectionEntry(entry: ITableType): void {
    this.ensureState(EmitterState.TableSection);
    this._sectionEntiesCount++;
    this.writeVarInt(entry.elementType);
    this.writeResizableLimits(entry.limits);
  }

  public writeBeginElementSectionEntry(entry: IElementSegment): void {
    this.ensureState(EmitterState.ElementSection);
    this._sectionEntiesCount++;
    this.writeVarUint(entry.index);
    this._state = EmitterState.ElementSectionEntry;
  }

  public writeElementSectionBody(body: IElementSegmentBody): void {
    this.ensureState(EmitterState.ElementSectionEntryBody);
    this.writeVarUint(body.elements.length);
    for (var i = 0; i < body.elements.length; i++)
      this.writeVarUint(body.elements[i]);
    this._state = EmitterState.ElementSectionEntryEnd;
  }

  public writeEndElementSectionEntry(): void {
    this.ensureState(EmitterState.ElementSectionEntryEnd);
    this._state = EmitterState.ElementSection;
  }

  public writeBeginGlobalSectionEntry(entry: IGlobalVariable): void {
    this.ensureState(EmitterState.GlobalSection);
    this._sectionEntiesCount++;
    this.writeGlobalType(entry.type);
    this._state = EmitterState.GlobalSectionEntry;
  }

  public writeEndGlobalSectionEntry(): void {
    this.ensureState(EmitterState.GlobalSectionEntryEnd);
    this._state = EmitterState.GlobalSection;
  }

  public writeBeginInitExpression(): void {
    switch (this._state) {
      case EmitterState.DataSectionEntry:
        this._initExpressionAfterState = EmitterState.DataSectionEntryBody;
        break;
      case EmitterState.ElementSectionEntry:
        this._initExpressionAfterState = EmitterState.ElementSectionEntryBody;
        break;
      case EmitterState.GlobalSectionEntry:
        this._initExpressionAfterState = EmitterState.GlobalSectionEntryEnd;
        break;
      default:
        throw new Error(
          `Unexpected state ${this._state} at writeEndInitExpression`
        );
    }
    this._endWritten = false;
    this._state = EmitterState.InitExpression;
  }

  public writeEndInitExpression(): void {
    this.ensureState(EmitterState.InitExpression);
    this.ensureEndOperatorWritten();
    this._state = this._initExpressionAfterState;
  }

  private writeMemoryImmediate(address: IMemoryAddress): void {
    this.writeVarUint(address.flags);
    this.writeVarUint(address.offset);
  }

  private writeVarInt64(n: Int64): void {
    var pos = 0,
      end = 7;
    var highBit = n.data[end] & 0x80;
    var optionalBits = highBit ? 0xff : 0;
    while (end > 0 && n.data[end] === optionalBits) {
      end--;
    }
    var buffer = n.data[pos],
      buffered = 8;
    do {
      this.writeByte(0x80 | (buffer & 0x7f));
      buffer >>= 7;
      buffered -= 7;
      if (buffered > 7) continue;
      if (pos < end) {
        ++pos;
        buffer |= n.data[pos] << buffered;
        buffered += 8;
      } else if (
        pos == end &&
        buffer === 7 &&
        (n.data[pos] & 0x80) !== highBit
      ) {
        ++pos;
        buffer |= optionalBits << buffered;
        buffered += 8;
      }
    } while (buffered > 7);
    buffer |= optionalBits << buffered;
    this.writeByte(buffer & 0x7f);
  }

  private writeFloat32(n: number): void {
    var data = new Uint8Array(4);
    new DataView(data.buffer, 0).setFloat32(0, n, true);
    this.writeBytes(data, 0, data.length);
  }

  private writeFloat64(n: number): void {
    var data = new Uint8Array(8);
    new DataView(data.buffer, 0).setFloat64(0, n, true);
    this.writeBytes(data, 0, data.length);
  }

  public writeOperator(opInfo: IOperatorInformation): void {
    this.ensureEitherState([
      EmitterState.FunctionBody,
      EmitterState.InitExpression,
    ]);
    if (opInfo.code < 0x100) {
      this.writeByte(opInfo.code);
    } else {
      this.writeByte(opInfo.code >> 8);
      this.writeVarUint(opInfo.code & 255);
    }
    this._endWritten = opInfo.code == OperatorCode.end;
    switch (opInfo.code) {
      case OperatorCode.block:
      case OperatorCode.loop:
      case OperatorCode.if:
        this.writeVarInt(opInfo.blockType);
        break;
      case OperatorCode.br:
      case OperatorCode.br_if:
        this.writeVarUint(opInfo.brDepth);
        break;
      case OperatorCode.br_table:
        var tableCount = opInfo.brTable.length - 1;
        this.writeVarUint(tableCount);
        for (var i = 0; i <= tableCount; i++) {
          // including default
          this.writeVarUint(opInfo.brTable[i]);
        }
        break;
      case OperatorCode.call:
        this.writeVarUint(opInfo.funcIndex);
        break;
      case OperatorCode.call_indirect:
        this.writeVarUint(opInfo.typeIndex);
        this.writeVarUint(0);
        break;
      case OperatorCode.local_get:
      case OperatorCode.local_set:
      case OperatorCode.local_tee:
        this.writeVarUint(opInfo.localIndex);
        break;
      case OperatorCode.global_get:
      case OperatorCode.global_set:
        this.writeVarUint(opInfo.globalIndex);
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
        this.writeMemoryImmediate(opInfo.memoryAddress);
        break;
      case OperatorCode.current_memory:
      case OperatorCode.grow_memory:
        this.writeVarUint(0);
        break;
      case OperatorCode.i32_const:
        this.writeVarInt((<number>opInfo.literal) | 0);
        break;
      case OperatorCode.i64_const:
        this.writeVarInt64(<Int64>opInfo.literal);
        break;
      case OperatorCode.f32_const:
        this.writeFloat32(<number>opInfo.literal);
        break;
      case OperatorCode.f64_const:
        this.writeFloat64(<number>opInfo.literal);
        break;
      case OperatorCode.v128_const:
        this.writeBytes(<Uint8Array>opInfo.literal, 0, 16);
        break;
      case OperatorCode.v8x16_shuffle:
        this.writeBytes(opInfo.lines, 0, 16);
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
        this.writeByte(opInfo.lineIndex);
        break;
    }
  }

  public writeMemorySectionEntry(entry: IMemoryType): void {
    this.ensureState(EmitterState.MemorySection);
    this._sectionEntiesCount++;
    this.writeMemoryType(entry);
  }

  private writeNameMap(map: INaming[]): void {
    this.writeVarUint(map.length);
    map.forEach((naming) => {
      this.writeVarUint(naming.index);
      this.writeString(naming.name);
    });
  }

  public writeNameEntry(entry: INameEntry): void {
    this.ensureState(EmitterState.NameEntry);
    this.writeVarUint(entry.type);
    var payloadLengthPatchable = this.writePatchableVarUint32();
    var start = this._position;
    switch (entry.type) {
      case NameType.Module:
        this.writeString((<IModuleNameEntry>entry).moduleName);
        break;
      case NameType.Function:
        this.writeNameMap((<IFunctionNameEntry>entry).names);
        break;
      case NameType.Local:
        var funcs = (<ILocalNameEntry>entry).funcs;
        this.writeVarUint(funcs.length);
        funcs.forEach((func) => {
          this.writeVarUint(func.index);
          this.writeNameMap(func.locals);
        });
        break;
      default:
        throw new Error(`Unexpected name entry type ${entry.type}`);
    }
    this.patchVarUint32(payloadLengthPatchable, this._position - start);
  }

  public writeRelocHeader(header: IRelocHeader): void {
    this.ensureState(EmitterState.RelocHeader);
    this.writeVarInt(header.id);
    if (header.id == SectionCode.Custom) {
      this.writeString(header.name);
    }
    this.writePatchableSectionEntriesCount();
    this._state = EmitterState.RelocEntry;
  }

  public writeRelocEntry(entry: IRelocEntry): void {
    this.ensureState(EmitterState.RelocEntry);
    this._sectionEntiesCount++;
    this.writeVarUint(entry.type);
    this.writeVarUint(entry.offset);
    this.writeVarUint(entry.index);
    switch (entry.type) {
      case RelocType.FunctionIndex_LEB:
      case RelocType.TableIndex_SLEB:
      case RelocType.TableIndex_I32:
        break;
      case RelocType.GlobalAddr_LEB:
      case RelocType.GlobalAddr_SLEB:
      case RelocType.GlobalAddr_I32:
        this.writeVarUint(entry.addend);
        break;
      default:
        throw new Error(`Unexpected reloc entry type ${entry.type}`);
    }
  }

  public writeLinkingSection(entry: ILinkingEntry): void {
    this.ensureState(EmitterState.LinkingEntry);
    this._sectionEntiesCount++;
    this.writeVarUint(entry.type);
    switch (entry.type) {
      case LinkingType.StackPointer:
        this.writeVarUint(entry.index);
        break;
      default:
        throw new Error(`Unexpected linking entry type ${entry.type}`);
    }
  }

  public writeSourceMappingURL(url: ISourceMappingURL): void {
    this.ensureState(EmitterState.SourceMappingURL);
    this.writeString(url.url);
    this._state = EmitterState.SourceMappingURLEnd;
  }

  public writeEndSection(): void {
    switch (this._state) {
      case EmitterState.TypeSection:
      case EmitterState.ImportSection:
      case EmitterState.FunctionSection:
      case EmitterState.ExportSection:
      case EmitterState.CodeSection:
      case EmitterState.MemorySection:
      case EmitterState.GlobalSection:
      case EmitterState.DataSection:
      case EmitterState.TableSection:
      case EmitterState.ElementSection:
      case EmitterState.RelocEntry:
      case EmitterState.LinkingEntry:
        this.patchVarUint32(
          this._sectionEntiesCountBytes,
          this._sectionEntiesCount
        );
        break;
      case EmitterState.NameEntry:
      case EmitterState.SourceMappingURLEnd:
      case EmitterState.RawDataSection:
        break;
      default:
        throw new Error(
          `Unexpected state: ${this._state} (expected section state)`
        );
    }
    var sectionLength = this._position - this._sectionStart;
    this.patchVarUint32(this._sectionSizeBytes, sectionLength);
    this._state = EmitterState.Wasm;
  }
}
