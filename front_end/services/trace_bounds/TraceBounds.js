// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../models/trace/trace.js';
let instance = null;
export class StateChangedEvent extends Event {
    state;
    updateType;
    options;
    static eventName = 'traceboundsstatechanged';
    constructor(state, updateType, options = { shouldAnimate: false }) {
        super(StateChangedEvent.eventName, { composed: true, bubbles: true });
        this.state = state;
        this.updateType = updateType;
        this.options = options;
    }
}
/**
 * Exposed as a shortcut to BoundsManager.instance().addEventListener, which
 * also takes care of type-casting the event to StateChangedEvent.
 **/
export function onChange(cb) {
    BoundsManager.instance().addEventListener(StateChangedEvent.eventName, 
    // Cast the callback as TS doesn't know that these events will emit
    // StateChangedEvent types.
    cb);
}
export function removeListener(cb) {
    BoundsManager.instance().removeEventListener(StateChangedEvent.eventName, cb);
}
export class BoundsManager extends EventTarget {
    static instance(opts = { forceNew: null }) {
        const forceNew = Boolean(opts.forceNew);
        if (!instance || forceNew) {
            instance = new BoundsManager();
        }
        return instance;
    }
    static removeInstance() {
        instance = null;
    }
    #currentState = null;
    constructor() {
        // Defined to enable us to mark it as Private.
        super();
    }
    resetWithNewBounds(initialBounds) {
        this.#currentState = {
            entireTraceBounds: initialBounds,
            minimapTraceBounds: initialBounds,
            timelineTraceWindow: initialBounds,
        };
        this.dispatchEvent(new StateChangedEvent(this.state(), 'RESET'));
        return this;
    }
    state() {
        if (this.#currentState === null) {
            return null;
        }
        const entireBoundsMilli = Trace.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.entireTraceBounds);
        const minimapBoundsMilli = Trace.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.minimapTraceBounds);
        const timelineTraceWindowMilli = Trace.Helpers.Timing.traceWindowMilliSeconds(this.#currentState.timelineTraceWindow);
        return {
            micro: this.#currentState,
            milli: {
                entireTraceBounds: entireBoundsMilli,
                minimapTraceBounds: minimapBoundsMilli,
                timelineTraceWindow: timelineTraceWindowMilli,
            },
        };
    }
    setMiniMapBounds(newBounds) {
        if (!this.#currentState) {
            // If we don't have the existing state and know the trace bounds, we
            // cannot set the minimap bounds.
            console.error('TraceBounds.setMiniMapBounds could not set bounds because there is no existing trace window set.');
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
        this.dispatchEvent(new StateChangedEvent(this.state(), 'MINIMAP_BOUNDS'));
    }
    /**
     * Updates the visible part of the trace that the user can see.
     * @param options.ignoreMiniMapBounds by default the visible window will be
     * bound by the minimap bounds. If you set this to `true` then the timeline
     * visible window will not be constrained by the minimap bounds. Be careful
     * with this! Unless you deal with this situation, the UI of the performance
     * panel will break.
     */
    setTimelineVisibleWindow(newWindow, options = {
        shouldAnimate: false,
        ignoreMiniMapBounds: false,
    }) {
        if (!this.#currentState) {
            // This is a weird state to be in: we can't change the visible timeline
            // window if we don't already have an existing state with the trace
            // bounds set.
            console.error('TraceBounds.setTimelineVisibleWindow could not set bounds because there is no existing trace window set.');
            return;
        }
        const existingWindow = this.#currentState.timelineTraceWindow;
        if (newWindow.range < 1_000) {
            // Minimum timeline visible window range is 1 millisecond.
            return;
        }
        if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
            // New bounds are identical to the old ones so no action required.
            return;
        }
        if (!options.ignoreMiniMapBounds) {
            // Ensure that the setTimelineVisibleWindow can never go outside the bounds of the minimap bounds.
            newWindow.min = Trace.Types.Timing.Micro(Math.max(this.#currentState.minimapTraceBounds.min, newWindow.min));
            newWindow.max = Trace.Types.Timing.Micro(Math.min(this.#currentState.minimapTraceBounds.max, newWindow.max));
        }
        if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
            // If, after we adjust for the minimap bounds, the new window matches the
            // old one, we can exit as no action is required.
            return;
        }
        this.#currentState.timelineTraceWindow = newWindow;
        this.dispatchEvent(new StateChangedEvent(this.state(), 'VISIBLE_WINDOW', { shouldAnimate: options.shouldAnimate }));
    }
}
//# sourceMappingURL=TraceBounds.js.map