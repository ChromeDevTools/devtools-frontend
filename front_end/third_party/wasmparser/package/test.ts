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

import { readdirSync, readFileSync }  from 'fs';
import { extname, join } from 'path';
import { WasmDisassembler } from "./src/WasmDis";
import { BinaryReader } from "./src/WasmParser";

const TEST_FOLDER = "./test";

readdirSync(TEST_FOLDER)
  .filter(fileName => extname(fileName) === ".wasm")
  .forEach(fileName => {
    test(`${fileName}`, () => {
      const filePath = join(TEST_FOLDER, fileName);
      let dis = new WasmDisassembler();
      let data = new Uint8Array(readFileSync(filePath));
      let parser = new BinaryReader();
      parser.setData(data.buffer, 0, data.length);
      let out = dis.disassemble(parser);
      let outFile = filePath + ".out";
      let outFileData = readFileSync(outFile, "utf8");
      expect(out).toBe(outFileData);
    });
  });

for (const maxLines of [1, 3, 6, 7, 8, 20, 30, 32, 34, 35, 36, 37, 38, 39, 80]) {
  test(`truncate_after_${maxLines}`, () => {
    const testFilePath = join(TEST_FOLDER, "memory_bulk.0.wasm");
    let dis = new WasmDisassembler();
    dis.maxLines = maxLines;
    let data = new Uint8Array(readFileSync(testFilePath));
    let parser = new BinaryReader();
    parser.setData(data.buffer, 0, data.length);
    let out = dis.disassemble(parser);
    let outFile = testFilePath + ".out";
    let outFileData = readFileSync(outFile, "utf8");
    let outLines = out.trimRight().split("\n");
    let allLines = outFileData.trimRight().split("\n");
    if (outLines.length > maxLines) {
      // truncated case
      expect(outLines.length).toBe(maxLines + 1);
      expect(outLines[maxLines]).toMatch("truncated");
      expect(outLines.slice(0, maxLines).join("\n")).toBe(allLines.slice(0, maxLines).join("\n"));
    } else {
      // full file should be output
      expect(out).toBe(outFileData);
    }
  });
}
