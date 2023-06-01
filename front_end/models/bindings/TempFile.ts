/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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

import * as Common from '../../core/common/common.js';

import {ChunkedFileReader, type ChunkedReader} from './FileUtils.js';

export class TempFile {
  #lastBlob: Blob|null;
  constructor() {
    this.#lastBlob = null;
  }

  write(pieces: (string|Blob)[]): void {
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
      Common.Console.Console.instance().error('Attempt to read a temp file that was never written');
      return '';
    }
    const blob = typeof startOffset === 'number' || typeof endOffset === 'number' ?
        this.#lastBlob.slice((startOffset as number), (endOffset as number)) :
        this.#lastBlob;

    const reader = new FileReader();
    try {
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
        reader.readAsText(blob);
      });
    } catch (error) {
      Common.Console.Console.instance().error('Failed to read from temp file: ' + error.message);
    }

    return reader.result as string | null;
  }

  async copyToOutputStream(
      outputStream: Common.StringOutputStream.OutputStream,
      progress?: ((arg0: ChunkedReader) => void)): Promise<DOMError|null> {
    if (!this.#lastBlob) {
      void outputStream.close();
      return null;
    }
    const reader = new ChunkedFileReader((this.#lastBlob as File), 10 * 1000 * 1000, progress);
    return reader.read(outputStream).then(success => success ? null : reader.error());
  }

  remove(): void {
    this.#lastBlob = null;
  }
}
