// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

let instance: BoundsManager|null = null;

export class CurrentBoundsChanged extends Event {
  static readonly eventName = 'currentboundschanged';

  constructor(
      public newBounds: TraceEngine.Types.Timing.TraceWindow,
      public newBoundsMilliSeconds: TraceEngine.Types.Timing.TraceWindowMilliSeconds) {
    super(CurrentBoundsChanged.eventName, {composed: true, bubbles: true});
  }
}

export class BoundsManager extends EventTarget {
  static instance(opts: {
    forceNew: boolean|null,
    initialBounds?: TraceEngine.Types.Timing.TraceWindow,
  } = {forceNew: null}): BoundsManager {
    const forceNew = Boolean(opts.forceNew);
    if (!instance || forceNew) {
      if (!opts.initialBounds) {
        throw new Error('Cannot construct a BoundsManager without providing the initial bounds');
      }
      instance = new BoundsManager(opts.initialBounds);
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  static traceWindowFromMilliSeconds(
      min: TraceEngine.Types.Timing.MilliSeconds,
      max: TraceEngine.Types.Timing.MilliSeconds): TraceEngine.Types.Timing.TraceWindow {
    const traceWindow: TraceEngine.Types.Timing.TraceWindow = {
      min: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(min),
      max: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(max),
      range: TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(max - min)),
    };
    return traceWindow;
  }

  // Represents the bounds of the entire trace. Once set, it cannot be changed.
  readonly #entireTraceBounds: TraceEngine.Types.Timing.TraceWindow;
  // Represents the visible bounds that the user is looking at. This can change
  // as the user works with the panel and e.g. zooms or creates breadcrumbs.
  #currentBounds: TraceEngine.Types.Timing.TraceWindow;

  private constructor(initialBounds: TraceEngine.Types.Timing.TraceWindow) {
    super();
    this.#entireTraceBounds = initialBounds;
    this.#currentBounds = initialBounds;
  }

  entireTraceBoundsMicroSeconds(): Readonly<TraceEngine.Types.Timing.TraceWindow> {
    return this.#entireTraceBounds;
  }
  entireTraceBoundsMilliSeconds(): Readonly<TraceEngine.Types.Timing.TraceWindowMilliSeconds> {
    return TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#entireTraceBounds);
  }

  currentBoundsMicroSeconds(): Readonly<TraceEngine.Types.Timing.TraceWindow> {
    return this.#currentBounds;
  }

  currentBoundsMilliSeconds(): Readonly<TraceEngine.Types.Timing.TraceWindowMilliSeconds> {
    return TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#currentBounds);
  }

  setNewBounds(bounds: TraceEngine.Types.Timing.TraceWindow): void {
    if (bounds.min === this.#currentBounds.min && bounds.max === this.#currentBounds.max) {
      // New bounds are identical to the old ones, so we can ignore this update.
      return;
    }

    if (bounds.range < 1000) {
      // Do not let ranges get to less than 1millisecond.
      return;
    }

    this.#currentBounds = bounds;
    this.dispatchEvent(
        new CurrentBoundsChanged(
            this.currentBoundsMicroSeconds(),
            this.currentBoundsMilliSeconds(),
            ),
    );
  }
}
