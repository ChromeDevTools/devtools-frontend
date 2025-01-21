// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

async function f() {
  const code = fetch('externref.s.wasm');
  const imports = {
    env: {
      __linear_memory: new WebAssembly.Memory({initial: 0}),
      __indirect_function_table: new WebAssembly.Table({
        element: 'anyfunc',
        initial: 0,
      }),
    },
  };
  const wasmModule = await WebAssembly.instantiateStreaming(code, imports);
  return {
    _main: () => wasmModule.instance.exports.f({x: 1, y: 'titi'}, 'test'),
  };
}
// eslint-disable-next-line import/no-default-export
export default f;
