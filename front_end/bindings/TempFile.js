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
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

/**
 * @unrestricted
 */
Bindings.TempFile = class {
  constructor() {
    this._fileEntry = null;
    this._writer = null;
  }

  /**
   * @param {string} dirPath
   * @param {string} name
   * @return {!Promise.<!Bindings.TempFile>}
   */
  static create(dirPath, name) {
    var file = new Bindings.TempFile();

    function requestTempFileSystem() {
      return new Promise(window.requestFileSystem.bind(window, window.TEMPORARY, 10));
    }

    /**
     * @param {!FileSystem} fs
     */
    function getDirectoryEntry(fs) {
      return new Promise(fs.root.getDirectory.bind(fs.root, dirPath, {create: true}));
    }

    /**
     * @param {!DirectoryEntry} dir
     */
    function getFileEntry(dir) {
      return new Promise(dir.getFile.bind(dir, name, {create: true}));
    }

    /**
     * @param {!FileEntry} fileEntry
     */
    function createFileWriter(fileEntry) {
      file._fileEntry = fileEntry;
      return new Promise(fileEntry.createWriter.bind(fileEntry));
    }

    /**
     * @param {!FileWriter} writer
     */
    function truncateFile(writer) {
      if (!writer.length) {
        file._writer = writer;
        return Promise.resolve(file);
      }

      /**
       * @param {function(?)} fulfill
       * @param {function(*)} reject
       */
      function truncate(fulfill, reject) {
        writer.onwriteend = fulfill;
        writer.onerror = reject;
        writer.truncate(0);
      }

      function didTruncate() {
        file._writer = writer;
        writer.onwriteend = null;
        writer.onerror = null;
        return Promise.resolve(file);
      }

      function onTruncateError(e) {
        writer.onwriteend = null;
        writer.onerror = null;
        throw e;
      }

      return new Promise(truncate).then(didTruncate, onTruncateError);
    }

    return Bindings.TempFile.ensureTempStorageCleared()
        .then(requestTempFileSystem)
        .then(getDirectoryEntry)
        .then(getFileEntry)
        .then(createFileWriter)
        .then(truncateFile);
  }

  /**
   * @return {!Promise.<undefined>}
   */
  static ensureTempStorageCleared() {
    if (!Bindings.TempFile._storageCleanerPromise) {
      Bindings.TempFile._storageCleanerPromise =
          Services.serviceManager.createAppService('utility_shared_worker', 'TempStorage', true).then(service => {
            if (service)
              return service.send('clear');
          });
    }
    return Bindings.TempFile._storageCleanerPromise;
  }

  /**
   * @param {!Array.<string>} strings
   * @param {function(number)} callback
   */
  write(strings, callback) {
    var blob = new Blob(strings, {type: 'text/plain'});
    this._writer.onerror = function(e) {
      Common.console.error('Failed to write into a temp file: ' + e.target.error.message);
      callback(-1);
    };
    this._writer.onwriteend = function(e) {
      callback(e.target.length);
    };
    this._writer.write(blob);
  }

  finishWriting() {
    this._writer = null;
  }

  /**
   * @param {function(?string)} callback
   */
  read(callback) {
    this.readRange(undefined, undefined, callback);
  }

  /**
   * @param {number|undefined} startOffset
   * @param {number|undefined} endOffset
   * @param {function(?string)} callback
   */
  readRange(startOffset, endOffset, callback) {
    /**
     * @param {!Blob} file
     */
    function didGetFile(file) {
      var reader = new FileReader();

      if (typeof startOffset === 'number' || typeof endOffset === 'number')
        file = file.slice(/** @type {number} */ (startOffset), /** @type {number} */ (endOffset));
      /**
       * @this {FileReader}
       */
      reader.onloadend = function(e) {
        callback(/** @type {?string} */ (this.result));
      };
      reader.onerror = function(error) {
        Common.console.error('Failed to read from temp file: ' + error.message);
      };
      reader.readAsText(file);
    }
    function didFailToGetFile(error) {
      Common.console.error('Failed to load temp file: ' + error.message);
      callback(null);
    }
    this._fileEntry.file(didGetFile, didFailToGetFile);
  }

  /**
   * @param {!Common.OutputStream} outputStream
   * @param {!Bindings.OutputStreamDelegate} delegate
   */
  copyToOutputStream(outputStream, delegate) {
    /**
     * @param {!File} file
     */
    function didGetFile(file) {
      var reader = new Bindings.ChunkedFileReader(file, 10 * 1000 * 1000, delegate);
      reader.start(outputStream);
    }

    function didFailToGetFile(error) {
      Common.console.error('Failed to load temp file: ' + error.message);
      outputStream.close();
    }

    this._fileEntry.file(didGetFile, didFailToGetFile);
  }

  remove() {
    if (this._fileEntry)
      this._fileEntry.remove(function() {});
  }
};


