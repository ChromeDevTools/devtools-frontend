// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

const WasmDisassembly = Common.WasmDisassembly.WasmDisassembly;

describe('WasmDisassembly', () => {
  const BYTECODE_OFFSETS = [0, 10, 23, 32, 35, 37, 39, 40, 75];
  const FUNCTION_BODY_OFFSETS = [{start: 35, end: 41}];

  it('reports the correct line numbers', () => {
    const disassembly = new WasmDisassembly(BYTECODE_OFFSETS, FUNCTION_BODY_OFFSETS);
    assert.strictEqual(disassembly.lineNumbers, BYTECODE_OFFSETS.length);
  });

  it('maps line numbers to bytecode offsets correctly', () => {
    const disassembly = new WasmDisassembly(BYTECODE_OFFSETS, FUNCTION_BODY_OFFSETS);
    for (const [lineNumber, bytecodeOffset] of BYTECODE_OFFSETS.entries()) {
      assert.strictEqual(disassembly.lineNumberToBytecodeOffset(lineNumber), bytecodeOffset);
    }
  });

  it('maps bytecode offsets to line numbers correctly', () => {
    const disassembly = new WasmDisassembly(BYTECODE_OFFSETS, FUNCTION_BODY_OFFSETS);
    for (const [lineNumber, bytecodeOffset] of BYTECODE_OFFSETS.entries()) {
      assert.strictEqual(disassembly.bytecodeOffsetToLineNumber(bytecodeOffset), lineNumber);
    }
  });

  it('yields non-breakable line numbers correctly', () => {
    const disassembly = new WasmDisassembly(BYTECODE_OFFSETS, FUNCTION_BODY_OFFSETS);
    assert.deepEqual([...disassembly.nonBreakableLineNumbers()], [0, 1, 2, 3, 8]);
  });
});
