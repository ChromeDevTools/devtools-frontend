// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// REQUIRES: formatters
// RUN: %p/Inputs/lsp-encode %p/Inputs/formatCompound.json \
// RUN: | %symbol-server 2>/dev/null | node %s | FileCheck %s

// CHECK-NOT: Didn't consume
// CHECK: Reading 4 bytes from offset 1032
// CHECK: Reading 4 bytes from offset 1036
// CHECK: Result at: {{[0-9]+}}
// CHECK: Result: {"type":"Pair","js_type":"object","name":"P","value":[{"type":"int32_t","js_type":"number","name":"X","value":"8"},{"type":"int32_t","js_type":"number","name":"Y","value":"12"}]}

tests = require('./tests.js')

// void __getMemory(uint32_t offset, uint32_t size, void* result);
function proxyGetMemory(offset, size, result) {
  console.log('Reading ' + size + ' bytes from offset ' + offset);
  // Expecting size 4, so "read" 4 bytes from the engine:
  Heap[result] = offset % 256;
  Heap[result + 1] = 0;
  Heap[result + 2] = 0;
  Heap[result + 3] = 0;
}

(async () => {
  const data = await tests.readStdIn();
  const input = [...tests.parseInput(data)];

  for (const message of input) {
    if (message.result.value) {
      const buf = Uint8Array.from(tests.decodeBase64(message.result.value.code));
      const module = new WebAssembly.Module(buf);
      const instance = tests.makeInstance(module, {getMemory: proxyGetMemory});
      Heap = new Uint8Array(instance.exports.memory.buffer);

      const result_offset = instance.exports.wasm_format();
      console.log('Result at: ' + result_offset);
      console.log('Result: ' + tests.toString(Heap, result_offset));
    } else {
      console.log(JSON.stringify(message));
    }
  }
})();
