// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import {TracingModel, type Event, type ObjectSnapshot} from './TracingModel.js';

export class FilmStripModel {
  #framesInternal: Frame[];
  #zeroTimeInternal: number;
  #spanTimeInternal: number;
  constructor(tracingModel: TracingModel, zeroTime?: number) {
    this.#framesInternal = [];
    this.#zeroTimeInternal = 0;
    this.#spanTimeInternal = 0;

    this.reset(tracingModel, zeroTime);
  }

  reset(tracingModel: TracingModel, zeroTime?: number): void {
    this.#zeroTimeInternal = zeroTime || tracingModel.minimumRecordTime();
    this.#spanTimeInternal = tracingModel.maximumRecordTime() - this.#zeroTimeInternal;

    this.#framesInternal = [];
    const browserMain = TracingModel.browserMainThread(tracingModel);
    if (!browserMain) {
      return;
    }

    const events = browserMain.events();
    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (event.startTime < this.#zeroTimeInternal) {
        continue;
      }
      if (!event.hasCategory(category)) {
        continue;
      }
      if (event.name === TraceEvents.CaptureFrame) {
        const data = event.args['data'];
        if (data) {
          this.#framesInternal.push(Frame.fromEvent(this, event, this.#framesInternal.length));
        }
      } else if (event.name === TraceEvents.Screenshot) {
        this.#framesInternal.push(Frame.fromSnapshot(this, (event as ObjectSnapshot), this.#framesInternal.length));
      }
    }
  }

  frames(): Frame[] {
    return this.#framesInternal;
  }

  zeroTime(): number {
    return this.#zeroTimeInternal;
  }

  spanTime(): number {
    return this.#spanTimeInternal;
  }

  frameByTimestamp(timestamp: number): Frame|null {
    const index = Platform.ArrayUtilities.upperBound(
                      this.#framesInternal, timestamp, (timestamp, frame) => timestamp - frame.timestamp) -
        1;
    return index >= 0 ? this.#framesInternal[index] : null;
  }
}

const category = 'disabled-by-default-devtools.screenshot';

const TraceEvents = {
  CaptureFrame: 'CaptureFrame',
  Screenshot: 'Screenshot',
};

export class Frame {
  readonly #modelInternal: FilmStripModel;
  timestamp: number;
  index: number;
  #imageData: string|null;
  #snapshot: ObjectSnapshot|null;
  constructor(model: FilmStripModel, timestamp: number, index: number) {
    this.#modelInternal = model;
    this.timestamp = timestamp;
    this.index = index;
    this.#imageData = null;
    this.#snapshot = null;
  }

  static fromEvent(model: FilmStripModel, event: Event, index: number): Frame {
    const frame = new Frame(model, event.startTime, index);
    frame.#imageData = event.args['data'];
    return frame;
  }

  static fromSnapshot(model: FilmStripModel, snapshot: ObjectSnapshot, index: number): Frame {
    const frame = new Frame(model, snapshot.startTime, index);
    frame.#snapshot = snapshot;
    return frame;
  }

  model(): FilmStripModel {
    return this.#modelInternal;
  }

  imageDataPromise(): Promise<string|null> {
    if (this.#imageData || !this.#snapshot) {
      return Promise.resolve(this.#imageData);
    }

    return this.#snapshot.objectPromise() as Promise<string|null>;
  }
}
