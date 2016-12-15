// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Extensions.TracingSession}
 * @implements {Timeline.LoaderClient}
 */
Timeline.ExtensionTracingSession = class {
  /**
   * @param {!Extensions.ExtensionTraceProvider} provider
   * @param {!Timeline.TimelineLifecycleDelegate} delegate
   */
  constructor(provider, delegate) {
    this._provider = provider;
    this._delegate = delegate;
    this._sessionGeneration = delegate.sessionGeneration();
    /** @type {function()} */
    this._completionCallback;
    this._completionPromise = new Promise(fulfill => {this._completionCallback = fulfill;});
    /** @type {?SDK.TracingModel} */
    this._tracingModel = null;
    /** @type {number} */
    this._timeOffset = 0;
  }

  /** @override */
  loadingStarted() {
  }

  /**
   * @override
   * @param {number=} progress
   */
  loadingProgress(progress) {
  }

  /**
   * @override
   * @param {boolean} success
   */
  loadingComplete(success) {
    if (!success || this._sessionGeneration !== this._delegate.sessionGeneration()) {
      this._tracingModel.reset();
    } else {
      this._delegate.addExtensionEvents(
          this._provider.longDisplayName(),
          /** @type {!SDK.TracingModel} */ (this._tracingModel), this._timeOffset);
    }
    this._completionCallback();
  }

  /**
   * @override
   * @param {string} url
   * @param {number} timeOffsetMicroseconds
   */
  complete(url, timeOffsetMicroseconds) {
    if (!url || this._sessionGeneration !== this._delegate.sessionGeneration()) {
      this._completionCallback();
      return;
    }
    var storage = new Bindings.TempFileBackingStorage('tracing');
    this._tracingModel = new SDK.TracingModel(storage);
    this._timeOffset = timeOffsetMicroseconds;
    Timeline.TimelineLoader.loadFromURL(this._tracingModel, url, this);
  }

  start() {
    this._provider.start(this);
  }

  /** @return {!Promise<string>} */
  stop() {
    this._provider.stop();
    return this._completionPromise;
  }
};
