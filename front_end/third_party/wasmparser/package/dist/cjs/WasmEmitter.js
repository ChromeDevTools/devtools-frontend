"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emitter = void 0;
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
var WasmParser_js_1 = require("./WasmParser.js");
var EmitterState;
(function (EmitterState) {
    EmitterState[EmitterState["Initial"] = 0] = "Initial";
    EmitterState[EmitterState["Error"] = 1] = "Error";
    EmitterState[EmitterState["Wasm"] = 2] = "Wasm";
    EmitterState[EmitterState["CustomSecton"] = 3] = "CustomSecton";
    EmitterState[EmitterState["TypeSection"] = 4] = "TypeSection";
    EmitterState[EmitterState["ImportSection"] = 5] = "ImportSection";
    EmitterState[EmitterState["FunctionSection"] = 6] = "FunctionSection";
    EmitterState[EmitterState["TableSection"] = 7] = "TableSection";
    EmitterState[EmitterState["MemorySection"] = 8] = "MemorySection";
    EmitterState[EmitterState["GlobalSection"] = 9] = "GlobalSection";
    EmitterState[EmitterState["ExportSection"] = 10] = "ExportSection";
    EmitterState[EmitterState["StartSection"] = 11] = "StartSection";
    EmitterState[EmitterState["ElementSection"] = 12] = "ElementSection";
    EmitterState[EmitterState["CodeSection"] = 13] = "CodeSection";
    EmitterState[EmitterState["DataSection"] = 14] = "DataSection";
    EmitterState[EmitterState["FunctionBody"] = 15] = "FunctionBody";
    EmitterState[EmitterState["DataSectionEntry"] = 16] = "DataSectionEntry";
    EmitterState[EmitterState["DataSectionEntryBody"] = 17] = "DataSectionEntryBody";
    EmitterState[EmitterState["DataSectionEntryEnd"] = 18] = "DataSectionEntryEnd";
    EmitterState[EmitterState["InitExpression"] = 19] = "InitExpression";
    EmitterState[EmitterState["ElementSectionEntry"] = 20] = "ElementSectionEntry";
    EmitterState[EmitterState["ElementSectionEntryBody"] = 21] = "ElementSectionEntryBody";
    EmitterState[EmitterState["ElementSectionEntryEnd"] = 22] = "ElementSectionEntryEnd";
    EmitterState[EmitterState["GlobalSectionEntry"] = 23] = "GlobalSectionEntry";
    EmitterState[EmitterState["GlobalSectionEntryEnd"] = 24] = "GlobalSectionEntryEnd";
    EmitterState[EmitterState["RawDataSection"] = 25] = "RawDataSection";
    EmitterState[EmitterState["NameEntry"] = 26] = "NameEntry";
    EmitterState[EmitterState["RelocHeader"] = 27] = "RelocHeader";
    EmitterState[EmitterState["RelocEntry"] = 28] = "RelocEntry";
    EmitterState[EmitterState["LinkingEntry"] = 29] = "LinkingEntry";
    EmitterState[EmitterState["SourceMappingURL"] = 30] = "SourceMappingURL";
    EmitterState[EmitterState["SourceMappingURLEnd"] = 31] = "SourceMappingURLEnd";
})(EmitterState || (EmitterState = {}));
var Emitter = /** @class */ (function () {
    function Emitter() {
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
    Object.defineProperty(Emitter.prototype, "data", {
        get: function () {
            return this._data;
        },
        enumerable: false,
        configurable: true
    });
    Emitter.prototype.write = function (reader) {
        this.writeStateAndResult(reader.state, reader.result);
    };
    Emitter.prototype.writeData = function (data) {
        this.writeStateAndResult(data.state, data.result || null);
    };
    Emitter.prototype.writeStateAndResult = function (state, result) {
        switch (state) {
            case 1 /* BEGIN_WASM */:
                this.writeBeginWasm(result);
                break;
            case 2 /* END_WASM */:
                this.writeEndWasm();
                break;
            case 3 /* BEGIN_SECTION */:
                this.writeBeginSection(result);
                break;
            case 4 /* END_SECTION */:
                this.writeEndSection();
                break;
            case 11 /* TYPE_SECTION_ENTRY */:
                this.writeTypeSectionEntry(result);
                break;
            case 12 /* IMPORT_SECTION_ENTRY */:
                this.writeImportSectionEntry(result);
                break;
            case 13 /* FUNCTION_SECTION_ENTRY */:
                this.writeFunctionSectionEntry(result);
                break;
            case 17 /* EXPORT_SECTION_ENTRY */:
                this.writeExportSectionEntry(result);
                break;
            case 28 /* BEGIN_FUNCTION_BODY */:
                this.writeBeginFunctionBody(result);
                break;
            case 31 /* END_FUNCTION_BODY */:
                this.writeEndFunctionBody();
                break;
            case 15 /* MEMORY_SECTION_ENTRY */:
                this.writeMemorySectionEntry(result);
                break;
            case 26 /* INIT_EXPRESSION_OPERATOR */:
            case 30 /* CODE_OPERATOR */:
                this.writeOperator(result);
                break;
            case 36 /* BEGIN_DATA_SECTION_ENTRY */:
                this.writeBeginDataSectionEntry(result);
                break;
            case 37 /* DATA_SECTION_ENTRY_BODY */:
                this.writeDataSectionBody(result);
                break;
            case 38 /* END_DATA_SECTION_ENTRY */:
                this.writeEndDataSectionEntry();
                break;
            case 25 /* BEGIN_INIT_EXPRESSION_BODY */:
                this.writeBeginInitExpression();
                break;
            case 27 /* END_INIT_EXPRESSION_BODY */:
                this.writeEndInitExpression();
                break;
            case 14 /* TABLE_SECTION_ENTRY */:
                this.writeTableSectionEntry(result);
                break;
            case 33 /* BEGIN_ELEMENT_SECTION_ENTRY */:
                this.writeBeginElementSectionEntry(result);
                break;
            case 35 /* END_ELEMENT_SECTION_ENTRY */:
                this.writeEndElementSectionEntry();
                break;
            case 34 /* ELEMENT_SECTION_ENTRY_BODY */:
                this.writeElementSectionBody(result);
                break;
            case 39 /* BEGIN_GLOBAL_SECTION_ENTRY */:
                this.writeBeginGlobalSectionEntry(result);
                break;
            case 40 /* END_GLOBAL_SECTION_ENTRY */:
                this.writeEndGlobalSectionEntry();
                break;
            case 7 /* SECTION_RAW_DATA */:
                this.writeSectionRawData(result);
                break;
            case 19 /* NAME_SECTION_ENTRY */:
                this.writeNameEntry(result);
                break;
            case 41 /* RELOC_SECTION_HEADER */:
                this.writeRelocHeader(result);
                break;
            case 42 /* RELOC_SECTION_ENTRY */:
                this.writeRelocEntry(result);
                break;
            case 21 /* LINKING_SECTION_ENTRY */:
                this.writeLinkingSection(result);
                break;
            case 43 /* SOURCE_MAPPING_URL */:
                this.writeSourceMappingURL(result);
                break;
            default:
                throw new Error("Invalid state: " + state);
        }
    };
    Emitter.prototype.writeByte = function (byte) {
        this._buffer.push(byte);
    };
    Emitter.prototype.writeMutiple = function () {
        var _a;
        var bytes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            bytes[_i] = arguments[_i];
        }
        (_a = this._buffer).push.apply(_a, bytes);
    };
    Object.defineProperty(Emitter.prototype, "_position", {
        get: function () {
            return this._buffer.length;
        },
        enumerable: false,
        configurable: true
    });
    Emitter.prototype.patchByte = function (pos, byte) {
        this._buffer[pos] = byte;
    };
    Emitter.prototype.writeVarUint = function (n) {
        while (n & ~0x7f) {
            this.writeByte(0x80 | (n & 0x7f));
            n >>>= 7;
        }
        this.writeByte(n);
    };
    Emitter.prototype.writeVarInt = function (n) {
        n |= 0;
        var test = n >> 31;
        while (n >> 6 != test) {
            this.writeByte(0x80 | (n & 0x7f));
            n >>= 7;
        }
        this.writeByte(n & 0x7f);
    };
    Emitter.prototype.writePatchableVarUint32 = function () {
        var pos = this._position;
        this.writeMutiple(0x80, 0x80, 0x80, 0x80, 0x00);
        return pos;
    };
    Emitter.prototype.writePatchableSectionEntriesCount = function () {
        this._sectionEntiesCountBytes = this.writePatchableVarUint32();
        this._sectionEntiesCount = 0;
    };
    Emitter.prototype.writeBytes = function (bytes, start, end) {
        for (var i = start; i < end; i++)
            this.writeByte(bytes[i]);
    };
    Emitter.prototype.writeString = function (str) {
        this.writeVarUint(str.length);
        this.writeBytes(str, 0, str.length);
    };
    Emitter.prototype.patchVarUint32 = function (pos, n) {
        this.patchByte(pos, 0x80 | (n & 0x7f));
        this.patchByte(pos + 1, 0x80 | ((n >>> 7) & 0x7f));
        this.patchByte(pos + 2, 0x80 | ((n >>> 14) & 0x7f));
        this.patchByte(pos + 3, 0x80 | ((n >>> 21) & 0x7f));
        this.patchByte(pos + 4, (n >>> 28) & 0x7f);
    };
    Emitter.prototype.ensureState = function (state) {
        if (this._state !== state)
            throw new Error("Unexpected state: " + this._state + " (expected " + state + ").");
    };
    Emitter.prototype.ensureEitherState = function (states) {
        if (states.indexOf(this._state) < 0)
            throw new Error("Unexpected state: " + this._state + " (expected one of " + states + ").");
    };
    Emitter.prototype.ensureEndOperatorWritten = function () {
        if (!this._endWritten)
            throw new Error("End as a last written operator is expected.");
    };
    Emitter.prototype.writeBeginWasm = function (header) {
        this.ensureState(EmitterState.Initial);
        this.writeMutiple(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
        this._state = EmitterState.Wasm;
    };
    Emitter.prototype.writeEndWasm = function () {
        this.ensureState(EmitterState.Wasm);
        this._state = EmitterState.Initial;
        this._data = new Uint8Array(this._buffer);
        this._buffer.length = 0;
    };
    Emitter.prototype.writeBeginSection = function (section) {
        this.ensureState(EmitterState.Wasm);
        this.writeVarUint(section.id);
        this._sectionSizeBytes = this.writePatchableVarUint32();
        this._sectionStart = this._position;
        switch (section.id) {
            case 0 /* Custom */:
                this.writeString(section.name);
                var sectionName = WasmParser_js_1.bytesToString(section.name);
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
                throw new Error("Unexpected section " + section.id);
            case 1 /* Type */:
                this._state = EmitterState.TypeSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 2 /* Import */:
                this._state = EmitterState.ImportSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 3 /* Function */:
                this._state = EmitterState.FunctionSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 7 /* Export */:
                this._state = EmitterState.ExportSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 10 /* Code */:
                this._state = EmitterState.CodeSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 5 /* Memory */:
                this._state = EmitterState.MemorySection;
                this.writePatchableSectionEntriesCount();
                break;
            case 6 /* Global */:
                this._state = EmitterState.GlobalSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 11 /* Data */:
                this._state = EmitterState.DataSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 4 /* Table */:
                this._state = EmitterState.TableSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 9 /* Element */:
                this._state = EmitterState.ElementSection;
                this.writePatchableSectionEntriesCount();
                break;
            case 6 /* Global */:
                this._state = EmitterState.GlobalSection;
                this.writePatchableSectionEntriesCount();
                break;
        }
    };
    Emitter.prototype.writeBeginSectionRawData = function (section) {
        this.ensureState(EmitterState.Wasm);
        this.writeVarUint(section.id);
        if (section.id == 0 /* Custom */) {
            this.writeString(section.name);
        }
        this._state = EmitterState.RawDataSection;
    };
    Emitter.prototype.writeSectionRawData = function (bytes) {
        this.ensureState(EmitterState.RawDataSection);
        this.writeBytes(bytes, 0, bytes.length);
    };
    Emitter.prototype.writeFuncType = function (type) {
        this.writeVarInt(type.form);
        this.writeVarUint(type.params.length);
        for (var i = 0; i < type.params.length; i++)
            this.writeVarInt(type.params[i]);
        this.writeVarUint(type.returns.length);
        for (var i = 0; i < type.returns.length; i++)
            this.writeVarInt(type.returns[i]);
    };
    Emitter.prototype.writeTypeSectionEntry = function (type) {
        this.ensureState(EmitterState.TypeSection);
        this._sectionEntiesCount++;
        this.writeFuncType(type);
    };
    Emitter.prototype.writeResizableLimits = function (limits) {
        var flags = limits.maximum == undefined ? 0 : 1;
        this.writeVarUint(flags);
        this.writeVarUint(limits.initial);
        if (flags)
            this.writeVarUint(limits.maximum);
    };
    Emitter.prototype.writeTableType = function (type) {
        this.writeVarInt(type.elementType);
        this.writeResizableLimits(type.limits);
    };
    Emitter.prototype.writeMemoryType = function (type) {
        this.writeResizableLimits(type.limits);
    };
    Emitter.prototype.writeGlobalType = function (type) {
        this.writeVarInt(type.contentType);
        this.writeVarUint(type.mutability);
    };
    Emitter.prototype.writeImportSectionEntry = function (entry) {
        this.ensureState(EmitterState.ImportSection);
        this._sectionEntiesCount++;
        this.writeString(entry.module);
        this.writeString(entry.field);
        this.writeByte(entry.kind);
        switch (entry.kind) {
            case 0 /* Function */:
                this.writeVarUint(entry.funcTypeIndex);
                break;
            case 1 /* Table */:
                this.writeTableType(entry.type);
                break;
            case 2 /* Memory */:
                this.writeMemoryType(entry.type);
                break;
            case 3 /* Global */:
                this.writeGlobalType(entry.type);
                break;
            default:
                throw new Error("Invalid import kind: " + entry.kind);
        }
    };
    Emitter.prototype.writeFunctionSectionEntry = function (entry) {
        this.ensureState(EmitterState.FunctionSection);
        this._sectionEntiesCount++;
        this.writeVarUint(entry.typeIndex);
    };
    Emitter.prototype.writeExportSectionEntry = function (entry) {
        this.ensureState(EmitterState.ExportSection);
        this._sectionEntiesCount++;
        this.writeString(entry.field);
        this.writeByte(entry.kind);
        this.writeVarUint(entry.index);
    };
    Emitter.prototype.writeBeginFunctionBody = function (functionInfo) {
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
    };
    Emitter.prototype.writeEndFunctionBody = function () {
        this.ensureState(EmitterState.FunctionBody);
        this.ensureEndOperatorWritten();
        var bodySize = this._position - this._bodyStart;
        this.patchVarUint32(this._bodySizeBytes, bodySize);
        this._state = EmitterState.CodeSection;
    };
    Emitter.prototype.writeBeginDataSectionEntry = function (entry) {
        this.ensureState(EmitterState.DataSection);
        this._sectionEntiesCount++;
        this.writeVarUint(entry.index);
        this._state = EmitterState.DataSectionEntry;
    };
    Emitter.prototype.writeDataSectionBody = function (body) {
        this.ensureState(EmitterState.DataSectionEntryBody);
        this.writeString(body.data);
        this._state = EmitterState.DataSectionEntryEnd;
    };
    Emitter.prototype.writeEndDataSectionEntry = function () {
        this.ensureState(EmitterState.DataSectionEntryEnd);
        this._state = EmitterState.DataSection;
    };
    Emitter.prototype.writeTableSectionEntry = function (entry) {
        this.ensureState(EmitterState.TableSection);
        this._sectionEntiesCount++;
        this.writeVarInt(entry.elementType);
        this.writeResizableLimits(entry.limits);
    };
    Emitter.prototype.writeBeginElementSectionEntry = function (entry) {
        this.ensureState(EmitterState.ElementSection);
        this._sectionEntiesCount++;
        this.writeVarUint(entry.index);
        this._state = EmitterState.ElementSectionEntry;
    };
    Emitter.prototype.writeElementSectionBody = function (body) {
        this.ensureState(EmitterState.ElementSectionEntryBody);
        this.writeVarUint(body.elements.length);
        for (var i = 0; i < body.elements.length; i++)
            this.writeVarUint(body.elements[i]);
        this._state = EmitterState.ElementSectionEntryEnd;
    };
    Emitter.prototype.writeEndElementSectionEntry = function () {
        this.ensureState(EmitterState.ElementSectionEntryEnd);
        this._state = EmitterState.ElementSection;
    };
    Emitter.prototype.writeBeginGlobalSectionEntry = function (entry) {
        this.ensureState(EmitterState.GlobalSection);
        this._sectionEntiesCount++;
        this.writeGlobalType(entry.type);
        this._state = EmitterState.GlobalSectionEntry;
    };
    Emitter.prototype.writeEndGlobalSectionEntry = function () {
        this.ensureState(EmitterState.GlobalSectionEntryEnd);
        this._state = EmitterState.GlobalSection;
    };
    Emitter.prototype.writeBeginInitExpression = function () {
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
                throw new Error("Unexpected state " + this._state + " at writeEndInitExpression");
        }
        this._endWritten = false;
        this._state = EmitterState.InitExpression;
    };
    Emitter.prototype.writeEndInitExpression = function () {
        this.ensureState(EmitterState.InitExpression);
        this.ensureEndOperatorWritten();
        this._state = this._initExpressionAfterState;
    };
    Emitter.prototype.writeMemoryImmediate = function (address) {
        this.writeVarUint(address.flags);
        this.writeVarUint(address.offset);
    };
    Emitter.prototype.writeVarInt64 = function (n) {
        var pos = 0, end = 7;
        var highBit = n.data[end] & 0x80;
        var optionalBits = highBit ? 0xff : 0;
        while (end > 0 && n.data[end] === optionalBits) {
            end--;
        }
        var buffer = n.data[pos], buffered = 8;
        do {
            this.writeByte(0x80 | (buffer & 0x7f));
            buffer >>= 7;
            buffered -= 7;
            if (buffered > 7)
                continue;
            if (pos < end) {
                ++pos;
                buffer |= n.data[pos] << buffered;
                buffered += 8;
            }
            else if (pos == end &&
                buffer === 7 &&
                (n.data[pos] & 0x80) !== highBit) {
                ++pos;
                buffer |= optionalBits << buffered;
                buffered += 8;
            }
        } while (buffered > 7);
        buffer |= optionalBits << buffered;
        this.writeByte(buffer & 0x7f);
    };
    Emitter.prototype.writeFloat32 = function (n) {
        var data = new Uint8Array(4);
        new DataView(data.buffer, 0).setFloat32(0, n, true);
        this.writeBytes(data, 0, data.length);
    };
    Emitter.prototype.writeFloat64 = function (n) {
        var data = new Uint8Array(8);
        new DataView(data.buffer, 0).setFloat64(0, n, true);
        this.writeBytes(data, 0, data.length);
    };
    Emitter.prototype.writeOperator = function (opInfo) {
        this.ensureEitherState([
            EmitterState.FunctionBody,
            EmitterState.InitExpression,
        ]);
        if (opInfo.code < 0x100) {
            this.writeByte(opInfo.code);
        }
        else {
            this.writeByte(opInfo.code >> 8);
            this.writeVarUint(opInfo.code & 255);
        }
        this._endWritten = opInfo.code == 11 /* end */;
        switch (opInfo.code) {
            case 2 /* block */:
            case 3 /* loop */:
            case 4 /* if */:
                this.writeVarInt(opInfo.blockType);
                break;
            case 12 /* br */:
            case 13 /* br_if */:
                this.writeVarUint(opInfo.brDepth);
                break;
            case 14 /* br_table */:
                var tableCount = opInfo.brTable.length - 1;
                this.writeVarUint(tableCount);
                for (var i = 0; i <= tableCount; i++) {
                    // including default
                    this.writeVarUint(opInfo.brTable[i]);
                }
                break;
            case 16 /* call */:
                this.writeVarUint(opInfo.funcIndex);
                break;
            case 17 /* call_indirect */:
                this.writeVarUint(opInfo.typeIndex);
                this.writeVarUint(0);
                break;
            case 32 /* local_get */:
            case 33 /* local_set */:
            case 34 /* local_tee */:
                this.writeVarUint(opInfo.localIndex);
                break;
            case 35 /* global_get */:
            case 36 /* global_set */:
                this.writeVarUint(opInfo.globalIndex);
                break;
            case 40 /* i32_load */:
            case 41 /* i64_load */:
            case 42 /* f32_load */:
            case 43 /* f64_load */:
            case 44 /* i32_load8_s */:
            case 45 /* i32_load8_u */:
            case 46 /* i32_load16_s */:
            case 47 /* i32_load16_u */:
            case 48 /* i64_load8_s */:
            case 49 /* i64_load8_u */:
            case 50 /* i64_load16_s */:
            case 51 /* i64_load16_u */:
            case 52 /* i64_load32_s */:
            case 53 /* i64_load32_u */:
            case 54 /* i32_store */:
            case 55 /* i64_store */:
            case 56 /* f32_store */:
            case 57 /* f64_store */:
            case 58 /* i32_store8 */:
            case 59 /* i32_store16 */:
            case 60 /* i64_store8 */:
            case 61 /* i64_store16 */:
            case 62 /* i64_store32 */:
            case 65024 /* atomic_notify */:
            case 65025 /* i32_atomic_wait */:
            case 65026 /* i64_atomic_wait */:
            case 65040 /* i32_atomic_load */:
            case 65041 /* i64_atomic_load */:
            case 65042 /* i32_atomic_load8_u */:
            case 65043 /* i32_atomic_load16_u */:
            case 65044 /* i64_atomic_load8_u */:
            case 65045 /* i64_atomic_load16_u */:
            case 65046 /* i64_atomic_load32_u */:
            case 65047 /* i32_atomic_store */:
            case 65048 /* i64_atomic_store */:
            case 65049 /* i32_atomic_store8 */:
            case 65050 /* i32_atomic_store16 */:
            case 65051 /* i64_atomic_store8 */:
            case 65052 /* i64_atomic_store16 */:
            case 65053 /* i64_atomic_store32 */:
            case 65054 /* i32_atomic_rmw_add */:
            case 65055 /* i64_atomic_rmw_add */:
            case 65056 /* i32_atomic_rmw8_add_u */:
            case 65057 /* i32_atomic_rmw16_add_u */:
            case 65058 /* i64_atomic_rmw8_add_u */:
            case 65059 /* i64_atomic_rmw16_add_u */:
            case 65060 /* i64_atomic_rmw32_add_u */:
            case 65061 /* i32_atomic_rmw_sub */:
            case 65062 /* i64_atomic_rmw_sub */:
            case 65063 /* i32_atomic_rmw8_sub_u */:
            case 65064 /* i32_atomic_rmw16_sub_u */:
            case 65065 /* i64_atomic_rmw8_sub_u */:
            case 65066 /* i64_atomic_rmw16_sub_u */:
            case 65067 /* i64_atomic_rmw32_sub_u */:
            case 65068 /* i32_atomic_rmw_and */:
            case 65069 /* i64_atomic_rmw_and */:
            case 65070 /* i32_atomic_rmw8_and_u */:
            case 65071 /* i32_atomic_rmw16_and_u */:
            case 65072 /* i64_atomic_rmw8_and_u */:
            case 65073 /* i64_atomic_rmw16_and_u */:
            case 65074 /* i64_atomic_rmw32_and_u */:
            case 65075 /* i32_atomic_rmw_or */:
            case 65076 /* i64_atomic_rmw_or */:
            case 65077 /* i32_atomic_rmw8_or_u */:
            case 65078 /* i32_atomic_rmw16_or_u */:
            case 65079 /* i64_atomic_rmw8_or_u */:
            case 65080 /* i64_atomic_rmw16_or_u */:
            case 65081 /* i64_atomic_rmw32_or_u */:
            case 65082 /* i32_atomic_rmw_xor */:
            case 65083 /* i64_atomic_rmw_xor */:
            case 65084 /* i32_atomic_rmw8_xor_u */:
            case 65085 /* i32_atomic_rmw16_xor_u */:
            case 65086 /* i64_atomic_rmw8_xor_u */:
            case 65087 /* i64_atomic_rmw16_xor_u */:
            case 65088 /* i64_atomic_rmw32_xor_u */:
            case 65089 /* i32_atomic_rmw_xchg */:
            case 65090 /* i64_atomic_rmw_xchg */:
            case 65091 /* i32_atomic_rmw8_xchg_u */:
            case 65092 /* i32_atomic_rmw16_xchg_u */:
            case 65093 /* i64_atomic_rmw8_xchg_u */:
            case 65094 /* i64_atomic_rmw16_xchg_u */:
            case 65095 /* i64_atomic_rmw32_xchg_u */:
            case 65096 /* i32_atomic_rmw_cmpxchg */:
            case 65097 /* i64_atomic_rmw_cmpxchg */:
            case 65098 /* i32_atomic_rmw8_cmpxchg_u */:
            case 65099 /* i32_atomic_rmw16_cmpxchg_u */:
            case 65100 /* i64_atomic_rmw8_cmpxchg_u */:
            case 65101 /* i64_atomic_rmw16_cmpxchg_u */:
            case 65102 /* i64_atomic_rmw32_cmpxchg_u */:
            case 64768 /* v128_load */:
            case 64779 /* v128_store */:
                this.writeMemoryImmediate(opInfo.memoryAddress);
                break;
            case 63 /* current_memory */:
            case 64 /* grow_memory */:
                this.writeVarUint(0);
                break;
            case 65 /* i32_const */:
                this.writeVarInt(opInfo.literal | 0);
                break;
            case 66 /* i64_const */:
                this.writeVarInt64(opInfo.literal);
                break;
            case 67 /* f32_const */:
                this.writeFloat32(opInfo.literal);
                break;
            case 68 /* f64_const */:
                this.writeFloat64(opInfo.literal);
                break;
            case 64780 /* v128_const */:
                this.writeBytes(opInfo.literal, 0, 16);
                break;
            case 64781 /* v8x16_shuffle */:
                this.writeBytes(opInfo.lines, 0, 16);
                break;
            case 64789 /* i8x16_extract_lane_s */:
            case 64790 /* i8x16_extract_lane_u */:
            case 64791 /* i8x16_replace_lane */:
            case 64792 /* i16x8_extract_lane_s */:
            case 64793 /* i16x8_extract_lane_u */:
            case 64794 /* i16x8_replace_lane */:
            case 64795 /* i32x4_extract_lane */:
            case 64796 /* i32x4_replace_lane */:
            case 64799 /* f32x4_extract_lane */:
            case 64800 /* f32x4_replace_lane */:
            case 64797 /* i64x2_extract_lane */:
            case 64798 /* i64x2_replace_lane */:
            case 64801 /* f64x2_extract_lane */:
            case 64802 /* f64x2_replace_lane */:
                this.writeByte(opInfo.lineIndex);
                break;
        }
    };
    Emitter.prototype.writeMemorySectionEntry = function (entry) {
        this.ensureState(EmitterState.MemorySection);
        this._sectionEntiesCount++;
        this.writeMemoryType(entry);
    };
    Emitter.prototype.writeNameMap = function (map) {
        var _this = this;
        this.writeVarUint(map.length);
        map.forEach(function (naming) {
            _this.writeVarUint(naming.index);
            _this.writeString(naming.name);
        });
    };
    Emitter.prototype.writeNameEntry = function (entry) {
        var _this = this;
        this.ensureState(EmitterState.NameEntry);
        this.writeVarUint(entry.type);
        var payloadLengthPatchable = this.writePatchableVarUint32();
        var start = this._position;
        switch (entry.type) {
            case 0 /* Module */:
                this.writeString(entry.moduleName);
                break;
            case 1 /* Function */:
                this.writeNameMap(entry.names);
                break;
            case 2 /* Local */:
                var funcs = entry.funcs;
                this.writeVarUint(funcs.length);
                funcs.forEach(function (func) {
                    _this.writeVarUint(func.index);
                    _this.writeNameMap(func.locals);
                });
                break;
            default:
                throw new Error("Unexpected name entry type " + entry.type);
        }
        this.patchVarUint32(payloadLengthPatchable, this._position - start);
    };
    Emitter.prototype.writeRelocHeader = function (header) {
        this.ensureState(EmitterState.RelocHeader);
        this.writeVarInt(header.id);
        if (header.id == 0 /* Custom */) {
            this.writeString(header.name);
        }
        this.writePatchableSectionEntriesCount();
        this._state = EmitterState.RelocEntry;
    };
    Emitter.prototype.writeRelocEntry = function (entry) {
        this.ensureState(EmitterState.RelocEntry);
        this._sectionEntiesCount++;
        this.writeVarUint(entry.type);
        this.writeVarUint(entry.offset);
        this.writeVarUint(entry.index);
        switch (entry.type) {
            case 0 /* FunctionIndex_LEB */:
            case 1 /* TableIndex_SLEB */:
            case 2 /* TableIndex_I32 */:
                break;
            case 3 /* GlobalAddr_LEB */:
            case 4 /* GlobalAddr_SLEB */:
            case 5 /* GlobalAddr_I32 */:
                this.writeVarUint(entry.addend);
                break;
            default:
                throw new Error("Unexpected reloc entry type " + entry.type);
        }
    };
    Emitter.prototype.writeLinkingSection = function (entry) {
        this.ensureState(EmitterState.LinkingEntry);
        this._sectionEntiesCount++;
        this.writeVarUint(entry.type);
        switch (entry.type) {
            case 1 /* StackPointer */:
                this.writeVarUint(entry.index);
                break;
            default:
                throw new Error("Unexpected linking entry type " + entry.type);
        }
    };
    Emitter.prototype.writeSourceMappingURL = function (url) {
        this.ensureState(EmitterState.SourceMappingURL);
        this.writeString(url.url);
        this._state = EmitterState.SourceMappingURLEnd;
    };
    Emitter.prototype.writeEndSection = function () {
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
                this.patchVarUint32(this._sectionEntiesCountBytes, this._sectionEntiesCount);
                break;
            case EmitterState.NameEntry:
            case EmitterState.SourceMappingURLEnd:
            case EmitterState.RawDataSection:
                break;
            default:
                throw new Error("Unexpected state: " + this._state + " (expected section state)");
        }
        var sectionLength = this._position - this._sectionStart;
        this.patchVarUint32(this._sectionSizeBytes, sectionLength);
        this._state = EmitterState.Wasm;
    };
    return Emitter;
}());
exports.Emitter = Emitter;
//# sourceMappingURL=WasmEmitter.js.map