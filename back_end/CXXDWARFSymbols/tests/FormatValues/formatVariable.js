// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// REQUIRES: formatters
// RUN: %p/Inputs/lsp-encode %p/Inputs/formatVariable.json \
// RUN: | %symbol-server 2>/dev/null | node %s | FileCheck %s

// CHECK-NOT: Didn't consume
// CHECK: Got 3 responses
// CHECK: ["global.c"]
// CHECK: {"name":"I","scope":"GLOBAL","type":"int"}

// CHECK: Reading 4 bytes from offset 1024
// CHECK: Result at: {{[0-9]+}}
// CHECK: Result: {"type":"int32_t","name":"I","value":"256"}

tests = require('./tests.js')

var heap;

// void __getMemory(uint32_t offset, uint32_t size, void* result);
function proxyGetMemory(offset, size, result) {
  console.log('Reading ' + size + ' bytes from offset ' + offset + ' into ' + result);
  // Expecting size 4, so "read" 4 bytes from the engine:
  heap[result] = 0;
  heap[result + 1] = 1;
  heap[result + 2] = 0;
  heap[result + 3] = 0;
}

(async () => {
  const data = await tests.readStdIn();
  const input = [...tests.parseInput(data)];
  console.log('Got ' + input.length + ' responses.');

  for (const message of input) {
    if (message.result.value) {
      const buf = Uint8Array.from(tests.decodeBase64(message.result.value.code));
      const module = new WebAssembly.Module(buf);
      const instance = tests.makeInstance(module, {getMemory: proxyGetMemory});
      heap = new Uint8Array(instance.exports.memory.buffer);
      const result_offset = instance.exports.wasm_format();
      console.log('Result at: ' + result_offset);
      console.log('Result: ' + tests.toString(heap, result_offset));
    } else {
      console.log(JSON.stringify(message));
    }
  }
})();
