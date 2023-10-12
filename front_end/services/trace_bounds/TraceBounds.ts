// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../models/trace/trace.js';

let instance: BoundsManager|null = null;

export class TimelineVisibleWindowChanged extends Event {
  static readonly eventName = 'timelinevisiblewindowchanged';

  constructor(public state: Readonly<TraceWindows>, public shouldAnimate: boolean) {
    super(TimelineVisibleWindowChanged.eventName, {composed: true, bubbles: true});
  }
}

export class MiniMapBoundsChanged extends Event {
  static readonly eventName = 'minimapboundschanged';

  constructor(
      public state: Readonly<TraceWindows>,
  ) {
    super(MiniMapBoundsChanged.eventName, {composed: true, bubbles: true});
  }
}

export interface TraceWindows {
  /**
   * This is the bounds of the entire trace. Once a trace is imported/recorded
   * and this is set, it cannot be changed.
   */
  readonly entireTraceBounds: TraceEngine.Types.Timing.TraceWindow;
  /**
   * This is the bounds of the minimap and represents the left and right bound
   * being shown by the minimap. It can be changed by a user action: for
   * example, when a user creates a breadcrumb, that breadcrumb becomes the
   * minimap trace bounds. By default, and when a trace is first loaded, the
   * minimapTraceBounds are equivalent to the entireTraceBounds.
   */
  minimapTraceBounds: TraceEngine.Types.Timing.TraceWindow;
  /**
   * This represents the trace window that is being shown on the main timeline.
   * The reason this is called a "Window" rather than "Bounds" is because the
   * user is not bound by this value - they can use their mouse to pan/zoom
   * in/out beyond the limits of this window (the limit is the
   * minimapTraceBounds). Another way to think of this value is that the
   * min/max of this value is what is represented by the two drag handles on
   * the TimelineMiniMap that the user can drag to change their current window.
   */
  timelineTraceWindow: TraceEngine.Types.Timing.TraceWindow;
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

  #currentState: TraceWindows;

  private constructor(initialBounds: TraceEngine.Types.Timing.TraceWindow) {
    super();
    this.#currentState = {
      entireTraceBounds: initialBounds,
      minimapTraceBounds: initialBounds,
      timelineTraceWindow: initialBounds,
    };
  }

  get state(): Readonly<TraceWindows> {
    return this.#currentState;
  }

  setMiniMapBounds(newBounds: TraceEngine.Types.Timing.TraceWindow): void {
    const existingBounds = this.#currentState.minimapTraceBounds;
    if (newBounds.min === existingBounds.min && newBounds.max === existingBounds.max) {
      // New bounds are identical to the old ones so no action required.
      return;
    }

    if (newBounds.range < 5_000) {
      // Minimum minimap bounds range is 5 milliseconds.
      return;
    }

    this.#currentState.minimapTraceBounds = newBounds;
    this.dispatchEvent(new MiniMapBoundsChanged(this.#currentState));
  }

  setTimelineVisibleWindow(newWindow: TraceEngine.Types.Timing.TraceWindow, options: {
    shouldAnimate: boolean,
  } = {
    shouldAnimate: false,
  }): void {
    const existingWindow = this.#currentState.timelineTraceWindow;
    if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
      // New bounds are identical to the old ones so no action required.
      return;
    }

    if (newWindow.range < 1_000) {
      // Minimum timeline visible window range is 1 millisecond.
      return;
    }

    this.#currentState.timelineTraceWindow = newWindow;

    this.dispatchEvent(new TimelineVisibleWindowChanged(this.#currentState, options.shouldAnimate));
  }
}
