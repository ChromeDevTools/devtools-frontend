// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// REQUIRES: formatters
// RUN: %p/Inputs/lsp-encode %p/Inputs/formatParameters.json \
// RUN: | %symbol-server 2>/dev/null | node %s | FileCheck %s

// CHECK-NOT: Didn't consume
// CHECK: Got 3 responses
// CHECK: ["params.c"]
// CHECK: {"name":"a","scope":"PARAMETER","type":"int"}

// We're returning 7 for the fbref local, plus an fbreg offset of 12:
// CHECK: Reading 4 bytes from offset 19

// CHECK: Result at: {{[0-9]+}}
// CHECK: Result: {"type":"int32_t","js_type":"number","name":"a","value":"256"}

tests = require('./tests.js')

// void __getMemory(uint32_t localt, void* result);
function proxyGetLocal(local, result) {
  console.log('Reading local ' + local + ' into ' + result);
  Heap[result] = 7;
  Heap[result + 1] = 0;
  Heap[result + 2] = 0;
  Heap[result + 3] = 0;
}

// void __getMemory(uint32_t offset, uint32_t size, void* result);
function proxyGetMemory(offset, size, result) {
  console.log('Reading ' + size + ' bytes from offset ' + offset + ' into ' + result);
  // Expecting size 4, so "read" 4 bytes from the engine:
  Heap[result] = 0;
  Heap[result + 1] = 1;
  Heap[result + 2] = 0;
  Heap[result + 3] = 0;
}

(async () => {
  const data = await tests.readStdIn();
  const input = [...tests.parseInput(data)];
  console.log('Got ' + input.length + ' responses.');

  for (const message of input) {
    if (message.result.value) {
      const buf = Uint8Array.from(tests.decodeBase64(message.result.value.code));
      const module = new WebAssembly.Module(buf);
      const instance = tests.makeInstance(module, {getLocal: proxyGetLocal, getMemory: proxyGetMemory});
      Heap = new Uint8Array(instance.exports.memory.buffer);
      const result_offset = instance.exports.wasm_format();
      console.log('Result at: ' + result_offset);
      console.log('Result: ' + tests.toString(Heap, result_offset));
    } else {
      console.log(JSON.stringify(message));
    }
  }
})();
