var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/services/tracing/FreshRecording.js
var FreshRecording_exports = {};
__export(FreshRecording_exports, {
  Tracker: () => Tracker
});
var instance = null;
var Tracker = class _Tracker {
  #freshRecordings = /* @__PURE__ */ new WeakSet();
  static instance(opts = { forceNew: false }) {
    if (!instance || opts.forceNew) {
      instance = new _Tracker();
    }
    return instance;
  }
  registerFreshRecording(data) {
    this.#freshRecordings.add(data);
  }
  recordingIsFresh(data) {
    return this.#freshRecordings.has(data);
  }
  recordingIsFreshOrEnhanced(data) {
    return this.#freshRecordings.has(data) || data.metadata.enhancedTraceVersion !== void 0;
  }
};

// gen/front_end/services/tracing/PerformanceTracing.js
var PerformanceTracing_exports = {};
__export(PerformanceTracing_exports, {
  PerformanceTracing: () => PerformanceTracing,
  RawTraceEvents: () => RawTraceEvents
});

// gen/front_end/services/tracing/TracingManager.js
var TracingManager_exports = {};
__export(TracingManager_exports, {
  TracingManager: () => TracingManager
});
import * as SDK from "./../../core/sdk/sdk.js";
var TracingManager = class extends SDK.SDKModel.SDKModel {
  #tracingAgent;
  #activeClient;
  #eventsRetrieved;
  #finishing;
  constructor(target) {
    super(target);
    this.#tracingAgent = target.tracingAgent();
    target.registerTracingDispatcher(new TracingDispatcher(this));
    this.#activeClient = null;
    this.#eventsRetrieved = 0;
  }
  bufferUsage(usage, percentFull) {
    if (this.#activeClient) {
      this.#activeClient.tracingBufferUsage(usage || percentFull || 0);
    }
  }
  eventsCollected(events) {
    if (!this.#activeClient) {
      return;
    }
    this.#activeClient.traceEventsCollected(events);
    this.#eventsRetrieved += events.length;
    const progress = Math.min(this.#eventsRetrieved / 9e5 + 0.15, 0.9);
    this.#activeClient.eventsRetrievalProgress(progress);
  }
  tracingComplete() {
    this.#eventsRetrieved = 0;
    if (this.#activeClient) {
      this.#activeClient.tracingComplete();
      this.#activeClient = null;
    }
    this.#finishing = false;
  }
  async reset() {
    if (this.#activeClient) {
      await this.#tracingAgent.invoke_end();
    }
    this.#eventsRetrieved = 0;
    this.#activeClient = null;
    this.#finishing = false;
  }
  async start(client, categoryFilter) {
    if (this.#activeClient) {
      throw new Error("Tracing is already started");
    }
    const bufferUsageReportingIntervalMs = 500;
    this.#activeClient = client;
    const args = {
      bufferUsageReportingInterval: bufferUsageReportingIntervalMs,
      transferMode: "ReportEvents",
      traceConfig: {
        recordMode: "recordUntilFull",
        traceBufferSizeInKb: 1200 * 1e3,
        includedCategories: categoryFilter.split(",")
      }
    };
    const response = await this.#tracingAgent.invoke_start(args);
    if (response.getError()) {
      this.#activeClient = null;
    }
    return response;
  }
  stop() {
    if (!this.#activeClient) {
      throw new Error("Tracing is not started");
    }
    if (this.#finishing) {
      throw new Error("Tracing is already being stopped");
    }
    this.#finishing = true;
    void this.#tracingAgent.invoke_end();
  }
};
var TracingDispatcher = class {
  #tracingManager;
  constructor(tracingManager) {
    this.#tracingManager = tracingManager;
  }
  // `eventCount` will always be 0 as perfetto no longer calculates `approximate_event_count`
  bufferUsage({ value, percentFull }) {
    this.#tracingManager.bufferUsage(value, percentFull);
  }
  dataCollected({ value }) {
    this.#tracingManager.eventsCollected(value);
  }
  tracingComplete() {
    this.#tracingManager.tracingComplete();
  }
};
SDK.SDKModel.SDKModel.register(TracingManager, { capabilities: 128, autostart: false });

// gen/front_end/services/tracing/PerformanceTracing.js
var PerformanceTracing = class {
  #traceEvents = [];
  #tracingManager = null;
  #delegate;
  constructor(target, delegate) {
    this.#tracingManager = target.model(TracingManager);
    this.#delegate = delegate;
  }
  async start() {
    this.#traceEvents.length = 0;
    if (!this.#tracingManager) {
      throw new Error("No tracing manager");
    }
    const categories = [
      "-*",
      "blink.console",
      "blink.user_timing",
      "devtools.timeline",
      "disabled-by-default-devtools.screenshot",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.invalidationTracking",
      "disabled-by-default-devtools.timeline.frame",
      "disabled-by-default-devtools.timeline.stack",
      "disabled-by-default-v8.cpu_profiler",
      "disabled-by-default-v8.cpu_profiler.hires",
      "latencyInfo",
      "loading",
      "disabled-by-default-lighthouse",
      "v8.execute",
      "v8"
    ].join(",");
    const started = await this.#tracingManager.start(this, categories);
    if (!started) {
      throw new Error("Unable to start tracing.");
    }
  }
  async stop() {
    return this.#tracingManager?.stop();
  }
  // Start of implementation of SDK.TracingManager.TracingManagerClient
  traceEventsCollected(events) {
    this.#traceEvents.push(...events);
  }
  tracingBufferUsage(usage) {
    this.#delegate.tracingBufferUsage(usage);
  }
  eventsRetrievalProgress(progress) {
    this.#delegate.eventsRetrievalProgress(progress);
  }
  tracingComplete() {
    this.#delegate.tracingComplete(this.#traceEvents);
  }
};
var RawTraceEvents = class {
  events;
  constructor(events) {
    this.events = events;
  }
  getEvents() {
    return this.events;
  }
};
export {
  FreshRecording_exports as FreshRecording,
  PerformanceTracing_exports as PerformanceTracing,
  TracingManager_exports as TracingManager
};
//# sourceMappingURL=tracing.js.map