/**
 * @unrestricted
 */
Bindings.DeferredTempFile = class {
  /**
   * @param {string} dirPath
   * @param {string} name
   */
  constructor(dirPath, name) {
    /** @type {!Array.<!{strings: !Array.<string>, callback: ?function(number)}>} */
    this._chunks = [];
    this._tempFile = null;
    this._isWriting = false;
    this._finishCallback = null;
    this._finishedWriting = false;
    this._callsPendingOpen = [];
    this._pendingReads = [];
    Bindings.TempFile.create(dirPath, name)
        .then(this._didCreateTempFile.bind(this), this._failedToCreateTempFile.bind(this));
  }

  /**
   * @param {!Array.<string>} strings
   * @param {function(number)=} callback
   */
  write(strings, callback) {
    if (this._finishCallback)
      throw new Error('No writes are allowed after close.');
    this._chunks.push({strings: strings, callback: callback || null});
    if (this._tempFile && !this._isWriting)
      this._writeNextChunk();
  }

  /**
   * @param {function(?Bindings.TempFile)} callback
   */
  finishWriting(callback) {
    this._finishCallback = callback;
    if (this._finishedWriting)
      callback(this._tempFile);
    else if (!this._isWriting && !this._chunks.length)
      this._notifyFinished();
  }

  /**
   * @param {*} e
   */
  _failedToCreateTempFile(e) {
    Common.console.error('Failed to create temp file ' + e.code + ' : ' + e.message);
    this._notifyFinished();
  }

  /**
   * @param {!Bindings.TempFile} tempFile
   */
  _didCreateTempFile(tempFile) {
    this._tempFile = tempFile;
    var callsPendingOpen = this._callsPendingOpen;
    this._callsPendingOpen = null;
    for (var i = 0; i < callsPendingOpen.length; ++i)
      callsPendingOpen[i]();
    if (this._chunks.length)
      this._writeNextChunk();
  }

  _writeNextChunk() {
    // File was deleted while create or write was in-flight.
    if (!this._tempFile)
      return;
    var chunk = this._chunks.shift();
    this._isWriting = true;
    this._tempFile.write(
        /** @type {!Array.<string>} */ (chunk.strings), this._didWriteChunk.bind(this, chunk.callback));
  }

  /**
   * @param {?function(number)} callback
   * @param {number} size
   */
  _didWriteChunk(callback, size) {
    this._isWriting = false;
    if (size === -1) {
      this._tempFile = null;
      this._notifyFinished();
      return;
    }
    if (callback)
      callback(size);
    if (this._chunks.length)
      this._writeNextChunk();
    else if (this._finishCallback)
      this._notifyFinished();
  }

  _notifyFinished() {
    this._finishedWriting = true;
    if (this._tempFile)
      this._tempFile.finishWriting();
    var chunks = this._chunks;
    this._chunks = [];
    for (var i = 0; i < chunks.length; ++i) {
      if (chunks[i].callback)
        chunks[i].callback(-1);
    }
    if (this._finishCallback)
      this._finishCallback(this._tempFile);
    var pendingReads = this._pendingReads;
    this._pendingReads = [];
    for (var i = 0; i < pendingReads.length; ++i)
      pendingReads[i]();
  }

  /**
   * @param {number|undefined} startOffset
   * @param {number|undefined} endOffset
   * @param {function(string?)} callback
   */
  readRange(startOffset, endOffset, callback) {
    if (!this._finishedWriting) {
      this._pendingReads.push(this.readRange.bind(this, startOffset, endOffset, callback));
      return;
    }
    if (!this._tempFile) {
      callback(null);
      return;
    }
    this._tempFile.readRange(startOffset, endOffset, callback);
  }

  /**
   * @param {!Common.OutputStream} outputStream
   * @param {!Bindings.OutputStreamDelegate} delegate
   */
  copyToOutputStream(outputStream, delegate) {
    if (!this._finishedWriting) {
      this._pendingReads.push(this.copyToOutputStream.bind(this, outputStream, delegate));
      return;
    }
    if (this._tempFile)
      this._tempFile.copyToOutputStream(outputStream, delegate);
  }

  remove() {
    if (this._callsPendingOpen) {
      this._callsPendingOpen.push(this.remove.bind(this));
      return;
    }
    if (this._tempFile)
      this._tempFile.remove();
    this._tempFile = null;
  }
};


