// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Common.OutputStream}
 * @implements {Bindings.OutputStreamDelegate}
 * @unrestricted
 */
Timeline.TimelineLoader = class {
  /**
   * @param {!Timeline.TimelineLoader.Client} client
   */
  constructor(client) {
    this._client = client;

    this._backingStorage = new Bindings.TempFileBackingStorage('tracing');
    this._tracingModel = new SDK.TracingModel(this._backingStorage);

    /** @type {?function()} */
    this._canceledCallback = null;
    this._state = Timeline.TimelineLoader.State.Initial;
    this._buffer = '';
    this._firstRawChunk = true;
    this._firstChunk = true;

    this._loadedBytes = 0;
    /** @type {number} */
    this._totalSize;
    this._jsonTokenizer = new Common.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
  }

  /**
   * @param {!File} file
   * @param {!Timeline.TimelineLoader.Client} client
   * @return {!Timeline.TimelineLoader}
   */
  static loadFromFile(file, client) {
    var loader = new Timeline.TimelineLoader(client);
    var fileReader = Timeline.TimelineLoader._createFileReader(file, loader);
    loader._canceledCallback = fileReader.cancel.bind(fileReader);
    loader._totalSize = file.size;
    fileReader.start(loader);
    return loader;
  }

  /**
   * @param {string} url
   * @param {!Timeline.TimelineLoader.Client} client
   * @return {!Timeline.TimelineLoader}
   */
  static loadFromURL(url, client) {
    var stream = new Timeline.TimelineLoader(client);
    Host.ResourceLoader.loadAsStream(url, null, stream);
    return stream;
  }

  /**
   * @param {!File} file
   * @param {!Bindings.OutputStreamDelegate} delegate
   * @return {!Bindings.ChunkedReader}
   */
  static _createFileReader(file, delegate) {
    return new Bindings.ChunkedFileReader(file, Timeline.TimelineLoader.TransferChunkLengthBytes, delegate);
  }

  cancel() {
    this._tracingModel = null;
    this._backingStorage.reset();
    this._client.loadingComplete(null, null);
    this._client = null;
    if (this._canceledCallback)
      this._canceledCallback();
  }

  /**
   * @override
   * @param {string} chunk
   */
  write(chunk) {
    if (!this._client)
      return;
    this._loadedBytes += chunk.length;
    if (this._firstRawChunk)
      this._client.loadingStarted();
    else
      this._client.loadingProgress(this._totalSize ? this._loadedBytes / this._totalSize : undefined);
    this._firstRawChunk = false;

    if (this._state === Timeline.TimelineLoader.State.Initial) {
      if (chunk.startsWith('{"nodes":[')) {
        this._state = Timeline.TimelineLoader.State.LoadingCPUProfileFormat;
      } else if (chunk[0] === '{') {
        this._state = Timeline.TimelineLoader.State.LookingForEvents;
      } else if (chunk[0] === '[') {
        this._state = Timeline.TimelineLoader.State.ReadingEvents;
      } else {
        this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline data: Unknown JSON format'));
        return;
      }
    }

    if (this._state === Timeline.TimelineLoader.State.LoadingCPUProfileFormat) {
      this._buffer += chunk;
      return;
    }

    if (this._state === Timeline.TimelineLoader.State.LookingForEvents) {
      var objectName = '"traceEvents":';
      var startPos = this._buffer.length - objectName.length;
      this._buffer += chunk;
      var pos = this._buffer.indexOf(objectName, startPos);
      if (pos === -1)
        return;
      chunk = this._buffer.slice(pos + objectName.length);
      this._state = Timeline.TimelineLoader.State.ReadingEvents;
    }

    if (this._state !== Timeline.TimelineLoader.State.ReadingEvents)
      return;
    if (this._jsonTokenizer.write(chunk))
      return;
    this._state = Timeline.TimelineLoader.State.SkippingTail;
    if (this._firstChunk) {
      this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline input, wrong JSON brackets balance'));
      return;
    }
  }

  /**
   * @param {string} data
   */
  _writeBalancedJSON(data) {
    var json = data + ']';

    if (!this._firstChunk) {
      var commaIndex = json.indexOf(',');
      if (commaIndex !== -1)
        json = json.slice(commaIndex + 1);
      json = '[' + json;
    }

    var items;
    try {
      items = /** @type {!Array.<!SDK.TracingManager.EventPayload>} */ (JSON.parse(json));
    } catch (e) {
      this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline data: %s', e.toString()));
      return;
    }

    if (this._firstChunk) {
      this._firstChunk = false;
      if (this._looksLikeAppVersion(items[0])) {
        this._reportErrorAndCancelLoading(Common.UIString('Legacy Timeline format is not supported.'));
        return;
      }
    }

    try {
      this._tracingModel.addEvents(items);
    } catch (e) {
      this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline data: %s', e.toString()));
    }
  }

  /**
   * @param {string=} message
   */
  _reportErrorAndCancelLoading(message) {
    if (message)
      Common.console.error(message);
    this.cancel();
  }

  /**
   * @param {*} item
   * @return {boolean}
   */
  _looksLikeAppVersion(item) {
    return typeof item === 'string' && item.indexOf('Chrome') !== -1;
  }

  /**
   * @override
   */
  close() {
    if (!this._client)
      return;
    this._client.processingStarted();
    setTimeout(() => this._finalizeTrace(), 0);
  }

  _finalizeTrace() {
    if (this._state === Timeline.TimelineLoader.State.LoadingCPUProfileFormat) {
      this._parseCPUProfileFormat(this._buffer);
      this._buffer = '';
    }
    this._tracingModel.tracingComplete();
    this._client.loadingComplete(this._tracingModel, this._backingStorage);
  }

  /**
   * @override
   */
  onTransferStarted() {
  }

  /**
   * @override
   * @param {!Bindings.ChunkedReader} reader
   */
  onChunkTransferred(reader) {
  }

  /**
   * @override
   */
  onTransferFinished() {
  }

  /**
   * @override
   * @param {!Bindings.ChunkedReader} reader
   * @param {!Event} event
   */
  onError(reader, event) {
    switch (event.target.error.name) {
      case 'NotFoundError':
        this._reportErrorAndCancelLoading(Common.UIString('File "%s" not found.', reader.fileName()));
        break;
      case 'NotReadableError':
        this._reportErrorAndCancelLoading(Common.UIString('File "%s" is not readable', reader.fileName()));
        break;
      case 'AbortError':
        break;
      default:
        this._reportErrorAndCancelLoading(
            Common.UIString('An error occurred while reading the file "%s"', reader.fileName()));
    }
  }

  /**
   * @param {string} text
   */
  _parseCPUProfileFormat(text) {
    var traceEvents;
    try {
      var profile = JSON.parse(text);
      traceEvents = TimelineModel.TimelineJSProfileProcessor.buildTraceProfileFromCpuProfile(profile);
    } catch (e) {
      this._reportErrorAndCancelLoading(Common.UIString('Malformed CPU profile format'));
      return;
    }
    this._tracingModel.addEvents(traceEvents);
  }
};


