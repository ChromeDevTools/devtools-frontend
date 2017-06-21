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

Bindings.TempFile = class {
  constructor() {
    /** @type {?FileEntry} */
    this._fileEntry = null;
    /** @type {?FileWriter} */
    this._writer = null;
  }

  /**
   * @param {string} dirPath
   * @param {string} name
   * @return {!Promise<!Bindings.TempFile>}
   */
  static async create(dirPath, name) {
    var file = new Bindings.TempFile();

    await Bindings.TempFile.ensureTempStorageCleared();
    var fs = await new Promise(window.requestFileSystem.bind(window, window.TEMPORARY, 10));
    var dir = await new Promise(fs.root.getDirectory.bind(fs.root, dirPath, {create: true}));
    file._fileEntry = await new Promise(dir.getFile.bind(dir, name, {create: true}));
    var writer = await new Promise(file._fileEntry.createWriter.bind(file._fileEntry));

    if (writer.length) {
      try {
        await new Promise((resolve, reject) => {
          writer.onwriteend = resolve;
          writer.onerror = reject;
          writer.truncate(0);
        });
      } finally {
        writer.onwriteend = null;
        writer.onerror = null;
      }
    }

    file._writer = writer;
    return file;
  }

  /**
   * @return {!Promise}
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
   * @param {!Array<string>} strings
   * @return {!Promise<number>}
   */
  write(strings) {
    var blob = new Blob(strings, {type: 'text/plain'});
    return new Promise(resolve => {
      this._writer.onerror = function(e) {
        Common.console.error('Failed to write into a temp file: ' + e.target.error.message);
        resolve(-1);
      };
      this._writer.onwriteend = e => resolve(e.target.length);
      this._writer.write(blob);
    });
  }

  finishWriting() {
    this._writer = null;
  }

  /**
   * @return {!Promise<?string>}
   */
  read() {
    return this.readRange();
  }

  /**
   * @param {number=} startOffset
   * @param {number=} endOffset
   * @return {!Promise<?string>}
   */
  async readRange(startOffset, endOffset) {
    var file;
    try {
      file = await new Promise(this._fileEntry.file.bind(this._fileEntry));
    } catch (error) {
      Common.console.error('Failed to load temp file: ' + error.message);
      return null;
    }

    if (typeof startOffset === 'number' || typeof endOffset === 'number')
      file = file.slice(/** @type {number} */ (startOffset), /** @type {number} */ (endOffset));

    var reader = new FileReader();
    try {
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } catch (error) {
      Common.console.error('Failed to read from temp file: ' + error.message);
    }

    return reader.result;
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
      this._fileEntry.remove(() => {});
  }
};

Bindings.DeferredTempFile = class {
  /**
   * @param {string} dirPath
   * @param {string} name
   */
  constructor(dirPath, name) {
    /** @type {?Bindings.TempFile} */
    this._tempFile = null;
    this._writeFinished = false;
    /** @type {function(?Bindings.TempFile)} */
    this._writeFinishedResolve;
    this._writeFinishedPromise = new Promise(resolve => this._writeFinishedResolve = resolve);

    this._lastActionPromise =
        Bindings.TempFile.create(dirPath, name)
            .then(
                tempFile => this._tempFile = tempFile,
                error => Common.console.error(`Failed to create temp file ${error.code} : ${error.message}`));
  }

  /**
   * @param {!Array<string>} strings
   * @return {!Promise<number>}
   */
  write(strings) {
    if (this._writeFinished)
      throw new Error('No writes are allowed after close.');

    this._lastActionPromise = this._lastActionPromise.then(async () => {
      if (!this._tempFile)
        return -1;
      var size = await this._tempFile.write(strings);
      if (size === -1) {
        this._tempFile.remove();
        this._tempFile = null;
      }
      return size;
    });

    return this._lastActionPromise;
  }

  /**
   * @return {!Promise<?Bindings.TempFile>}
   */
  async finishWriting() {
    this._writeFinished = true;
    await this._lastActionPromise;
    this._writeFinishedResolve(this._tempFile);
    return this._writeFinishedPromise;
  }

  /**
   * @param {number|undefined} startOffset
   * @param {number|undefined} endOffset
   * @return {!Promise<?string>}
   */
  async readRange(startOffset, endOffset) {
    await this._writeFinishedPromise;
    return this._tempFile ? this._tempFile.readRange(startOffset, endOffset) : null;
  }

  /**
   * @param {!Common.OutputStream} outputStream
   * @param {!Bindings.OutputStreamDelegate} delegate
   */
  async copyToOutputStream(outputStream, delegate) {
    await this._writeFinishedPromise;
    if (this._tempFile)
      this._tempFile.copyToOutputStream(outputStream, delegate);
  }

  async remove() {
    await this._lastActionPromise;
    if (this._tempFile)
      this._tempFile.remove();
    this._tempFile = null;
  }
};

/**
 * @implements {SDK.BackingStorage}
 */
Bindings.TempFileBackingStorage = class {
  /**
   * @param {string} dirName
   */
  constructor(dirName) {
    this._dirName = dirName;
    /** @type {?Bindings.DeferredTempFile} */
    this._file = null;
    /** @type {!Array<string>} */
    this._strings;
    /** @type {number} */
    this._stringsLength;
    /** @type {number} */
    this._fileSize;
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
   * @return {function():!Promise<?string>}
   */
  appendAccessibleString(string) {
    this._flush(false);
    this._strings.push(string);
    var chunk = /** @type {!Bindings.TempFileBackingStorage.Chunk} */ (this._flush(true));

    /**
     * @param {!Bindings.TempFileBackingStorage.Chunk} chunk
     * @param {!Bindings.DeferredTempFile} file
     * @return {!Promise<?string>}
     */
    function readString(chunk, file) {
      if (chunk.string)
        return /** @type {!Promise<?string>} */ (Promise.resolve(chunk.string));

      console.assert(chunk.endOffset);
      if (!chunk.endOffset)
        return Promise.reject('Neither string nor offset to the string in the file were found.');

      return file.readRange(chunk.startOffset, chunk.endOffset);
    }

    return readString.bind(null, chunk, /** @type {!Bindings.DeferredTempFile} */ (this._file));
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

    if (!this._file)
      this._file = new Bindings.DeferredTempFile(this._dirName, String(Date.now()));

    this._stringsLength = 0;
    this._file.write(this._strings.splice(0)).then(fileSize => {
      if (fileSize === -1)
        return;
      if (chunk) {
        chunk.startOffset = this._fileSize;
        chunk.endOffset = fileSize;
        chunk.string = null;
      }
      this._fileSize = fileSize;
    });

    return chunk;
  }

  /**
   * @override
   */
  finishWriting() {
    this._flush(false);
    this._file.finishWriting();
  }

  /**
   * @override
   */
  reset() {
    if (this._file)
      this._file.remove();
    this._file = null;
    /** @type {!Array<string>} */
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
