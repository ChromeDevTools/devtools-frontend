// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

let instance: BoundsManager|null = null;

export class StateChangedEvent extends Event {
  static readonly eventName = 'traceboundsstatechanged';
  constructor(
      public state: Readonly<State>,
      public updateType: 'RESET'|'MINIMAP_BOUNDS'|'VISIBLE_WINDOW',
      public options: {
        shouldAnimate?: boolean,
      } = {shouldAnimate: false},
  ) {
    super(StateChangedEvent.eventName, {composed: true, bubbles: true});
  }
}

// Exposed as a shortcut to BoundsManager.instance().addEventListener, which
// also takes care of type-casting the event to StateChangedEvent.
export function onChange(cb: (event: StateChangedEvent) => void): void {
  BoundsManager.instance().addEventListener(
      StateChangedEvent.eventName,
      // Cast the callback as TS doesn't know that these events will emit
      // StateChangedEvent types.
      cb as (event: Event) => void);
}

export function removeListener(cb: (event: StateChangedEvent) => void): void {
  BoundsManager.instance().removeEventListener(StateChangedEvent.eventName, cb as (event: Event) => void);
}

export interface State {
  readonly micro: Readonly<TraceWindows<TraceEngine.Types.Timing.MicroSeconds>>;
  readonly milli: Readonly<TraceWindows<TraceEngine.Types.Timing.MilliSeconds>>;
}

export interface TraceWindows<TimeFormat extends TraceEngine.Types.Timing.MicroSeconds|
                                                 TraceEngine.Types.Timing.MilliSeconds> {
  /**
   * This is the bounds of the entire trace. Once a trace is imported/recorded
   * and this is set, it cannot be changed.
   */
  readonly entireTraceBounds: TraceEngine.Types.Timing.TraceWindow<TimeFormat>;
  /**
   * This is the bounds of the minimap and represents the left and right bound
   * being shown by the minimap. It can be changed by a user action: for
   * example, when a user creates a breadcrumb, that breadcrumb becomes the
   * minimap trace bounds. By default, and when a trace is first loaded, the
   * minimapTraceBounds are equivalent to the entireTraceBounds.
   * Note that this is NOT the active time window that the user has dragged
   * the minimap handles to; this is the min/max being shown by the minimap.
   */
  minimapTraceBounds: TraceEngine.Types.Timing.TraceWindow<TimeFormat>;
  /**
   * This represents the trace window that is being shown on the main timeline.
   * The reason this is called a "Window" rather than "Bounds" is because the
   * user is not bound by this value - they can use their mouse to pan/zoom
   * in/out beyond the limits of this window (the limit is the
   * minimapTraceBounds). Another way to think of this value is that the
   * min/max of this value is what is represented by the two drag handles on
   * the TimelineMiniMap that the user can drag to change their current window.
   */
  timelineTraceWindow: TraceEngine.Types.Timing.TraceWindow<TimeFormat>;
}

export class BoundsManager extends EventTarget {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): BoundsManager {
    const forceNew = Boolean(opts.forceNew);
    if (!instance || forceNew) {
      instance = new BoundsManager();
    }
    return instance;
  }

  static removeInstance(): void {
    instance = null;
  }

  #currentState: TraceWindows<TraceEngine.Types.Timing.MicroSeconds>|null = null;

  private constructor() {
    // Defined to enable us to mark it as Private.
    super();
  }

  resetWithNewBounds(initialBounds: TraceEngine.Types.Timing.TraceWindowMicroSeconds): this {
    this.#currentState = {
      entireTraceBounds: initialBounds,
      minimapTraceBounds: initialBounds,
      timelineTraceWindow: initialBounds,
    };
    this.dispatchEvent(new StateChangedEvent(this.state() as State, 'RESET'));
    return this;
  }

  state(): Readonly<State>|null {
    if (this.#currentState === null) {
      return null;
    }
    const entireBoundsMilli = TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.entireTraceBounds);
    const minimapBoundsMilli =
        TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.minimapTraceBounds);
    const timelineTraceWindowMilli =
        TraceEngine.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.timelineTraceWindow);

    return {
      micro: this.#currentState,
      milli: {
        entireTraceBounds: entireBoundsMilli,
        minimapTraceBounds: minimapBoundsMilli,
        timelineTraceWindow: timelineTraceWindowMilli,
      },
    };
  }

  setMiniMapBounds(newBounds: TraceEngine.Types.Timing.TraceWindowMicroSeconds): void {
    if (!this.#currentState) {
      // If we don't have the existing state and know the trace bounds, we cannot set the minimap bounds.
      return;
    }
    const existingBounds = this.#currentState.minimapTraceBounds;
    if (newBounds.min === existingBounds.min && newBounds.max === existingBounds.max) {
      // New bounds are identical to the old ones so no action required.
      return;
    }

    if (newBounds.range < 1_000) {
      // Minimum minimap bounds range is 1 millisecond.
      return;
    }

    this.#currentState.minimapTraceBounds = newBounds;
    // this.state() cannot be null here.
    this.dispatchEvent(new StateChangedEvent(this.state() as State, 'MINIMAP_BOUNDS'));
  }

  setTimelineVisibleWindow(newWindow: TraceEngine.Types.Timing.TraceWindowMicroSeconds, options: {
    shouldAnimate: boolean,
  } = {
    shouldAnimate: false,
  }): void {
    if (!this.#currentState) {
      return;
    }
    const existingWindow = this.#currentState.timelineTraceWindow;
    if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
      // New bounds are identical to the old ones so no action required.
      return;
    }

    if (newWindow.range < 1_000) {
      // Minimum timeline visible window range is 1 millisecond.
      return;
    }

    // Ensure that the setTimelineVisibleWindow can never go outside the bounds of the minimap bounds.
    newWindow.min =
        TraceEngine.Types.Timing.MicroSeconds(Math.max(this.#currentState.minimapTraceBounds.min, newWindow.min));
    newWindow.max =
        TraceEngine.Types.Timing.MicroSeconds(Math.min(this.#currentState.minimapTraceBounds.max, newWindow.max));

    this.#currentState.timelineTraceWindow = newWindow;
    this.dispatchEvent(
        new StateChangedEvent(this.state() as State, 'VISIBLE_WINDOW', {shouldAnimate: options.shouldAnimate}));
  }
}
