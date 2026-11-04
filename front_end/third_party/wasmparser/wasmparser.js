var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/third_party/wasmparser/package/dist/esm/WasmDis.js
var WasmDis_exports = {};
__export(WasmDis_exports, {
  DefaultNameResolver: () => DefaultNameResolver,
  DevToolsNameGenerator: () => DevToolsNameGenerator,
  DevToolsNameResolver: () => DevToolsNameResolver,
  LabelMode: () => LabelMode,
  NameSectionReader: () => NameSectionReader,
  NumericNameResolver: () => NumericNameResolver,
  WasmDisassembler: () => WasmDisassembler
});

// ../../front_end/third_party/wasmparser/package/dist/esm/WasmParser.js
var WasmParser_exports = {};
__export(WasmParser_exports, {
  BinaryReader: () => BinaryReader,
  BinaryReaderState: () => BinaryReaderState,
  DataMode: () => DataMode,
  ElementMode: () => ElementMode,
  ExternalKind: () => ExternalKind,
  Int64: () => Int64,
  LinkingType: () => LinkingType,
  NameType: () => NameType,
  OperatorCode: () => OperatorCode,
  OperatorCodeNames: () => OperatorCodeNames,
  RelocType: () => RelocType,
  SectionCode: () => SectionCode,
  Type: () => Type,
  TypeKind: () => TypeKind,
  bytesToString: () => bytesToString
});
var WASM_MAGIC_NUMBER = 1836278016;
var WASM_SUPPORTED_EXPERIMENTAL_VERSION = 13;
var WASM_SUPPORTED_VERSION = 1;
var SectionCode;
(function(SectionCode2) {
  SectionCode2[SectionCode2["Unknown"] = -1] = "Unknown";
  SectionCode2[SectionCode2["Custom"] = 0] = "Custom";
  SectionCode2[SectionCode2["Type"] = 1] = "Type";
  SectionCode2[SectionCode2["Import"] = 2] = "Import";
  SectionCode2[SectionCode2["Function"] = 3] = "Function";
  SectionCode2[SectionCode2["Table"] = 4] = "Table";
  SectionCode2[SectionCode2["Memory"] = 5] = "Memory";
  SectionCode2[SectionCode2["Global"] = 6] = "Global";
  SectionCode2[SectionCode2["Export"] = 7] = "Export";
  SectionCode2[SectionCode2["Start"] = 8] = "Start";
  SectionCode2[SectionCode2["Element"] = 9] = "Element";
  SectionCode2[SectionCode2["Code"] = 10] = "Code";
  SectionCode2[SectionCode2["Data"] = 11] = "Data";
  SectionCode2[SectionCode2["Event"] = 13] = "Event";
})(SectionCode || (SectionCode = {}));
var OperatorCode;
(function(OperatorCode2) {
  OperatorCode2[OperatorCode2["unreachable"] = 0] = "unreachable";
  OperatorCode2[OperatorCode2["nop"] = 1] = "nop";
  OperatorCode2[OperatorCode2["block"] = 2] = "block";
  OperatorCode2[OperatorCode2["loop"] = 3] = "loop";
  OperatorCode2[OperatorCode2["if"] = 4] = "if";
  OperatorCode2[OperatorCode2["else"] = 5] = "else";
  OperatorCode2[OperatorCode2["try"] = 6] = "try";
  OperatorCode2[OperatorCode2["catch"] = 7] = "catch";
  OperatorCode2[OperatorCode2["throw"] = 8] = "throw";
  OperatorCode2[OperatorCode2["rethrow"] = 9] = "rethrow";
  OperatorCode2[OperatorCode2["unwind"] = 10] = "unwind";
  OperatorCode2[OperatorCode2["end"] = 11] = "end";
  OperatorCode2[OperatorCode2["br"] = 12] = "br";
  OperatorCode2[OperatorCode2["br_if"] = 13] = "br_if";
  OperatorCode2[OperatorCode2["br_table"] = 14] = "br_table";
  OperatorCode2[OperatorCode2["return"] = 15] = "return";
  OperatorCode2[OperatorCode2["call"] = 16] = "call";
  OperatorCode2[OperatorCode2["call_indirect"] = 17] = "call_indirect";
  OperatorCode2[OperatorCode2["return_call"] = 18] = "return_call";
  OperatorCode2[OperatorCode2["return_call_indirect"] = 19] = "return_call_indirect";
  OperatorCode2[OperatorCode2["call_ref"] = 20] = "call_ref";
  OperatorCode2[OperatorCode2["return_call_ref"] = 21] = "return_call_ref";
  OperatorCode2[OperatorCode2["let"] = 23] = "let";
  OperatorCode2[OperatorCode2["delegate"] = 24] = "delegate";
  OperatorCode2[OperatorCode2["catch_all"] = 25] = "catch_all";
  OperatorCode2[OperatorCode2["drop"] = 26] = "drop";
  OperatorCode2[OperatorCode2["select"] = 27] = "select";
  OperatorCode2[OperatorCode2["select_with_type"] = 28] = "select_with_type";
  OperatorCode2[OperatorCode2["local_get"] = 32] = "local_get";
  OperatorCode2[OperatorCode2["local_set"] = 33] = "local_set";
  OperatorCode2[OperatorCode2["local_tee"] = 34] = "local_tee";
  OperatorCode2[OperatorCode2["global_get"] = 35] = "global_get";
  OperatorCode2[OperatorCode2["global_set"] = 36] = "global_set";
  OperatorCode2[OperatorCode2["i32_load"] = 40] = "i32_load";
  OperatorCode2[OperatorCode2["i64_load"] = 41] = "i64_load";
  OperatorCode2[OperatorCode2["f32_load"] = 42] = "f32_load";
  OperatorCode2[OperatorCode2["f64_load"] = 43] = "f64_load";
  OperatorCode2[OperatorCode2["i32_load8_s"] = 44] = "i32_load8_s";
  OperatorCode2[OperatorCode2["i32_load8_u"] = 45] = "i32_load8_u";
  OperatorCode2[OperatorCode2["i32_load16_s"] = 46] = "i32_load16_s";
  OperatorCode2[OperatorCode2["i32_load16_u"] = 47] = "i32_load16_u";
  OperatorCode2[OperatorCode2["i64_load8_s"] = 48] = "i64_load8_s";
  OperatorCode2[OperatorCode2["i64_load8_u"] = 49] = "i64_load8_u";
  OperatorCode2[OperatorCode2["i64_load16_s"] = 50] = "i64_load16_s";
  OperatorCode2[OperatorCode2["i64_load16_u"] = 51] = "i64_load16_u";
  OperatorCode2[OperatorCode2["i64_load32_s"] = 52] = "i64_load32_s";
  OperatorCode2[OperatorCode2["i64_load32_u"] = 53] = "i64_load32_u";
  OperatorCode2[OperatorCode2["i32_store"] = 54] = "i32_store";
  OperatorCode2[OperatorCode2["i64_store"] = 55] = "i64_store";
  OperatorCode2[OperatorCode2["f32_store"] = 56] = "f32_store";
  OperatorCode2[OperatorCode2["f64_store"] = 57] = "f64_store";
  OperatorCode2[OperatorCode2["i32_store8"] = 58] = "i32_store8";
  OperatorCode2[OperatorCode2["i32_store16"] = 59] = "i32_store16";
  OperatorCode2[OperatorCode2["i64_store8"] = 60] = "i64_store8";
  OperatorCode2[OperatorCode2["i64_store16"] = 61] = "i64_store16";
  OperatorCode2[OperatorCode2["i64_store32"] = 62] = "i64_store32";
  OperatorCode2[OperatorCode2["current_memory"] = 63] = "current_memory";
  OperatorCode2[OperatorCode2["grow_memory"] = 64] = "grow_memory";
  OperatorCode2[OperatorCode2["i32_const"] = 65] = "i32_const";
  OperatorCode2[OperatorCode2["i64_const"] = 66] = "i64_const";
  OperatorCode2[OperatorCode2["f32_const"] = 67] = "f32_const";
  OperatorCode2[OperatorCode2["f64_const"] = 68] = "f64_const";
  OperatorCode2[OperatorCode2["i32_eqz"] = 69] = "i32_eqz";
  OperatorCode2[OperatorCode2["i32_eq"] = 70] = "i32_eq";
  OperatorCode2[OperatorCode2["i32_ne"] = 71] = "i32_ne";
  OperatorCode2[OperatorCode2["i32_lt_s"] = 72] = "i32_lt_s";
  OperatorCode2[OperatorCode2["i32_lt_u"] = 73] = "i32_lt_u";
  OperatorCode2[OperatorCode2["i32_gt_s"] = 74] = "i32_gt_s";
  OperatorCode2[OperatorCode2["i32_gt_u"] = 75] = "i32_gt_u";
  OperatorCode2[OperatorCode2["i32_le_s"] = 76] = "i32_le_s";
  OperatorCode2[OperatorCode2["i32_le_u"] = 77] = "i32_le_u";
  OperatorCode2[OperatorCode2["i32_ge_s"] = 78] = "i32_ge_s";
  OperatorCode2[OperatorCode2["i32_ge_u"] = 79] = "i32_ge_u";
  OperatorCode2[OperatorCode2["i64_eqz"] = 80] = "i64_eqz";
  OperatorCode2[OperatorCode2["i64_eq"] = 81] = "i64_eq";
  OperatorCode2[OperatorCode2["i64_ne"] = 82] = "i64_ne";
  OperatorCode2[OperatorCode2["i64_lt_s"] = 83] = "i64_lt_s";
  OperatorCode2[OperatorCode2["i64_lt_u"] = 84] = "i64_lt_u";
  OperatorCode2[OperatorCode2["i64_gt_s"] = 85] = "i64_gt_s";
  OperatorCode2[OperatorCode2["i64_gt_u"] = 86] = "i64_gt_u";
  OperatorCode2[OperatorCode2["i64_le_s"] = 87] = "i64_le_s";
  OperatorCode2[OperatorCode2["i64_le_u"] = 88] = "i64_le_u";
  OperatorCode2[OperatorCode2["i64_ge_s"] = 89] = "i64_ge_s";
  OperatorCode2[OperatorCode2["i64_ge_u"] = 90] = "i64_ge_u";
  OperatorCode2[OperatorCode2["f32_eq"] = 91] = "f32_eq";
  OperatorCode2[OperatorCode2["f32_ne"] = 92] = "f32_ne";
  OperatorCode2[OperatorCode2["f32_lt"] = 93] = "f32_lt";
  OperatorCode2[OperatorCode2["f32_gt"] = 94] = "f32_gt";
  OperatorCode2[OperatorCode2["f32_le"] = 95] = "f32_le";
  OperatorCode2[OperatorCode2["f32_ge"] = 96] = "f32_ge";
  OperatorCode2[OperatorCode2["f64_eq"] = 97] = "f64_eq";
  OperatorCode2[OperatorCode2["f64_ne"] = 98] = "f64_ne";
  OperatorCode2[OperatorCode2["f64_lt"] = 99] = "f64_lt";
  OperatorCode2[OperatorCode2["f64_gt"] = 100] = "f64_gt";
  OperatorCode2[OperatorCode2["f64_le"] = 101] = "f64_le";
  OperatorCode2[OperatorCode2["f64_ge"] = 102] = "f64_ge";
  OperatorCode2[OperatorCode2["i32_clz"] = 103] = "i32_clz";
  OperatorCode2[OperatorCode2["i32_ctz"] = 104] = "i32_ctz";
  OperatorCode2[OperatorCode2["i32_popcnt"] = 105] = "i32_popcnt";
  OperatorCode2[OperatorCode2["i32_add"] = 106] = "i32_add";
  OperatorCode2[OperatorCode2["i32_sub"] = 107] = "i32_sub";
  OperatorCode2[OperatorCode2["i32_mul"] = 108] = "i32_mul";
  OperatorCode2[OperatorCode2["i32_div_s"] = 109] = "i32_div_s";
  OperatorCode2[OperatorCode2["i32_div_u"] = 110] = "i32_div_u";
  OperatorCode2[OperatorCode2["i32_rem_s"] = 111] = "i32_rem_s";
  OperatorCode2[OperatorCode2["i32_rem_u"] = 112] = "i32_rem_u";
  OperatorCode2[OperatorCode2["i32_and"] = 113] = "i32_and";
  OperatorCode2[OperatorCode2["i32_or"] = 114] = "i32_or";
  OperatorCode2[OperatorCode2["i32_xor"] = 115] = "i32_xor";
  OperatorCode2[OperatorCode2["i32_shl"] = 116] = "i32_shl";
  OperatorCode2[OperatorCode2["i32_shr_s"] = 117] = "i32_shr_s";
  OperatorCode2[OperatorCode2["i32_shr_u"] = 118] = "i32_shr_u";
  OperatorCode2[OperatorCode2["i32_rotl"] = 119] = "i32_rotl";
  OperatorCode2[OperatorCode2["i32_rotr"] = 120] = "i32_rotr";
  OperatorCode2[OperatorCode2["i64_clz"] = 121] = "i64_clz";
  OperatorCode2[OperatorCode2["i64_ctz"] = 122] = "i64_ctz";
  OperatorCode2[OperatorCode2["i64_popcnt"] = 123] = "i64_popcnt";
  OperatorCode2[OperatorCode2["i64_add"] = 124] = "i64_add";
  OperatorCode2[OperatorCode2["i64_sub"] = 125] = "i64_sub";
  OperatorCode2[OperatorCode2["i64_mul"] = 126] = "i64_mul";
  OperatorCode2[OperatorCode2["i64_div_s"] = 127] = "i64_div_s";
  OperatorCode2[OperatorCode2["i64_div_u"] = 128] = "i64_div_u";
  OperatorCode2[OperatorCode2["i64_rem_s"] = 129] = "i64_rem_s";
  OperatorCode2[OperatorCode2["i64_rem_u"] = 130] = "i64_rem_u";
  OperatorCode2[OperatorCode2["i64_and"] = 131] = "i64_and";
  OperatorCode2[OperatorCode2["i64_or"] = 132] = "i64_or";
  OperatorCode2[OperatorCode2["i64_xor"] = 133] = "i64_xor";
  OperatorCode2[OperatorCode2["i64_shl"] = 134] = "i64_shl";
  OperatorCode2[OperatorCode2["i64_shr_s"] = 135] = "i64_shr_s";
  OperatorCode2[OperatorCode2["i64_shr_u"] = 136] = "i64_shr_u";
  OperatorCode2[OperatorCode2["i64_rotl"] = 137] = "i64_rotl";
  OperatorCode2[OperatorCode2["i64_rotr"] = 138] = "i64_rotr";
  OperatorCode2[OperatorCode2["f32_abs"] = 139] = "f32_abs";
  OperatorCode2[OperatorCode2["f32_neg"] = 140] = "f32_neg";
  OperatorCode2[OperatorCode2["f32_ceil"] = 141] = "f32_ceil";
  OperatorCode2[OperatorCode2["f32_floor"] = 142] = "f32_floor";
  OperatorCode2[OperatorCode2["f32_trunc"] = 143] = "f32_trunc";
  OperatorCode2[OperatorCode2["f32_nearest"] = 144] = "f32_nearest";
  OperatorCode2[OperatorCode2["f32_sqrt"] = 145] = "f32_sqrt";
  OperatorCode2[OperatorCode2["f32_add"] = 146] = "f32_add";
  OperatorCode2[OperatorCode2["f32_sub"] = 147] = "f32_sub";
  OperatorCode2[OperatorCode2["f32_mul"] = 148] = "f32_mul";
  OperatorCode2[OperatorCode2["f32_div"] = 149] = "f32_div";
  OperatorCode2[OperatorCode2["f32_min"] = 150] = "f32_min";
  OperatorCode2[OperatorCode2["f32_max"] = 151] = "f32_max";
  OperatorCode2[OperatorCode2["f32_copysign"] = 152] = "f32_copysign";
  OperatorCode2[OperatorCode2["f64_abs"] = 153] = "f64_abs";
  OperatorCode2[OperatorCode2["f64_neg"] = 154] = "f64_neg";
  OperatorCode2[OperatorCode2["f64_ceil"] = 155] = "f64_ceil";
  OperatorCode2[OperatorCode2["f64_floor"] = 156] = "f64_floor";
  OperatorCode2[OperatorCode2["f64_trunc"] = 157] = "f64_trunc";
  OperatorCode2[OperatorCode2["f64_nearest"] = 158] = "f64_nearest";
  OperatorCode2[OperatorCode2["f64_sqrt"] = 159] = "f64_sqrt";
  OperatorCode2[OperatorCode2["f64_add"] = 160] = "f64_add";
  OperatorCode2[OperatorCode2["f64_sub"] = 161] = "f64_sub";
  OperatorCode2[OperatorCode2["f64_mul"] = 162] = "f64_mul";
  OperatorCode2[OperatorCode2["f64_div"] = 163] = "f64_div";
  OperatorCode2[OperatorCode2["f64_min"] = 164] = "f64_min";
  OperatorCode2[OperatorCode2["f64_max"] = 165] = "f64_max";
  OperatorCode2[OperatorCode2["f64_copysign"] = 166] = "f64_copysign";
  OperatorCode2[OperatorCode2["i32_wrap_i64"] = 167] = "i32_wrap_i64";
  OperatorCode2[OperatorCode2["i32_trunc_f32_s"] = 168] = "i32_trunc_f32_s";
  OperatorCode2[OperatorCode2["i32_trunc_f32_u"] = 169] = "i32_trunc_f32_u";
  OperatorCode2[OperatorCode2["i32_trunc_f64_s"] = 170] = "i32_trunc_f64_s";
  OperatorCode2[OperatorCode2["i32_trunc_f64_u"] = 171] = "i32_trunc_f64_u";
  OperatorCode2[OperatorCode2["i64_extend_i32_s"] = 172] = "i64_extend_i32_s";
  OperatorCode2[OperatorCode2["i64_extend_i32_u"] = 173] = "i64_extend_i32_u";
  OperatorCode2[OperatorCode2["i64_trunc_f32_s"] = 174] = "i64_trunc_f32_s";
  OperatorCode2[OperatorCode2["i64_trunc_f32_u"] = 175] = "i64_trunc_f32_u";
  OperatorCode2[OperatorCode2["i64_trunc_f64_s"] = 176] = "i64_trunc_f64_s";
  OperatorCode2[OperatorCode2["i64_trunc_f64_u"] = 177] = "i64_trunc_f64_u";
  OperatorCode2[OperatorCode2["f32_convert_i32_s"] = 178] = "f32_convert_i32_s";
  OperatorCode2[OperatorCode2["f32_convert_i32_u"] = 179] = "f32_convert_i32_u";
  OperatorCode2[OperatorCode2["f32_convert_i64_s"] = 180] = "f32_convert_i64_s";
  OperatorCode2[OperatorCode2["f32_convert_i64_u"] = 181] = "f32_convert_i64_u";
  OperatorCode2[OperatorCode2["f32_demote_f64"] = 182] = "f32_demote_f64";
  OperatorCode2[OperatorCode2["f64_convert_i32_s"] = 183] = "f64_convert_i32_s";
  OperatorCode2[OperatorCode2["f64_convert_i32_u"] = 184] = "f64_convert_i32_u";
  OperatorCode2[OperatorCode2["f64_convert_i64_s"] = 185] = "f64_convert_i64_s";
  OperatorCode2[OperatorCode2["f64_convert_i64_u"] = 186] = "f64_convert_i64_u";
  OperatorCode2[OperatorCode2["f64_promote_f32"] = 187] = "f64_promote_f32";
  OperatorCode2[OperatorCode2["i32_reinterpret_f32"] = 188] = "i32_reinterpret_f32";
  OperatorCode2[OperatorCode2["i64_reinterpret_f64"] = 189] = "i64_reinterpret_f64";
  OperatorCode2[OperatorCode2["f32_reinterpret_i32"] = 190] = "f32_reinterpret_i32";
  OperatorCode2[OperatorCode2["f64_reinterpret_i64"] = 191] = "f64_reinterpret_i64";
  OperatorCode2[OperatorCode2["i32_extend8_s"] = 192] = "i32_extend8_s";
  OperatorCode2[OperatorCode2["i32_extend16_s"] = 193] = "i32_extend16_s";
  OperatorCode2[OperatorCode2["i64_extend8_s"] = 194] = "i64_extend8_s";
  OperatorCode2[OperatorCode2["i64_extend16_s"] = 195] = "i64_extend16_s";
  OperatorCode2[OperatorCode2["i64_extend32_s"] = 196] = "i64_extend32_s";
  OperatorCode2[OperatorCode2["prefix_0xfb"] = 251] = "prefix_0xfb";
  OperatorCode2[OperatorCode2["prefix_0xfc"] = 252] = "prefix_0xfc";
  OperatorCode2[OperatorCode2["prefix_0xfd"] = 253] = "prefix_0xfd";
  OperatorCode2[OperatorCode2["prefix_0xfe"] = 254] = "prefix_0xfe";
  OperatorCode2[OperatorCode2["i32_trunc_sat_f32_s"] = 64512] = "i32_trunc_sat_f32_s";
  OperatorCode2[OperatorCode2["i32_trunc_sat_f32_u"] = 64513] = "i32_trunc_sat_f32_u";
  OperatorCode2[OperatorCode2["i32_trunc_sat_f64_s"] = 64514] = "i32_trunc_sat_f64_s";
  OperatorCode2[OperatorCode2["i32_trunc_sat_f64_u"] = 64515] = "i32_trunc_sat_f64_u";
  OperatorCode2[OperatorCode2["i64_trunc_sat_f32_s"] = 64516] = "i64_trunc_sat_f32_s";
  OperatorCode2[OperatorCode2["i64_trunc_sat_f32_u"] = 64517] = "i64_trunc_sat_f32_u";
  OperatorCode2[OperatorCode2["i64_trunc_sat_f64_s"] = 64518] = "i64_trunc_sat_f64_s";
  OperatorCode2[OperatorCode2["i64_trunc_sat_f64_u"] = 64519] = "i64_trunc_sat_f64_u";
  OperatorCode2[OperatorCode2["memory_init"] = 64520] = "memory_init";
  OperatorCode2[OperatorCode2["data_drop"] = 64521] = "data_drop";
  OperatorCode2[OperatorCode2["memory_copy"] = 64522] = "memory_copy";
  OperatorCode2[OperatorCode2["memory_fill"] = 64523] = "memory_fill";
  OperatorCode2[OperatorCode2["table_init"] = 64524] = "table_init";
  OperatorCode2[OperatorCode2["elem_drop"] = 64525] = "elem_drop";
  OperatorCode2[OperatorCode2["table_copy"] = 64526] = "table_copy";
  OperatorCode2[OperatorCode2["table_grow"] = 64527] = "table_grow";
  OperatorCode2[OperatorCode2["table_size"] = 64528] = "table_size";
  OperatorCode2[OperatorCode2["table_fill"] = 64529] = "table_fill";
  OperatorCode2[OperatorCode2["table_get"] = 37] = "table_get";
  OperatorCode2[OperatorCode2["table_set"] = 38] = "table_set";
  OperatorCode2[OperatorCode2["ref_null"] = 208] = "ref_null";
  OperatorCode2[OperatorCode2["ref_is_null"] = 209] = "ref_is_null";
  OperatorCode2[OperatorCode2["ref_func"] = 210] = "ref_func";
  OperatorCode2[OperatorCode2["ref_as_non_null"] = 211] = "ref_as_non_null";
  OperatorCode2[OperatorCode2["br_on_null"] = 212] = "br_on_null";
  OperatorCode2[OperatorCode2["ref_eq"] = 213] = "ref_eq";
  OperatorCode2[OperatorCode2["br_on_non_null"] = 214] = "br_on_non_null";
  OperatorCode2[OperatorCode2["atomic_notify"] = 65024] = "atomic_notify";
  OperatorCode2[OperatorCode2["i32_atomic_wait"] = 65025] = "i32_atomic_wait";
  OperatorCode2[OperatorCode2["i64_atomic_wait"] = 65026] = "i64_atomic_wait";
  OperatorCode2[OperatorCode2["atomic_fence"] = 65027] = "atomic_fence";
  OperatorCode2[OperatorCode2["i32_atomic_load"] = 65040] = "i32_atomic_load";
  OperatorCode2[OperatorCode2["i64_atomic_load"] = 65041] = "i64_atomic_load";
  OperatorCode2[OperatorCode2["i32_atomic_load8_u"] = 65042] = "i32_atomic_load8_u";
  OperatorCode2[OperatorCode2["i32_atomic_load16_u"] = 65043] = "i32_atomic_load16_u";
  OperatorCode2[OperatorCode2["i64_atomic_load8_u"] = 65044] = "i64_atomic_load8_u";
  OperatorCode2[OperatorCode2["i64_atomic_load16_u"] = 65045] = "i64_atomic_load16_u";
  OperatorCode2[OperatorCode2["i64_atomic_load32_u"] = 65046] = "i64_atomic_load32_u";
  OperatorCode2[OperatorCode2["i32_atomic_store"] = 65047] = "i32_atomic_store";
  OperatorCode2[OperatorCode2["i64_atomic_store"] = 65048] = "i64_atomic_store";
  OperatorCode2[OperatorCode2["i32_atomic_store8"] = 65049] = "i32_atomic_store8";
  OperatorCode2[OperatorCode2["i32_atomic_store16"] = 65050] = "i32_atomic_store16";
  OperatorCode2[OperatorCode2["i64_atomic_store8"] = 65051] = "i64_atomic_store8";
  OperatorCode2[OperatorCode2["i64_atomic_store16"] = 65052] = "i64_atomic_store16";
  OperatorCode2[OperatorCode2["i64_atomic_store32"] = 65053] = "i64_atomic_store32";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_add"] = 65054] = "i32_atomic_rmw_add";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_add"] = 65055] = "i64_atomic_rmw_add";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_add_u"] = 65056] = "i32_atomic_rmw8_add_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_add_u"] = 65057] = "i32_atomic_rmw16_add_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_add_u"] = 65058] = "i64_atomic_rmw8_add_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_add_u"] = 65059] = "i64_atomic_rmw16_add_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_add_u"] = 65060] = "i64_atomic_rmw32_add_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_sub"] = 65061] = "i32_atomic_rmw_sub";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_sub"] = 65062] = "i64_atomic_rmw_sub";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_sub_u"] = 65063] = "i32_atomic_rmw8_sub_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_sub_u"] = 65064] = "i32_atomic_rmw16_sub_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_sub_u"] = 65065] = "i64_atomic_rmw8_sub_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_sub_u"] = 65066] = "i64_atomic_rmw16_sub_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_sub_u"] = 65067] = "i64_atomic_rmw32_sub_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_and"] = 65068] = "i32_atomic_rmw_and";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_and"] = 65069] = "i64_atomic_rmw_and";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_and_u"] = 65070] = "i32_atomic_rmw8_and_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_and_u"] = 65071] = "i32_atomic_rmw16_and_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_and_u"] = 65072] = "i64_atomic_rmw8_and_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_and_u"] = 65073] = "i64_atomic_rmw16_and_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_and_u"] = 65074] = "i64_atomic_rmw32_and_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_or"] = 65075] = "i32_atomic_rmw_or";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_or"] = 65076] = "i64_atomic_rmw_or";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_or_u"] = 65077] = "i32_atomic_rmw8_or_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_or_u"] = 65078] = "i32_atomic_rmw16_or_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_or_u"] = 65079] = "i64_atomic_rmw8_or_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_or_u"] = 65080] = "i64_atomic_rmw16_or_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_or_u"] = 65081] = "i64_atomic_rmw32_or_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_xor"] = 65082] = "i32_atomic_rmw_xor";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_xor"] = 65083] = "i64_atomic_rmw_xor";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_xor_u"] = 65084] = "i32_atomic_rmw8_xor_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_xor_u"] = 65085] = "i32_atomic_rmw16_xor_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_xor_u"] = 65086] = "i64_atomic_rmw8_xor_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_xor_u"] = 65087] = "i64_atomic_rmw16_xor_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_xor_u"] = 65088] = "i64_atomic_rmw32_xor_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_xchg"] = 65089] = "i32_atomic_rmw_xchg";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_xchg"] = 65090] = "i64_atomic_rmw_xchg";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_xchg_u"] = 65091] = "i32_atomic_rmw8_xchg_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_xchg_u"] = 65092] = "i32_atomic_rmw16_xchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_xchg_u"] = 65093] = "i64_atomic_rmw8_xchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_xchg_u"] = 65094] = "i64_atomic_rmw16_xchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_xchg_u"] = 65095] = "i64_atomic_rmw32_xchg_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw_cmpxchg"] = 65096] = "i32_atomic_rmw_cmpxchg";
  OperatorCode2[OperatorCode2["i64_atomic_rmw_cmpxchg"] = 65097] = "i64_atomic_rmw_cmpxchg";
  OperatorCode2[OperatorCode2["i32_atomic_rmw8_cmpxchg_u"] = 65098] = "i32_atomic_rmw8_cmpxchg_u";
  OperatorCode2[OperatorCode2["i32_atomic_rmw16_cmpxchg_u"] = 65099] = "i32_atomic_rmw16_cmpxchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw8_cmpxchg_u"] = 65100] = "i64_atomic_rmw8_cmpxchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw16_cmpxchg_u"] = 65101] = "i64_atomic_rmw16_cmpxchg_u";
  OperatorCode2[OperatorCode2["i64_atomic_rmw32_cmpxchg_u"] = 65102] = "i64_atomic_rmw32_cmpxchg_u";
  OperatorCode2[OperatorCode2["v128_load"] = 64768] = "v128_load";
  OperatorCode2[OperatorCode2["i16x8_load8x8_s"] = 64769] = "i16x8_load8x8_s";
  OperatorCode2[OperatorCode2["i16x8_load8x8_u"] = 64770] = "i16x8_load8x8_u";
  OperatorCode2[OperatorCode2["i32x4_load16x4_s"] = 64771] = "i32x4_load16x4_s";
  OperatorCode2[OperatorCode2["i32x4_load16x4_u"] = 64772] = "i32x4_load16x4_u";
  OperatorCode2[OperatorCode2["i64x2_load32x2_s"] = 64773] = "i64x2_load32x2_s";
  OperatorCode2[OperatorCode2["i64x2_load32x2_u"] = 64774] = "i64x2_load32x2_u";
  OperatorCode2[OperatorCode2["v8x16_load_splat"] = 64775] = "v8x16_load_splat";
  OperatorCode2[OperatorCode2["v16x8_load_splat"] = 64776] = "v16x8_load_splat";
  OperatorCode2[OperatorCode2["v32x4_load_splat"] = 64777] = "v32x4_load_splat";
  OperatorCode2[OperatorCode2["v64x2_load_splat"] = 64778] = "v64x2_load_splat";
  OperatorCode2[OperatorCode2["v128_store"] = 64779] = "v128_store";
  OperatorCode2[OperatorCode2["v128_const"] = 64780] = "v128_const";
  OperatorCode2[OperatorCode2["i8x16_shuffle"] = 64781] = "i8x16_shuffle";
  OperatorCode2[OperatorCode2["i8x16_swizzle"] = 64782] = "i8x16_swizzle";
  OperatorCode2[OperatorCode2["i8x16_splat"] = 64783] = "i8x16_splat";
  OperatorCode2[OperatorCode2["i16x8_splat"] = 64784] = "i16x8_splat";
  OperatorCode2[OperatorCode2["i32x4_splat"] = 64785] = "i32x4_splat";
  OperatorCode2[OperatorCode2["i64x2_splat"] = 64786] = "i64x2_splat";
  OperatorCode2[OperatorCode2["f32x4_splat"] = 64787] = "f32x4_splat";
  OperatorCode2[OperatorCode2["f64x2_splat"] = 64788] = "f64x2_splat";
  OperatorCode2[OperatorCode2["i8x16_extract_lane_s"] = 64789] = "i8x16_extract_lane_s";
  OperatorCode2[OperatorCode2["i8x16_extract_lane_u"] = 64790] = "i8x16_extract_lane_u";
  OperatorCode2[OperatorCode2["i8x16_replace_lane"] = 64791] = "i8x16_replace_lane";
  OperatorCode2[OperatorCode2["i16x8_extract_lane_s"] = 64792] = "i16x8_extract_lane_s";
  OperatorCode2[OperatorCode2["i16x8_extract_lane_u"] = 64793] = "i16x8_extract_lane_u";
  OperatorCode2[OperatorCode2["i16x8_replace_lane"] = 64794] = "i16x8_replace_lane";
  OperatorCode2[OperatorCode2["i32x4_extract_lane"] = 64795] = "i32x4_extract_lane";
  OperatorCode2[OperatorCode2["i32x4_replace_lane"] = 64796] = "i32x4_replace_lane";
  OperatorCode2[OperatorCode2["i64x2_extract_lane"] = 64797] = "i64x2_extract_lane";
  OperatorCode2[OperatorCode2["i64x2_replace_lane"] = 64798] = "i64x2_replace_lane";
  OperatorCode2[OperatorCode2["f32x4_extract_lane"] = 64799] = "f32x4_extract_lane";
  OperatorCode2[OperatorCode2["f32x4_replace_lane"] = 64800] = "f32x4_replace_lane";
  OperatorCode2[OperatorCode2["f64x2_extract_lane"] = 64801] = "f64x2_extract_lane";
  OperatorCode2[OperatorCode2["f64x2_replace_lane"] = 64802] = "f64x2_replace_lane";
  OperatorCode2[OperatorCode2["i8x16_eq"] = 64803] = "i8x16_eq";
  OperatorCode2[OperatorCode2["i8x16_ne"] = 64804] = "i8x16_ne";
  OperatorCode2[OperatorCode2["i8x16_lt_s"] = 64805] = "i8x16_lt_s";
  OperatorCode2[OperatorCode2["i8x16_lt_u"] = 64806] = "i8x16_lt_u";
  OperatorCode2[OperatorCode2["i8x16_gt_s"] = 64807] = "i8x16_gt_s";
  OperatorCode2[OperatorCode2["i8x16_gt_u"] = 64808] = "i8x16_gt_u";
  OperatorCode2[OperatorCode2["i8x16_le_s"] = 64809] = "i8x16_le_s";
  OperatorCode2[OperatorCode2["i8x16_le_u"] = 64810] = "i8x16_le_u";
  OperatorCode2[OperatorCode2["i8x16_ge_s"] = 64811] = "i8x16_ge_s";
  OperatorCode2[OperatorCode2["i8x16_ge_u"] = 64812] = "i8x16_ge_u";
  OperatorCode2[OperatorCode2["i16x8_eq"] = 64813] = "i16x8_eq";
  OperatorCode2[OperatorCode2["i16x8_ne"] = 64814] = "i16x8_ne";
  OperatorCode2[OperatorCode2["i16x8_lt_s"] = 64815] = "i16x8_lt_s";
  OperatorCode2[OperatorCode2["i16x8_lt_u"] = 64816] = "i16x8_lt_u";
  OperatorCode2[OperatorCode2["i16x8_gt_s"] = 64817] = "i16x8_gt_s";
  OperatorCode2[OperatorCode2["i16x8_gt_u"] = 64818] = "i16x8_gt_u";
  OperatorCode2[OperatorCode2["i16x8_le_s"] = 64819] = "i16x8_le_s";
  OperatorCode2[OperatorCode2["i16x8_le_u"] = 64820] = "i16x8_le_u";
  OperatorCode2[OperatorCode2["i16x8_ge_s"] = 64821] = "i16x8_ge_s";
  OperatorCode2[OperatorCode2["i16x8_ge_u"] = 64822] = "i16x8_ge_u";
  OperatorCode2[OperatorCode2["i32x4_eq"] = 64823] = "i32x4_eq";
  OperatorCode2[OperatorCode2["i32x4_ne"] = 64824] = "i32x4_ne";
  OperatorCode2[OperatorCode2["i32x4_lt_s"] = 64825] = "i32x4_lt_s";
  OperatorCode2[OperatorCode2["i32x4_lt_u"] = 64826] = "i32x4_lt_u";
  OperatorCode2[OperatorCode2["i32x4_gt_s"] = 64827] = "i32x4_gt_s";
  OperatorCode2[OperatorCode2["i32x4_gt_u"] = 64828] = "i32x4_gt_u";
  OperatorCode2[OperatorCode2["i32x4_le_s"] = 64829] = "i32x4_le_s";
  OperatorCode2[OperatorCode2["i32x4_le_u"] = 64830] = "i32x4_le_u";
  OperatorCode2[OperatorCode2["i32x4_ge_s"] = 64831] = "i32x4_ge_s";
  OperatorCode2[OperatorCode2["i32x4_ge_u"] = 64832] = "i32x4_ge_u";
  OperatorCode2[OperatorCode2["f32x4_eq"] = 64833] = "f32x4_eq";
  OperatorCode2[OperatorCode2["f32x4_ne"] = 64834] = "f32x4_ne";
  OperatorCode2[OperatorCode2["f32x4_lt"] = 64835] = "f32x4_lt";
  OperatorCode2[OperatorCode2["f32x4_gt"] = 64836] = "f32x4_gt";
  OperatorCode2[OperatorCode2["f32x4_le"] = 64837] = "f32x4_le";
  OperatorCode2[OperatorCode2["f32x4_ge"] = 64838] = "f32x4_ge";
  OperatorCode2[OperatorCode2["f64x2_eq"] = 64839] = "f64x2_eq";
  OperatorCode2[OperatorCode2["f64x2_ne"] = 64840] = "f64x2_ne";
  OperatorCode2[OperatorCode2["f64x2_lt"] = 64841] = "f64x2_lt";
  OperatorCode2[OperatorCode2["f64x2_gt"] = 64842] = "f64x2_gt";
  OperatorCode2[OperatorCode2["f64x2_le"] = 64843] = "f64x2_le";
  OperatorCode2[OperatorCode2["f64x2_ge"] = 64844] = "f64x2_ge";
  OperatorCode2[OperatorCode2["v128_not"] = 64845] = "v128_not";
  OperatorCode2[OperatorCode2["v128_and"] = 64846] = "v128_and";
  OperatorCode2[OperatorCode2["v128_andnot"] = 64847] = "v128_andnot";
  OperatorCode2[OperatorCode2["v128_or"] = 64848] = "v128_or";
  OperatorCode2[OperatorCode2["v128_xor"] = 64849] = "v128_xor";
  OperatorCode2[OperatorCode2["v128_bitselect"] = 64850] = "v128_bitselect";
  OperatorCode2[OperatorCode2["v128_any_true"] = 64851] = "v128_any_true";
  OperatorCode2[OperatorCode2["v128_load8_lane"] = 64852] = "v128_load8_lane";
  OperatorCode2[OperatorCode2["v128_load16_lane"] = 64853] = "v128_load16_lane";
  OperatorCode2[OperatorCode2["v128_load32_lane"] = 64854] = "v128_load32_lane";
  OperatorCode2[OperatorCode2["v128_load64_lane"] = 64855] = "v128_load64_lane";
  OperatorCode2[OperatorCode2["v128_store8_lane"] = 64856] = "v128_store8_lane";
  OperatorCode2[OperatorCode2["v128_store16_lane"] = 64857] = "v128_store16_lane";
  OperatorCode2[OperatorCode2["v128_store32_lane"] = 64858] = "v128_store32_lane";
  OperatorCode2[OperatorCode2["v128_store64_lane"] = 64859] = "v128_store64_lane";
  OperatorCode2[OperatorCode2["v128_load32_zero"] = 64860] = "v128_load32_zero";
  OperatorCode2[OperatorCode2["v128_load64_zero"] = 64861] = "v128_load64_zero";
  OperatorCode2[OperatorCode2["f32x4_demote_f64x2_zero"] = 64862] = "f32x4_demote_f64x2_zero";
  OperatorCode2[OperatorCode2["f64x2_promote_low_f32x4"] = 64863] = "f64x2_promote_low_f32x4";
  OperatorCode2[OperatorCode2["i8x16_abs"] = 64864] = "i8x16_abs";
  OperatorCode2[OperatorCode2["i8x16_neg"] = 64865] = "i8x16_neg";
  OperatorCode2[OperatorCode2["i8x16_popcnt"] = 64866] = "i8x16_popcnt";
  OperatorCode2[OperatorCode2["i8x16_all_true"] = 64867] = "i8x16_all_true";
  OperatorCode2[OperatorCode2["i8x16_bitmask"] = 64868] = "i8x16_bitmask";
  OperatorCode2[OperatorCode2["i8x16_narrow_i16x8_s"] = 64869] = "i8x16_narrow_i16x8_s";
  OperatorCode2[OperatorCode2["i8x16_narrow_i16x8_u"] = 64870] = "i8x16_narrow_i16x8_u";
  OperatorCode2[OperatorCode2["f32x4_ceil"] = 64871] = "f32x4_ceil";
  OperatorCode2[OperatorCode2["f32x4_floor"] = 64872] = "f32x4_floor";
  OperatorCode2[OperatorCode2["f32x4_trunc"] = 64873] = "f32x4_trunc";
  OperatorCode2[OperatorCode2["f32x4_nearest"] = 64874] = "f32x4_nearest";
  OperatorCode2[OperatorCode2["i8x16_shl"] = 64875] = "i8x16_shl";
  OperatorCode2[OperatorCode2["i8x16_shr_s"] = 64876] = "i8x16_shr_s";
  OperatorCode2[OperatorCode2["i8x16_shr_u"] = 64877] = "i8x16_shr_u";
  OperatorCode2[OperatorCode2["i8x16_add"] = 64878] = "i8x16_add";
  OperatorCode2[OperatorCode2["i8x16_add_sat_s"] = 64879] = "i8x16_add_sat_s";
  OperatorCode2[OperatorCode2["i8x16_add_sat_u"] = 64880] = "i8x16_add_sat_u";
  OperatorCode2[OperatorCode2["i8x16_sub"] = 64881] = "i8x16_sub";
  OperatorCode2[OperatorCode2["i8x16_sub_sat_s"] = 64882] = "i8x16_sub_sat_s";
  OperatorCode2[OperatorCode2["i8x16_sub_sat_u"] = 64883] = "i8x16_sub_sat_u";
  OperatorCode2[OperatorCode2["f64x2_ceil"] = 64884] = "f64x2_ceil";
  OperatorCode2[OperatorCode2["f64x2_floor"] = 64885] = "f64x2_floor";
  OperatorCode2[OperatorCode2["i8x16_min_s"] = 64886] = "i8x16_min_s";
  OperatorCode2[OperatorCode2["i8x16_min_u"] = 64887] = "i8x16_min_u";
  OperatorCode2[OperatorCode2["i8x16_max_s"] = 64888] = "i8x16_max_s";
  OperatorCode2[OperatorCode2["i8x16_max_u"] = 64889] = "i8x16_max_u";
  OperatorCode2[OperatorCode2["f64x2_trunc"] = 64890] = "f64x2_trunc";
  OperatorCode2[OperatorCode2["i8x16_avgr_u"] = 64891] = "i8x16_avgr_u";
  OperatorCode2[OperatorCode2["i16x8_extadd_pairwise_i8x16_s"] = 64892] = "i16x8_extadd_pairwise_i8x16_s";
  OperatorCode2[OperatorCode2["i16x8_extadd_pairwise_i8x16_u"] = 64893] = "i16x8_extadd_pairwise_i8x16_u";
  OperatorCode2[OperatorCode2["i32x4_extadd_pairwise_i16x8_s"] = 64894] = "i32x4_extadd_pairwise_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extadd_pairwise_i16x8_u"] = 64895] = "i32x4_extadd_pairwise_i16x8_u";
  OperatorCode2[OperatorCode2["i16x8_abs"] = 64896] = "i16x8_abs";
  OperatorCode2[OperatorCode2["i16x8_neg"] = 64897] = "i16x8_neg";
  OperatorCode2[OperatorCode2["i16x8_q15mulr_sat_s"] = 64898] = "i16x8_q15mulr_sat_s";
  OperatorCode2[OperatorCode2["i16x8_all_true"] = 64899] = "i16x8_all_true";
  OperatorCode2[OperatorCode2["i16x8_bitmask"] = 64900] = "i16x8_bitmask";
  OperatorCode2[OperatorCode2["i16x8_narrow_i32x4_s"] = 64901] = "i16x8_narrow_i32x4_s";
  OperatorCode2[OperatorCode2["i16x8_narrow_i32x4_u"] = 64902] = "i16x8_narrow_i32x4_u";
  OperatorCode2[OperatorCode2["i16x8_extend_low_i8x16_s"] = 64903] = "i16x8_extend_low_i8x16_s";
  OperatorCode2[OperatorCode2["i16x8_extend_high_i8x16_s"] = 64904] = "i16x8_extend_high_i8x16_s";
  OperatorCode2[OperatorCode2["i16x8_extend_low_i8x16_u"] = 64905] = "i16x8_extend_low_i8x16_u";
  OperatorCode2[OperatorCode2["i16x8_extend_high_i8x16_u"] = 64906] = "i16x8_extend_high_i8x16_u";
  OperatorCode2[OperatorCode2["i16x8_shl"] = 64907] = "i16x8_shl";
  OperatorCode2[OperatorCode2["i16x8_shr_s"] = 64908] = "i16x8_shr_s";
  OperatorCode2[OperatorCode2["i16x8_shr_u"] = 64909] = "i16x8_shr_u";
  OperatorCode2[OperatorCode2["i16x8_add"] = 64910] = "i16x8_add";
  OperatorCode2[OperatorCode2["i16x8_add_sat_s"] = 64911] = "i16x8_add_sat_s";
  OperatorCode2[OperatorCode2["i16x8_add_sat_u"] = 64912] = "i16x8_add_sat_u";
  OperatorCode2[OperatorCode2["i16x8_sub"] = 64913] = "i16x8_sub";
  OperatorCode2[OperatorCode2["i16x8_sub_sat_s"] = 64914] = "i16x8_sub_sat_s";
  OperatorCode2[OperatorCode2["i16x8_sub_sat_u"] = 64915] = "i16x8_sub_sat_u";
  OperatorCode2[OperatorCode2["f64x2_nearest"] = 64916] = "f64x2_nearest";
  OperatorCode2[OperatorCode2["i16x8_mul"] = 64917] = "i16x8_mul";
  OperatorCode2[OperatorCode2["i16x8_min_s"] = 64918] = "i16x8_min_s";
  OperatorCode2[OperatorCode2["i16x8_min_u"] = 64919] = "i16x8_min_u";
  OperatorCode2[OperatorCode2["i16x8_max_s"] = 64920] = "i16x8_max_s";
  OperatorCode2[OperatorCode2["i16x8_max_u"] = 64921] = "i16x8_max_u";
  OperatorCode2[OperatorCode2["i16x8_avgr_u"] = 64923] = "i16x8_avgr_u";
  OperatorCode2[OperatorCode2["i16x8_extmul_low_i8x16_s"] = 64924] = "i16x8_extmul_low_i8x16_s";
  OperatorCode2[OperatorCode2["i16x8_extmul_high_i8x16_s"] = 64925] = "i16x8_extmul_high_i8x16_s";
  OperatorCode2[OperatorCode2["i16x8_extmul_low_i8x16_u"] = 64926] = "i16x8_extmul_low_i8x16_u";
  OperatorCode2[OperatorCode2["i16x8_extmul_high_i8x16_u"] = 64927] = "i16x8_extmul_high_i8x16_u";
  OperatorCode2[OperatorCode2["i32x4_abs"] = 64928] = "i32x4_abs";
  OperatorCode2[OperatorCode2["i32x4_neg"] = 64929] = "i32x4_neg";
  OperatorCode2[OperatorCode2["i32x4_all_true"] = 64931] = "i32x4_all_true";
  OperatorCode2[OperatorCode2["i32x4_bitmask"] = 64932] = "i32x4_bitmask";
  OperatorCode2[OperatorCode2["i32x4_extend_low_i16x8_s"] = 64935] = "i32x4_extend_low_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extend_high_i16x8_s"] = 64936] = "i32x4_extend_high_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extend_low_i16x8_u"] = 64937] = "i32x4_extend_low_i16x8_u";
  OperatorCode2[OperatorCode2["i32x4_extend_high_i16x8_u"] = 64938] = "i32x4_extend_high_i16x8_u";
  OperatorCode2[OperatorCode2["i32x4_shl"] = 64939] = "i32x4_shl";
  OperatorCode2[OperatorCode2["i32x4_shr_s"] = 64940] = "i32x4_shr_s";
  OperatorCode2[OperatorCode2["i32x4_shr_u"] = 64941] = "i32x4_shr_u";
  OperatorCode2[OperatorCode2["i32x4_add"] = 64942] = "i32x4_add";
  OperatorCode2[OperatorCode2["i32x4_sub"] = 64945] = "i32x4_sub";
  OperatorCode2[OperatorCode2["i32x4_mul"] = 64949] = "i32x4_mul";
  OperatorCode2[OperatorCode2["i32x4_min_s"] = 64950] = "i32x4_min_s";
  OperatorCode2[OperatorCode2["i32x4_min_u"] = 64951] = "i32x4_min_u";
  OperatorCode2[OperatorCode2["i32x4_max_s"] = 64952] = "i32x4_max_s";
  OperatorCode2[OperatorCode2["i32x4_max_u"] = 64953] = "i32x4_max_u";
  OperatorCode2[OperatorCode2["i32x4_dot_i16x8_s"] = 64954] = "i32x4_dot_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extmul_low_i16x8_s"] = 64956] = "i32x4_extmul_low_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extmul_high_i16x8_s"] = 64957] = "i32x4_extmul_high_i16x8_s";
  OperatorCode2[OperatorCode2["i32x4_extmul_low_i16x8_u"] = 64958] = "i32x4_extmul_low_i16x8_u";
  OperatorCode2[OperatorCode2["i32x4_extmul_high_i16x8_u"] = 64959] = "i32x4_extmul_high_i16x8_u";
  OperatorCode2[OperatorCode2["i64x2_abs"] = 64960] = "i64x2_abs";
  OperatorCode2[OperatorCode2["i64x2_neg"] = 64961] = "i64x2_neg";
  OperatorCode2[OperatorCode2["i64x2_all_true"] = 64963] = "i64x2_all_true";
  OperatorCode2[OperatorCode2["i64x2_bitmask"] = 64964] = "i64x2_bitmask";
  OperatorCode2[OperatorCode2["i64x2_extend_low_i32x4_s"] = 64967] = "i64x2_extend_low_i32x4_s";
  OperatorCode2[OperatorCode2["i64x2_extend_high_i32x4_s"] = 64968] = "i64x2_extend_high_i32x4_s";
  OperatorCode2[OperatorCode2["i64x2_extend_low_i32x4_u"] = 64969] = "i64x2_extend_low_i32x4_u";
  OperatorCode2[OperatorCode2["i64x2_extend_high_i32x4_u"] = 64970] = "i64x2_extend_high_i32x4_u";
  OperatorCode2[OperatorCode2["i64x2_shl"] = 64971] = "i64x2_shl";
  OperatorCode2[OperatorCode2["i64x2_shr_s"] = 64972] = "i64x2_shr_s";
  OperatorCode2[OperatorCode2["i64x2_shr_u"] = 64973] = "i64x2_shr_u";
  OperatorCode2[OperatorCode2["i64x2_add"] = 64974] = "i64x2_add";
  OperatorCode2[OperatorCode2["i64x2_sub"] = 64977] = "i64x2_sub";
  OperatorCode2[OperatorCode2["i64x2_mul"] = 64981] = "i64x2_mul";
  OperatorCode2[OperatorCode2["i64x2_eq"] = 64982] = "i64x2_eq";
  OperatorCode2[OperatorCode2["i64x2_ne"] = 64983] = "i64x2_ne";
  OperatorCode2[OperatorCode2["i64x2_lt_s"] = 64984] = "i64x2_lt_s";
  OperatorCode2[OperatorCode2["i64x2_gt_s"] = 64985] = "i64x2_gt_s";
  OperatorCode2[OperatorCode2["i64x2_le_s"] = 64986] = "i64x2_le_s";
  OperatorCode2[OperatorCode2["i64x2_ge_s"] = 64987] = "i64x2_ge_s";
  OperatorCode2[OperatorCode2["i64x2_extmul_low_i32x4_s"] = 64988] = "i64x2_extmul_low_i32x4_s";
  OperatorCode2[OperatorCode2["i64x2_extmul_high_i32x4_s"] = 64989] = "i64x2_extmul_high_i32x4_s";
  OperatorCode2[OperatorCode2["i64x2_extmul_low_i32x4_u"] = 64990] = "i64x2_extmul_low_i32x4_u";
  OperatorCode2[OperatorCode2["i64x2_extmul_high_i32x4_u"] = 64991] = "i64x2_extmul_high_i32x4_u";
  OperatorCode2[OperatorCode2["f32x4_abs"] = 64992] = "f32x4_abs";
  OperatorCode2[OperatorCode2["f32x4_neg"] = 64993] = "f32x4_neg";
  OperatorCode2[OperatorCode2["f32x4_sqrt"] = 64995] = "f32x4_sqrt";
  OperatorCode2[OperatorCode2["f32x4_add"] = 64996] = "f32x4_add";
  OperatorCode2[OperatorCode2["f32x4_sub"] = 64997] = "f32x4_sub";
  OperatorCode2[OperatorCode2["f32x4_mul"] = 64998] = "f32x4_mul";
  OperatorCode2[OperatorCode2["f32x4_div"] = 64999] = "f32x4_div";
  OperatorCode2[OperatorCode2["f32x4_min"] = 65e3] = "f32x4_min";
  OperatorCode2[OperatorCode2["f32x4_max"] = 65001] = "f32x4_max";
  OperatorCode2[OperatorCode2["f32x4_pmin"] = 65002] = "f32x4_pmin";
  OperatorCode2[OperatorCode2["f32x4_pmax"] = 65003] = "f32x4_pmax";
  OperatorCode2[OperatorCode2["f64x2_abs"] = 65004] = "f64x2_abs";
  OperatorCode2[OperatorCode2["f64x2_neg"] = 65005] = "f64x2_neg";
  OperatorCode2[OperatorCode2["f64x2_sqrt"] = 65007] = "f64x2_sqrt";
  OperatorCode2[OperatorCode2["f64x2_add"] = 65008] = "f64x2_add";
  OperatorCode2[OperatorCode2["f64x2_sub"] = 65009] = "f64x2_sub";
  OperatorCode2[OperatorCode2["f64x2_mul"] = 65010] = "f64x2_mul";
  OperatorCode2[OperatorCode2["f64x2_div"] = 65011] = "f64x2_div";
  OperatorCode2[OperatorCode2["f64x2_min"] = 65012] = "f64x2_min";
  OperatorCode2[OperatorCode2["f64x2_max"] = 65013] = "f64x2_max";
  OperatorCode2[OperatorCode2["f64x2_pmin"] = 65014] = "f64x2_pmin";
  OperatorCode2[OperatorCode2["f64x2_pmax"] = 65015] = "f64x2_pmax";
  OperatorCode2[OperatorCode2["i32x4_trunc_sat_f32x4_s"] = 65016] = "i32x4_trunc_sat_f32x4_s";
  OperatorCode2[OperatorCode2["i32x4_trunc_sat_f32x4_u"] = 65017] = "i32x4_trunc_sat_f32x4_u";
  OperatorCode2[OperatorCode2["f32x4_convert_i32x4_s"] = 65018] = "f32x4_convert_i32x4_s";
  OperatorCode2[OperatorCode2["f32x4_convert_i32x4_u"] = 65019] = "f32x4_convert_i32x4_u";
  OperatorCode2[OperatorCode2["i32x4_trunc_sat_f64x2_s_zero"] = 65020] = "i32x4_trunc_sat_f64x2_s_zero";
  OperatorCode2[OperatorCode2["i32x4_trunc_sat_f64x2_u_zero"] = 65021] = "i32x4_trunc_sat_f64x2_u_zero";
  OperatorCode2[OperatorCode2["f64x2_convert_low_i32x4_s"] = 65022] = "f64x2_convert_low_i32x4_s";
  OperatorCode2[OperatorCode2["f64x2_convert_low_i32x4_u"] = 65023] = "f64x2_convert_low_i32x4_u";
  OperatorCode2[OperatorCode2["struct_new_with_rtt"] = 64257] = "struct_new_with_rtt";
  OperatorCode2[OperatorCode2["struct_new_default_with_rtt"] = 64258] = "struct_new_default_with_rtt";
  OperatorCode2[OperatorCode2["struct_get"] = 64259] = "struct_get";
  OperatorCode2[OperatorCode2["struct_get_s"] = 64260] = "struct_get_s";
  OperatorCode2[OperatorCode2["struct_get_u"] = 64261] = "struct_get_u";
  OperatorCode2[OperatorCode2["struct_set"] = 64262] = "struct_set";
  OperatorCode2[OperatorCode2["struct_new"] = 64263] = "struct_new";
  OperatorCode2[OperatorCode2["struct_new_default"] = 64264] = "struct_new_default";
  OperatorCode2[OperatorCode2["array_new_with_rtt"] = 64273] = "array_new_with_rtt";
  OperatorCode2[OperatorCode2["array_new_default_with_rtt"] = 64274] = "array_new_default_with_rtt";
  OperatorCode2[OperatorCode2["array_get"] = 64275] = "array_get";
  OperatorCode2[OperatorCode2["array_get_s"] = 64276] = "array_get_s";
  OperatorCode2[OperatorCode2["array_get_u"] = 64277] = "array_get_u";
  OperatorCode2[OperatorCode2["array_set"] = 64278] = "array_set";
  OperatorCode2[OperatorCode2["array_len"] = 64279] = "array_len";
  OperatorCode2[OperatorCode2["array_copy"] = 64280] = "array_copy";
  OperatorCode2[OperatorCode2["array_init"] = 64281] = "array_init";
  OperatorCode2[OperatorCode2["array_init_static"] = 64282] = "array_init_static";
  OperatorCode2[OperatorCode2["array_new"] = 64283] = "array_new";
  OperatorCode2[OperatorCode2["array_new_default"] = 64284] = "array_new_default";
  OperatorCode2[OperatorCode2["i31_new"] = 64288] = "i31_new";
  OperatorCode2[OperatorCode2["i31_get_s"] = 64289] = "i31_get_s";
  OperatorCode2[OperatorCode2["i31_get_u"] = 64290] = "i31_get_u";
  OperatorCode2[OperatorCode2["rtt_canon"] = 64304] = "rtt_canon";
  OperatorCode2[OperatorCode2["rtt_sub"] = 64305] = "rtt_sub";
  OperatorCode2[OperatorCode2["rtt_fresh_sub"] = 64306] = "rtt_fresh_sub";
  OperatorCode2[OperatorCode2["ref_test"] = 64320] = "ref_test";
  OperatorCode2[OperatorCode2["ref_test_static"] = 64324] = "ref_test_static";
  OperatorCode2[OperatorCode2["ref_cast"] = 64321] = "ref_cast";
  OperatorCode2[OperatorCode2["ref_cast_static"] = 64325] = "ref_cast_static";
  OperatorCode2[OperatorCode2["br_on_cast"] = 64322] = "br_on_cast";
  OperatorCode2[OperatorCode2["br_on_cast_static"] = 64326] = "br_on_cast_static";
  OperatorCode2[OperatorCode2["br_on_cast_fail"] = 64323] = "br_on_cast_fail";
  OperatorCode2[OperatorCode2["br_on_cast_static_fail"] = 64327] = "br_on_cast_static_fail";
  OperatorCode2[OperatorCode2["ref_is_func"] = 64336] = "ref_is_func";
  OperatorCode2[OperatorCode2["ref_is_data"] = 64337] = "ref_is_data";
  OperatorCode2[OperatorCode2["ref_is_i31"] = 64338] = "ref_is_i31";
  OperatorCode2[OperatorCode2["ref_as_func"] = 64344] = "ref_as_func";
  OperatorCode2[OperatorCode2["ref_as_data"] = 64345] = "ref_as_data";
  OperatorCode2[OperatorCode2["ref_as_i31"] = 64346] = "ref_as_i31";
  OperatorCode2[OperatorCode2["br_on_func"] = 64352] = "br_on_func";
  OperatorCode2[OperatorCode2["br_on_data"] = 64353] = "br_on_data";
  OperatorCode2[OperatorCode2["br_on_i31"] = 64354] = "br_on_i31";
  OperatorCode2[OperatorCode2["br_on_non_func"] = 64355] = "br_on_non_func";
  OperatorCode2[OperatorCode2["br_on_non_data"] = 64356] = "br_on_non_data";
  OperatorCode2[OperatorCode2["br_on_non_i31"] = 64357] = "br_on_non_i31";
})(OperatorCode || (OperatorCode = {}));
var OperatorCodeNames = [
  "unreachable",
  "nop",
  "block",
  "loop",
  "if",
  "else",
  "try",
  "catch",
  "throw",
  "rethrow",
  "unwind",
  "end",
  "br",
  "br_if",
  "br_table",
  "return",
  "call",
  "call_indirect",
  "return_call",
  "return_call_indirect",
  "call_ref",
  "return_call_ref",
  void 0,
  "let",
  "delegate",
  "catch_all",
  "drop",
  "select",
  "select",
  void 0,
  void 0,
  void 0,
  "local.get",
  "local.set",
  "local.tee",
  "global.get",
  "global.set",
  "table.get",
  "table.set",
  void 0,
  "i32.load",
  "i64.load",
  "f32.load",
  "f64.load",
  "i32.load8_s",
  "i32.load8_u",
  "i32.load16_s",
  "i32.load16_u",
  "i64.load8_s",
  "i64.load8_u",
  "i64.load16_s",
  "i64.load16_u",
  "i64.load32_s",
  "i64.load32_u",
  "i32.store",
  "i64.store",
  "f32.store",
  "f64.store",
  "i32.store8",
  "i32.store16",
  "i64.store8",
  "i64.store16",
  "i64.store32",
  "current_memory",
  "memory.grow",
  "i32.const",
  "i64.const",
  "f32.const",
  "f64.const",
  "i32.eqz",
  "i32.eq",
  "i32.ne",
  "i32.lt_s",
  "i32.lt_u",
  "i32.gt_s",
  "i32.gt_u",
  "i32.le_s",
  "i32.le_u",
  "i32.ge_s",
  "i32.ge_u",
  "i64.eqz",
  "i64.eq",
  "i64.ne",
  "i64.lt_s",
  "i64.lt_u",
  "i64.gt_s",
  "i64.gt_u",
  "i64.le_s",
  "i64.le_u",
  "i64.ge_s",
  "i64.ge_u",
  "f32.eq",
  "f32.ne",
  "f32.lt",
  "f32.gt",
  "f32.le",
  "f32.ge",
  "f64.eq",
  "f64.ne",
  "f64.lt",
  "f64.gt",
  "f64.le",
  "f64.ge",
  "i32.clz",
  "i32.ctz",
  "i32.popcnt",
  "i32.add",
  "i32.sub",
  "i32.mul",
  "i32.div_s",
  "i32.div_u",
  "i32.rem_s",
  "i32.rem_u",
  "i32.and",
  "i32.or",
  "i32.xor",
  "i32.shl",
  "i32.shr_s",
  "i32.shr_u",
  "i32.rotl",
  "i32.rotr",
  "i64.clz",
  "i64.ctz",
  "i64.popcnt",
  "i64.add",
  "i64.sub",
  "i64.mul",
  "i64.div_s",
  "i64.div_u",
  "i64.rem_s",
  "i64.rem_u",
  "i64.and",
  "i64.or",
  "i64.xor",
  "i64.shl",
  "i64.shr_s",
  "i64.shr_u",
  "i64.rotl",
  "i64.rotr",
  "f32.abs",
  "f32.neg",
  "f32.ceil",
  "f32.floor",
  "f32.trunc",
  "f32.nearest",
  "f32.sqrt",
  "f32.add",
  "f32.sub",
  "f32.mul",
  "f32.div",
  "f32.min",
  "f32.max",
  "f32.copysign",
  "f64.abs",
  "f64.neg",
  "f64.ceil",
  "f64.floor",
  "f64.trunc",
  "f64.nearest",
  "f64.sqrt",
  "f64.add",
  "f64.sub",
  "f64.mul",
  "f64.div",
  "f64.min",
  "f64.max",
  "f64.copysign",
  "i32.wrap_i64",
  "i32.trunc_f32_s",
  "i32.trunc_f32_u",
  "i32.trunc_f64_s",
  "i32.trunc_f64_u",
  "i64.extend_i32_s",
  "i64.extend_i32_u",
  "i64.trunc_f32_s",
  "i64.trunc_f32_u",
  "i64.trunc_f64_s",
  "i64.trunc_f64_u",
  "f32.convert_i32_s",
  "f32.convert_i32_u",
  "f32.convert_i64_s",
  "f32.convert_i64_u",
  "f32.demote_f64",
  "f64.convert_i32_s",
  "f64.convert_i32_u",
  "f64.convert_i64_s",
  "f64.convert_i64_u",
  "f64.promote_f32",
  "i32.reinterpret_f32",
  "i64.reinterpret_f64",
  "f32.reinterpret_i32",
  "f64.reinterpret_i64",
  "i32.extend8_s",
  "i32.extend16_s",
  "i64.extend8_s",
  "i64.extend16_s",
  "i64.extend32_s",
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  "ref.null",
  "ref.is_null",
  "ref.func",
  "ref.as_non_null",
  "br_on_null",
  "ref.eq",
  "br_on_non_null",
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0
];
[
  "i32.trunc_sat_f32_s",
  "i32.trunc_sat_f32_u",
  "i32.trunc_sat_f64_s",
  "i32.trunc_sat_f64_u",
  "i64.trunc_sat_f32_s",
  "i64.trunc_sat_f32_u",
  "i64.trunc_sat_f64_s",
  "i64.trunc_sat_f64_u",
  "memory.init",
  "data.drop",
  "memory.copy",
  "memory.fill",
  "table.init",
  "elem.drop",
  "table.copy",
  "table.grow",
  "table.size",
  "table.fill"
].forEach((s, i) => {
  OperatorCodeNames[64512 | i] = s;
});
[
  "v128.load",
  "i16x8.load8x8_s",
  "i16x8.load8x8_u",
  "i32x4.load16x4_s",
  "i32x4.load16x4_u",
  "i64x2.load32x2_s",
  "i64x2.load32x2_u",
  "v8x16.load_splat",
  "v16x8.load_splat",
  "v32x4.load_splat",
  "v64x2.load_splat",
  "v128.store",
  "v128.const",
  "i8x16.shuffle",
  "i8x16.swizzle",
  "i8x16.splat",
  "i16x8.splat",
  "i32x4.splat",
  "i64x2.splat",
  "f32x4.splat",
  "f64x2.splat",
  "i8x16.extract_lane_s",
  "i8x16.extract_lane_u",
  "i8x16.replace_lane",
  "i16x8.extract_lane_s",
  "i16x8.extract_lane_u",
  "i16x8.replace_lane",
  "i32x4.extract_lane",
  "i32x4.replace_lane",
  "i64x2.extract_lane",
  "i64x2.replace_lane",
  "f32x4.extract_lane",
  "f32x4.replace_lane",
  "f64x2.extract_lane",
  "f64x2.replace_lane",
  "i8x16.eq",
  "i8x16.ne",
  "i8x16.lt_s",
  "i8x16.lt_u",
  "i8x16.gt_s",
  "i8x16.gt_u",
  "i8x16.le_s",
  "i8x16.le_u",
  "i8x16.ge_s",
  "i8x16.ge_u",
  "i16x8.eq",
  "i16x8.ne",
  "i16x8.lt_s",
  "i16x8.lt_u",
  "i16x8.gt_s",
  "i16x8.gt_u",
  "i16x8.le_s",
  "i16x8.le_u",
  "i16x8.ge_s",
  "i16x8.ge_u",
  "i32x4.eq",
  "i32x4.ne",
  "i32x4.lt_s",
  "i32x4.lt_u",
  "i32x4.gt_s",
  "i32x4.gt_u",
  "i32x4.le_s",
  "i32x4.le_u",
  "i32x4.ge_s",
  "i32x4.ge_u",
  "f32x4.eq",
  "f32x4.ne",
  "f32x4.lt",
  "f32x4.gt",
  "f32x4.le",
  "f32x4.ge",
  "f64x2.eq",
  "f64x2.ne",
  "f64x2.lt",
  "f64x2.gt",
  "f64x2.le",
  "f64x2.ge",
  "v128.not",
  "v128.and",
  "v128.andnot",
  "v128.or",
  "v128.xor",
  "v128.bitselect",
  "v128.any_true",
  "v128.load8_lane",
  "v128.load16_lane",
  "v128.load32_lane",
  "v128.load64_lane",
  "v128.store8_lane",
  "v128.store16_lane",
  "v128.store32_lane",
  "v128.store64_lane",
  "v128.load32_zero",
  "v128.load64_zero",
  "f32x4.demote_f64x2_zero",
  "f64x2.promote_low_f32x4",
  "i8x16.abs",
  "i8x16.neg",
  "i8x16_popcnt",
  "i8x16.all_true",
  "i8x16.bitmask",
  "i8x16.narrow_i16x8_s",
  "i8x16.narrow_i16x8_u",
  "f32x4.ceil",
  "f32x4.floor",
  "f32x4.trunc",
  "f32x4.nearest",
  "i8x16.shl",
  "i8x16.shr_s",
  "i8x16.shr_u",
  "i8x16.add",
  "i8x16.add_sat_s",
  "i8x16.add_sat_u",
  "i8x16.sub",
  "i8x16.sub_sat_s",
  "i8x16.sub_sat_u",
  "f64x2.ceil",
  "f64x2.floor",
  "i8x16.min_s",
  "i8x16.min_u",
  "i8x16.max_s",
  "i8x16.max_u",
  "f64x2.trunc",
  "i8x16.avgr_u",
  "i16x8.extadd_pairwise_i8x16_s",
  "i16x8.extadd_pairwise_i8x16_u",
  "i32x4.extadd_pairwise_i16x8_s",
  "i32x4.extadd_pairwise_i16x8_u",
  "i16x8.abs",
  "i16x8.neg",
  "i16x8.q15mulr_sat_s",
  "i16x8.all_true",
  "i16x8.bitmask",
  "i16x8.narrow_i32x4_s",
  "i16x8.narrow_i32x4_u",
  "i16x8.extend_low_i8x16_s",
  "i16x8.extend_high_i8x16_s",
  "i16x8.extend_low_i8x16_u",
  "i16x8.extend_high_i8x16_u",
  "i16x8.shl",
  "i16x8.shr_s",
  "i16x8.shr_u",
  "i16x8.add",
  "i16x8.add_sat_s",
  "i16x8.add_sat_u",
  "i16x8.sub",
  "i16x8.sub_sat_s",
  "i16x8.sub_sat_u",
  "f64x2.nearest",
  "i16x8.mul",
  "i16x8.min_s",
  "i16x8.min_u",
  "i16x8.max_s",
  "i16x8.max_u",
  void 0,
  "i16x8.avgr_u",
  "i16x8.extmul_low_i8x16_s",
  "i16x8.extmul_high_i8x16_s",
  "i16x8.extmul_low_i8x16_u",
  "i16x8.extmul_high_i8x16_u",
  "i32x4.abs",
  "i32x4.neg",
  void 0,
  "i32x4.all_true",
  "i32x4.bitmask",
  void 0,
  void 0,
  "i32x4.extend_low_i16x8_s",
  "i32x4.extend_high_i16x8_s",
  "i32x4.extend_low_i16x8_u",
  "i32x4.extend_high_i16x8_u",
  "i32x4.shl",
  "i32x4.shr_s",
  "i32x4.shr_u",
  "i32x4.add",
  void 0,
  void 0,
  "i32x4.sub",
  void 0,
  void 0,
  void 0,
  "i32x4.mul",
  "i32x4.min_s",
  "i32x4.min_u",
  "i32x4.max_s",
  "i32x4.max_u",
  "i32x4.dot_i16x8_s",
  void 0,
  "i32x4.extmul_low_i16x8_s",
  "i32x4.extmul_high_i16x8_s",
  "i32x4.extmul_low_i16x8_u",
  "i32x4.extmul_high_i16x8_u",
  "i64x2.abs",
  "i64x2.neg",
  void 0,
  "i64x2.all_true",
  "i64x2.bitmask",
  void 0,
  void 0,
  "i64x2.extend_low_i32x4_s",
  "i64x2.extend_high_i32x4_s",
  "i64x2.extend_low_i32x4_u",
  "i64x2.extend_high_i32x4_u",
  "i64x2.shl",
  "i64x2.shr_s",
  "i64x2.shr_u",
  "i64x2.add",
  void 0,
  void 0,
  "i64x2.sub",
  void 0,
  void 0,
  void 0,
  "i64x2.mul",
  "i64x2.eq",
  "i64x2.ne",
  "i64x2.lt_s",
  "i64x2.gt_s",
  "i64x2.le_s",
  "i64x2.ge_s",
  "i64x2.extmul_low_i32x4_s",
  "i64x2.extmul_high_i32x4_s",
  "i64x2.extmul_low_i32x4_u",
  "i64x2.extmul_high_i32x4_u",
  "f32x4.abs",
  "f32x4.neg",
  void 0,
  "f32x4.sqrt",
  "f32x4.add",
  "f32x4.sub",
  "f32x4.mul",
  "f32x4.div",
  "f32x4.min",
  "f32x4.max",
  "f32x4.pmin",
  "f32x4.pmax",
  "f64x2.abs",
  "f64x2.neg",
  void 0,
  "f64x2.sqrt",
  "f64x2.add",
  "f64x2.sub",
  "f64x2.mul",
  "f64x2.div",
  "f64x2.min",
  "f64x2.max",
  "f64x2.pmin",
  "f64x2.pmax",
  "i32x4.trunc_sat_f32x4_s",
  "i32x4.trunc_sat_f32x4_u",
  "f32x4.convert_i32x4_s",
  "f32x4.convert_i32x4_u",
  "i32x4.trunc_sat_f64x2_s_zero",
  "i32x4.trunc_sat_f64x2_u_zero",
  "f64x2.convert_low_i32x4_s",
  "f64x2.convert_low_i32x4_u"
].forEach((s, i) => {
  OperatorCodeNames[64768 | i] = s;
});
[
  "atomic.notify",
  "i32.atomic.wait",
  "i64.atomic.wait",
  "atomic.fence",
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  void 0,
  "i32.atomic.load",
  "i64.atomic.load",
  "i32.atomic.load8_u",
  "i32.atomic.load16_u",
  "i64.atomic.load8_u",
  "i64.atomic.load16_u",
  "i64.atomic.load32_u",
  "i32.atomic.store",
  "i64.atomic.store",
  "i32.atomic.store8",
  "i32.atomic.store16",
  "i64.atomic.store8",
  "i64.atomic.store16",
  "i64.atomic.store32",
  "i32.atomic.rmw.add",
  "i64.atomic.rmw.add",
  "i32.atomic.rmw8.add_u",
  "i32.atomic.rmw16.add_u",
  "i64.atomic.rmw8.add_u",
  "i64.atomic.rmw16.add_u",
  "i64.atomic.rmw32.add_u",
  "i32.atomic.rmw.sub",
  "i64.atomic.rmw.sub",
  "i32.atomic.rmw8.sub_u",
  "i32.atomic.rmw16.sub_u",
  "i64.atomic.rmw8.sub_u",
  "i64.atomic.rmw16.sub_u",
  "i64.atomic.rmw32.sub_u",
  "i32.atomic.rmw.and",
  "i64.atomic.rmw.and",
  "i32.atomic.rmw8.and_u",
  "i32.atomic.rmw16.and_u",
  "i64.atomic.rmw8.and_u",
  "i64.atomic.rmw16.and_u",
  "i64.atomic.rmw32.and_u",
  "i32.atomic.rmw.or",
  "i64.atomic.rmw.or",
  "i32.atomic.rmw8.or_u",
  "i32.atomic.rmw16.or_u",
  "i64.atomic.rmw8.or_u",
  "i64.atomic.rmw16.or_u",
  "i64.atomic.rmw32.or_u",
  "i32.atomic.rmw.xor",
  "i64.atomic.rmw.xor",
  "i32.atomic.rmw8.xor_u",
  "i32.atomic.rmw16.xor_u",
  "i64.atomic.rmw8.xor_u",
  "i64.atomic.rmw16.xor_u",
  "i64.atomic.rmw32.xor_u",
  "i32.atomic.rmw.xchg",
  "i64.atomic.rmw.xchg",
  "i32.atomic.rmw8.xchg_u",
  "i32.atomic.rmw16.xchg_u",
  "i64.atomic.rmw8.xchg_u",
  "i64.atomic.rmw16.xchg_u",
  "i64.atomic.rmw32.xchg_u",
  "i32.atomic.rmw.cmpxchg",
  "i64.atomic.rmw.cmpxchg",
  "i32.atomic.rmw8.cmpxchg_u",
  "i32.atomic.rmw16.cmpxchg_u",
  "i64.atomic.rmw8.cmpxchg_u",
  "i64.atomic.rmw16.cmpxchg_u",
  "i64.atomic.rmw32.cmpxchg_u"
].forEach((s, i) => {
  OperatorCodeNames[65024 | i] = s;
});
OperatorCodeNames[64257] = "struct.new_with_rtt";
OperatorCodeNames[64258] = "struct.new_default_with_rtt";
OperatorCodeNames[64259] = "struct.get";
OperatorCodeNames[64260] = "struct.get_s";
OperatorCodeNames[64261] = "struct.get_u";
OperatorCodeNames[64262] = "struct.set";
OperatorCodeNames[64263] = "struct.new";
OperatorCodeNames[64264] = "struct.new_default";
OperatorCodeNames[64273] = "array.new_with_rtt";
OperatorCodeNames[64274] = "array.new_default_with_rtt";
OperatorCodeNames[64275] = "array.get";
OperatorCodeNames[64276] = "array.get_s";
OperatorCodeNames[64277] = "array.get_u";
OperatorCodeNames[64278] = "array.set";
OperatorCodeNames[64279] = "array.len";
OperatorCodeNames[64280] = "array.copy";
OperatorCodeNames[64281] = "array.init";
OperatorCodeNames[64282] = "array.init_static";
OperatorCodeNames[64283] = "array.new";
OperatorCodeNames[64284] = "array.new_default";
OperatorCodeNames[64288] = "i31.new";
OperatorCodeNames[64289] = "i31.get_s";
OperatorCodeNames[64290] = "i31.get_u";
OperatorCodeNames[64304] = "rtt.canon";
OperatorCodeNames[64305] = "rtt.sub";
OperatorCodeNames[64306] = "rtt.fresh_sub";
OperatorCodeNames[64320] = "ref.test";
OperatorCodeNames[64321] = "ref.cast";
OperatorCodeNames[64322] = "br_on_cast";
OperatorCodeNames[64323] = "br_on_cast_fail";
OperatorCodeNames[64324] = "ref.test_static";
OperatorCodeNames[64325] = "ref.cast_static";
OperatorCodeNames[64326] = "br_on_cast_static";
OperatorCodeNames[64327] = "br_on_cast_static_fail";
OperatorCodeNames[64336] = "ref.is_func";
OperatorCodeNames[64337] = "ref.is_data";
OperatorCodeNames[64338] = "ref.is_i31";
OperatorCodeNames[64344] = "ref.as_func";
OperatorCodeNames[64345] = "ref.as_data";
OperatorCodeNames[64346] = "ref.as_i31";
OperatorCodeNames[64352] = "br_on_func";
OperatorCodeNames[64353] = "br_on_data";
OperatorCodeNames[64354] = "br_on_i31";
OperatorCodeNames[64355] = "br_on_non_func";
OperatorCodeNames[64356] = "br_on_non_data";
OperatorCodeNames[64357] = "br_on_non_i31";
var ExternalKind;
(function(ExternalKind2) {
  ExternalKind2[ExternalKind2["Function"] = 0] = "Function";
  ExternalKind2[ExternalKind2["Table"] = 1] = "Table";
  ExternalKind2[ExternalKind2["Memory"] = 2] = "Memory";
  ExternalKind2[ExternalKind2["Global"] = 3] = "Global";
  ExternalKind2[ExternalKind2["Event"] = 4] = "Event";
})(ExternalKind || (ExternalKind = {}));
var TypeKind;
(function(TypeKind2) {
  TypeKind2[TypeKind2["unspecified"] = 0] = "unspecified";
  TypeKind2[TypeKind2["i32"] = -1] = "i32";
  TypeKind2[TypeKind2["i64"] = -2] = "i64";
  TypeKind2[TypeKind2["f32"] = -3] = "f32";
  TypeKind2[TypeKind2["f64"] = -4] = "f64";
  TypeKind2[TypeKind2["v128"] = -5] = "v128";
  TypeKind2[TypeKind2["i8"] = -6] = "i8";
  TypeKind2[TypeKind2["i16"] = -7] = "i16";
  TypeKind2[TypeKind2["funcref"] = -16] = "funcref";
  TypeKind2[TypeKind2["externref"] = -17] = "externref";
  TypeKind2[TypeKind2["anyref"] = -18] = "anyref";
  TypeKind2[TypeKind2["eqref"] = -19] = "eqref";
  TypeKind2[TypeKind2["optref"] = -20] = "optref";
  TypeKind2[TypeKind2["ref"] = -21] = "ref";
  TypeKind2[TypeKind2["i31ref"] = -22] = "i31ref";
  TypeKind2[TypeKind2["rtt_d"] = -23] = "rtt_d";
  TypeKind2[TypeKind2["rtt"] = -24] = "rtt";
  TypeKind2[TypeKind2["dataref"] = -25] = "dataref";
  TypeKind2[TypeKind2["func"] = -32] = "func";
  TypeKind2[TypeKind2["struct"] = -33] = "struct";
  TypeKind2[TypeKind2["array"] = -34] = "array";
  TypeKind2[TypeKind2["func_subtype"] = -35] = "func_subtype";
  TypeKind2[TypeKind2["struct_subtype"] = -36] = "struct_subtype";
  TypeKind2[TypeKind2["array_subtype"] = -37] = "array_subtype";
  TypeKind2[TypeKind2["empty_block_type"] = -64] = "empty_block_type";
})(TypeKind || (TypeKind = {}));
var Type = class {
  constructor(kind, index = -1, depth = -1) {
    if (kind < 0 || kind === 0 && index >= 0) {
    } else {
      throw new Error(`invalid type: ${kind}/${index}/${depth}`);
    }
    this.kind = kind;
    this.index = index;
    this.depth = depth;
    if (index === -16 && kind === -20 || index === -17 && kind === -20 || index === -18 && kind === -20 || index === -19 && kind === -20 || index === -22 && kind === -21 || index === -25 && kind === -21) {
      this.kind = index;
      this.index = -1;
    }
  }
};
Type.funcref = new Type(
  -16
  /* funcref */
);
Type.externref = new Type(
  -17
  /* externref */
);
var RelocType;
(function(RelocType2) {
  RelocType2[RelocType2["FunctionIndex_LEB"] = 0] = "FunctionIndex_LEB";
  RelocType2[RelocType2["TableIndex_SLEB"] = 1] = "TableIndex_SLEB";
  RelocType2[RelocType2["TableIndex_I32"] = 2] = "TableIndex_I32";
  RelocType2[RelocType2["GlobalAddr_LEB"] = 3] = "GlobalAddr_LEB";
  RelocType2[RelocType2["GlobalAddr_SLEB"] = 4] = "GlobalAddr_SLEB";
  RelocType2[RelocType2["GlobalAddr_I32"] = 5] = "GlobalAddr_I32";
  RelocType2[RelocType2["TypeIndex_LEB"] = 6] = "TypeIndex_LEB";
  RelocType2[RelocType2["GlobalIndex_LEB"] = 7] = "GlobalIndex_LEB";
})(RelocType || (RelocType = {}));
var LinkingType;
(function(LinkingType2) {
  LinkingType2[LinkingType2["StackPointer"] = 1] = "StackPointer";
})(LinkingType || (LinkingType = {}));
var NameType;
(function(NameType2) {
  NameType2[NameType2["Module"] = 0] = "Module";
  NameType2[NameType2["Function"] = 1] = "Function";
  NameType2[NameType2["Local"] = 2] = "Local";
  NameType2[NameType2["Event"] = 3] = "Event";
  NameType2[NameType2["Type"] = 4] = "Type";
  NameType2[NameType2["Table"] = 5] = "Table";
  NameType2[NameType2["Memory"] = 6] = "Memory";
  NameType2[NameType2["Global"] = 7] = "Global";
  NameType2[NameType2["Field"] = 10] = "Field";
})(NameType || (NameType = {}));
var BinaryReaderState;
(function(BinaryReaderState2) {
  BinaryReaderState2[BinaryReaderState2["ERROR"] = -1] = "ERROR";
  BinaryReaderState2[BinaryReaderState2["INITIAL"] = 0] = "INITIAL";
  BinaryReaderState2[BinaryReaderState2["BEGIN_WASM"] = 1] = "BEGIN_WASM";
  BinaryReaderState2[BinaryReaderState2["END_WASM"] = 2] = "END_WASM";
  BinaryReaderState2[BinaryReaderState2["BEGIN_SECTION"] = 3] = "BEGIN_SECTION";
  BinaryReaderState2[BinaryReaderState2["END_SECTION"] = 4] = "END_SECTION";
  BinaryReaderState2[BinaryReaderState2["SKIPPING_SECTION"] = 5] = "SKIPPING_SECTION";
  BinaryReaderState2[BinaryReaderState2["READING_SECTION_RAW_DATA"] = 6] = "READING_SECTION_RAW_DATA";
  BinaryReaderState2[BinaryReaderState2["SECTION_RAW_DATA"] = 7] = "SECTION_RAW_DATA";
  BinaryReaderState2[BinaryReaderState2["TYPE_SECTION_ENTRY"] = 11] = "TYPE_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["IMPORT_SECTION_ENTRY"] = 12] = "IMPORT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["FUNCTION_SECTION_ENTRY"] = 13] = "FUNCTION_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["TABLE_SECTION_ENTRY"] = 14] = "TABLE_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["MEMORY_SECTION_ENTRY"] = 15] = "MEMORY_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["GLOBAL_SECTION_ENTRY"] = 16] = "GLOBAL_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["EXPORT_SECTION_ENTRY"] = 17] = "EXPORT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["DATA_SECTION_ENTRY"] = 18] = "DATA_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["NAME_SECTION_ENTRY"] = 19] = "NAME_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["ELEMENT_SECTION_ENTRY"] = 20] = "ELEMENT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["LINKING_SECTION_ENTRY"] = 21] = "LINKING_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["START_SECTION_ENTRY"] = 22] = "START_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["EVENT_SECTION_ENTRY"] = 23] = "EVENT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["BEGIN_INIT_EXPRESSION_BODY"] = 25] = "BEGIN_INIT_EXPRESSION_BODY";
  BinaryReaderState2[BinaryReaderState2["INIT_EXPRESSION_OPERATOR"] = 26] = "INIT_EXPRESSION_OPERATOR";
  BinaryReaderState2[BinaryReaderState2["END_INIT_EXPRESSION_BODY"] = 27] = "END_INIT_EXPRESSION_BODY";
  BinaryReaderState2[BinaryReaderState2["BEGIN_FUNCTION_BODY"] = 28] = "BEGIN_FUNCTION_BODY";
  BinaryReaderState2[BinaryReaderState2["READING_FUNCTION_HEADER"] = 29] = "READING_FUNCTION_HEADER";
  BinaryReaderState2[BinaryReaderState2["CODE_OPERATOR"] = 30] = "CODE_OPERATOR";
  BinaryReaderState2[BinaryReaderState2["END_FUNCTION_BODY"] = 31] = "END_FUNCTION_BODY";
  BinaryReaderState2[BinaryReaderState2["SKIPPING_FUNCTION_BODY"] = 32] = "SKIPPING_FUNCTION_BODY";
  BinaryReaderState2[BinaryReaderState2["BEGIN_ELEMENT_SECTION_ENTRY"] = 33] = "BEGIN_ELEMENT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["ELEMENT_SECTION_ENTRY_BODY"] = 34] = "ELEMENT_SECTION_ENTRY_BODY";
  BinaryReaderState2[BinaryReaderState2["END_ELEMENT_SECTION_ENTRY"] = 35] = "END_ELEMENT_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["BEGIN_DATA_SECTION_ENTRY"] = 36] = "BEGIN_DATA_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["DATA_SECTION_ENTRY_BODY"] = 37] = "DATA_SECTION_ENTRY_BODY";
  BinaryReaderState2[BinaryReaderState2["END_DATA_SECTION_ENTRY"] = 38] = "END_DATA_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["BEGIN_GLOBAL_SECTION_ENTRY"] = 39] = "BEGIN_GLOBAL_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["END_GLOBAL_SECTION_ENTRY"] = 40] = "END_GLOBAL_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["RELOC_SECTION_HEADER"] = 41] = "RELOC_SECTION_HEADER";
  BinaryReaderState2[BinaryReaderState2["RELOC_SECTION_ENTRY"] = 42] = "RELOC_SECTION_ENTRY";
  BinaryReaderState2[BinaryReaderState2["SOURCE_MAPPING_URL"] = 43] = "SOURCE_MAPPING_URL";
  BinaryReaderState2[BinaryReaderState2["BEGIN_OFFSET_EXPRESSION_BODY"] = 44] = "BEGIN_OFFSET_EXPRESSION_BODY";
  BinaryReaderState2[BinaryReaderState2["OFFSET_EXPRESSION_OPERATOR"] = 45] = "OFFSET_EXPRESSION_OPERATOR";
  BinaryReaderState2[BinaryReaderState2["END_OFFSET_EXPRESSION_BODY"] = 46] = "END_OFFSET_EXPRESSION_BODY";
})(BinaryReaderState || (BinaryReaderState = {}));
var DataSegmentType;
(function(DataSegmentType2) {
  DataSegmentType2[DataSegmentType2["Active"] = 0] = "Active";
  DataSegmentType2[DataSegmentType2["Passive"] = 1] = "Passive";
  DataSegmentType2[DataSegmentType2["ActiveWithMemoryIndex"] = 2] = "ActiveWithMemoryIndex";
})(DataSegmentType || (DataSegmentType = {}));
function isActiveDataSegmentType(segmentType) {
  switch (segmentType) {
    case 0:
    case 2:
      return true;
    default:
      return false;
  }
}
var DataMode;
(function(DataMode2) {
  DataMode2[DataMode2["Active"] = 0] = "Active";
  DataMode2[DataMode2["Passive"] = 1] = "Passive";
})(DataMode || (DataMode = {}));
var ElementSegmentType;
(function(ElementSegmentType2) {
  ElementSegmentType2[ElementSegmentType2["LegacyActiveFuncrefExternval"] = 0] = "LegacyActiveFuncrefExternval";
  ElementSegmentType2[ElementSegmentType2["PassiveExternval"] = 1] = "PassiveExternval";
  ElementSegmentType2[ElementSegmentType2["ActiveExternval"] = 2] = "ActiveExternval";
  ElementSegmentType2[ElementSegmentType2["DeclaredExternval"] = 3] = "DeclaredExternval";
  ElementSegmentType2[ElementSegmentType2["LegacyActiveFuncrefElemexpr"] = 4] = "LegacyActiveFuncrefElemexpr";
  ElementSegmentType2[ElementSegmentType2["PassiveElemexpr"] = 5] = "PassiveElemexpr";
  ElementSegmentType2[ElementSegmentType2["ActiveElemexpr"] = 6] = "ActiveElemexpr";
  ElementSegmentType2[ElementSegmentType2["DeclaredElemexpr"] = 7] = "DeclaredElemexpr";
})(ElementSegmentType || (ElementSegmentType = {}));
function isActiveElementSegmentType(segmentType) {
  switch (segmentType) {
    case 0:
    case 2:
    case 4:
    case 6:
      return true;
    default:
      return false;
  }
}
function isExternvalElementSegmentType(segmentType) {
  switch (segmentType) {
    case 0:
    case 1:
    case 2:
    case 3:
      return true;
    default:
      return false;
  }
}
var ElementMode;
(function(ElementMode2) {
  ElementMode2[ElementMode2["Active"] = 0] = "Active";
  ElementMode2[ElementMode2["Passive"] = 1] = "Passive";
  ElementMode2[ElementMode2["Declarative"] = 2] = "Declarative";
})(ElementMode || (ElementMode = {}));
var DataRange = class {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  offset(delta) {
    this.start += delta;
    this.end += delta;
  }
};
var Int64 = class {
  constructor(data) {
    this._data = data || new Uint8Array(8);
  }
  toInt32() {
    return this._data[0] | this._data[1] << 8 | this._data[2] << 16 | this._data[3] << 24;
  }
  toDouble() {
    var power = 1;
    var sum;
    if (this._data[7] & 128) {
      sum = -1;
      for (var i = 0; i < 8; i++, power *= 256)
        sum -= power * (255 ^ this._data[i]);
    } else {
      sum = 0;
      for (var i = 0; i < 8; i++, power *= 256)
        sum += power * this._data[i];
    }
    return sum;
  }
  toString() {
    var low = (this._data[0] | this._data[1] << 8 | this._data[2] << 16 | this._data[3] << 24) >>> 0;
    var high = (this._data[4] | this._data[5] << 8 | this._data[6] << 16 | this._data[7] << 24) >>> 0;
    if (low === 0 && high === 0) {
      return "0";
    }
    var sign = false;
    if (high >> 31) {
      high = 4294967296 - high;
      if (low > 0) {
        high--;
        low = 4294967296 - low;
      }
      sign = true;
    }
    var buf = [];
    while (high > 0) {
      var t = high % 10 * 4294967296 + low;
      high = Math.floor(high / 10);
      buf.unshift((t % 10).toString());
      low = Math.floor(t / 10);
    }
    while (low > 0) {
      buf.unshift((low % 10).toString());
      low = Math.floor(low / 10);
    }
    if (sign)
      buf.unshift("-");
    return buf.join("");
  }
  get data() {
    return this._data;
  }
};
var BinaryReader = class {
  constructor() {
    this._data = null;
    this._pos = 0;
    this._length = 0;
    this._eof = false;
    this.state = 0;
    this.result = null;
    this.error = null;
    this._sectionEntriesLeft = 0;
    this._sectionId = -1;
    this._sectionRange = null;
    this._functionRange = null;
    this._segmentType = 0;
    this._segmentEntriesLeft = 0;
  }
  get data() {
    return this._data;
  }
  get position() {
    return this._pos;
  }
  get length() {
    return this._length;
  }
  setData(buffer, pos, length, eof) {
    var posDelta = pos - this._pos;
    this._data = new Uint8Array(buffer);
    this._pos = pos;
    this._length = length;
    this._eof = eof === void 0 ? true : eof;
    if (this._sectionRange)
      this._sectionRange.offset(posDelta);
    if (this._functionRange)
      this._functionRange.offset(posDelta);
  }
  hasBytes(n) {
    return this._pos + n <= this._length;
  }
  hasMoreBytes() {
    return this.hasBytes(1);
  }
  readUint8() {
    return this._data[this._pos++];
  }
  readInt32() {
    var b1 = this._data[this._pos++];
    var b2 = this._data[this._pos++];
    var b3 = this._data[this._pos++];
    var b4 = this._data[this._pos++];
    return b1 | b2 << 8 | b3 << 16 | b4 << 24;
  }
  readUint32() {
    return this.readInt32();
  }
  peekInt32() {
    var b1 = this._data[this._pos];
    var b2 = this._data[this._pos + 1];
    var b3 = this._data[this._pos + 2];
    var b4 = this._data[this._pos + 3];
    return b1 | b2 << 8 | b3 << 16 | b4 << 24;
  }
  hasVarIntBytes() {
    var pos = this._pos;
    while (pos < this._length) {
      if ((this._data[pos++] & 128) == 0)
        return true;
    }
    return false;
  }
  readVarUint1() {
    return this.readUint8();
  }
  readVarInt7() {
    return this.readUint8() << 25 >> 25;
  }
  readVarUint7() {
    return this.readUint8();
  }
  readVarInt32() {
    var result = 0;
    var shift = 0;
    while (true) {
      var byte = this.readUint8();
      result |= (byte & 127) << shift;
      shift += 7;
      if ((byte & 128) === 0)
        break;
    }
    if (shift >= 32)
      return result;
    var ashift = 32 - shift;
    return result << ashift >> ashift;
  }
  readVarUint32() {
    var result = 0;
    var shift = 0;
    while (true) {
      var byte = this.readUint8();
      result |= (byte & 127) << shift;
      shift += 7;
      if ((byte & 128) === 0)
        break;
    }
    return result >>> 0;
  }
  readVarInt64() {
    var result = new Uint8Array(8);
    var i = 0;
    var c = 0;
    var shift = 0;
    while (true) {
      var byte = this.readUint8();
      c |= (byte & 127) << shift;
      shift += 7;
      if (shift > 8) {
        result[i++] = c & 255;
        c >>= 8;
        shift -= 8;
      }
      if ((byte & 128) === 0)
        break;
    }
    var ashift = 32 - shift;
    c = c << ashift >> ashift;
    while (i < 8) {
      result[i++] = c & 255;
      c >>= 8;
    }
    return new Int64(result);
  }
  // Reads any "s33" (signed 33-bit integer) value correctly; no guarantees
  // outside that range.
  readHeapType() {
    var result = 0;
    var shift = 0;
    var byte;
    while (true) {
      byte = this.readUint8();
      if (shift === 28) {
        var signed = byte << 25 >> 25;
        return signed * Math.pow(2, 28) + result;
      }
      result |= (byte & 127) << shift;
      shift += 7;
      if ((byte & 128) === 0)
        break;
    }
    shift = 32 - shift;
    return result << shift >> shift;
  }
  readTypeInternal(kind) {
    if (kind === -21 || kind === -20 || kind === -24) {
      var index = this.readHeapType();
      return new Type(kind, index);
    }
    if (kind === -23) {
      var index = this.readHeapType();
      var depth = this.readVarUint32();
      return new Type(kind, index, depth);
    }
    return new Type(kind);
  }
  readType() {
    var kind = this.readVarInt7();
    return this.readTypeInternal(kind);
  }
  readBlockType() {
    var block_type = this.readHeapType();
    if (block_type < 0) {
      return this.readTypeInternal(block_type);
    }
    var func_index = block_type;
    return new Type(0, func_index);
  }
  readStringBytes() {
    var length = this.readVarUint32();
    return this.readBytes(length);
  }
  readBytes(length) {
    var result = this._data.subarray(this._pos, this._pos + length);
    this._pos += length;
    return new Uint8Array(result);
  }
  skipBytes(length) {
    this._pos += length;
  }
  hasStringBytes() {
    if (!this.hasVarIntBytes())
      return false;
    var pos = this._pos;
    var length = this.readVarUint32();
    var result = this.hasBytes(length);
    this._pos = pos;
    return result;
  }
  hasSectionPayload() {
    return this.hasBytes(this._sectionRange.end - this._pos);
  }
  readFuncType() {
    var paramCount = this.readVarUint32();
    var paramTypes = new Array(paramCount);
    for (var i = 0; i < paramCount; i++)
      paramTypes[i] = this.readType();
    var returnCount = this.readVarUint1();
    var returnTypes = new Array(returnCount);
    for (var i = 0; i < returnCount; i++)
      returnTypes[i] = this.readType();
    return {
      form: -32,
      params: paramTypes,
      returns: returnTypes
    };
  }
  readFuncSubtype() {
    var result = this.readFuncType();
    result.form = -35;
    result.supertype = this.readHeapType();
    return result;
  }
  readStructType() {
    var fieldCount = this.readVarUint32();
    var fieldTypes = new Array(fieldCount);
    var fieldMutabilities = new Array(fieldCount);
    for (var i = 0; i < fieldCount; i++) {
      fieldTypes[i] = this.readType();
      fieldMutabilities[i] = !!this.readVarUint1();
    }
    return {
      form: -33,
      fields: fieldTypes,
      mutabilities: fieldMutabilities
    };
  }
  readStructSubtype() {
    var result = this.readStructType();
    result.form = -36;
    result.supertype = this.readHeapType();
    return result;
  }
  readArrayType() {
    var elementType = this.readType();
    var mutability = !!this.readVarUint1();
    return {
      form: -34,
      elementType,
      mutability
    };
  }
  readArraySubtype() {
    var result = this.readArrayType();
    result.form = -37;
    result.supertype = this.readHeapType();
    return result;
  }
  readResizableLimits(maxPresent) {
    var initial = this.readVarUint32();
    var maximum;
    if (maxPresent) {
      maximum = this.readVarUint32();
    }
    return { initial, maximum };
  }
  readTableType() {
    var elementType = this.readType();
    var flags = this.readVarUint32();
    var limits = this.readResizableLimits(!!(flags & 1));
    return { elementType, limits };
  }
  readMemoryType() {
    var flags = this.readVarUint32();
    var shared = !!(flags & 2);
    return {
      limits: this.readResizableLimits(!!(flags & 1)),
      shared
    };
  }
  readGlobalType() {
    if (!this.hasVarIntBytes()) {
      return null;
    }
    var pos = this._pos;
    var contentType = this.readType();
    if (!this.hasVarIntBytes()) {
      this._pos = pos;
      return null;
    }
    var mutability = this.readVarUint1();
    return { contentType, mutability };
  }
  readEventType() {
    var attribute = this.readVarUint32();
    var typeIndex = this.readVarUint32();
    return {
      attribute,
      typeIndex
    };
  }
  readTypeEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    this.state = 11;
    var form = this.readVarInt7();
    switch (form) {
      case -32:
        this.result = this.readFuncType();
        break;
      case -35:
        this.result = this.readFuncSubtype();
        break;
      case -33:
        this.result = this.readStructType();
        break;
      case -36:
        this.result = this.readStructSubtype();
        break;
      case -34:
        this.result = this.readArrayType();
        break;
      case -37:
        this.result = this.readArraySubtype();
        break;
      default:
        throw new Error(`Unknown type kind: ${form}`);
    }
    this._sectionEntriesLeft--;
    return true;
  }
  readImportEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    this.state = 12;
    var module = this.readStringBytes();
    var field = this.readStringBytes();
    var kind = this.readUint8();
    var funcTypeIndex;
    var type;
    switch (kind) {
      case 0:
        funcTypeIndex = this.readVarUint32();
        break;
      case 1:
        type = this.readTableType();
        break;
      case 2:
        type = this.readMemoryType();
        break;
      case 3:
        type = this.readGlobalType();
        break;
      case 4:
        type = this.readEventType();
        break;
    }
    this.result = {
      module,
      field,
      kind,
      funcTypeIndex,
      type
    };
    this._sectionEntriesLeft--;
    return true;
  }
  readExportEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    var field = this.readStringBytes();
    var kind = this.readUint8();
    var index = this.readVarUint32();
    this.state = 17;
    this.result = { field, kind, index };
    this._sectionEntriesLeft--;
    return true;
  }
  readFunctionEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    var typeIndex = this.readVarUint32();
    this.state = 13;
    this.result = { typeIndex };
    this._sectionEntriesLeft--;
    return true;
  }
  readTableEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    this.state = 14;
    this.result = this.readTableType();
    this._sectionEntriesLeft--;
    return true;
  }
  readMemoryEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    this.state = 15;
    this.result = this.readMemoryType();
    this._sectionEntriesLeft--;
    return true;
  }
  readEventEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    this.state = 23;
    this.result = this.readEventType();
    this._sectionEntriesLeft--;
    return true;
  }
  readGlobalEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    var globalType = this.readGlobalType();
    if (!globalType) {
      this.state = 16;
      return false;
    }
    this.state = 39;
    this.result = {
      type: globalType
    };
    this._sectionEntriesLeft--;
    return true;
  }
  readElementEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    const pos = this._pos;
    if (!this.hasMoreBytes()) {
      this.state = 20;
      return false;
    }
    const segmentType = this.readUint8();
    let mode, tableIndex;
    switch (segmentType) {
      case 0:
      case 4:
        mode = 0;
        tableIndex = 0;
        break;
      case 1:
      case 5:
        mode = 1;
        break;
      case 2:
      case 6:
        mode = 0;
        if (!this.hasVarIntBytes()) {
          this.state = 20;
          this._pos = pos;
          return false;
        }
        tableIndex = this.readVarUint32();
        break;
      case 3:
      case 7:
        mode = 2;
        break;
      default:
        throw new Error(`Unsupported element segment type ${segmentType}`);
    }
    this.state = 33;
    this.result = { mode, tableIndex };
    this._sectionEntriesLeft--;
    this._segmentType = segmentType;
    return true;
  }
  readElementEntryBody() {
    let elementType = Type.funcref;
    switch (this._segmentType) {
      case 1:
      case 2:
      case 3:
        if (!this.hasMoreBytes())
          return false;
        this.skipBytes(1);
        break;
      case 5:
      case 6:
      case 7:
        if (!this.hasMoreBytes())
          return false;
        elementType = this.readType();
        break;
      case 0:
      case 4:
        break;
      default:
        throw new Error(`Unsupported element segment type ${this._segmentType}`);
    }
    this.state = 34;
    this.result = { elementType };
    return true;
  }
  readDataEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    const pos = this._pos;
    if (!this.hasVarIntBytes()) {
      this.state = 18;
      return false;
    }
    const segmentType = this.readVarUint32();
    let mode, memoryIndex;
    switch (segmentType) {
      case 0:
        mode = 0;
        memoryIndex = 0;
        break;
      case 1:
        mode = 1;
        break;
      case 2:
        mode = 0;
        if (!this.hasVarIntBytes()) {
          this._pos = pos;
          this.state = 18;
          return false;
        }
        memoryIndex = this.readVarUint32();
        break;
      default:
        throw new Error(`Unsupported data segment type ${segmentType}`);
    }
    this.state = 36;
    this.result = { mode, memoryIndex };
    this._sectionEntriesLeft--;
    this._segmentType = segmentType;
    return true;
  }
  readDataEntryBody() {
    if (!this.hasStringBytes()) {
      return false;
    }
    this.state = 37;
    this.result = {
      data: this.readStringBytes()
    };
    return true;
  }
  readInitExpressionBody() {
    this.state = 25;
    this.result = null;
    return true;
  }
  readOffsetExpressionBody() {
    this.state = 44;
    this.result = null;
    return true;
  }
  readMemoryImmediate() {
    var flags = this.readVarUint32();
    var offset = this.readVarUint32();
    return { flags, offset };
  }
  readNameMap() {
    var count = this.readVarUint32();
    var result = [];
    for (var i = 0; i < count; i++) {
      var index = this.readVarUint32();
      var name = this.readStringBytes();
      result.push({ index, name });
    }
    return result;
  }
  readNameEntry() {
    var pos = this._pos;
    if (pos >= this._sectionRange.end) {
      this.skipSection();
      return this.read();
    }
    if (!this.hasVarIntBytes())
      return false;
    var type = this.readVarUint7();
    if (!this.hasVarIntBytes()) {
      this._pos = pos;
      return false;
    }
    var payloadLength = this.readVarUint32();
    if (!this.hasBytes(payloadLength)) {
      this._pos = pos;
      return false;
    }
    var result;
    switch (type) {
      case 0:
        result = {
          type,
          moduleName: this.readStringBytes()
        };
        break;
      case 1:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        result = {
          type,
          names: this.readNameMap()
        };
        break;
      case 2:
        var funcsLength = this.readVarUint32();
        var funcs = [];
        for (var i = 0; i < funcsLength; i++) {
          var funcIndex = this.readVarUint32();
          funcs.push({
            index: funcIndex,
            locals: this.readNameMap()
          });
        }
        result = {
          type,
          funcs
        };
        break;
      case 10:
        var typesLength = this.readVarUint32();
        var types = [];
        for (var i = 0; i < typesLength; i++) {
          var fieldIndex = this.readVarUint32();
          types.push({
            index: fieldIndex,
            fields: this.readNameMap()
          });
        }
        result = {
          type,
          types
        };
        break;
      default:
        this.skipBytes(payloadLength);
        return this.read();
    }
    this.state = 19;
    this.result = result;
    return true;
  }
  readRelocHeader() {
    if (!this.hasVarIntBytes()) {
      return false;
    }
    var pos = this._pos;
    var sectionId = this.readVarUint7();
    var sectionName;
    if (sectionId === 0) {
      if (!this.hasStringBytes()) {
        this._pos = pos;
        return false;
      }
      sectionName = this.readStringBytes();
    }
    this.state = 41;
    this.result = {
      id: sectionId,
      name: sectionName
    };
    return true;
  }
  readLinkingEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    if (!this.hasVarIntBytes())
      return false;
    var pos = this._pos;
    var type = this.readVarUint32();
    var index;
    switch (type) {
      case 1:
        if (!this.hasVarIntBytes()) {
          this._pos = pos;
          return false;
        }
        index = this.readVarUint32();
        break;
      default:
        this.error = new Error(`Bad linking type: ${type}`);
        this.state = -1;
        return true;
    }
    this.state = 21;
    this.result = { type, index };
    this._sectionEntriesLeft--;
    return true;
  }
  readSourceMappingURL() {
    if (!this.hasStringBytes())
      return false;
    var url = this.readStringBytes();
    this.state = 43;
    this.result = { url };
    return true;
  }
  readRelocEntry() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    if (!this.hasVarIntBytes())
      return false;
    var pos = this._pos;
    var type = this.readVarUint7();
    if (!this.hasVarIntBytes()) {
      this._pos = pos;
      return false;
    }
    var offset = this.readVarUint32();
    if (!this.hasVarIntBytes()) {
      this._pos = pos;
      return false;
    }
    var index = this.readVarUint32();
    var addend;
    switch (type) {
      case 0:
      case 1:
      case 2:
      case 6:
      case 7:
        break;
      case 3:
      case 4:
      case 5:
        if (!this.hasVarIntBytes()) {
          this._pos = pos;
          return false;
        }
        addend = this.readVarUint32();
        break;
      default:
        this.error = new Error(`Bad relocation type: ${type}`);
        this.state = -1;
        return true;
    }
    this.state = 42;
    this.result = {
      type,
      offset,
      index,
      addend
    };
    this._sectionEntriesLeft--;
    return true;
  }
  readCodeOperator_0xfb() {
    const MAX_CODE_OPERATOR_0XFB_SIZE = 12;
    if (!this._eof && !this.hasBytes(MAX_CODE_OPERATOR_0XFB_SIZE)) {
      return false;
    }
    var code, brDepth, refType, srcType, fieldIndex;
    code = this._data[this._pos++] | 64256;
    switch (code) {
      case 64322:
      case 64323:
      case 64352:
      case 64355:
      case 64353:
      case 64356:
      case 64354:
      case 64357:
        brDepth = this.readVarUint32();
        break;
      case 64326:
      case 64327:
        brDepth = this.readVarUint32();
        refType = this.readHeapType();
        break;
      case 64275:
      case 64276:
      case 64277:
      case 64279:
      case 64278:
      case 64283:
      case 64273:
      case 64284:
      case 64274:
      case 64263:
      case 64257:
      case 64264:
      case 64258:
      case 64304:
      case 64305:
      case 64306:
      case 64324:
      case 64325:
        refType = this.readHeapType();
        break;
      case 64280:
        refType = this.readHeapType();
        srcType = this.readHeapType();
        break;
      case 64259:
      case 64260:
      case 64261:
      case 64262:
        refType = this.readHeapType();
        fieldIndex = this.readVarUint32();
        break;
      case 64281:
      case 64282:
        refType = this.readHeapType();
        brDepth = this.readVarUint32();
        break;
      case 64336:
      case 64337:
      case 64338:
      case 64344:
      case 64345:
      case 64346:
      case 64320:
      case 64321:
      case 64288:
      case 64289:
      case 64290:
        break;
      default:
        this.error = new Error(`Unknown operator: 0x${code.toString(16).padStart(4, "0")}`);
        this.state = -1;
        return true;
    }
    this.result = {
      code,
      blockType: void 0,
      refType,
      srcType,
      brDepth,
      brTable: void 0,
      tableIndex: void 0,
      funcIndex: void 0,
      typeIndex: void 0,
      localIndex: void 0,
      globalIndex: void 0,
      fieldIndex,
      memoryAddress: void 0,
      literal: void 0,
      segmentIndex: void 0,
      destinationIndex: void 0,
      lines: void 0,
      lineIndex: void 0
    };
    return true;
  }
  readCodeOperator_0xfc() {
    if (!this.hasVarIntBytes()) {
      return false;
    }
    var code = this.readVarUint32() | 64512;
    var reserved, segmentIndex, destinationIndex, tableIndex;
    switch (code) {
      case 64512:
      case 64513:
      case 64514:
      case 64515:
      case 64516:
      case 64517:
      case 64518:
      case 64519:
        break;
      case 64522:
        reserved = this.readVarUint1();
        reserved = this.readVarUint1();
        break;
      case 64523:
        reserved = this.readVarUint1();
        break;
      case 64524:
        segmentIndex = this.readVarUint32();
        tableIndex = this.readVarUint32();
        break;
      case 64526:
        tableIndex = this.readVarUint32();
        destinationIndex = this.readVarUint32();
        break;
      case 64527:
      case 64528:
      case 64529:
        tableIndex = this.readVarUint32();
        break;
      case 64520:
        segmentIndex = this.readVarUint32();
        reserved = this.readVarUint1();
        break;
      case 64521:
      case 64525:
        segmentIndex = this.readVarUint32();
        break;
      default:
        this.error = new Error(`Unknown operator: 0x${code.toString(16).padStart(4, "0")}`);
        this.state = -1;
        return true;
    }
    this.result = {
      code,
      blockType: void 0,
      selectType: void 0,
      refType: void 0,
      srcType: void 0,
      brDepth: void 0,
      brTable: void 0,
      funcIndex: void 0,
      typeIndex: void 0,
      tableIndex,
      localIndex: void 0,
      globalIndex: void 0,
      fieldIndex: void 0,
      memoryAddress: void 0,
      literal: void 0,
      segmentIndex,
      destinationIndex,
      lines: void 0,
      lineIndex: void 0
    };
    return true;
  }
  readCodeOperator_0xfd() {
    const MAX_CODE_OPERATOR_0XFD_SIZE = 17;
    var pos = this._pos;
    if (!this._eof && pos + MAX_CODE_OPERATOR_0XFD_SIZE > this._length) {
      return false;
    }
    if (!this.hasVarIntBytes()) {
      return false;
    }
    var code = this.readVarUint32() | 64768;
    var memoryAddress;
    var literal;
    var lineIndex;
    var lines;
    switch (code) {
      case 64768:
      case 64769:
      case 64770:
      case 64771:
      case 64772:
      case 64773:
      case 64774:
      case 64775:
      case 64776:
      case 64777:
      case 64778:
      case 64779:
      case 64860:
      case 64861:
        memoryAddress = this.readMemoryImmediate();
        break;
      case 64780:
        literal = this.readBytes(16);
        break;
      case 64781:
        lines = new Uint8Array(16);
        for (var i = 0; i < lines.length; i++) {
          lines[i] = this.readUint8();
        }
        break;
      case 64789:
      case 64790:
      case 64791:
      case 64792:
      case 64793:
      case 64794:
      case 64795:
      case 64796:
      case 64797:
      case 64798:
      case 64799:
      case 64800:
      case 64801:
      case 64802:
        lineIndex = this.readUint8();
        break;
      case 64782:
      case 64783:
      case 64784:
      case 64785:
      case 64786:
      case 64787:
      case 64788:
      case 64803:
      case 64804:
      case 64805:
      case 64806:
      case 64807:
      case 64808:
      case 64809:
      case 64810:
      case 64811:
      case 64812:
      case 64813:
      case 64814:
      case 64815:
      case 64816:
      case 64817:
      case 64818:
      case 64819:
      case 64820:
      case 64821:
      case 64822:
      case 64823:
      case 64824:
      case 64825:
      case 64826:
      case 64827:
      case 64828:
      case 64829:
      case 64830:
      case 64831:
      case 64832:
      case 64833:
      case 64834:
      case 64835:
      case 64836:
      case 64837:
      case 64838:
      case 64839:
      case 64840:
      case 64841:
      case 64842:
      case 64843:
      case 64844:
      case 64845:
      case 64846:
      case 64847:
      case 64848:
      case 64849:
      case 64850:
      case 64851:
      case 64862:
      case 64863:
      case 64864:
      case 64865:
      case 64866:
      case 64867:
      case 64868:
      case 64869:
      case 64870:
      case 64871:
      case 64872:
      case 64873:
      case 64874:
      case 64875:
      case 64876:
      case 64877:
      case 64878:
      case 64879:
      case 64880:
      case 64881:
      case 64882:
      case 64883:
      case 64884:
      case 64885:
      case 64886:
      case 64887:
      case 64888:
      case 64889:
      case 64890:
      case 64891:
      case 64892:
      case 64893:
      case 64894:
      case 64895:
      case 64896:
      case 64897:
      case 64898:
      case 64899:
      case 64900:
      case 64901:
      case 64902:
      case 64903:
      case 64904:
      case 64905:
      case 64906:
      case 64907:
      case 64908:
      case 64909:
      case 64910:
      case 64911:
      case 64912:
      case 64913:
      case 64914:
      case 64915:
      case 64916:
      case 64917:
      case 64918:
      case 64919:
      case 64920:
      case 64921:
      case 64923:
      case 64924:
      case 64925:
      case 64926:
      case 64927:
      case 64928:
      case 64929:
      case 64931:
      case 64932:
      case 64935:
      case 64936:
      case 64937:
      case 64938:
      case 64939:
      case 64940:
      case 64941:
      case 64942:
      case 64945:
      case 64949:
      case 64950:
      case 64951:
      case 64952:
      case 64953:
      case 64954:
      case 64956:
      case 64957:
      case 64958:
      case 64959:
      case 64960:
      case 64961:
      case 64963:
      case 64964:
      case 64967:
      case 64968:
      case 64969:
      case 64970:
      case 64971:
      case 64972:
      case 64973:
      case 64974:
      case 64977:
      case 64981:
      case 64982:
      case 64983:
      case 64984:
      case 64985:
      case 64986:
      case 64987:
      case 64988:
      case 64989:
      case 64988:
      case 64989:
      case 64992:
      case 64992:
      case 64993:
      case 64995:
      case 64996:
      case 64997:
      case 64998:
      case 64999:
      case 65e3:
      case 65001:
      case 65002:
      case 65003:
      case 65004:
      case 65005:
      case 65007:
      case 65008:
      case 65009:
      case 65010:
      case 65011:
      case 65012:
      case 65013:
      case 65014:
      case 65015:
      case 65016:
      case 65017:
      case 65018:
      case 65019:
      case 65020:
      case 65021:
      case 65022:
      case 65023:
        break;
      default:
        this.error = new Error(`Unknown operator: 0x${code.toString(16).padStart(4, "0")}`);
        this.state = -1;
        return true;
    }
    this.result = {
      code,
      blockType: void 0,
      selectType: void 0,
      refType: void 0,
      srcType: void 0,
      brDepth: void 0,
      brTable: void 0,
      funcIndex: void 0,
      typeIndex: void 0,
      localIndex: void 0,
      globalIndex: void 0,
      fieldIndex: void 0,
      memoryAddress,
      literal,
      segmentIndex: void 0,
      destinationIndex: void 0,
      lines,
      lineIndex
    };
    return true;
  }
  readCodeOperator_0xfe() {
    const MAX_CODE_OPERATOR_0XFE_SIZE = 11;
    var pos = this._pos;
    if (!this._eof && pos + MAX_CODE_OPERATOR_0XFE_SIZE > this._length) {
      return false;
    }
    if (!this.hasVarIntBytes()) {
      return false;
    }
    var code = this.readVarUint32() | 65024;
    var memoryAddress;
    switch (code) {
      case 65024:
      case 65025:
      case 65026:
      case 65040:
      case 65041:
      case 65042:
      case 65043:
      case 65044:
      case 65045:
      case 65046:
      case 65047:
      case 65048:
      case 65049:
      case 65050:
      case 65051:
      case 65052:
      case 65053:
      case 65054:
      case 65055:
      case 65056:
      case 65057:
      case 65058:
      case 65059:
      case 65060:
      case 65061:
      case 65062:
      case 65063:
      case 65064:
      case 65065:
      case 65066:
      case 65067:
      case 65068:
      case 65069:
      case 65070:
      case 65071:
      case 65072:
      case 65073:
      case 65074:
      case 65075:
      case 65076:
      case 65077:
      case 65078:
      case 65079:
      case 65080:
      case 65081:
      case 65082:
      case 65083:
      case 65084:
      case 65085:
      case 65086:
      case 65087:
      case 65088:
      case 65089:
      case 65090:
      case 65091:
      case 65092:
      case 65093:
      case 65094:
      case 65095:
      case 65096:
      case 65097:
      case 65098:
      case 65099:
      case 65100:
      case 65101:
      case 65102:
        memoryAddress = this.readMemoryImmediate();
        break;
      case 65027: {
        var consistency_model = this.readUint8();
        if (consistency_model != 0) {
          this.error = new Error("atomic.fence consistency model must be 0");
          this.state = -1;
          return true;
        }
        break;
      }
      default:
        this.error = new Error(`Unknown operator: 0x${code.toString(16).padStart(4, "0")}`);
        this.state = -1;
        return true;
    }
    this.result = {
      code,
      blockType: void 0,
      selectType: void 0,
      refType: void 0,
      srcType: void 0,
      brDepth: void 0,
      brTable: void 0,
      funcIndex: void 0,
      typeIndex: void 0,
      localIndex: void 0,
      globalIndex: void 0,
      fieldIndex: void 0,
      memoryAddress,
      literal: void 0,
      segmentIndex: void 0,
      destinationIndex: void 0,
      lines: void 0,
      lineIndex: void 0
    };
    return true;
  }
  readCodeOperator() {
    switch (this.state) {
      case 30:
        if (this._pos >= this._functionRange.end) {
          this.skipFunctionBody();
          return this.read();
        }
        break;
      case 26:
        if (this.result && this.result.code === 11) {
          this.state = 27;
          this.result = null;
          return true;
        }
        break;
      case 45:
        if (this.result && this.result.code === 11) {
          this.state = 46;
          this.result = null;
          return true;
        }
        break;
    }
    var code, blockType, selectType, refType, brDepth, brTable, relativeDepth, funcIndex, typeIndex, tableIndex, localIndex, globalIndex, eventIndex, memoryAddress, literal, reserved;
    if (this.state === 26 && this._sectionId === 9 && isExternvalElementSegmentType(this._segmentType)) {
      if (this.result && this.result.code === 210) {
        code = 11;
      } else {
        if (!this.hasVarIntBytes())
          return false;
        code = 210;
        funcIndex = this.readVarUint32();
      }
    } else {
      const MAX_CODE_OPERATOR_SIZE = 11;
      var pos = this._pos;
      if (!this._eof && pos + MAX_CODE_OPERATOR_SIZE > this._length) {
        return false;
      }
      code = this._data[this._pos++];
      switch (code) {
        case 2:
        case 3:
        case 4:
        case 6:
          blockType = this.readBlockType();
          break;
        case 12:
        case 13:
        case 212:
        case 214:
          brDepth = this.readVarUint32();
          break;
        case 14:
          var tableCount = this.readVarUint32();
          if (!this.hasBytes(tableCount + 1)) {
            this._pos = pos;
            return false;
          }
          brTable = [];
          for (var i = 0; i <= tableCount; i++) {
            if (!this.hasVarIntBytes()) {
              this._pos = pos;
              return false;
            }
            brTable.push(this.readVarUint32());
          }
          break;
        case 9:
        case 24:
          relativeDepth = this.readVarUint32();
          break;
        case 7:
        case 8:
          eventIndex = this.readVarInt32();
          break;
        case 208:
          refType = this.readHeapType();
          break;
        case 16:
        case 18:
        case 210:
          funcIndex = this.readVarUint32();
          break;
        case 17:
        case 19:
          typeIndex = this.readVarUint32();
          reserved = this.readVarUint1();
          break;
        case 32:
        case 33:
        case 34:
          localIndex = this.readVarUint32();
          break;
        case 35:
        case 36:
          globalIndex = this.readVarUint32();
          break;
        case 37:
        case 38:
          tableIndex = this.readVarUint32();
          break;
        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
        case 58:
        case 59:
        case 60:
        case 61:
        case 62:
          memoryAddress = this.readMemoryImmediate();
          break;
        case 63:
        case 64:
          reserved = this.readVarUint1();
          break;
        case 65:
          literal = this.readVarInt32();
          break;
        case 66:
          literal = this.readVarInt64();
          break;
        case 67:
          literal = new DataView(this._data.buffer, this._data.byteOffset).getFloat32(this._pos, true);
          this._pos += 4;
          break;
        case 68:
          literal = new DataView(this._data.buffer, this._data.byteOffset).getFloat64(this._pos, true);
          this._pos += 8;
          break;
        case 28:
          const num_types = this.readVarInt32();
          if (num_types == 1) {
            selectType = this.readType();
          }
          break;
        case 251:
          if (this.readCodeOperator_0xfb()) {
            return true;
          }
          this._pos = pos;
          return false;
        case 252:
          if (this.readCodeOperator_0xfc()) {
            return true;
          }
          this._pos = pos;
          return false;
        case 253:
          if (this.readCodeOperator_0xfd()) {
            return true;
          }
          this._pos = pos;
          return false;
        case 254:
          if (this.readCodeOperator_0xfe()) {
            return true;
          }
          this._pos = pos;
          return false;
        case 0:
        case 1:
        case 5:
        case 10:
        case 11:
        case 15:
        case 25:
        case 26:
        case 27:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
        case 95:
        case 96:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
        case 123:
        case 124:
        case 125:
        case 126:
        case 127:
        case 128:
        case 129:
        case 130:
        case 131:
        case 132:
        case 133:
        case 134:
        case 135:
        case 136:
        case 137:
        case 138:
        case 139:
        case 140:
        case 141:
        case 142:
        case 143:
        case 144:
        case 145:
        case 146:
        case 147:
        case 148:
        case 149:
        case 150:
        case 151:
        case 152:
        case 153:
        case 154:
        case 155:
        case 156:
        case 157:
        case 158:
        case 159:
        case 160:
        case 161:
        case 162:
        case 163:
        case 164:
        case 165:
        case 166:
        case 167:
        case 168:
        case 169:
        case 170:
        case 171:
        case 172:
        case 173:
        case 174:
        case 175:
        case 176:
        case 177:
        case 178:
        case 179:
        case 180:
        case 181:
        case 182:
        case 183:
        case 184:
        case 185:
        case 186:
        case 187:
        case 188:
        case 189:
        case 190:
        case 191:
        case 192:
        case 193:
        case 194:
        case 195:
        case 196:
        case 20:
        case 21:
        case 209:
        case 211:
        case 213:
          break;
        default:
          this.error = new Error(`Unknown operator: ${code}`);
          this.state = -1;
          return true;
      }
    }
    this.result = {
      code,
      blockType,
      selectType,
      refType,
      srcType: void 0,
      brDepth,
      brTable,
      relativeDepth,
      tableIndex,
      funcIndex,
      typeIndex,
      localIndex,
      globalIndex,
      fieldIndex: void 0,
      eventIndex,
      memoryAddress,
      literal,
      segmentIndex: void 0,
      destinationIndex: void 0,
      lines: void 0,
      lineIndex: void 0
    };
    return true;
  }
  readFunctionBody() {
    if (this._sectionEntriesLeft === 0) {
      this.skipSection();
      return this.read();
    }
    if (!this.hasVarIntBytes())
      return false;
    var pos = this._pos;
    var size = this.readVarUint32();
    var bodyEnd = this._pos + size;
    if (!this.hasVarIntBytes()) {
      this._pos = pos;
      return false;
    }
    var localCount = this.readVarUint32();
    var locals = [];
    for (var i = 0; i < localCount; i++) {
      if (!this.hasVarIntBytes()) {
        this._pos = pos;
        return false;
      }
      var count = this.readVarUint32();
      if (!this.hasVarIntBytes()) {
        this._pos = pos;
        return false;
      }
      var type = this.readType();
      locals.push({ count, type });
    }
    var bodyStart = this._pos;
    this.state = 28;
    this.result = {
      locals
    };
    this._functionRange = new DataRange(bodyStart, bodyEnd);
    this._sectionEntriesLeft--;
    return true;
  }
  readSectionHeader() {
    if (this._pos >= this._length && this._eof) {
      this._sectionId = -1;
      this._sectionRange = null;
      this.result = null;
      this.state = 2;
      return true;
    }
    if (this._pos < this._length - 4) {
      var magicNumber = this.peekInt32();
      if (magicNumber === WASM_MAGIC_NUMBER) {
        this._sectionId = -1;
        this._sectionRange = null;
        this.result = null;
        this.state = 2;
        return true;
      }
    }
    if (!this.hasVarIntBytes())
      return false;
    var sectionStart = this._pos;
    var id = this.readVarUint7();
    if (!this.hasVarIntBytes()) {
      this._pos = sectionStart;
      return false;
    }
    var payloadLength = this.readVarUint32();
    var name = null;
    var payloadEnd = this._pos + payloadLength;
    if (id == 0) {
      if (!this.hasStringBytes()) {
        this._pos = sectionStart;
        return false;
      }
      name = this.readStringBytes();
    }
    this.result = { id, name };
    this._sectionId = id;
    this._sectionRange = new DataRange(this._pos, payloadEnd);
    this.state = 3;
    return true;
  }
  readSectionRawData() {
    var payloadLength = this._sectionRange.end - this._sectionRange.start;
    if (!this.hasBytes(payloadLength)) {
      return false;
    }
    this.state = 7;
    this.result = this.readBytes(payloadLength);
    return true;
  }
  readSectionBody() {
    if (this._pos >= this._sectionRange.end) {
      this.result = null;
      this.state = 4;
      this._sectionId = -1;
      this._sectionRange = null;
      return true;
    }
    var currentSection = this.result;
    switch (currentSection.id) {
      case 1:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readTypeEntry();
      case 2:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readImportEntry();
      case 7:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readExportEntry();
      case 3:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readFunctionEntry();
      case 4:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readTableEntry();
      case 5:
        if (!this.hasSectionPayload())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readMemoryEntry();
      case 6:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readGlobalEntry();
      case 8:
        if (!this.hasVarIntBytes())
          return false;
        this.state = 22;
        this.result = { index: this.readVarUint32() };
        return true;
      case 10:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        this.state = 29;
        return this.readFunctionBody();
      case 9:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readElementEntry();
      case 11:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readDataEntry();
      case 13:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readEventEntry();
      case 0:
        var customSectionName = bytesToString(currentSection.name);
        if (customSectionName === "name") {
          return this.readNameEntry();
        }
        if (customSectionName.indexOf("reloc.") === 0) {
          return this.readRelocHeader();
        }
        if (customSectionName === "linking") {
          if (!this.hasVarIntBytes())
            return false;
          this._sectionEntriesLeft = this.readVarUint32();
          return this.readLinkingEntry();
        }
        if (customSectionName === "sourceMappingURL") {
          return this.readSourceMappingURL();
        }
        return this.readSectionRawData();
      default:
        this.error = new Error(`Unsupported section: ${this._sectionId}`);
        this.state = -1;
        return true;
    }
  }
  read() {
    switch (this.state) {
      case 0:
        if (!this.hasBytes(8))
          return false;
        var magicNumber = this.readUint32();
        if (magicNumber != WASM_MAGIC_NUMBER) {
          this.error = new Error("Bad magic number");
          this.state = -1;
          return true;
        }
        var version = this.readUint32();
        if (version != WASM_SUPPORTED_VERSION && version != WASM_SUPPORTED_EXPERIMENTAL_VERSION) {
          this.error = new Error(`Bad version number ${version}`);
          this.state = -1;
          return true;
        }
        this.result = { magicNumber, version };
        this.state = 1;
        return true;
      case 2:
        this.result = null;
        this.state = 1;
        if (this.hasMoreBytes()) {
          this.state = 0;
          return this.read();
        }
        return false;
      case -1:
        return true;
      case 1:
      case 4:
        return this.readSectionHeader();
      case 3:
        return this.readSectionBody();
      case 5:
        if (!this.hasSectionPayload()) {
          return false;
        }
        this.state = 4;
        this._pos = this._sectionRange.end;
        this._sectionId = -1;
        this._sectionRange = null;
        this.result = null;
        return true;
      case 32:
        this.state = 31;
        this._pos = this._functionRange.end;
        this._functionRange = null;
        this.result = null;
        return true;
      case 11:
        return this.readTypeEntry();
      case 12:
        return this.readImportEntry();
      case 17:
        return this.readExportEntry();
      case 13:
        return this.readFunctionEntry();
      case 14:
        return this.readTableEntry();
      case 15:
        return this.readMemoryEntry();
      case 23:
        return this.readEventEntry();
      case 16:
      case 40:
        return this.readGlobalEntry();
      case 39:
        return this.readInitExpressionBody();
      case 20:
      case 35:
        return this.readElementEntry();
      case 33:
        if (isActiveElementSegmentType(this._segmentType)) {
          return this.readOffsetExpressionBody();
        } else {
          return this.readElementEntryBody();
        }
      case 34:
        if (!this.hasVarIntBytes())
          return false;
        this._segmentEntriesLeft = this.readVarUint32();
        if (this._segmentEntriesLeft === 0) {
          this.state = 35;
          this.result = null;
          return true;
        }
        return this.readInitExpressionBody();
      case 18:
      case 38:
        return this.readDataEntry();
      case 36:
        if (isActiveDataSegmentType(this._segmentType)) {
          return this.readOffsetExpressionBody();
        } else {
          return this.readDataEntryBody();
        }
      case 37:
        this.state = 38;
        this.result = null;
        return true;
      case 27:
        switch (this._sectionId) {
          case 6:
            this.state = 40;
            return true;
          case 9:
            if (--this._segmentEntriesLeft > 0) {
              return this.readInitExpressionBody();
            }
            this.state = 35;
            this.result = null;
            return true;
        }
        this.error = new Error(`Unexpected section type: ${this._sectionId}`);
        this.state = -1;
        return true;
      case 46:
        if (this._sectionId === 11) {
          return this.readDataEntryBody();
        } else {
          return this.readElementEntryBody();
        }
      case 19:
        return this.readNameEntry();
      case 41:
        if (!this.hasVarIntBytes())
          return false;
        this._sectionEntriesLeft = this.readVarUint32();
        return this.readRelocEntry();
      case 21:
        return this.readLinkingEntry();
      case 43:
        this.state = 4;
        this.result = null;
        return true;
      case 42:
        return this.readRelocEntry();
      case 29:
      case 31:
        return this.readFunctionBody();
      case 28:
        this.state = 30;
        return this.readCodeOperator();
      case 25:
        this.state = 26;
        return this.readCodeOperator();
      case 44:
        this.state = 45;
        return this.readCodeOperator();
      case 30:
      case 26:
      case 45:
        return this.readCodeOperator();
      case 6:
        return this.readSectionRawData();
      case 22:
      case 7:
        this.state = 4;
        this.result = null;
        return true;
      default:
        this.error = new Error(`Unsupported state: ${this.state}`);
        this.state = -1;
        return true;
    }
  }
  skipSection() {
    if (this.state === -1 || this.state === 0 || this.state === 4 || this.state === 1 || this.state === 2)
      return;
    this.state = 5;
  }
  skipFunctionBody() {
    if (this.state !== 28 && this.state !== 30)
      return;
    this.state = 32;
  }
  skipInitExpression() {
    while (this.state === 26)
      this.readCodeOperator();
  }
  fetchSectionRawData() {
    if (this.state !== 3) {
      this.error = new Error(`Unsupported state: ${this.state}`);
      this.state = -1;
      return;
    }
    this.state = 6;
  }
};
var bytesToString;
if (typeof TextDecoder !== "undefined") {
  try {
    bytesToString = (function() {
      var utf8Decoder = new TextDecoder("utf-8");
      utf8Decoder.decode(new Uint8Array([97, 208, 144]));
      return (b) => utf8Decoder.decode(b);
    })();
  } catch (_) {
  }
}
if (!bytesToString) {
  bytesToString = (b) => {
    var str = String.fromCharCode.apply(null, b);
    return decodeURIComponent(escape(str));
  };
}