/**
 * @implements {SDK.BackingStorage}
 * @unrestricted
 */
Bindings.TempFileBackingStorage = class {
  /**
   * @param {string} dirName
   */
  constructor(dirName) {
    this._dirName = dirName;
    this.reset();
  }

  /**
   * @override
   * @param {string} string
   */
  appendString(string) {
    this._strings.push(string);
    this._stringsLength += string.length;
    var flushStringLength = 10 * 1024 * 1024;
    if (this._stringsLength > flushStringLength)
      this._flush(false);
  }

  /**
   * @override
   * @param {string} string
   * @return {function():!Promise.<?string>}
   */
  appendAccessibleString(string) {
    this._flush(false);
    this._strings.push(string);
    var chunk = /** @type {!Bindings.TempFileBackingStorage.Chunk} */ (this._flush(true));

    /**
     * @param {!Bindings.TempFileBackingStorage.Chunk} chunk
     * @param {!Bindings.DeferredTempFile} file
     * @return {!Promise.<?string>}
     */
    function readString(chunk, file) {
      if (chunk.string)
        return /** @type {!Promise.<?string>} */ (Promise.resolve(chunk.string));

      console.assert(chunk.endOffset);
      if (!chunk.endOffset)
        return Promise.reject('Nor string nor offset to the string in the file were found.');

      /**
       * @param {function(?string)} fulfill
       * @param {function(*)} reject
       */
      function readRange(fulfill, reject) {
        // FIXME: call reject for null strings.
        file.readRange(chunk.startOffset, chunk.endOffset, fulfill);
      }

      return new Promise(readRange);
    }

    return readString.bind(null, chunk, this._file);
  }

  /**
   * @param {boolean} createChunk
   * @return {?Bindings.TempFileBackingStorage.Chunk}
   */
  _flush(createChunk) {
    if (!this._strings.length)
      return null;

    var chunk = null;
    if (createChunk) {
      console.assert(this._strings.length === 1);
      chunk = {string: this._strings[0], startOffset: 0, endOffset: 0};
    }

    /**
     * @this {Bindings.TempFileBackingStorage}
     * @param {?Bindings.TempFileBackingStorage.Chunk} chunk
     * @param {number} fileSize
     */
    function didWrite(chunk, fileSize) {
      if (fileSize === -1)
        return;
      if (chunk) {
        chunk.startOffset = this._fileSize;
        chunk.endOffset = fileSize;
        chunk.string = null;
      }
      this._fileSize = fileSize;
    }

    if (!this._file)
      this._file = new Bindings.DeferredTempFile(this._dirName, String(Date.now()));
    this._file.write(this._strings, didWrite.bind(this, chunk));
    this._strings = [];
    this._stringsLength = 0;
    return chunk;
  }

  /**
   * @override
   */
  finishWriting() {
    this._flush(false);
    this._file.finishWriting(function() {});
  }

  /**
   * @override
   */
  reset() {
    if (this._file)
      this._file.remove();
    this._file = null;
    /**
     * @type {!Array.<string>}
     */
    this._strings = [];
    this._stringsLength = 0;
    this._fileSize = 0;
  }

  /**
   * @param {!Common.OutputStream} outputStream
   * @param {!Bindings.OutputStreamDelegate} delegate
   */
  writeToStream(outputStream, delegate) {
    if (this._file)
      this._file.copyToOutputStream(outputStream, delegate);
  }
};

/**
 * @typedef {{
 *      string: ?string,
 *      startOffset: number,
 *      endOffset: number
 * }}
 */
Bindings.TempFileBackingStorage.Chunk;
