/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
import * as Workspace from '../../workspace/workspace.js';

/**
 * @interface
 */
export interface ChunkedReader {
  fileSize(): number;

  loadedSize(): number;

  fileName(): string;

  cancel(): void;

  error(): DOMError|null;
}

export class ChunkedFileReader implements ChunkedReader {
  _file: File|null;
  _fileSize: number;
  _loadedSize: number;
  _chunkSize: number;
  _chunkTransferredCallback: ((arg0: ChunkedReader) => void)|undefined;
  _decoder: TextDecoder;
  _isCanceled: boolean;
  _error: DOMError|null;
  _transferFinished!: (arg0: boolean) => void;
  _output?: Common.StringOutputStream.OutputStream;
  _reader?: FileReader|null;

  constructor(blob: File, chunkSize: number, chunkTransferredCallback?: ((arg0: ChunkedReader) => void)) {
    this._file = blob;
    this._fileSize = blob.size;
    this._loadedSize = 0;
    this._chunkSize = chunkSize;
    this._chunkTransferredCallback = chunkTransferredCallback;
    this._decoder = new TextDecoder();
    this._isCanceled = false;
    this._error = null;
  }

  read(output: Common.StringOutputStream.OutputStream): Promise<boolean> {
    if (this._chunkTransferredCallback) {
      this._chunkTransferredCallback(this);
    }
    this._output = output;
    this._reader = new FileReader();
    this._reader.onload = this._onChunkLoaded.bind(this);
    this._reader.onerror = this._onError.bind(this);
    this._loadChunk();

    return new Promise(resolve => {
      this._transferFinished = resolve;
    });
  }

  cancel(): void {
    this._isCanceled = true;
  }

  loadedSize(): number {
    return this._loadedSize;
  }

  fileSize(): number {
    return this._fileSize;
  }

  fileName(): string {
    if (!this._file) {
      return '';
    }
    return this._file.name;
  }

  error(): DOMError|null {
    return this._error;
  }

  _onChunkLoaded(event: Event): void {
    if (this._isCanceled) {
      return;
    }

    const eventTarget = (event.target as FileReader);
    if (eventTarget.readyState !== FileReader.DONE) {
      return;
    }

    if (!this._output || !this._reader) {
      return;
    }

    const buffer = (this._reader.result as ArrayBuffer);
    this._loadedSize += buffer.byteLength;
    const endOfFile = this._loadedSize === this._fileSize;
    const decodedString = this._decoder.decode(buffer, {stream: !endOfFile});
    this._output.write(decodedString);
    if (this._isCanceled) {
      return;
    }
    if (this._chunkTransferredCallback) {
      this._chunkTransferredCallback(this);
    }

    if (endOfFile) {
      this._file = null;
      this._reader = null;
      this._output.close();
      this._transferFinished(!this._error);
      return;
    }

    this._loadChunk();
  }

  _loadChunk(): void {
    if (!this._output || !this._reader || !this._file) {
      return;
    }
    const chunkStart = this._loadedSize;
    const chunkEnd = Math.min(this._fileSize, chunkStart + this._chunkSize);
    const nextPart = this._file.slice(chunkStart, chunkEnd);
    this._reader.readAsArrayBuffer(nextPart);
  }

  _onError(event: Event): void {
    const eventTarget = (event.target as FileReader);
    this._error = (eventTarget.error as DOMError);
    this._transferFinished(false);
  }
}

export class FileOutputStream implements Common.StringOutputStream.OutputStream {
  _writeCallbacks: (() => void)[];
  _fileName!: string;
  _closed?: boolean;
  constructor() {
    this._writeCallbacks = [];
  }

  async open(fileName: string): Promise<boolean> {
    this._closed = false;
    /** @type {!Array<function():void>} */
    this._writeCallbacks = [];
    this._fileName = fileName;
    const saveResponse = await Workspace.FileManager.FileManager.instance().save(this._fileName, '', true);
    if (saveResponse) {
      Workspace.FileManager.FileManager.instance().addEventListener(
          Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
    }
    return Boolean(saveResponse);
  }

  write(data: string): Promise<void> {
    return new Promise(resolve => {
      this._writeCallbacks.push(resolve);
      Workspace.FileManager.FileManager.instance().append(this._fileName, data);
    });
  }

  async close(): Promise<void> {
    this._closed = true;
    if (this._writeCallbacks.length) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this._fileName);
  }

  _onAppendDone(event: Common.EventTarget.EventTargetEvent): void {
    if (event.data !== this._fileName) {
      return;
    }
    const writeCallback = this._writeCallbacks.shift();
    if (writeCallback) {
      writeCallback();
    }
    if (this._writeCallbacks.length) {
      return;
    }
    if (!this._closed) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this._fileName);
  }
}
