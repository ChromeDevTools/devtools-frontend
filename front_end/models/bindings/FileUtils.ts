// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

export interface ChunkedReader {
  fileSize(): number;

  loadedSize(): number;

  fileName(): string;

  cancel(): void;

  error(): DOMError|null;
}

export class ChunkedFileReader implements ChunkedReader {
  #file: File|null;
  readonly #fileSize: number;
  #loadedSize: number;
  #streamReader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>|null;
  readonly #chunkSize: number;
  readonly #chunkTransferredCallback: ((arg0: ChunkedReader) => void)|undefined;
  readonly #decoder: TextDecoder;
  #isCanceled: boolean;
  #error: DOMException|null;
  #transferFinished!: (arg0: boolean) => void;
  #output?: Common.StringOutputStream.OutputStream;
  #reader?: FileReader|null;

  constructor(file: File, chunkSize?: number, chunkTransferredCallback?: ((arg0: ChunkedReader) => void)) {
    this.#file = file;
    this.#fileSize = file.size;
    this.#loadedSize = 0;
    this.#chunkSize = (chunkSize) ? chunkSize : Number.MAX_VALUE;
    this.#chunkTransferredCallback = chunkTransferredCallback;
    this.#decoder = new TextDecoder();
    this.#isCanceled = false;
    this.#error = null;
    this.#streamReader = null;
  }

  async read(output: Common.StringOutputStream.OutputStream): Promise<boolean> {
    if (this.#chunkTransferredCallback) {
      this.#chunkTransferredCallback(this);
    }

    if (this.#file?.type.endsWith('gzip')) {
      const fileStream = this.#file.stream();
      const stream = Common.Gzip.decompressStream(fileStream);
      this.#streamReader = stream.getReader();
    } else {
      this.#reader = new FileReader();
      this.#reader.onload = this.onChunkLoaded.bind(this);
      this.#reader.onerror = this.onError.bind(this);
    }

    this.#output = output;
    void this.loadChunk();

    return await new Promise(resolve => {
      this.#transferFinished = resolve;
    });
  }

  cancel(): void {
    this.#isCanceled = true;
  }

  loadedSize(): number {
    return this.#loadedSize;
  }

  fileSize(): number {
    return this.#fileSize;
  }

  fileName(): string {
    if (!this.#file) {
      return '';
    }
    return this.#file.name;
  }

  error(): DOMException|null {
    return this.#error;
  }

  private onChunkLoaded(event: Event): void {
    if (this.#isCanceled) {
      return;
    }

    const eventTarget = (event.target as FileReader);
    if (eventTarget.readyState !== FileReader.DONE) {
      return;
    }

    if (!this.#reader) {
      return;
    }

    const buffer = (this.#reader.result as ArrayBuffer);
    this.#loadedSize += buffer.byteLength;
    const endOfFile = this.#loadedSize === this.#fileSize;
    void this.decodeChunkBuffer(buffer, endOfFile);
  }

  private async decodeChunkBuffer(buffer: ArrayBuffer, endOfFile: boolean): Promise<void> {
    if (!this.#output) {
      return;
    }
    const decodedString = this.#decoder.decode(buffer, {stream: !endOfFile});
    await this.#output.write(decodedString, endOfFile);
    if (this.#isCanceled) {
      return;
    }
    if (this.#chunkTransferredCallback) {
      this.#chunkTransferredCallback(this);
    }

    if (endOfFile) {
      void this.finishRead();
      return;
    }
    void this.loadChunk();
  }

  private async finishRead(): Promise<void> {
    if (!this.#output) {
      return;
    }
    this.#file = null;
    this.#reader = null;
    await this.#output.close();
    this.#transferFinished(!this.#error);
  }

  private async loadChunk(): Promise<void> {
    if (!this.#output || !this.#file) {
      return;
    }
    if (this.#streamReader) {
      const {value, done} = await this.#streamReader.read();
      if (done || !value) {
        // Write empty string to inform of file end
        await this.#output.write('', true);
        return await this.finishRead();
      }
      void this.decodeChunkBuffer(value.buffer, false);
    }
    if (this.#reader) {
      const chunkStart = this.#loadedSize;
      const chunkEnd = Math.min(this.#fileSize, chunkStart + this.#chunkSize);
      const nextPart = this.#file.slice(chunkStart, chunkEnd);
      this.#reader.readAsArrayBuffer(nextPart);
    }
  }

  private onError(event: Event): void {
    const eventTarget = (event.target as FileReader);
    this.#error = eventTarget.error;
    this.#transferFinished(false);
  }
}

export class FileOutputStream implements Common.StringOutputStream.OutputStream {
  #writeCallbacks: Array<() => void>;
  #fileName!: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString;
  #closed?: boolean;
  constructor() {
    this.#writeCallbacks = [];
  }

  async open(fileName: Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.UrlString): Promise<boolean> {
    this.#closed = false;
    this.#writeCallbacks = [];
    this.#fileName = fileName;
    const saveResponse = await Workspace.FileManager.FileManager.instance().save(
        this.#fileName, TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA, /* forceSaveAs=*/ true);
    if (saveResponse) {
      Workspace.FileManager.FileManager.instance().addEventListener(
          Workspace.FileManager.Events.APPENDED_TO_URL, this.onAppendDone, this);
    }
    return Boolean(saveResponse);
  }

  write(data: string): Promise<void> {
    return new Promise(resolve => {
      this.#writeCallbacks.push(resolve);
      Workspace.FileManager.FileManager.instance().append(this.#fileName, data);
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
    if (this.#writeCallbacks.length) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.APPENDED_TO_URL, this.onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this.#fileName);
  }

  private onAppendDone(event: Common.EventTarget.EventTargetEvent<string>): void {
    if (event.data !== this.#fileName) {
      return;
    }
    const writeCallback = this.#writeCallbacks.shift();
    if (writeCallback) {
      writeCallback();
    }
    if (this.#writeCallbacks.length) {
      return;
    }
    if (!this.#closed) {
      return;
    }
    Workspace.FileManager.FileManager.instance().removeEventListener(
        Workspace.FileManager.Events.APPENDED_TO_URL, this.onAppendDone, this);
    Workspace.FileManager.FileManager.instance().close(this.#fileName);
  }
}
