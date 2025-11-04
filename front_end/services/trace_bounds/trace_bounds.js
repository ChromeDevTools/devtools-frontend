var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/services/trace_bounds/TraceBounds.js
var TraceBounds_exports = {};
__export(TraceBounds_exports, {
  BoundsManager: () => BoundsManager,
  StateChangedEvent: () => StateChangedEvent,
  onChange: () => onChange,
  removeListener: () => removeListener
});
import * as Trace from "./../../models/trace/trace.js";
var instance = null;
var StateChangedEvent = class _StateChangedEvent extends Event {
  state;
  updateType;
  options;
  static eventName = "traceboundsstatechanged";
  constructor(state, updateType, options = { shouldAnimate: false }) {
    super(_StateChangedEvent.eventName, { composed: true, bubbles: true });
    this.state = state;
    this.updateType = updateType;
    this.options = options;
  }
};
function onChange(cb) {
  BoundsManager.instance().addEventListener(
    StateChangedEvent.eventName,
    // Cast the callback as TS doesn't know that these events will emit
    // StateChangedEvent types.
    cb
  );
}
function removeListener(cb) {
  BoundsManager.instance().removeEventListener(StateChangedEvent.eventName, cb);
}
var BoundsManager = class _BoundsManager extends EventTarget {
  static instance(opts = { forceNew: null }) {
    const forceNew = Boolean(opts.forceNew);
    if (!instance || forceNew) {
      instance = new _BoundsManager();
    }
    return instance;
  }
  static removeInstance() {
    instance = null;
  }
  #currentState = null;
  constructor() {
    super();
  }
  resetWithNewBounds(initialBounds) {
    this.#currentState = {
      entireTraceBounds: initialBounds,
      minimapTraceBounds: initialBounds,
      timelineTraceWindow: initialBounds
    };
    this.dispatchEvent(new StateChangedEvent(this.state(), "RESET"));
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
        timelineTraceWindow: timelineTraceWindowMilli
      }
    };
  }
  setMiniMapBounds(newBounds) {
    if (!this.#currentState) {
      console.error("TraceBounds.setMiniMapBounds could not set bounds because there is no existing trace window set.");
      return;
    }
    const existingBounds = this.#currentState.minimapTraceBounds;
    if (newBounds.min === existingBounds.min && newBounds.max === existingBounds.max) {
      return;
    }
    if (newBounds.range < 1e3) {
      return;
    }
    this.#currentState.minimapTraceBounds = newBounds;
    this.dispatchEvent(new StateChangedEvent(this.state(), "MINIMAP_BOUNDS"));
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
    ignoreMiniMapBounds: false
  }) {
    if (!this.#currentState) {
      console.error("TraceBounds.setTimelineVisibleWindow could not set bounds because there is no existing trace window set.");
      return;
    }
    const existingWindow = this.#currentState.timelineTraceWindow;
    if (newWindow.range < 1e3) {
      return;
    }
    if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
      return;
    }
    if (!options.ignoreMiniMapBounds) {
      newWindow.min = Trace.Types.Timing.Micro(Math.max(this.#currentState.minimapTraceBounds.min, newWindow.min));
      newWindow.max = Trace.Types.Timing.Micro(Math.min(this.#currentState.minimapTraceBounds.max, newWindow.max));
    }
    if (newWindow.min === existingWindow.min && newWindow.max === existingWindow.max) {
      return;
    }
    this.#currentState.timelineTraceWindow = newWindow;
    this.dispatchEvent(new StateChangedEvent(this.state(), "VISIBLE_WINDOW", { shouldAnimate: options.shouldAnimate }));
  }
};
export {
  TraceBounds_exports as TraceBounds
};
//# sourceMappingURL=trace_bounds.js.map
