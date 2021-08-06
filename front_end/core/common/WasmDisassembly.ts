// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Metadata to map between bytecode offsets and line numbers in the
 * disassembly for WebAssembly modules.
 */

interface FunctionBodyOffset {
  start: number;
  end: number;
}
export class WasmDisassembly {
  private readonly offsets: number[];
  private functionBodyOffsets: FunctionBodyOffset[];

  constructor(offsets: number[], functionBodyOffsets: FunctionBodyOffset[]) {
    this.offsets = offsets;
    this.functionBodyOffsets = functionBodyOffsets;
  }

  get lineNumbers(): number {
    return this.offsets.length;
  }

  bytecodeOffsetToLineNumber(bytecodeOffset: number): number {
    let l = 0, r: number = this.offsets.length - 1;
    while (l <= r) {
      const m = Math.floor((l + r) / 2);
      const offset = this.offsets[m];
      if (offset < bytecodeOffset) {
        l = m + 1;
      } else if (offset > bytecodeOffset) {
        r = m - 1;
      } else {
        return m;
      }
    }
    return l;
  }

  lineNumberToBytecodeOffset(lineNumber: number): number {
    return this.offsets[lineNumber];
  }

  /**
   * returns an iterable enumerating all the non-breakable line numbers in the disassembly
   */
  * nonBreakableLineNumbers(): Iterable<number> {
    let lineNumber = 0;
    let functionIndex = 0;
    while (lineNumber < this.lineNumbers) {
      if (functionIndex < this.functionBodyOffsets.length) {
        const offset = this.lineNumberToBytecodeOffset(lineNumber);
        if (offset >= this.functionBodyOffsets[functionIndex].start) {
          lineNumber = this.bytecodeOffsetToLineNumber(this.functionBodyOffsets[functionIndex++].end);
          continue;
        }
      }
      yield lineNumber++;
    }
  }
}
