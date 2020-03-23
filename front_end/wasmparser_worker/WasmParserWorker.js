/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @param {string} mimeType
 * @return {function(string, function(string, ?string, number, number):(!Object|undefined))}
 */

import * as WasmDis from '../third_party/wasmparser/WasmDis.js';
import * as WasmParser from '../third_party/wasmparser/WasmParser.js';

self.onmessage = async function(event) {
  const method = /** @type {string} */ (event.data.method);
  const params = /** @type !{content: string} */ (event.data.params);
  if (!method || method !== 'disassemble') {
    return;
  }

  const response = await fetch(`data:application/wasm;base64,${params.content}`);
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);

  const parser = new WasmParser.BinaryReader();
  parser.setData(data, 0, data.length);
  const nameGenerator = new WasmDis.DevToolsNameGenerator();
  nameGenerator.read(parser);
  const dis = new WasmDis.WasmDisassembler();
  dis.nameResolver = nameGenerator.getNameResolver();
  dis.addOffsets = true;
  dis.maxLines = 1000000;
  parser.setData(data, 0, data.length);
  dis.disassembleChunk(parser);
  const result = dis.getResult();
  this.postMessage({source: result.lines.join('\n'), offsets: result.offsets});
};

/* Legacy exported object */
self.WasmParserWorker = self.WasmParserWorker || {};

/* Legacy exported object */
WasmParserWorker = WasmParserWorker || {};
