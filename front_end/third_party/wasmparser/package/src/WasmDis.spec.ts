/* Copyright 2016 Mozilla Foundation
 * Copyright 2019 Google LLC
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

import { NameSectionReader, WasmDisassembler } from "./WasmDis";
import { DevToolsNameGenerator } from "./WasmDis";
import { BinaryReader } from "./WasmParser";

const { parseWat } = require("wabt")();

describe("DevToolsNameGenerator", () => {
  test("Wasm module with export names only for function, memory, global and table", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "export.function" (func 0))
         (export "export.memory" (memory 0))
         (export "export.table" (table 0))
         (export "export.global" (global 0))
         (func)
         (memory 0)
         (table 1 funcref)
         (global i32 (i32.const 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$export.function");
    expect(nr.getFunctionName(0, false, false)).toBe("$export.function (;0;)");
    expect(nr.getMemoryName(0, true)).toBe("$export.memory");
    expect(nr.getMemoryName(0, false)).toBe("$export.memory (;0;)");
    expect(nr.getTableName(0, true)).toBe("$export.table");
    expect(nr.getTableName(0, false)).toBe("$export.table (;0;)");
    expect(nr.getGlobalName(0, true)).toBe("$export.global");
    expect(nr.getGlobalName(0, false)).toBe("$export.global (;0;)");
  });

  test("Wasm module with import names only for function, memory, global and table", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (import "import" "function" (func))
         (import "import" "memory" (memory 0))
         (import "import" "table" (table 1 funcref))
         (import "import" "global" (global i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getTypeName(0, true)).toBe("$type0");
    expect(nr.getTypeName(0, false)).toBe("$type0");
    expect(nr.getFunctionName(0, true, true)).toBe("$import.function");
    expect(nr.getFunctionName(0, true, false)).toBe("$import.function (;0;)");
    expect(nr.getMemoryName(0, true)).toBe("$import.memory");
    expect(nr.getMemoryName(0, false)).toBe("$import.memory (;0;)");
    expect(nr.getTableName(0, true)).toBe("$import.table");
    expect(nr.getTableName(0, false)).toBe("$import.table (;0;)");
    expect(nr.getGlobalName(0, true)).toBe("$import.global");
    expect(nr.getGlobalName(0, false)).toBe("$import.global (;0;)");
  });

  test("Wasm module with function and export name", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "export.function" (func $f))
         (func $f (result i32) i32.const 0))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$f");
    expect(nr.getFunctionName(0, false, false)).toBe("$f (;0;)");
  });

  test("Wasm module with import and export name", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (import "import" "function" (func))
         (export "export.function" (func 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, true, true)).toBe("$import.function");
    expect(nr.getFunctionName(0, true, false)).toBe("$import.function (;0;)");
  });

  test("Wasm module with no set names", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (import "" "" (func))
           (export "" (func 0))
           (func)
           (memory 0)
           (table 1 funcref)
           (global i32 (i32.const 0)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, true, true)).toBe("$.");
    expect(nr.getFunctionName(0, true, false)).toBe("$. (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$func1");
    expect(nr.getFunctionName(1, false, false)).toBe("$func1");
    expect(nr.getMemoryName(0, true)).toBe("$memory0");
    expect(nr.getMemoryName(0, false)).toBe("$memory0");
    expect(nr.getTableName(0, true)).toBe("$table0");
    expect(nr.getTableName(0, false)).toBe("$table0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
    expect(nr.getGlobalName(0, false)).toBe("$global0");
  });

  test("Wasm module with defined and undefined param names", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (func (param i32) (param $x i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$x");
    expect(nr.getVariableName(0, 1, false)).toBe("$x (;1;)");
  });

  test("Wasm module with defined and undefined local names", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
           (func (local i32) (local $x i32)))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$x");
    expect(nr.getVariableName(0, 1, false)).toBe("$x (;1;)");
  });

  test("Wasm module with invalid export name", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (export "{}" (func 0))
         (func))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(reader);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$__");
    expect(nr.getFunctionName(0, false, false)).toBe("$__ (;0;)");
  });
});

describe("NameSectionReader", () => {
  test("Empty Wasm module", () => {
    const data = new Uint8Array([
      // Wasm header
      0x00,
      0x61,
      0x73,
      0x6d,
      0x01,
      0x00,
      0x00,
      0x00,
    ]);
    const reader = new BinaryReader();
    reader.setData(data.buffer, 0, data.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(false);
    expect(nsr.getNameResolver.bind(nsr)).toThrowError();
  });

  test("Wasm module with function name", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (result i32) i32.const 0))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$var0");
    expect(nr.getVariableName(0, 0, false)).toBe("$var0");
    expect(nr.getVariableName(0, 1, true)).toBe("$var1");
    expect(nr.getVariableName(0, 1, false)).toBe("$var1");
  });

  test("Wasm module with parameter name", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (param $x i32) (result i32) local.get $x))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$x");
    expect(nr.getVariableName(0, 0, false)).toBe("$x (;0;)");
    expect(nr.getVariableName(0, 1, true)).toBe("$var1");
    expect(nr.getVariableName(0, 1, false)).toBe("$var1");
  });

  test("Wasm module with bad names", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module
         (import "import" "function" (func $foo))
         (import "import" "function2" (func $foo))
         )`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new NameSectionReader();
    ng.read(reader);
    expect(ng.hasValidNames()).toBe(true);
    const nr = ng.getNameResolver();
    expect(nr.getFunctionName(0, true, true)).toBe("$unknown0");
    expect(nr.getFunctionName(1, true, true)).toBe("$unknown1");
  });

  test("Wasm module with local names", () => {
    const { buffer } = parseWat(
      `test.wat`,
      `(module (func $foo (local $x i32) (local $y f32)
        local.get $x
        local.get $y))`
    ).toBinary({ write_debug_names: true });
    const reader = new BinaryReader();
    reader.setData(buffer.buffer, 0, buffer.byteLength);
    const nsr = new NameSectionReader();
    nsr.read(reader);
    expect(nsr.hasValidNames()).toBe(true);
    const nr = nsr.getNameResolver();
    expect(nr.getFunctionName(0, false, true)).toBe("$foo");
    expect(nr.getFunctionName(0, false, false)).toBe("$foo (;0;)");
    expect(nr.getFunctionName(1, false, true)).toBe("$unknown1");
    expect(nr.getFunctionName(1, false, false)).toBe("$unknown1");
    expect(nr.getVariableName(0, 0, true)).toBe("$x");
    expect(nr.getVariableName(0, 0, false)).toBe("$x (;0;)");
    expect(nr.getVariableName(0, 1, true)).toBe("$y");
    expect(nr.getVariableName(0, 1, false)).toBe("$y (;1;)");
  });
});

describe("WasmDisassembler with export metadata", () => {
  function parseAndDisassemble(lines: string[]) {
    const { buffer } = parseWat("functions.js", lines.join("\n")).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const ng = new DevToolsNameGenerator();
    ng.read(parser);
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.exportMetadata = ng.getExportMetadata();
    dis.disassembleChunk(parser);
    return dis.getResult().lines;
  }

  test("functions", () => {
    const lines = [
      `(module`,
      `  (func $import0 (export "bar") (export "foo") (import "foo" "bar") (param i32 f32) (result i64))`,
      `  (func $func1 (export "baz") (param $var0 i32) (result i32)`,
      `    local.get $var0`,
      `  )`,
      `)`,
    ];
    expect(parseAndDisassemble(lines)).toEqual(lines);
  });

  test("globals", () => {
    const lines = [
      `(module`,
      `  (global $global0 (export "bar") (export "foo") (import "foo" "bar") i32)`,
      `  (global $global1 (export "baz") f32 (f32.const 42))`,
      `)`,
    ];
    expect(parseAndDisassemble(lines)).toEqual(lines);
  });

  test("imported memory", () => {
    const lines = [
      `(module`,
      `  (memory $memory0 (export "bar") (export "foo") (import "foo" "bar") 100)`,
      `)`,
    ];
    expect(parseAndDisassemble(lines)).toEqual(lines);
  });

  test("memory", () => {
    const lines = [
      `(module`,
      `  (memory $memory0 (export "bar") (export "foo") 100)`,
      `)`,
    ];
    expect(parseAndDisassemble(lines)).toEqual(lines);
  });

  test("tables", () => {
    const lines = [
      `(module`,
      `  (table $table0 (export "bar") (export "foo") (import "foo" "bar") 10 anyfunc)`,
      `  (table $table1 (export "baz") 5 20 anyfunc)`,
      `)`,
    ];
    expect(parseAndDisassemble(lines)).toEqual(lines);
  });
});

describe("WasmDisassembler.getResult() with function code", () => {
  const watString = `(module
  (export "export.function" (func $f))
  (func $f (result i32)
  (local $x i32)
  i32.const 0)
  (func $f1 (result i32) i32.const 1))`;
  const fileName = `test.wat`;
  const expectedLines = [
    "(module",
    '  (export "export.function" (func $func0))',
    "  (func $func0 (result i32)",
    "    (local $var0 i32)",
    "    i32.const 0",
    "  )",
    "  (func $func1 (result i32)",
    "    i32.const 1",
    "  )",
    ")",
  ];

  test("addOffsets is true", () => {
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = true;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toEqual([0, 22, 43, 43, 48, 50, 51, 53, 55, 83]);
    expect(result.functionBodyOffsets).toEqual([
      {
        start: 48,
        end: 51,
      },
      {
        start: 53,
        end: 56,
      },
    ]);
  });

  test("addOffsets is false", () => {
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = false;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toBeUndefined();
    expect(result.functionBodyOffsets).toBeUndefined();
  });
});

describe("WasmDisassembler.getResult() without function code", () => {
  const fileName = `test.wat`;
  const expectedLines = [
    `(module`,
    `  (func $import0 (import "import" "function"))`,
    `  (export "export.function" (func $import0))`,
    `)`,
  ];
  const expectedLinesWithTypes = [
    `(module`,
    `  (type $type0 (func))`,
    `  (func $import0 (import "import" "function"))`,
    `  (export \"export.function\" (func $import0))`,
    `)`,
  ];
  const watString = expectedLines.join("\n");

  test("addOffsets is true", () => {
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = true;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toEqual([0, 16, 37, 80]);
    expect(result.functionBodyOffsets).toEqual([]);
  });

  test("addOffsets is false", () => {
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.addOffsets = false;
    const offsetInModule = 0;
    dis.disassembleChunk(parser, offsetInModule);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLines);
    expect(result.offsets).toBeUndefined();
    expect(result.functionBodyOffsets).toBeUndefined();
  });

  test("skipTypes is false", () => {
    const { buffer } = parseWat(fileName, watString).toBinary({
      write_debug_names: true,
    });
    const parser = new BinaryReader();
    parser.setData(buffer.buffer, 0, buffer.byteLength);
    const dis = new WasmDisassembler();
    dis.skipTypes = false;
    dis.disassembleChunk(parser);
    const result = dis.getResult();
    expect(result.done).toBe(true);
    expect(result.lines).toEqual(expectedLinesWithTypes);
  });
});
