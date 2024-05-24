// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import {ContentData} from './ContentData.js';
import { type DeferredContent } from './ContentProvider.js';

interface FunctionBodyOffset {
  start: number;
  end: number;
}

/**
 * Metadata to map between bytecode #offsets and line numbers in the
 * disassembly for WebAssembly modules.
 */
export class WasmDisassembly extends ContentData {
  readonly lines: string[];
  readonly #offsets: number[];
  #functionBodyOffsets: FunctionBodyOffset[];

  // Wasm can be potentially very large, so we calculate `text' lazily.
  #cachedText?: string;

  constructor(lines: string[], offsets: number[], functionBodyOffsets: FunctionBodyOffset[]) {
    super('', /* isBase64 */ false, 'text/x-wast', 'utf-8');
    if (lines.length !== offsets.length) {
      throw new Error('Lines and offsets don\'t match');
    }
    this.lines = lines;
    this.#offsets = offsets;
    this.#functionBodyOffsets = functionBodyOffsets;
  }

  override get text(): string {
    if (typeof this.#cachedText === 'undefined') {
      this.#cachedText = this.lines.join('\n');
    }
    return this.#cachedText;
  }

  override get isEmpty(): boolean {
    // Don't trigger unnecessary concatenating. Only check whether we have no lines, or a single empty line.
    return this.lines.length === 0 || (this.lines.length === 1 && this.lines[0].length === 0);
  }

  get lineNumbers(): number {
    return this.#offsets.length;
  }

  bytecodeOffsetToLineNumber(bytecodeOffset: number): number {
    return Platform.ArrayUtilities.upperBound(
               this.#offsets, bytecodeOffset, Platform.ArrayUtilities.DEFAULT_COMPARATOR) -
        1;
  }

  lineNumberToBytecodeOffset(lineNumber: number): number {
    return this.#offsets[lineNumber];
  }

  /**
   * returns an iterable enumerating all the non-breakable line numbers in the disassembly
   */
  * nonBreakableLineNumbers(): Iterable<number> {
    let lineNumber = 0;
    let functionIndex = 0;
    while (lineNumber < this.lineNumbers) {
      if (functionIndex < this.#functionBodyOffsets.length) {
        const offset = this.lineNumberToBytecodeOffset(lineNumber);
        if (offset >= this.#functionBodyOffsets[functionIndex].start) {
          lineNumber = this.bytecodeOffsetToLineNumber(this.#functionBodyOffsets[functionIndex++].end) + 1;
          continue;
        }
      }
      yield lineNumber++;
    }
  }

  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  override asDeferedContent(): DeferredContent {
    return {content: '', isEncoded: false, wasmDisassemblyInfo: this};
  }
}
