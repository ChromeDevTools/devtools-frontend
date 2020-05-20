"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Just re-exporting everything.
var WasmParser_js_1 = require("./WasmParser.js");
exports.SectionCode = WasmParser_js_1.SectionCode;
exports.OperatorCode = WasmParser_js_1.OperatorCode;
exports.OperatorCodeNames = WasmParser_js_1.OperatorCodeNames;
exports.ExternalKind = WasmParser_js_1.ExternalKind;
exports.Type = WasmParser_js_1.Type;
exports.RelocType = WasmParser_js_1.RelocType;
exports.LinkingType = WasmParser_js_1.LinkingType;
exports.NameType = WasmParser_js_1.NameType;
exports.BinaryReaderState = WasmParser_js_1.BinaryReaderState;
exports.Int64 = WasmParser_js_1.Int64;
exports.BinaryReader = WasmParser_js_1.BinaryReader;
exports.bytesToString = WasmParser_js_1.bytesToString;
var WasmEmitter_js_1 = require("./WasmEmitter.js");
exports.Emitter = WasmEmitter_js_1.Emitter;
var WasmParserTransform_js_1 = require("./WasmParserTransform.js");
exports.BinaryReaderTransform = WasmParserTransform_js_1.BinaryReaderTransform;
var WasmDis_js_1 = require("./WasmDis.js");
exports.DefaultNameResolver = WasmDis_js_1.DefaultNameResolver;
exports.NumericNameResolver = WasmDis_js_1.NumericNameResolver;
exports.WasmDisassembler = WasmDis_js_1.WasmDisassembler;
exports.LabelMode = WasmDis_js_1.LabelMode;
//# sourceMappingURL=index.js.map