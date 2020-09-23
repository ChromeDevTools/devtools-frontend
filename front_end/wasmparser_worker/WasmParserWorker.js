/*
 * Copyright (C) 2020 Google Inc. All rights reserved.
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

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as WasmDis from '../third_party/wasmparser/package/dist/esm/WasmDis.js';
import * as WasmParser from '../third_party/wasmparser/package/dist/esm/WasmParser.js';

class BinaryReaderWithProgress extends WasmParser.BinaryReader {
  /**
   * @param {!function(number):void} progressCallback
   */
  constructor(progressCallback) {
    super();
    /** @type {number} */
    this._percentage = 0;
    this._progressCallback = progressCallback;
  }

  read() {
    if (!super.read()) {
      return false;
    }
    const percentage = Math.floor((this.position / this.length) * 100);
    if (this._percentage !== percentage) {
      this._progressCallback.call(undefined, percentage);
      this._percentage = percentage;
    }
    return true;
  }
}

self.onmessage = async function(event) {
  const method = /** @type {string} */ (event.data.method);
  const params = /** @type !{content: string} */ (event.data.params);
  if (!method || method !== 'disassemble') {
    return;
  }

  const NAME_GENERATOR_WEIGHT = 30;
  const DISASSEMBLY_WEIGHT = 69;
  const FINALIZATION_WEIGHT = NAME_GENERATOR_WEIGHT + DISASSEMBLY_WEIGHT;

  const buffer = Common.Base64.decode(params.content);

  let parser = new BinaryReaderWithProgress(percentage => {
    this.postMessage({event: 'progress', params: {percentage: percentage * (NAME_GENERATOR_WEIGHT / 100)}});
  });
  parser.setData(buffer, 0, buffer.byteLength);
  const nameGenerator = new WasmDis.DevToolsNameGenerator();
  nameGenerator.read(parser);

  const dis = new WasmDis.WasmDisassembler();
  dis.addOffsets = true;
  dis.exportMetadata = nameGenerator.getExportMetadata();
  dis.nameResolver = nameGenerator.getNameResolver();
  parser = new BinaryReaderWithProgress(percentage => {
    this.postMessage(
        {event: 'progress', params: {percentage: NAME_GENERATOR_WEIGHT + percentage * (DISASSEMBLY_WEIGHT / 100)}});
  });
  parser.setData(buffer, 0, buffer.byteLength);
  dis.disassembleChunk(parser);
  const {lines, offsets, functionBodyOffsets} = dis.getResult();

  // Truncate the output to 1M lines, because CodeMirror gets glitchy above that.
  // TODO(bmeurer): This is not very performant and we also risk running out of
  // memory in the worker (seems to work for the cases that we know about for now),
  // so we should look into using the chunked disassembly to implement this in a
  // more reasonable fashion.
  const MAX_LINES = 1000 * 1000;
  if (lines.length > MAX_LINES) {
    lines[MAX_LINES] = ';; .... text is truncated due to size';
    lines.splice(MAX_LINES + 1);
    if (offsets) {
      offsets.splice(MAX_LINES + 1);
    }
  }

  this.postMessage({event: 'progress', params: {percentage: FINALIZATION_WEIGHT}});

  const source = lines.join('\n');

  this.postMessage({event: 'progress', params: {percentage: 100}});

  this.postMessage({method: 'disassemble', result: {source, offsets, functionBodyOffsets}});
};

/* Legacy exported object */
self.WasmParserWorker = self.WasmParserWorker || {};

/* Legacy exported object */
WasmParserWorker = WasmParserWorker || {};
