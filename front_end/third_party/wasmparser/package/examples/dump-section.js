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

var wasmparser = require('../dist/WasmParser.js');
var fs = require('fs');

var wasmPath = process.argv[2];
var data = new Uint8Array(fs.readFileSync(wasmPath));

var parser = new wasmparser.BinaryReader();
parser.setData(data.buffer, 0, data.length);

var sectionStart = 0;
while (true) {
  if (!parser.read())
      return null;
  switch (parser.state) {
    case wasmparser.BinaryReaderState.BEGIN_SECTION:
      sectionStart = parser.position;
      var sectionInfo = parser.result;
      parser.skipSection();
      break;
    case wasmparser.BinaryReaderState.END_SECTION:
      let sectionLength = parser.position - sectionStart;
      console.log(wasmparser.SectionCode[sectionInfo.id] + ": " + sectionLength.toLocaleString() + " bytes");
      break;
    default:
      parser.skipSection();
  }
}