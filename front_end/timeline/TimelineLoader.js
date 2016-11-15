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
   * @param {!SDK.TracingModel} model
   * @param {!Timeline.TimelineLifecycleDelegate} delegate
   */
  constructor(model, delegate) {
    this._model = model;
    this._delegate = delegate;

    /** @type {?function()} */
    this._canceledCallback = null;

    this._state = Timeline.TimelineLoader.State.Initial;
    this._buffer = '';
    this._firstChunk = true;

    this._loadedBytes = 0;
    /** @type {number} */
    this._totalSize;
    this._jsonTokenizer = new Common.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
  }

  /**
   * @param {!SDK.TracingModel} model
   * @param {!File} file
   * @param {!Timeline.TimelineLifecycleDelegate} delegate
   * @return {!Timeline.TimelineLoader}
   */
  static loadFromFile(model, file, delegate) {
    var loader = new Timeline.TimelineLoader(model, delegate);
    var fileReader = Timeline.TimelineLoader._createFileReader(file, loader);
    loader._canceledCallback = fileReader.cancel.bind(fileReader);
    loader._totalSize = file.size;
    fileReader.start(loader);
    return loader;
  }

  /**
   * @param {!SDK.TracingModel} model
   * @param {string} url
   * @param {!Timeline.TimelineLifecycleDelegate} delegate
   * @return {!Timeline.TimelineLoader}
   */
  static loadFromURL(model, url, delegate) {
    var stream = new Timeline.TimelineLoader(model, delegate);
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
    this._model.reset();
    this._delegate.loadingComplete(false);
    this._delegate = null;
    if (this._canceledCallback)
      this._canceledCallback();
  }

  /**
   * @override
   * @param {string} chunk
   */
  write(chunk) {
    if (!this._delegate)
      return;
    this._loadedBytes += chunk.length;
    if (!this._firstChunk)
      this._delegate.loadingProgress(this._totalSize ? this._loadedBytes / this._totalSize : undefined);

    if (this._state === Timeline.TimelineLoader.State.Initial) {
      if (chunk[0] === '{') {
        this._state = Timeline.TimelineLoader.State.LookingForEvents;
      } else if (chunk[0] === '[') {
        this._state = Timeline.TimelineLoader.State.ReadingEvents;
      } else {
        this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline data: Unknown JSON format'));
        return;
      }
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

    if (this._firstChunk) {
      this._delegate.loadingStarted();
    } else {
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
      this._model.reset();
      if (this._looksLikeAppVersion(items[0])) {
        this._reportErrorAndCancelLoading(Common.UIString('Legacy Timeline format is not supported.'));
        return;
      }
    }

    try {
      this._model.addEvents(items);
    } catch (e) {
      this._reportErrorAndCancelLoading(Common.UIString('Malformed timeline data: %s', e.toString()));
      return;
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
    this._model.tracingComplete();
    if (this._delegate)
      this._delegate.loadingComplete(true);
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
};


Timeline.TimelineLoader.TransferChunkLengthBytes = 5000000;


/**
 * @enum {symbol}
 */
Timeline.TimelineLoader.State = {
  Initial: Symbol('Initial'),
  LookingForEvents: Symbol('LookingForEvents'),
  ReadingEvents: Symbol('ReadingEvents'),
  SkippingTail: Symbol('SkippingTail')
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
