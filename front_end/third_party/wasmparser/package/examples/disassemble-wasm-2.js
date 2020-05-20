#!/usr/bin/env node
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

// Demo of the function names usage that are read from the name section.

var wasmparser = require('../dist/WasmParser.js');
var wasmdis = require('../dist/WasmDis.js');
var fs = require('fs');

var wasmPath = process.argv[2];
var data = new Uint8Array(fs.readFileSync(wasmPath));

var parser = new wasmparser.BinaryReader();
parser.setData(data.buffer, 0, data.length);
var namesReader = new wasmdis.NameSectionReader();
namesReader.read(parser);

var parser = new wasmparser.BinaryReader();
parser.setData(data.buffer, 0, data.length);
var dis = new wasmdis.WasmDisassembler();
if (namesReader.hasValidNames())
  dis.nameResolver = namesReader.getNameResolver();
console.log(dis.disassemble(parser));
