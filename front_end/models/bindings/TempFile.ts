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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';  // eslint-disable-line no-unused-vars

import type * as SDK from '../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars

import type {ChunkedReader} from './FileUtils.js';
import {ChunkedFileReader} from './FileUtils.js';  // eslint-disable-line no-unused-vars

export class TempFile {
  _lastBlob: Blob|null;
  constructor() {
    this._lastBlob = null;
  }

  write(pieces: (string|Blob)[]): void {
    if (this._lastBlob) {
      pieces.unshift(this._lastBlob);
    }
    this._lastBlob = new Blob(pieces, {type: 'text/plain'});
  }

  read(): Promise<string|null> {
    return this.readRange();
  }

  size(): number {
    return this._lastBlob ? this._lastBlob.size : 0;
  }

  async readRange(startOffset?: number, endOffset?: number): Promise<string|null> {
    if (!this._lastBlob) {
      Common.Console.Console.instance().error('Attempt to read a temp file that was never written');
      return '';
    }
    const blob = typeof startOffset === 'number' || typeof endOffset === 'number' ?
        this._lastBlob.slice((startOffset as number), (endOffset as number)) :
        this._lastBlob;

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
    if (!this._lastBlob) {
      outputStream.close();
      return null;
    }
    const reader = new ChunkedFileReader((this._lastBlob as File), 10 * 1000 * 1000, progress);
    return reader.read(outputStream).then(success => success ? null : reader.error());
  }

  remove(): void {
    this._lastBlob = null;
  }
}

export class TempFileBackingStorage implements SDK.TracingModel.BackingStorage {
  _file: TempFile|null;
  _strings!: string[];
  _stringsLength!: number;

  constructor() {
    this._file = null;
    this.reset();
  }

  appendString(string: string): void {
    this._strings.push(string);
    this._stringsLength += string.length;
    const flushStringLength = 10 * 1024 * 1024;
    if (this._stringsLength > flushStringLength) {
      this._flush();
    }
  }

  appendAccessibleString(string: string): () => Promise<string|null> {
    this._flush();
    if (!this._file) {
      return async(): Promise<null> => null;
    }
    const startOffset = this._file.size();
    this._strings.push(string);
    this._flush();
    return this._file.readRange.bind(this._file, startOffset, this._file.size());
  }

  _flush(): void {
    if (!this._strings.length) {
      return;
    }
    if (!this._file) {
      this._file = new TempFile();
    }
    this._stringsLength = 0;
    this._file.write(this._strings.splice(0));
  }

  finishWriting(): void {
    this._flush();
  }

  reset(): void {
    if (this._file) {
      this._file.remove();
    }
    this._file = null;
    this._strings = [];
    this._stringsLength = 0;
  }

  writeToStream(outputStream: Common.StringOutputStream.OutputStream): Promise<DOMError|null> {
    return this._file ? this._file.copyToOutputStream(outputStream) : Promise.resolve(null);
  }
}