Timeline.TimelineLoader.TransferChunkLengthBytes = 5000000;

/**
 * @interface
 */
Timeline.TimelineLoader.Client = function() {};

Timeline.TimelineLoader.Client.prototype = {
  loadingStarted() {},

  /**
   * @param {number=} progress
   */
  loadingProgress(progress) {},

  processingStarted() {},

  /**
   * @param {?SDK.TracingModel} tracingModel
   * @param {?Bindings.TempFileBackingStorage} backingStorage
   */
  loadingComplete(tracingModel, backingStorage) {},
};

/**
 * @enum {symbol}
 */
Timeline.TimelineLoader.State = {
  Initial: Symbol('Initial'),
  LookingForEvents: Symbol('LookingForEvents'),
  ReadingEvents: Symbol('ReadingEvents'),
  SkippingTail: Symbol('SkippingTail'),
  LoadingCPUProfileFormat: Symbol('LoadingCPUProfileFormat')
};

/**
 * @implements {Bindings.OutputStreamDelegate}
 * @unrestricted
 */
Timeline.TracingTimelineSaver = class {
  /**
   * @override
   */
  onTransferStarted() {
  }

  /**
   * @override
   */
  onTransferFinished() {
  }

  /**
   * @override
   * @param {!Bindings.ChunkedReader} reader
   */
  onChunkTransferred(reader) {
  }

  /**
   * @override
   * @param {!Bindings.ChunkedReader} reader
   * @param {!Event} event
   */
  onError(reader, event) {
    var error = event.target.error;
    Common.console.error(
        Common.UIString('Failed to save timeline: %s (%s, %s)', error.message, error.name, error.code));
  }
};
