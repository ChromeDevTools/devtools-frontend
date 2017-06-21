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
/**
 * @interface
 */
Bindings.OutputStreamDelegate = function() {};

Bindings.OutputStreamDelegate.prototype = {
  onTransferStarted() {},

  onTransferFinished() {},

  /**
   * @param {!Bindings.ChunkedReader} reader
   */
  onChunkTransferred(reader) {},

  /**
   * @param {!Bindings.ChunkedReader} reader
   * @param {!Event} event
   */
  onError(reader, event) {},
};

/**
 * @interface
 */
Bindings.ChunkedReader = function() {};

Bindings.ChunkedReader.prototype = {
  /**
   * @return {number}
   */
  fileSize() {},

  /**
   * @return {number}
   */
  loadedSize() {},

  /**
   * @return {string}
   */
  fileName() {},

  cancel() {}
};

/**
 * @implements {Bindings.ChunkedReader}
 * @unrestricted
 */
Bindings.ChunkedFileReader = class {
  /**
   * @param {!File} file
   * @param {number} chunkSize
   * @param {!Bindings.OutputStreamDelegate} delegate
   */
  constructor(file, chunkSize, delegate) {
    this._file = file;
    this._fileSize = file.size;
    this._loadedSize = 0;
    this._chunkSize = chunkSize;
    this._delegate = delegate;
    this._decoder = new TextDecoder();
    this._isCanceled = false;
  }

  /**
   * @param {!Common.OutputStream} output
   */
  start(output) {
    this._output = output;

    this._reader = new FileReader();
    this._reader.onload = this._onChunkLoaded.bind(this);
    this._reader.onerror = this._delegate.onError.bind(this._delegate, this);
    this._delegate.onTransferStarted();
    this._loadChunk();
  }

  /**
   * @override
   */
  cancel() {
    this._isCanceled = true;
  }

  /**
   * @override
   * @return {number}
   */
  loadedSize() {
    return this._loadedSize;
  }

  /**
   * @override
   * @return {number}
   */
  fileSize() {
    return this._fileSize;
  }

  /**
   * @override
   * @return {string}
   */
  fileName() {
    return this._file.name;
  }

  /**
   * @param {!Event} event
   */
  _onChunkLoaded(event) {
    if (this._isCanceled)
      return;

    if (event.target.readyState !== FileReader.DONE)
      return;

    var buffer = event.target.result;
    this._loadedSize += buffer.byteLength;
    var endOfFile = this._loadedSize === this._fileSize;
    var decodedString = this._decoder.decode(buffer, {stream: !endOfFile});
    this._output.write(decodedString);
    if (this._isCanceled)
      return;
    this._delegate.onChunkTransferred(this);

    if (endOfFile) {
      this._file = null;
      this._reader = null;
      this._output.close();
      this._delegate.onTransferFinished();
      return;
    }

    this._loadChunk();
  }

  _loadChunk() {
    var chunkStart = this._loadedSize;
    var chunkEnd = Math.min(this._fileSize, chunkStart + this._chunkSize);
    var nextPart = this._file.slice(chunkStart, chunkEnd);
    this._reader.readAsArrayBuffer(nextPart);
  }
};

/**
 * @implements {Common.OutputStream}
 * @unrestricted
 */
Bindings.FileOutputStream = class {
  /**
   * @param {string} fileName
   * @return {!Promise<boolean>}
   */
  open(fileName) {
    this._closed = false;
    /** @type {!Array<function()>} */
    this._writeCallbacks = [];
    this._fileName = fileName;
    return new Promise(resolve => {
      /**
       * @param {boolean} accepted
       * @this {Bindings.FileOutputStream}
       */
      function callbackWrapper(accepted) {
        if (accepted)
          Workspace.fileManager.addEventListener(Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
        resolve(accepted);
      }
      Workspace.fileManager.save(this._fileName, '', true, callbackWrapper.bind(this));
    });
  }

  /**
   * @override
   * @param {string} data
   * @return {!Promise}
   */
  write(data) {
    return new Promise(resolve => {
      this._writeCallbacks.push(resolve);
      Workspace.fileManager.append(this._fileName, data);
    });
  }

  /**
   * @override
   */
  close() {
    this._closed = true;
    if (this._writeCallbacks.length)
      return;
    Workspace.fileManager.removeEventListener(Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
    Workspace.fileManager.close(this._fileName);
  }

  /**
   * @param {!Common.Event} event
   */
  _onAppendDone(event) {
    if (event.data !== this._fileName)
      return;
    this._writeCallbacks.shift()();
    if (this._writeCallbacks.length)
      return;
    if (!this._closed)
      return;
    Workspace.fileManager.removeEventListener(Workspace.FileManager.Events.AppendedToURL, this._onAppendDone, this);
    Workspace.fileManager.close(this._fileName);
  }
};
