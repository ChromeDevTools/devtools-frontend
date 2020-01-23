// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Event, ObjectSnapshot, TracingModel} from './TracingModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class FilmStripModel {
  /**
   * @param {!TracingModel} tracingModel
   * @param {number=} zeroTime
   */
  constructor(tracingModel, zeroTime) {
    this.reset(tracingModel, zeroTime);
  }

  /**
   * @param {!TracingModel} tracingModel
   * @param {number=} zeroTime
   */
  reset(tracingModel, zeroTime) {
    this._zeroTime = zeroTime || tracingModel.minimumRecordTime();
    this._spanTime = tracingModel.maximumRecordTime() - this._zeroTime;

    /** @type {!Array<!Frame>} */
    this._frames = [];
    const browserMain = TracingModel.browserMainThread(tracingModel);
    if (!browserMain) {
      return;
    }

    const events = browserMain.events();
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (event.startTime < this._zeroTime) {
        continue;
      }
      if (!event.hasCategory(_category)) {
        continue;
      }
      if (event.name === TraceEvents.CaptureFrame) {
        const data = event.args['data'];
        if (data) {
          this._frames.push(Frame._fromEvent(this, event, this._frames.length));
        }
      } else if (event.name === TraceEvents.Screenshot) {
        this._frames.push(Frame._fromSnapshot(this, /** @type {!ObjectSnapshot} */ (event), this._frames.length));
      }
    }
  }

  /**
   * @return {!Array<!Frame>}
   */
  frames() {
    return this._frames;
  }

  /**
   * @return {number}
   */
  zeroTime() {
    return this._zeroTime;
  }

  /**
   * @return {number}
   */
  spanTime() {
    return this._spanTime;
  }

  /**
   * @param {number} timestamp
   * @return {?Frame}
   */
  frameByTimestamp(timestamp) {
    const index = this._frames.upperBound(timestamp, (timestamp, frame) => timestamp - frame.timestamp) - 1;
    return index >= 0 ? this._frames[index] : null;
  }
}

const _category = 'disabled-by-default-devtools.screenshot';

const TraceEvents = {
  CaptureFrame: 'CaptureFrame',
  Screenshot: 'Screenshot'
};

/**
 * @unrestricted
 */
export class Frame {
  /**
   * @param {!FilmStripModel} model
   * @param {number} timestamp
   * @param {number} index
   */
  constructor(model, timestamp, index) {
    this._model = model;
    this.timestamp = timestamp;
    this.index = index;
    /** @type {?string} */
    this._imageData = null;
    /** @type {?ObjectSnapshot} */
    this._snapshot = null;
  }

  /**
   * @param {!FilmStripModel} model
   * @param {!Event} event
   * @param {number} index
   * @return {!Frame}
   */
  static _fromEvent(model, event, index) {
    const frame = new Frame(model, event.startTime, index);
    frame._imageData = event.args['data'];
    return frame;
  }

  /**
   * @param {!FilmStripModel} model
   * @param {!ObjectSnapshot} snapshot
   * @param {number} index
   * @return {!Frame}
   */
  static _fromSnapshot(model, snapshot, index) {
    const frame = new Frame(model, snapshot.startTime, index);
    frame._snapshot = snapshot;
    return frame;
  }

  /**
   * @return {!FilmStripModel}
   */
  model() {
    return this._model;
  }

  /**
   * @return {!Promise<?string>}
   */
  imageDataPromise() {
    if (this._imageData || !this._snapshot) {
      return Promise.resolve(this._imageData);
    }

    return /** @type {!Promise<?string>} */ (this._snapshot.objectPromise());
  }
}
