// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

import {ChunkedFileReader, type ChunkedReader} from './FileUtils.js';

export class TempFile {
  #lastBlob: Blob|null = null;
  readonly #console: Common.Console.Console;

  constructor(console: Common.Console.Console) {
    this.#console = console;
  }

  write(pieces: Array<string|Blob>): void {
    if (this.#lastBlob) {
      pieces.unshift(this.#lastBlob);
    }
    this.#lastBlob = new Blob(pieces, {type: 'text/plain'});
  }

  read(): Promise<string|null> {
    return this.readRange();
  }

  size(): number {
    return this.#lastBlob ? this.#lastBlob.size : 0;
  }

  async readRange(startOffset?: number, endOffset?: number): Promise<string|null> {
    if (!this.#lastBlob) {
      this.#console.error('Attempt to read a temp file that was never written');
      return '';
    }
    const blob = typeof startOffset === 'number' || typeof endOffset === 'number' ?
        this.#lastBlob.slice((startOffset as number), (endOffset as number)) :
        this.#lastBlob;

    try {
      return await blob.text();
    } catch (error) {
      this.#console.error('Failed to read from temp file: ' + (error as Error).message);
      return null;
    }
  }

  async copyToOutputStream(outputStream: Common.StringOutputStream.OutputStream,
                           progress?: ((arg0: ChunkedReader) => void)): Promise<DOMException|Error|null> {
    if (!this.#lastBlob) {
      void outputStream.close();
      return null;
    }
    const reader = new ChunkedFileReader((this.#lastBlob as File), 10 * 1000 * 1000, progress);
    return await reader.read(outputStream).then(success => success ? null : reader.error());
  }

  remove(): void {
    this.#lastBlob = null;
  }
}