// ../../front_end/third_party/wasmparser/package/dist/esm/WasmDis.js
var NAME_SECTION_NAME = "name";
var INVALID_NAME_SYMBOLS_REGEX = /[^0-9A-Za-z!#$%&'*+.:<=>?@^_`|~\/\-]/;
var INVALID_NAME_SYMBOLS_REGEX_GLOBAL = new RegExp(INVALID_NAME_SYMBOLS_REGEX.source, "g");
function formatFloat32(n) {
  if (n === 0)
    return 1 / n < 0 ? "-0.0" : "0.0";
  if (isFinite(n))
    return n.toString();
  if (!isNaN(n))
    return n < 0 ? "-inf" : "inf";
  var view = new DataView(new ArrayBuffer(8));
  view.setFloat32(0, n, true);
  var data = view.getInt32(0, true);
  var payload = data & 8388607;
  const canonicalBits = 4194304;
  if (data > 0 && payload === canonicalBits)
    return "nan";
  else if (payload === canonicalBits)
    return "-nan";
  return (data < 0 ? "-" : "+") + "nan:0x" + payload.toString(16);
}
function formatFloat64(n) {
  if (n === 0)
    return 1 / n < 0 ? "-0.0" : "0.0";
  if (isFinite(n))
    return n.toString();
  if (!isNaN(n))
    return n < 0 ? "-inf" : "inf";
  var view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, n, true);
  var data1 = view.getUint32(0, true);
  var data2 = view.getInt32(4, true);
  var payload = data1 + (data2 & 1048575) * 4294967296;
  const canonicalBits = 524288 * 4294967296;
  if (data2 > 0 && payload === canonicalBits)
    return "nan";
  else if (payload === canonicalBits)
    return "-nan";
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
  for (var i = 0; i < count; i++)
    result.push(`${dv.getInt8(i)}`);
  return result.join(" ");
}
function memoryAddressToString(address, code) {
  var defaultAlignFlags;
  switch (code) {
    case 64768:
    case 64769:
    case 64770:
    case 64771:
    case 64772:
    case 64773:
    case 64774:
    case 64775:
    case 64776:
    case 64777:
    case 64778:
    case 64779:
      defaultAlignFlags = 4;
      break;
    case 41:
    case 55:
    case 43:
    case 57:
    case 65026:
    case 65041:
    case 65048:
    case 65055:
    case 65062:
    case 65069:
    case 65076:
    case 65083:
    case 65090:
    case 65097:
    case 64861:
      defaultAlignFlags = 3;
      break;
    case 40:
    case 52:
    case 53:
    case 54:
    case 62:
    case 42:
    case 56:
    case 65024:
    case 65025:
    case 65040:
    case 65046:
    case 65047:
    case 65053:
    case 65054:
    case 65060:
    case 65061:
    case 65067:
    case 65068:
    case 65074:
    case 65075:
    case 65081:
    case 65082:
    case 65088:
    case 65089:
    case 65095:
    case 65096:
    case 65102:
    case 64860:
      defaultAlignFlags = 2;
      break;
    case 46:
    case 47:
    case 50:
    case 51:
    case 59:
    case 61:
    case 65043:
    case 65045:
    case 65050:
    case 65052:
    case 65057:
    case 65059:
    case 65064:
    case 65066:
    case 65071:
    case 65073:
    case 65078:
    case 65080:
    case 65085:
    case 65087:
    case 65092:
    case 65094:
    case 65099:
    case 65101:
      defaultAlignFlags = 1;
      break;
    case 44:
    case 45:
    case 48:
    case 49:
    case 58:
    case 60:
    case 65042:
    case 65044:
    case 65049:
    case 65051:
    case 65056:
    case 65058:
    case 65063:
    case 65065:
    case 65070:
    case 65072:
    case 65077:
    case 65079:
    case 65084:
    case 65086:
    case 65091:
    case 65093:
    case 65098:
    case 65100:
      defaultAlignFlags = 0;
      break;
  }
  if (address.flags == defaultAlignFlags)
    return !address.offset ? null : `offset=${address.offset}`;
  if (!address.offset)
    return `align=${1 << address.flags}`;
  return `offset=${address.offset | 0} align=${1 << address.flags}`;
}
function limitsToString(limits) {
  return limits.initial + (limits.maximum !== void 0 ? " " + limits.maximum : "");
}
var paddingCache = ["0", "00", "000"];
function formatHex(n, width) {
  var s = (n >>> 0).toString(16).toUpperCase();
  if (width === void 0 || s.length >= width)
    return s;
  var paddingIndex = width - s.length - 1;
  while (paddingIndex >= paddingCache.length)
    paddingCache.push(paddingCache[paddingCache.length - 1] + "0");
  return paddingCache[paddingIndex] + s;
}
var IndentIncrement = "  ";
function isValidName(name) {
  return !INVALID_NAME_SYMBOLS_REGEX.test(name);
}
var DefaultNameResolver = class {
  getTypeName(index, isRef) {
    return "$type" + index;
  }
  getTableName(index, isRef) {
    return "$table" + index;
  }
  getMemoryName(index, isRef) {
    return "$memory" + index;
  }
  getGlobalName(index, isRef) {
    return "$global" + index;
  }
  getElementName(index, isRef) {
    return `$elem${index}`;
  }
  getEventName(index, isRef) {
    return `$event${index}`;
  }
  getFunctionName(index, isImport, isRef) {
    return (isImport ? "$import" : "$func") + index;
  }
  getVariableName(funcIndex, index, isRef) {
    return "$var" + index;
  }
  getFieldName(typeIndex, index, isRef) {
    return "$field" + index;
  }
  getLabel(index) {
    return "$label" + index;
  }
};
var EMPTY_STRING_ARRAY = [];
var DevToolsExportMetadata = class {
  constructor(functionExportNames, globalExportNames, memoryExportNames, tableExportNames, eventExportNames) {
    this._functionExportNames = functionExportNames;
    this._globalExportNames = globalExportNames;
    this._memoryExportNames = memoryExportNames;
    this._tableExportNames = tableExportNames;
    this._eventExportNames = eventExportNames;
  }
  getFunctionExportNames(index) {
    var _a;
    return (_a = this._functionExportNames[index]) !== null && _a !== void 0 ? _a : EMPTY_STRING_ARRAY;
  }
  getGlobalExportNames(index) {
    var _a;
    return (_a = this._globalExportNames[index]) !== null && _a !== void 0 ? _a : EMPTY_STRING_ARRAY;
  }
  getMemoryExportNames(index) {
    var _a;
    return (_a = this._memoryExportNames[index]) !== null && _a !== void 0 ? _a : EMPTY_STRING_ARRAY;
  }
  getTableExportNames(index) {
    var _a;
    return (_a = this._tableExportNames[index]) !== null && _a !== void 0 ? _a : EMPTY_STRING_ARRAY;
  }
  getEventExportNames(index) {
    var _a;
    return (_a = this._eventExportNames[index]) !== null && _a !== void 0 ? _a : EMPTY_STRING_ARRAY;
  }
};
var NumericNameResolver = class {
  getTypeName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getTableName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getMemoryName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getGlobalName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getElementName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getEventName(index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getFunctionName(index, isImport, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getVariableName(funcIndex, index, isRef) {
    return isRef ? "" + index : `(;${index};)`;
  }
  getFieldName(typeIndex, index, isRef) {
    return isRef ? "" : index + `(;${index};)`;
  }
  getLabel(index) {
    return null;
  }
};
var LabelMode;
(function(LabelMode2) {
  LabelMode2[LabelMode2["Depth"] = 0] = "Depth";
  LabelMode2[LabelMode2["WhenUsed"] = 1] = "WhenUsed";
  LabelMode2[LabelMode2["Always"] = 2] = "Always";
})(LabelMode || (LabelMode = {}));
var WasmDisassembler = class {
  constructor() {
    this._skipTypes = true;
    this._exportMetadata = null;
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
    this._currentSectionId = -1;
    this._logFirstInstruction = false;
    this._reset();
  }
  _reset() {
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
  get addOffsets() {
    return this._addOffsets;
  }
  set addOffsets(value) {
    if (this._currentPosition)
      throw new Error("Cannot switch addOffsets during processing.");
    this._addOffsets = value;
  }
  get skipTypes() {
    return this._skipTypes;
  }
  set skipTypes(skipTypes) {
    if (this._currentPosition)
      throw new Error("Cannot switch skipTypes during processing.");
    this._skipTypes = skipTypes;
  }
  get labelMode() {
    return this._labelMode;
  }
  set labelMode(value) {
    if (this._currentPosition)
      throw new Error("Cannot switch labelMode during processing.");
    this._labelMode = value;
  }
  get exportMetadata() {
    return this._exportMetadata;
  }
  set exportMetadata(exportMetadata) {
    if (this._currentPosition)
      throw new Error("Cannot switch exportMetadata during processing.");
    this._exportMetadata = exportMetadata;
  }
  get nameResolver() {
    return this._nameResolver;
  }
  set nameResolver(resolver) {
    if (this._currentPosition)
      throw new Error("Cannot switch nameResolver during processing.");
    this._nameResolver = resolver;
  }
  appendBuffer(s) {
    this._buffer += s;
  }
  newLine() {
    if (this.addOffsets)
      this._offsets.push(this._currentPosition);
    this._lines.push(this._buffer);
    this._buffer = "";
  }
  logStartOfFunctionBodyOffset() {
    if (this.addOffsets) {
      this._currentFunctionBodyOffset = this._currentPosition;
    }
  }
  logEndOfFunctionBodyOffset() {
    if (this.addOffsets) {
      this._functionBodyOffsets.push({
        start: this._currentFunctionBodyOffset,
        end: this._currentPosition
      });
    }
  }
  typeIndexToString(typeIndex) {
    if (typeIndex >= 0)
      return this._nameResolver.getTypeName(typeIndex, true);
    switch (typeIndex) {
      case -16:
        return "func";
      case -17:
        return "extern";
      case -18:
        return "any";
      case -19:
        return "eq";
      case -22:
        return "i31";
      case -25:
        return "data";
    }
  }
  typeToString(type) {
    switch (type.kind) {
      case -1:
        return "i32";
      case -2:
        return "i64";
      case -3:
        return "f32";
      case -4:
        return "f64";
      case -5:
        return "v128";
      case -6:
        return "i8";
      case -7:
        return "i16";
      case -16:
        return "funcref";
      case -17:
        return "externref";
      case -18:
        return "anyref";
      case -19:
        return "eqref";
      case -22:
        return "i31ref";
      case -25:
        return "dataref";
      case -21:
        return `(ref ${this.typeIndexToString(type.index)})`;
      case -20:
        return `(ref null ${this.typeIndexToString(type.index)})`;
      case -24:
        return `(rtt ${this.typeIndexToString(type.index)})`;
      case -23:
        return `(rtt ${type.depth} ${this.typeIndexToString(type.index)})`;
      default:
        throw new Error(`Unexpected type ${JSON.stringify(type)}`);
    }
  }
  maybeMut(type, mutability) {
    return mutability ? `(mut ${type})` : type;
  }
  globalTypeToString(type) {
    const typeStr = this.typeToString(type.contentType);
    return this.maybeMut(typeStr, !!type.mutability);
  }
  printFuncType(typeIndex) {
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
  printStructType(typeIndex) {
    var type = this._types[typeIndex];
    if (type.fields.length === 0)
      return;
    for (var i = 0; i < type.fields.length; i++) {
      const fieldType = this.maybeMut(this.typeToString(type.fields[i]), type.mutabilities[i]);
      const fieldName = this._nameResolver.getFieldName(typeIndex, i, false);
      this.appendBuffer(` (field ${fieldName} ${fieldType})`);
    }
  }
  printArrayType(typeIndex) {
    var type = this._types[typeIndex];
    this.appendBuffer(" (field ");
    this.appendBuffer(this.maybeMut(this.typeToString(type.elementType), type.mutability));
  }
  printBlockType(type) {
    if (type.kind === -64) {
      return;
    }
    if (type.kind === 0) {
      return this.printFuncType(type.index);
    }
    this.appendBuffer(" (result ");
    this.appendBuffer(this.typeToString(type));
    this.appendBuffer(")");
  }
  printString(b) {
    this.appendBuffer('"');
    for (var i = 0; i < b.length; i++) {
      var byte = b[i];
      if (byte < 32 || byte >= 127 || byte == /* " */
      34 || byte == /* \ */
      92) {
        this.appendBuffer("\\" + (byte >> 4).toString(16) + (byte & 15).toString(16));
      } else {
        this.appendBuffer(String.fromCharCode(byte));
      }
    }
    this.appendBuffer('"');
  }
  printExpression(expression) {
    for (const operator of expression) {
      this.appendBuffer("(");
      this.printOperator(operator);
      this.appendBuffer(")");
    }
  }
  // extraDepthOffset is used by "delegate" instructions.
  useLabel(depth, extraDepthOffset = 0) {
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
      this._lines[backrefLabel.line] = line.substring(0, backrefLabel.position) + " " + backrefLabel.label + line.substring(backrefLabel.position);
      this._labelIndex++;
    }
    return backrefLabel.label || "" + depth;
  }
  printOperator(operator) {
    var code = operator.code;
    this.appendBuffer(OperatorCodeNames[code]);
    switch (code) {
      case 2:
      case 3:
      case 4:
      case 6:
        if (this._labelMode !== LabelMode.Depth) {
          const backrefLabel2 = {
            line: this._lines.length,
            position: this._buffer.length,
            useLabel: false,
            label: null
          };
          if (this._labelMode === LabelMode.Always) {
            backrefLabel2.useLabel = true;
            backrefLabel2.label = this._nameResolver.getLabel(this._labelIndex++);
            if (backrefLabel2.label) {
              this.appendBuffer(" ");
              this.appendBuffer(backrefLabel2.label);
            }
          }
          this._backrefLabels.push(backrefLabel2);
        }
        this.printBlockType(operator.blockType);
        break;
      case 11:
        if (this._labelMode === LabelMode.Depth) {
          break;
        }
        const backrefLabel = this._backrefLabels.pop();
        if (backrefLabel.label) {
          this.appendBuffer(" ");
          this.appendBuffer(backrefLabel.label);
        }
        break;
      case 12:
      case 13:
      case 212:
      case 214:
      case 64322:
      case 64323:
      case 64352:
      case 64355:
      case 64353:
      case 64356:
      case 64354:
      case 64357:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.brDepth));
        break;
      case 64326:
      case 64327: {
        const label = this.useLabel(operator.brDepth);
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        this.appendBuffer(` ${label} ${refType}`);
        break;
      }
      case 14:
        for (var i = 0; i < operator.brTable.length; i++) {
          this.appendBuffer(" ");
          this.appendBuffer(this.useLabel(operator.brTable[i]));
        }
        break;
      case 9:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.relativeDepth));
        break;
      case 24:
        this.appendBuffer(" ");
        this.appendBuffer(this.useLabel(operator.relativeDepth, 1));
        break;
      case 7:
      case 8:
        var eventName = this._nameResolver.getEventName(operator.eventIndex, true);
        this.appendBuffer(` ${eventName}`);
        break;
      case 208:
        this.appendBuffer(" ");
        this.appendBuffer(this.typeIndexToString(operator.refType));
        break;
      case 16:
      case 18:
      case 210:
        var funcName = this._nameResolver.getFunctionName(operator.funcIndex, operator.funcIndex < this._importCount, true);
        this.appendBuffer(` ${funcName}`);
        break;
      case 17:
      case 19:
        this.printFuncType(operator.typeIndex);
        break;
      case 28: {
        const selectType = this.typeToString(operator.selectType);
        this.appendBuffer(` ${selectType}`);
        break;
      }
      case 32:
      case 33:
      case 34:
        var paramName = this._nameResolver.getVariableName(this._funcIndex, operator.localIndex, true);
        this.appendBuffer(` ${paramName}`);
        break;
      case 35:
      case 36:
        var globalName = this._nameResolver.getGlobalName(operator.globalIndex, true);
        this.appendBuffer(` ${globalName}`);
        break;
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      case 58:
      case 59:
      case 60:
      case 61:
      case 62:
      case 65024:
      case 65025:
      case 65026:
      case 65040:
      case 65041:
      case 65042:
      case 65043:
      case 65044:
      case 65045:
      case 65046:
      case 65047:
      case 65048:
      case 65049:
      case 65050:
      case 65051:
      case 65052:
      case 65053:
      case 65054:
      case 65055:
      case 65056:
      case 65057:
      case 65058:
      case 65059:
      case 65060:
      case 65061:
      case 65062:
      case 65063:
      case 65064:
      case 65065:
      case 65066:
      case 65067:
      case 65068:
      case 65069:
      case 65070:
      case 65071:
      case 65072:
      case 65073:
      case 65074:
      case 65075:
      case 65076:
      case 65077:
      case 65078:
      case 65079:
      case 65080:
      case 65081:
      case 65082:
      case 65083:
      case 65084:
      case 65085:
      case 65086:
      case 65087:
      case 65088:
      case 65089:
      case 65090:
      case 65091:
      case 65092:
      case 65093:
      case 65094:
      case 65095:
      case 65096:
      case 65097:
      case 65098:
      case 65099:
      case 65100:
      case 65101:
      case 65102:
      case 64768:
      case 64769:
      case 64770:
      case 64771:
      case 64772:
      case 64773:
      case 64774:
      case 64775:
      case 64776:
      case 64777:
      case 64778:
      case 64779:
      case 64860:
      case 64861:
        var memoryAddress = memoryAddressToString(operator.memoryAddress, operator.code);
        if (memoryAddress !== null) {
          this.appendBuffer(" ");
          this.appendBuffer(memoryAddress);
        }
        break;
      case 63:
      case 64:
        break;
      case 65:
        this.appendBuffer(` ${operator.literal.toString()}`);
        break;
      case 66:
        this.appendBuffer(` ${operator.literal.toString()}`);
        break;
      case 67:
        this.appendBuffer(` ${formatFloat32(operator.literal)}`);
        break;
      case 68:
        this.appendBuffer(` ${formatFloat64(operator.literal)}`);
        break;
      case 64780:
        this.appendBuffer(` i32x4 ${formatI32Array(operator.literal, 4)}`);
        break;
      case 64781:
        this.appendBuffer(` ${formatI8Array(operator.lines, 16)}`);
        break;
      case 64789:
      case 64790:
      case 64791:
      case 64792:
      case 64793:
      case 64794:
      case 64795:
      case 64796:
      case 64799:
      case 64800:
      case 64797:
      case 64798:
      case 64801:
      case 64802:
        this.appendBuffer(` ${operator.lineIndex}`);
        break;
      case 64520:
      case 64521:
        this.appendBuffer(` ${operator.segmentIndex}`);
        break;
      case 64525:
        const elementName = this._nameResolver.getElementName(operator.segmentIndex, true);
        this.appendBuffer(` ${elementName}`);
        break;
      case 38:
      case 37:
      case 64529: {
        const tableName = this._nameResolver.getTableName(operator.tableIndex, true);
        this.appendBuffer(` ${tableName}`);
        break;
      }
      case 64526: {
        if (operator.tableIndex !== 0 || operator.destinationIndex !== 0) {
          const tableName = this._nameResolver.getTableName(operator.tableIndex, true);
          const destinationName = this._nameResolver.getTableName(operator.destinationIndex, true);
          this.appendBuffer(` ${destinationName} ${tableName}`);
        }
        break;
      }
      case 64524: {
        if (operator.tableIndex !== 0) {
          const tableName = this._nameResolver.getTableName(operator.tableIndex, true);
          this.appendBuffer(` ${tableName}`);
        }
        const elementName2 = this._nameResolver.getElementName(operator.segmentIndex, true);
        this.appendBuffer(` ${elementName2}`);
        break;
      }
      case 64259:
      case 64260:
      case 64261:
      case 64262: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        const fieldName = this._nameResolver.getFieldName(operator.refType, operator.fieldIndex, true);
        this.appendBuffer(` ${refType} ${fieldName}`);
        break;
      }
      case 64304:
      case 64305:
      case 64306:
      case 64324:
      case 64325:
      case 64264:
      case 64258:
      case 64263:
      case 64257:
      case 64284:
      case 64274:
      case 64283:
      case 64273:
      case 64275:
      case 64276:
      case 64277:
      case 64278:
      case 64279: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        this.appendBuffer(` ${refType}`);
        break;
      }
      case 64280: {
        const dstType = this._nameResolver.getTypeName(operator.refType, true);
        const srcType = this._nameResolver.getTypeName(operator.srcType, true);
        this.appendBuffer(` ${dstType} ${srcType}`);
        break;
      }
      case 64281:
      case 64282: {
        const refType = this._nameResolver.getTypeName(operator.refType, true);
        const length = operator.brDepth;
        this.appendBuffer(` ${refType} ${length}`);
        break;
      }
    }
  }
  printImportSource(info) {
    this.printString(info.module);
    this.appendBuffer(" ");
    this.printString(info.field);
  }
  increaseIndent() {
    this._indent += IndentIncrement;
    this._indentLevel++;
  }
  decreaseIndent() {
    this._indent = this._indent.slice(0, -IndentIncrement.length);
    this._indentLevel--;
  }
  disassemble(reader) {
    const done = this.disassembleChunk(reader);
    if (!done)
      return null;
    let lines = this._lines;
    if (this._addOffsets) {
      lines = lines.map((line, index) => {
        var position = formatHex(this._offsets[index], 4);
        return line + " ;; @" + position;
      });
    }
    lines.push("");
    const result = lines.join("\n");
    this._lines.length = 0;
    this._offsets.length = 0;
    this._functionBodyOffsets.length = 0;
    return result;
  }
  getResult() {
    let linesReady = this._lines.length;
    if (this._backrefLabels && this._labelMode === LabelMode.WhenUsed) {
      this._backrefLabels.some((backrefLabel) => {
        if (backrefLabel.useLabel)
          return false;
        linesReady = backrefLabel.line;
        return true;
      });
    }
    if (linesReady === 0) {
      return {
        lines: [],
        offsets: this._addOffsets ? [] : void 0,
        done: this._done,
        functionBodyOffsets: this._addOffsets ? [] : void 0
      };
    }
    if (linesReady === this._lines.length) {
      const result2 = {
        lines: this._lines,
        offsets: this._addOffsets ? this._offsets : void 0,
        done: this._done,
        functionBodyOffsets: this._addOffsets ? this._functionBodyOffsets : void 0
      };
      this._lines = [];
      if (this._addOffsets) {
        this._offsets = [];
        this._functionBodyOffsets = [];
      }
      return result2;
    }
    const result = {
      lines: this._lines.splice(0, linesReady),
      offsets: this._addOffsets ? this._offsets.splice(0, linesReady) : void 0,
      done: false,
      functionBodyOffsets: this._addOffsets ? this._functionBodyOffsets : void 0
    };
    if (this._backrefLabels) {
      this._backrefLabels.forEach((backrefLabel) => {
        backrefLabel.line -= linesReady;
      });
    }
    return result;
  }
  disassembleChunk(reader, offsetInModule = 0) {
    if (this._done)
      throw new Error("Invalid state: disassembly process was already finished.");
    while (true) {
      this._currentPosition = reader.position + offsetInModule;
      if (!reader.read())
        return false;
      switch (reader.state) {
        case 2:
          this.appendBuffer(")");
          this.newLine();
          this._reset();
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case -1:
          throw reader.error;
        case 1:
          this.appendBuffer("(module");
          this.newLine();
          break;
        case 4:
          this._currentSectionId = -1;
          break;
        case 3:
          var sectionInfo = reader.result;
          switch (sectionInfo.id) {
            case 1:
            case 2:
            case 7:
            case 6:
            case 3:
            case 8:
            case 10:
            case 5:
            case 11:
            case 4:
            case 9:
            case 13:
              this._currentSectionId = sectionInfo.id;
              break;
            // reading known section;
            default:
              reader.skipSection();
              break;
          }
          break;
        case 15:
          var memoryInfo = reader.result;
          var memoryIndex = this._memoryCount++;
          var memoryName = this._nameResolver.getMemoryName(memoryIndex, false);
          this.appendBuffer(`  (memory ${memoryName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getMemoryExportNames(memoryIndex)) {
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
        case 23:
          var eventInfo = reader.result;
          var eventIndex = this._eventCount++;
          var eventName = this._nameResolver.getEventName(eventIndex, false);
          this.appendBuffer(`  (event ${eventName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getEventExportNames(eventIndex)) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.printFuncType(eventInfo.typeIndex);
          this.appendBuffer(")");
          this.newLine();
          break;
        case 14:
          var tableInfo = reader.result;
          var tableIndex = this._tableCount++;
          var tableName = this._nameResolver.getTableName(tableIndex, false);
          this.appendBuffer(`  (table ${tableName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getTableExportNames(tableIndex)) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.appendBuffer(` ${limitsToString(tableInfo.limits)} ${this.typeToString(tableInfo.elementType)})`);
          this.newLine();
          break;
        case 17:
          if (this._exportMetadata === null) {
            var exportInfo = reader.result;
            this.appendBuffer("  (export ");
            this.printString(exportInfo.field);
            this.appendBuffer(" ");
            switch (exportInfo.kind) {
              case 0:
                var funcName = this._nameResolver.getFunctionName(exportInfo.index, exportInfo.index < this._importCount, true);
                this.appendBuffer(`(func ${funcName})`);
                break;
              case 1:
                var tableName = this._nameResolver.getTableName(exportInfo.index, true);
                this.appendBuffer(`(table ${tableName})`);
                break;
              case 2:
                var memoryName = this._nameResolver.getMemoryName(exportInfo.index, true);
                this.appendBuffer(`(memory ${memoryName})`);
                break;
              case 3:
                var globalName = this._nameResolver.getGlobalName(exportInfo.index, true);
                this.appendBuffer(`(global ${globalName})`);
                break;
              case 4:
                var eventName = this._nameResolver.getEventName(exportInfo.index, true);
                this.appendBuffer(`(event ${eventName})`);
                break;
              default:
                throw new Error(`Unsupported export ${exportInfo.kind}`);
            }
            this.appendBuffer(")");
            this.newLine();
          }
          break;
        case 12:
          var importInfo = reader.result;
          switch (importInfo.kind) {
            case 0:
              this._importCount++;
              var funcIndex = this._funcIndex++;
              var funcName = this._nameResolver.getFunctionName(funcIndex, true, false);
              this.appendBuffer(`  (func ${funcName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getFunctionExportNames(funcIndex)) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(")");
              this.printFuncType(importInfo.funcTypeIndex);
              this.appendBuffer(")");
              break;
            case 3:
              var globalImportInfo = importInfo.type;
              var globalIndex = this._globalCount++;
              var globalName = this._nameResolver.getGlobalName(globalIndex, false);
              this.appendBuffer(`  (global ${globalName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getGlobalExportNames(globalIndex)) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(`) ${this.globalTypeToString(globalImportInfo)})`);
              break;
            case 2:
              var memoryImportInfo = importInfo.type;
              var memoryIndex = this._memoryCount++;
              var memoryName = this._nameResolver.getMemoryName(memoryIndex, false);
              this.appendBuffer(`  (memory ${memoryName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getMemoryExportNames(memoryIndex)) {
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
            case 1:
              var tableImportInfo = importInfo.type;
              var tableIndex = this._tableCount++;
              var tableName = this._nameResolver.getTableName(tableIndex, false);
              this.appendBuffer(`  (table ${tableName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getTableExportNames(tableIndex)) {
                  this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
                }
              }
              this.appendBuffer(` (import `);
              this.printImportSource(importInfo);
              this.appendBuffer(`) ${limitsToString(tableImportInfo.limits)} ${this.typeToString(tableImportInfo.elementType)})`);
              break;
            case 4:
              var eventImportInfo = importInfo.type;
              var eventIndex = this._eventCount++;
              var eventName = this._nameResolver.getEventName(eventIndex, false);
              this.appendBuffer(`  (event ${eventName}`);
              if (this._exportMetadata !== null) {
                for (const exportName of this._exportMetadata.getEventExportNames(eventIndex)) {
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
        case 33:
          var elementSegment = reader.result;
          var elementIndex = this._elementCount++;
          var elementName = this._nameResolver.getElementName(elementIndex, false);
          this.appendBuffer(`  (elem ${elementName}`);
          switch (elementSegment.mode) {
            case 0:
              if (elementSegment.tableIndex !== 0) {
                const tableName2 = this._nameResolver.getTableName(elementSegment.tableIndex, false);
                this.appendBuffer(` (table ${tableName2})`);
              }
              break;
            case 1:
              break;
            case 2:
              this.appendBuffer(" declare");
              break;
          }
          break;
        case 35:
          this.appendBuffer(")");
          this.newLine();
          break;
        case 34:
          const elementSegmentBody = reader.result;
          this.appendBuffer(` ${this.typeToString(elementSegmentBody.elementType)}`);
          break;
        case 39:
          var globalInfo = reader.result;
          var globalIndex = this._globalCount++;
          var globalName = this._nameResolver.getGlobalName(globalIndex, false);
          this.appendBuffer(`  (global ${globalName}`);
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getGlobalExportNames(globalIndex)) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          this.appendBuffer(` ${this.globalTypeToString(globalInfo.type)}`);
          break;
        case 40:
          this.appendBuffer(")");
          this.newLine();
          break;
        case 11:
          var typeEntry = reader.result;
          var typeIndex = this._types.length;
          this._types.push(typeEntry);
          if (!this._skipTypes) {
            var typeName = this._nameResolver.getTypeName(typeIndex, false);
            var superTypeName = void 0;
            if (typeEntry.supertype !== void 0) {
              superTypeName = this.typeIndexToString(typeEntry.supertype);
            }
            if (typeEntry.form === -32) {
              this.appendBuffer(`  (type ${typeName} (func`);
              this.printFuncType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === -35) {
              this.appendBuffer(`  (type ${typeName} (func_subtype`);
              this.printFuncType(typeIndex);
              this.appendBuffer(` (supertype ${superTypeName})))`);
            } else if (typeEntry.form === -33) {
              this.appendBuffer(`  (type ${typeName} (struct`);
              this.printStructType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === -36) {
              this.appendBuffer(`  (type ${typeName} (struct_subtype`);
              this.printStructType(typeIndex);
              this.appendBuffer(` (supertype ${superTypeName})))`);
            } else if (typeEntry.form === -34) {
              this.appendBuffer(`  (type ${typeName} (array`);
              this.printArrayType(typeIndex);
              this.appendBuffer("))");
            } else if (typeEntry.form === -37) {
              this.appendBuffer(`  (type ${typeName} (array_subtype`);
              this.printArrayType(typeIndex);
              this.appendBuffer(`) (supertype ${superTypeName})))`);
            } else {
              throw new Error(`Unknown type form: ${typeEntry.form}`);
            }
            this.newLine();
          }
          break;
        case 22:
          var startEntry = reader.result;
          var funcName = this._nameResolver.getFunctionName(startEntry.index, startEntry.index < this._importCount, true);
          this.appendBuffer(`  (start ${funcName})`);
          this.newLine();
          break;
        case 36:
          this.appendBuffer("  (data");
          break;
        case 37:
          var body = reader.result;
          this.appendBuffer(" ");
          this.printString(body.data);
          break;
        case 38:
          this.appendBuffer(")");
          this.newLine();
          break;
        case 25:
        case 44:
          this._expression = [];
          break;
        case 26:
        case 45:
          var operator = reader.result;
          if (operator.code !== 11) {
            this._expression.push(operator);
          }
          break;
        case 46:
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
        case 27:
          if (this._expression.length > 1 && this._currentSectionId === 9) {
            this.appendBuffer(" (item ");
            this.printExpression(this._expression);
            this.appendBuffer(")");
          } else {
            this.appendBuffer(" ");
            this.printExpression(this._expression);
          }
          this._expression = [];
          break;
        case 13:
          this._funcTypes.push(reader.result.typeIndex);
          break;
        case 28:
          var func = reader.result;
          var type = this._types[this._funcTypes[this._funcIndex - this._importCount]];
          this.appendBuffer("  (func ");
          this.appendBuffer(this._nameResolver.getFunctionName(this._funcIndex, false, false));
          if (this._exportMetadata !== null) {
            for (const exportName of this._exportMetadata.getFunctionExportNames(this._funcIndex)) {
              this.appendBuffer(` (export ${JSON.stringify(exportName)})`);
            }
          }
          for (var i = 0; i < type.params.length; i++) {
            var paramName = this._nameResolver.getVariableName(this._funcIndex, i, false);
            this.appendBuffer(` (param ${paramName} ${this.typeToString(type.params[i])})`);
          }
          for (var i = 0; i < type.returns.length; i++) {
            this.appendBuffer(` (result ${this.typeToString(type.returns[i])})`);
          }
          this.newLine();
          var localIndex = type.params.length;
          if (func.locals.length > 0) {
            this.appendBuffer("   ");
            for (var l of func.locals) {
              for (var i = 0; i < l.count; i++) {
                var paramName = this._nameResolver.getVariableName(this._funcIndex, localIndex++, false);
                this.appendBuffer(` (local ${paramName} ${this.typeToString(l.type)})`);
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
        case 30:
          if (this._logFirstInstruction) {
            this.logStartOfFunctionBodyOffset();
            this._logFirstInstruction = false;
          }
          var operator = reader.result;
          if (operator.code == 11 && this._indentLevel == 0) {
            this.appendBuffer(`  )`);
            this.newLine();
            break;
          }
          switch (operator.code) {
            case 11:
            case 5:
            case 7:
            case 25:
            case 10:
            case 24:
              this.decreaseIndent();
              break;
          }
          this.appendBuffer(this._indent);
          this.printOperator(operator);
          this.newLine();
          switch (operator.code) {
            case 4:
            case 2:
            case 3:
            case 5:
            case 6:
            case 7:
            case 25:
            case 10:
              this.increaseIndent();
              break;
          }
          break;
        case 31:
          this._funcIndex++;
          this._backrefLabels = null;
          this.logEndOfFunctionBodyOffset();
          break;
        default:
          throw new Error(`Expectected state: ${reader.state}`);
      }
    }
  }
};
var UNKNOWN_FUNCTION_PREFIX = "unknown";
var NameSectionNameResolver = class extends DefaultNameResolver {
  constructor(functionNames, localNames, eventNames, typeNames, tableNames, memoryNames, globalNames, fieldNames) {
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
  getTypeName(index, isRef) {
    const name = this._typeNames[index];
    if (!name)
      return super.getTypeName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getTableName(index, isRef) {
    const name = this._tableNames[index];
    if (!name)
      return super.getTableName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getMemoryName(index, isRef) {
    const name = this._memoryNames[index];
    if (!name)
      return super.getMemoryName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getGlobalName(index, isRef) {
    const name = this._globalNames[index];
    if (!name)
      return super.getGlobalName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getEventName(index, isRef) {
    const name = this._eventNames[index];
    if (!name)
      return super.getEventName(index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getFunctionName(index, isImport, isRef) {
    const name = this._functionNames[index];
    if (!name)
      return `$${UNKNOWN_FUNCTION_PREFIX}${index}`;
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getVariableName(funcIndex, index, isRef) {
    const name = this._localNames[funcIndex] && this._localNames[funcIndex][index];
    if (!name)
      return super.getVariableName(funcIndex, index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
  getFieldName(typeIndex, index, isRef) {
    const name = this._fieldNames[typeIndex] && this._fieldNames[typeIndex][index];
    if (!name)
      return super.getFieldName(typeIndex, index, isRef);
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
};
var NameSectionReader = class {
  constructor() {
    this._done = false;
    this._functionsCount = 0;
    this._functionImportsCount = 0;
    this._functionNames = null;
    this._functionLocalNames = null;
    this._eventNames = null;
    this._typeNames = null;
    this._tableNames = null;
    this._memoryNames = null;
    this._globalNames = null;
    this._fieldNames = null;
    this._hasNames = false;
  }
  read(reader) {
    if (this._done)
      throw new Error("Invalid state: disassembly process was already finished.");
    while (true) {
      if (!reader.read())
        return false;
      switch (reader.state) {
        case 2:
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case -1:
          throw reader.error;
        case 1:
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
        case 4:
          break;
        case 3:
          var sectionInfo = reader.result;
          if (sectionInfo.id === 0 && bytesToString(sectionInfo.name) === NAME_SECTION_NAME) {
            break;
          }
          if (sectionInfo.id === 3 || sectionInfo.id === 2) {
            break;
          }
          reader.skipSection();
          break;
        case 12:
          var importInfo = reader.result;
          if (importInfo.kind === 0)
            this._functionImportsCount++;
          break;
        case 13:
          this._functionsCount++;
          break;
        case 19:
          const nameInfo = reader.result;
          if (nameInfo.type === 1) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._functionNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 2) {
            const { funcs } = nameInfo;
            funcs.forEach(({ index, locals }) => {
              const localNames = this._functionLocalNames[index] = [];
              locals.forEach(({ index: index2, name }) => {
                localNames[index2] = bytesToString(name);
              });
            });
            this._hasNames = true;
          } else if (nameInfo.type === 3) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._eventNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 4) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._typeNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 5) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._tableNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 6) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._memoryNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 7) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._globalNames[index] = bytesToString(name);
            });
            this._hasNames = true;
          } else if (nameInfo.type === 10) {
            const { types } = nameInfo;
            types.forEach(({ index, fields }) => {
              const fieldNames = this._fieldNames[index] = [];
              fields.forEach(({ index: index2, name }) => {
                fieldNames[index2] = bytesToString(name);
              });
            });
          }
          break;
        default:
          throw new Error(`Expectected state: ${reader.state}`);
      }
    }
  }
  hasValidNames() {
    return this._hasNames;
  }
  getNameResolver() {
    if (!this.hasValidNames())
      throw new Error("Has no valid name section");
    const functionNamesLength = this._functionImportsCount + this._functionsCount;
    const functionNames = this._functionNames.slice(0, functionNamesLength);
    const usedNameAt = /* @__PURE__ */ Object.create(null);
    for (let i = 0; i < functionNames.length; i++) {
      const name = functionNames[i];
      if (!name)
        continue;
      const goodName = !(name in usedNameAt) && isValidName(name) && name.indexOf(UNKNOWN_FUNCTION_PREFIX) !== 0;
      if (!goodName) {
        if (usedNameAt[name] >= 0) {
          functionNames[usedNameAt[name]] = null;
          usedNameAt[name] = -1;
        }
        functionNames[i] = null;
        continue;
      }
      usedNameAt[name] = i;
    }
    return new NameSectionNameResolver(functionNames, this._functionLocalNames, this._eventNames, this._typeNames, this._tableNames, this._memoryNames, this._globalNames, this._fieldNames);
  }
};
var DevToolsNameResolver = class extends NameSectionNameResolver {
  constructor(functionNames, localNames, eventNames, typeNames, tableNames, memoryNames, globalNames, fieldNames) {
    super(functionNames, localNames, eventNames, typeNames, tableNames, memoryNames, globalNames, fieldNames);
  }
  getFunctionName(index, isImport, isRef) {
    const name = this._functionNames[index];
    if (!name)
      return isImport ? `$import${index}` : `$func${index}`;
    return isRef ? `$${name}` : `$${name} (;${index};)`;
  }
};
var DevToolsNameGenerator = class {
  constructor() {
    this._done = false;
    this._functionImportsCount = 0;
    this._memoryImportsCount = 0;
    this._tableImportsCount = 0;
    this._globalImportsCount = 0;
    this._eventImportsCount = 0;
    this._functionNames = null;
    this._functionLocalNames = null;
    this._eventNames = null;
    this._memoryNames = null;
    this._typeNames = null;
    this._tableNames = null;
    this._globalNames = null;
    this._fieldNames = null;
    this._functionExportNames = null;
    this._globalExportNames = null;
    this._memoryExportNames = null;
    this._tableExportNames = null;
    this._eventExportNames = null;
  }
  _addExportName(exportNames, index, name) {
    const names = exportNames[index];
    if (names) {
      names.push(name);
    } else {
      exportNames[index] = [name];
    }
  }
  _setName(names, index, name, isNameSectionName) {
    if (!name)
      return;
    if (isNameSectionName) {
      if (!isValidName(name))
        return;
      names[index] = name;
    } else if (!names[index]) {
      names[index] = name.replace(INVALID_NAME_SYMBOLS_REGEX_GLOBAL, "_");
    }
  }
  read(reader) {
    if (this._done)
      throw new Error("Invalid state: disassembly process was already finished.");
    while (true) {
      if (!reader.read())
        return false;
      switch (reader.state) {
        case 2:
          if (!reader.hasMoreBytes()) {
            this._done = true;
            return true;
          }
          break;
        case -1:
          throw reader.error;
        case 1:
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
        case 4:
          break;
        case 3:
          var sectionInfo = reader.result;
          if (sectionInfo.id === 0 && bytesToString(sectionInfo.name) === NAME_SECTION_NAME) {
            break;
          }
          switch (sectionInfo.id) {
            case 2:
            case 7:
              break;
            // reading known section;
            default:
              reader.skipSection();
              break;
          }
          break;
        case 12:
          var importInfo = reader.result;
          const importName = `${bytesToString(importInfo.module)}.${bytesToString(importInfo.field)}`;
          switch (importInfo.kind) {
            case 0:
              this._setName(this._functionNames, this._functionImportsCount++, importName, false);
              break;
            case 1:
              this._setName(this._tableNames, this._tableImportsCount++, importName, false);
              break;
            case 2:
              this._setName(this._memoryNames, this._memoryImportsCount++, importName, false);
              break;
            case 3:
              this._setName(this._globalNames, this._globalImportsCount++, importName, false);
              break;
            case 4:
              this._setName(this._eventNames, this._eventImportsCount++, importName, false);
            default:
              throw new Error(`Unsupported export ${importInfo.kind}`);
          }
          break;
        case 19:
          const nameInfo = reader.result;
          if (nameInfo.type === 1) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._functionNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 2) {
            const { funcs } = nameInfo;
            funcs.forEach(({ index, locals }) => {
              const localNames = this._functionLocalNames[index] = [];
              locals.forEach(({ index: index2, name }) => {
                localNames[index2] = bytesToString(name);
              });
            });
          } else if (nameInfo.type === 3) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._eventNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 4) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._typeNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 5) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._tableNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 6) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._memoryNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 7) {
            const { names } = nameInfo;
            names.forEach(({ index, name }) => {
              this._setName(this._globalNames, index, bytesToString(name), true);
            });
          } else if (nameInfo.type === 10) {
            const { types } = nameInfo;
            types.forEach(({ index, fields }) => {
              const fieldNames = this._fieldNames[index] = [];
              fields.forEach(({ index: index2, name }) => {
                fieldNames[index2] = bytesToString(name);
              });
            });
          }
          break;
        case 17:
          var exportInfo = reader.result;
          const exportName = bytesToString(exportInfo.field);
          switch (exportInfo.kind) {
            case 0:
              this._addExportName(this._functionExportNames, exportInfo.index, exportName);
              this._setName(this._functionNames, exportInfo.index, exportName, false);
              break;
            case 3:
              this._addExportName(this._globalExportNames, exportInfo.index, exportName);
              this._setName(this._globalNames, exportInfo.index, exportName, false);
              break;
            case 2:
              this._addExportName(this._memoryExportNames, exportInfo.index, exportName);
              this._setName(this._memoryNames, exportInfo.index, exportName, false);
              break;
            case 1:
              this._addExportName(this._tableExportNames, exportInfo.index, exportName);
              this._setName(this._tableNames, exportInfo.index, exportName, false);
              break;
            case 4:
              this._addExportName(this._eventExportNames, exportInfo.index, exportName);
              this._setName(this._eventNames, exportInfo.index, exportName, false);
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
  getExportMetadata() {
    return new DevToolsExportMetadata(this._functionExportNames, this._globalExportNames, this._memoryExportNames, this._tableExportNames, this._eventExportNames);
  }
  getNameResolver() {
    return new DevToolsNameResolver(this._functionNames, this._functionLocalNames, this._eventNames, this._typeNames, this._tableNames, this._memoryNames, this._globalNames, this._fieldNames);
  }
};
export {
  WasmDis_exports as WasmDis,
  WasmParser_exports as WasmParser
};
//# sourceMappingURL=wasmparser.js.map
