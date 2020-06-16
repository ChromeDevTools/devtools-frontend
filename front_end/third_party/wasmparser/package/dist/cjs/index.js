"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Just re-exporting everything.
var WasmParser_js_1 = require("./WasmParser.js");
Object.defineProperty(exports, "SectionCode", { enumerable: true, get: function () { return WasmParser_js_1.SectionCode; } });
Object.defineProperty(exports, "OperatorCode", { enumerable: true, get: function () { return WasmParser_js_1.OperatorCode; } });
Object.defineProperty(exports, "OperatorCodeNames", { enumerable: true, get: function () { return WasmParser_js_1.OperatorCodeNames; } });
Object.defineProperty(exports, "ExternalKind", { enumerable: true, get: function () { return WasmParser_js_1.ExternalKind; } });
Object.defineProperty(exports, "Type", { enumerable: true, get: function () { return WasmParser_js_1.Type; } });
Object.defineProperty(exports, "RelocType", { enumerable: true, get: function () { return WasmParser_js_1.RelocType; } });
Object.defineProperty(exports, "LinkingType", { enumerable: true, get: function () { return WasmParser_js_1.LinkingType; } });
Object.defineProperty(exports, "NameType", { enumerable: true, get: function () { return WasmParser_js_1.NameType; } });
Object.defineProperty(exports, "BinaryReaderState", { enumerable: true, get: function () { return WasmParser_js_1.BinaryReaderState; } });
Object.defineProperty(exports, "Int64", { enumerable: true, get: function () { return WasmParser_js_1.Int64; } });
Object.defineProperty(exports, "BinaryReader", { enumerable: true, get: function () { return WasmParser_js_1.BinaryReader; } });
Object.defineProperty(exports, "bytesToString", { enumerable: true, get: function () { return WasmParser_js_1.bytesToString; } });
var WasmEmitter_js_1 = require("./WasmEmitter.js");
Object.defineProperty(exports, "Emitter", { enumerable: true, get: function () { return WasmEmitter_js_1.Emitter; } });
var WasmParserTransform_js_1 = require("./WasmParserTransform.js");
Object.defineProperty(exports, "BinaryReaderTransform", { enumerable: true, get: function () { return WasmParserTransform_js_1.BinaryReaderTransform; } });
var WasmDis_js_1 = require("./WasmDis.js");
Object.defineProperty(exports, "DefaultNameResolver", { enumerable: true, get: function () { return WasmDis_js_1.DefaultNameResolver; } });
Object.defineProperty(exports, "NumericNameResolver", { enumerable: true, get: function () { return WasmDis_js_1.NumericNameResolver; } });
Object.defineProperty(exports, "WasmDisassembler", { enumerable: true, get: function () { return WasmDis_js_1.WasmDisassembler; } });
Object.defineProperty(exports, "LabelMode", { enumerable: true, get: function () { return WasmDis_js_1.LabelMode; } });
//# sourceMappingURL=index.js.map