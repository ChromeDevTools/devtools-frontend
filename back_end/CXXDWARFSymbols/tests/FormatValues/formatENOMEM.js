// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// REQUIRES: formatters
// RUN: %p/Inputs/lsp-encode %p/Inputs/formatString.json \
// RUN: | %symbol-server 2>/dev/null | node %s | FileCheck %s

// CHECK-NOT: Didn't consume
// CHECK: Reading 4 bytes from offset 1028
// CHECK: Result at: 0

tests = require('./tests.js')

// void __getMemory(uint32_t offset, uint32_t size, void* result);
function proxyGetMemory(offset, size, result) {
  console.log('Reading ' + size + ' bytes from offset ' + offset + ' into ' + result);

  if (offset == 1028) {  // Deref char*;
    Heap[result] = 0;
    Heap[result + 1] = 0;
    Heap[result + 2] = 1;
    Heap[result + 3] = 0;
  } else {
    Heap[result] = 65;
  }
}

(async () => {
  const data = await tests.readStdIn();
  const input = [...tests.parseInput(data)];
  console.log(input);

  for (const message of input) {
    if (message.result.value) {
      const buf = Uint8Array.from(tests.decodeBase64(message.result.value.code));
      const module = new WebAssembly.Module(buf);
      const instance = tests.makeInstance(module, {getMemory: proxyGetMemory});
      Heap = new Uint8Array(instance.exports.memory.buffer);

      const result_offset = instance.exports.wasm_format();
      console.log('Result at: ' + result_offset);
    } else {
      console.log(JSON.stringify(message));
    }
  }
})();
