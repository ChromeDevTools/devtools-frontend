var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/EntityMapper.js
var EntityMapper_exports = {};
__export(EntityMapper_exports, {
  EntityMapper: () => EntityMapper
});
import * as Handlers from "./handlers/handlers.js";
import * as Helpers2 from "./helpers/helpers.js";
var EntityMapper = class {
  #parsedTrace;
  #entityMappings;
  #firstPartyEntity;
  #thirdPartyEvents = [];
  /**
   * When resolving urls and updating our entity mapping in the
   * SourceMapsResolver, a single call frame can appear multiple times
   * as different cpu profile nodes. To avoid duplicate work on the
   * same CallFrame, we can keep track of them.
   */
  #resolvedCallFrames = /* @__PURE__ */ new Set();
  constructor(parsedTrace) {
    this.#parsedTrace = parsedTrace;
    this.#entityMappings = this.#parsedTrace.data.Renderer.entityMappings;
    this.#firstPartyEntity = this.#findFirstPartyEntity();
    this.#thirdPartyEvents = this.#getThirdPartyEvents();
  }
  #findFirstPartyEntity() {
    const nav = Array.from(this.#parsedTrace.data.Meta.navigationsByNavigationId.values()).sort((a, b) => a.ts - b.ts)[0];
    const firstPartyUrl = nav?.args.data?.documentLoaderURL ?? this.#parsedTrace.data.Meta.mainFrameURL;
    if (!firstPartyUrl) {
      return null;
    }
    return Handlers.Helpers.getEntityForUrl(firstPartyUrl, this.#entityMappings) ?? null;
  }
  #getThirdPartyEvents() {
    const entries = Array.from(this.#entityMappings.eventsByEntity.entries());
    const thirdPartyEvents = entries.flatMap(([entity, events]) => {
      return entity !== this.#firstPartyEntity ? events : [];
    });
    return thirdPartyEvents;
  }
  /**
   * Returns an entity for a given event if any.
   */
  entityForEvent(event) {
    return this.#entityMappings.entityByEvent.get(event) ?? null;
  }
  /**
   * Returns trace events that correspond with a given entity if any.
   */
  eventsForEntity(entity) {
    return this.#entityMappings.eventsByEntity.get(entity) ?? [];
  }
  firstPartyEntity() {
    return this.#firstPartyEntity;
  }
  thirdPartyEvents() {
    return this.#thirdPartyEvents;
  }
  mappings() {
    return this.#entityMappings;
  }
  /**
   * This updates entity mapping given a callFrame and sourceURL (newly resolved),
   * updating both eventsByEntity and entityByEvent. The call frame provides us the
   * URL and sourcemap source location that events map to. This describes the exact events we
   * want to update. We then update the events with the new sourceURL.
   *
   * compiledURLs -> the actual file's url (e.g. my-big-bundle.min.js)
   * sourceURLs -> the resolved urls (e.g. react.development.js, my-app.ts)
   * @param callFrame
   * @param sourceURL
   */
  updateSourceMapEntities(callFrame, sourceURL) {
    if (this.#resolvedCallFrames.has(callFrame)) {
      return;
    }
    const compiledURL = callFrame.url;
    const currentEntity = Handlers.Helpers.getEntityForUrl(compiledURL, this.#entityMappings);
    const resolvedEntity = Handlers.Helpers.getEntityForUrl(sourceURL, this.#entityMappings);
    if (resolvedEntity === currentEntity || (!currentEntity || !resolvedEntity)) {
      return;
    }
    const currentEntityEvents = (currentEntity && this.#entityMappings.eventsByEntity.get(currentEntity)) ?? [];
    const sourceLocationEvents = [];
    const unrelatedEvents = [];
    currentEntityEvents?.forEach((e) => {
      const cf = Helpers2.Trace.getStackTraceTopCallFrameInEventPayload(e);
      const matchesCallFrame = cf && Helpers2.Trace.isMatchingCallFrame(cf, callFrame);
      if (matchesCallFrame) {
        sourceLocationEvents.push(e);
      } else {
        unrelatedEvents.push(e);
      }
    });
    this.#entityMappings.eventsByEntity.set(currentEntity, unrelatedEvents);
    this.#entityMappings.eventsByEntity.set(resolvedEntity, sourceLocationEvents);
    sourceLocationEvents.forEach((e) => {
      this.#entityMappings.entityByEvent.set(e, resolvedEntity);
    });
    this.#resolvedCallFrames.add(callFrame);
  }
  // Update entities with proper Chrome Extension names.
  updateExtensionEntitiesWithName(executionContextNamesByOrigin) {
    const entities = Array.from(this.#entityMappings.eventsByEntity.keys());
    for (const [origin, name] of executionContextNamesByOrigin) {
      const entity = entities.find((e) => e.domains[0] === origin);
      if (entity) {
        entity.name = entity.company = name;
      }
    }
  }
};

// gen/front_end/models/trace/EventsSerializer.js
var EventsSerializer_exports = {};
__export(EventsSerializer_exports, {
  EventsSerializer: () => EventsSerializer
});
import * as Helpers3 from "./helpers/helpers.js";
import * as Types from "./types/types.js";
var EventsSerializer = class _EventsSerializer {
  #modifiedProfileCallByKey = /* @__PURE__ */ new Map();
  keyForEvent(event) {
    if (Types.Events.isProfileCall(event)) {
      return `${"p"}-${event.pid}-${event.tid}-${Types.Events.SampleIndex(event.sampleIndex)}-${event.nodeId}`;
    }
    if (Types.Events.isLegacyTimelineFrame(event)) {
      return `${"l"}-${event.index}`;
    }
    const rawEvents = Helpers3.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
    const key = Types.Events.isSyntheticBased(event) ? `${"s"}-${rawEvents.indexOf(event.rawSourceEvent)}` : `${"r"}-${rawEvents.indexOf(event)}`;
    if (key.length < 3) {
      return null;
    }
    return key;
  }
  eventForKey(key, parsedTrace) {
    const eventValues = Types.File.traceEventKeyToValues(key);
    if (_EventsSerializer.isProfileCallKey(eventValues)) {
      return this.#getModifiedProfileCallByKeyValues(eventValues, parsedTrace);
    }
    if (_EventsSerializer.isLegacyTimelineFrameKey(eventValues)) {
      const event = parsedTrace.data.Frames.frames.at(eventValues.rawIndex);
      if (!event) {
        throw new Error(`Unknown trace event. Could not find frame with index ${eventValues.rawIndex}`);
      }
      return event;
    }
    if (_EventsSerializer.isSyntheticEventKey(eventValues)) {
      const syntheticEvents = Helpers3.SyntheticEvents.SyntheticEventsManager.getActiveManager().getSyntheticTraces();
      const syntheticEvent = syntheticEvents.at(eventValues.rawIndex);
      if (!syntheticEvent) {
        throw new Error(`Unknown trace event. Attempted to get a synthetic event from an unknown raw event index: ${eventValues.rawIndex}`);
      }
      return syntheticEvent;
    }
    if (_EventsSerializer.isRawEventKey(eventValues)) {
      const rawEvents = Helpers3.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
      return rawEvents[eventValues.rawIndex];
    }
    throw new Error(`Unknown trace event. Serializable key values: ${eventValues.join("-")}`);
  }
  static isProfileCallKey(key) {
    return key.type === "p";
  }
  static isLegacyTimelineFrameKey(key) {
    return key.type === "l";
  }
  static isRawEventKey(key) {
    return key.type === "r";
  }
  static isSyntheticEventKey(key) {
    return key.type === "s";
  }
  #getModifiedProfileCallByKeyValues(key, parsedTrace) {
    const cacheResult = this.#modifiedProfileCallByKey.get(key);
    if (cacheResult) {
      return cacheResult;
    }
    const profileCallsInThread = parsedTrace.data.Renderer.processes.get(key.processID)?.threads.get(key.threadID)?.profileCalls;
    if (!profileCallsInThread) {
      throw new Error(`Unknown profile call serializable key: ${key}`);
    }
    const match = profileCallsInThread?.find((e) => {
      return e.sampleIndex === key.sampleIndex && e.nodeId === key.protocol;
    });
    if (!match) {
      throw new Error(`Unknown profile call serializable key: ${JSON.stringify(key)}`);
    }
    this.#modifiedProfileCallByKey.set(key, match);
    return match;
  }
};

// gen/front_end/models/trace/trace.prebundle.js
import * as Extras from "./extras/extras.js";
import * as Handlers7 from "./handlers/handlers.js";
import * as Helpers7 from "./helpers/helpers.js";
import * as Insights2 from "./insights/insights.js";
import * as Lantern3 from "./lantern/lantern.js";

// gen/front_end/models/trace/LanternComputationData.js
var LanternComputationData_exports = {};
__export(LanternComputationData_exports, {
  createGraph: () => createGraph,
  createNetworkRequests: () => createNetworkRequests,
  createProcessedNavigation: () => createProcessedNavigation
});
import * as Handlers2 from "./handlers/handlers.js";
import * as Lantern from "./lantern/lantern.js";
function createProcessedNavigation(data, frameId, navigationId) {
  const scoresByNav = data.PageLoadMetrics.metricScoresByFrameId.get(frameId);
  if (!scoresByNav) {
    throw new Lantern.Core.LanternError("missing metric scores for frame");
  }
  const scores = scoresByNav.get(navigationId);
  if (!scores) {
    throw new Lantern.Core.LanternError("missing metric scores for specified navigation");
  }
  const getTimestampOrUndefined = (metric) => {
    const metricScore = scores.get(metric);
    if (!metricScore?.event) {
      return;
    }
    return metricScore.event.ts;
  };
  const getTimestamp = (metric) => {
    const metricScore = scores.get(metric);
    if (!metricScore?.event) {
      throw new Lantern.Core.LanternError(`missing metric: ${metric}`);
    }
    return metricScore.event.ts;
  };
  return {
    timestamps: {
      firstContentfulPaint: getTimestamp(
        "FCP"
        /* Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP */
      ),
      largestContentfulPaint: getTimestampOrUndefined(
        "LCP"
        /* Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP */
      )
    }
  };
}
function createParsedUrl(url) {
  if (typeof url === "string") {
    url = new URL(url);
  }
  return {
    scheme: url.protocol.split(":")[0],
    // Intentional, DevTools uses different terminology
    host: url.hostname,
    securityOrigin: url.origin
  };
}
function findWorkerThreads(trace) {
  const workerThreads = /* @__PURE__ */ new Map();
  const workerCreationEvents = ["ServiceWorker thread", "DedicatedWorker thread"];
  for (const event of trace.traceEvents) {
    if (event.name !== "thread_name" || !event.args.name) {
      continue;
    }
    if (!workerCreationEvents.includes(event.args.name)) {
      continue;
    }
    const tids = workerThreads.get(event.pid);
    if (tids) {
      tids.push(event.tid);
    } else {
      workerThreads.set(event.pid, [event.tid]);
    }
  }
  return workerThreads;
}
function createLanternRequest(parsedTrace, workerThreads, request) {
  if (request.args.data.hasResponse && request.args.data.connectionId === void 0) {
    throw new Lantern.Core.LanternError("Trace is too old");
  }
  let url;
  try {
    url = new URL(request.args.data.url);
  } catch {
    return;
  }
  const timing = request.args.data.timing ? {
    // These two timings are not included in the trace.
    workerFetchStart: -1,
    workerRespondWithSettled: -1,
    receiveHeadersStart: -1,
    ...request.args.data.timing
  } : void 0;
  const networkRequestTime = timing ? timing.requestTime * 1e3 : request.args.data.syntheticData.downloadStart / 1e3;
  let fromWorker = false;
  const tids = workerThreads.get(request.pid);
  if (tids?.includes(request.tid)) {
    fromWorker = true;
  }
  if (parsedTrace.Workers.workerIdByThread.has(request.tid)) {
    fromWorker = true;
  }
  const initiator = request.args.data.initiator ?? {
    type: "other"
    /* Protocol.Network.InitiatorType.Other */
  };
  if (request.args.data.stackTrace) {
    const callFrames = request.args.data.stackTrace.map((f) => {
      return {
        scriptId: String(f.scriptId),
        url: f.url,
        lineNumber: f.lineNumber - 1,
        columnNumber: f.columnNumber - 1,
        functionName: f.functionName
      };
    });
    initiator.stack = { callFrames };
  }
  let resourceType = request.args.data.resourceType;
  if (request.args.data.initiator?.fetchType === "xmlhttprequest") {
    resourceType = "XHR";
  } else if (request.args.data.initiator?.fetchType === "fetch") {
    resourceType = "Fetch";
  }
  let resourceSize = request.args.data.decodedBodyLength ?? 0;
  if (url.protocol === "data:" && resourceSize === 0) {
    const commaIndex = url.pathname.indexOf(",");
    if (url.pathname.substring(0, commaIndex).includes(";base64")) {
      resourceSize = atob(url.pathname.substring(commaIndex + 1)).length;
    } else {
      resourceSize = url.pathname.length - commaIndex - 1;
    }
  }
  return {
    rawRequest: request,
    requestId: request.args.data.requestId,
    connectionId: request.args.data.connectionId ?? 0,
    connectionReused: request.args.data.connectionReused ?? false,
    url: request.args.data.url,
    protocol: request.args.data.protocol,
    parsedURL: createParsedUrl(url),
    documentURL: request.args.data.requestingFrameUrl,
    rendererStartTime: request.ts / 1e3,
    networkRequestTime,
    responseHeadersEndTime: request.args.data.syntheticData.downloadStart / 1e3,
    networkEndTime: request.args.data.syntheticData.finishTime / 1e3,
    transferSize: request.args.data.encodedDataLength,
    resourceSize,
    fromDiskCache: request.args.data.syntheticData.isDiskCached,
    fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
    isLinkPreload: request.args.data.isLinkPreload,
    finished: request.args.data.finished,
    failed: request.args.data.failed,
    statusCode: request.args.data.statusCode,
    initiator,
    timing,
    resourceType,
    mimeType: request.args.data.mimeType,
    priority: request.args.data.priority,
    frameId: request.args.data.frame,
    fromWorker,
    serverResponseTime: request.args.data.lrServerResponseTime ?? void 0,
    // Set later.
    redirects: void 0,
    redirectSource: void 0,
    redirectDestination: void 0,
    initiatorRequest: void 0
  };
}
function chooseInitiatorRequest(request, requestsByURL) {
  if (request.redirectSource) {
    return request.redirectSource;
  }
  const initiatorURL = Lantern.Graph.PageDependencyGraph.getNetworkInitiators(request)[0];
  let candidates = requestsByURL.get(initiatorURL) || [];
  candidates = candidates.filter((c) => {
    return c.responseHeadersEndTime <= request.rendererStartTime && c.finished && !c.failed;
  });
  if (candidates.length > 1) {
    const nonPrefetchCandidates = candidates.filter((cand) => cand.resourceType !== Lantern.Types.NetworkRequestTypes.Other);
    if (nonPrefetchCandidates.length) {
      candidates = nonPrefetchCandidates;
    }
  }
  if (candidates.length > 1) {
    const sameFrameCandidates = candidates.filter((cand) => cand.frameId === request.frameId);
    if (sameFrameCandidates.length) {
      candidates = sameFrameCandidates;
    }
  }
  if (candidates.length > 1 && request.initiator.type === "parser") {
    const documentCandidates = candidates.filter((cand) => cand.resourceType === Lantern.Types.NetworkRequestTypes.Document);
    if (documentCandidates.length) {
      candidates = documentCandidates;
    }
  }
  if (candidates.length > 1) {
    const linkPreloadCandidates = candidates.filter((c) => c.isLinkPreload);
    if (linkPreloadCandidates.length) {
      const nonPreloadCandidates = candidates.filter((c) => !c.isLinkPreload);
      const allPreloaded = nonPreloadCandidates.every((c) => c.fromDiskCache || c.fromMemoryCache);
      if (nonPreloadCandidates.length && allPreloaded) {
        candidates = linkPreloadCandidates;
      }
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}
function linkInitiators(lanternRequests) {
  const requestsByURL = /* @__PURE__ */ new Map();
  for (const request of lanternRequests) {
    const requests = requestsByURL.get(request.url) || [];
    requests.push(request);
    requestsByURL.set(request.url, requests);
  }
  for (const request of lanternRequests) {
    const initiatorRequest = chooseInitiatorRequest(request, requestsByURL);
    if (initiatorRequest) {
      request.initiatorRequest = initiatorRequest;
    }
  }
}
function createNetworkRequests(trace, data, startTime = 0, endTime = Number.POSITIVE_INFINITY) {
  const workerThreads = findWorkerThreads(trace);
  const lanternRequestsNoRedirects = [];
  for (const request of data.NetworkRequests.byTime) {
    if (request.ts >= startTime && request.ts < endTime) {
      const lanternRequest = createLanternRequest(data, workerThreads, request);
      if (lanternRequest) {
        lanternRequestsNoRedirects.push(lanternRequest);
      }
    }
  }
  const lanternRequests = [];
  for (const request of [...lanternRequestsNoRedirects]) {
    if (!request.rawRequest) {
      continue;
    }
    const redirects = request.rawRequest.args.data.redirects;
    if (!redirects.length) {
      lanternRequests.push(request);
      continue;
    }
    const requestChain = [];
    for (const redirect of redirects) {
      const redirectedRequest = structuredClone(request);
      redirectedRequest.networkRequestTime = redirect.ts / 1e3;
      redirectedRequest.rendererStartTime = redirectedRequest.networkRequestTime;
      redirectedRequest.networkEndTime = (redirect.ts + redirect.dur) / 1e3;
      redirectedRequest.responseHeadersEndTime = redirectedRequest.networkEndTime;
      redirectedRequest.timing = {
        requestTime: redirectedRequest.networkRequestTime / 1e3,
        receiveHeadersStart: redirectedRequest.responseHeadersEndTime,
        receiveHeadersEnd: redirectedRequest.responseHeadersEndTime,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: -1,
        dnsEnd: -1,
        connectStart: -1,
        connectEnd: -1,
        sslStart: -1,
        sslEnd: -1,
        sendStart: -1,
        sendEnd: -1,
        workerStart: -1,
        workerReady: -1,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
        pushStart: -1,
        pushEnd: -1
      };
      redirectedRequest.url = redirect.url;
      redirectedRequest.parsedURL = createParsedUrl(redirect.url);
      redirectedRequest.statusCode = 302;
      redirectedRequest.resourceType = void 0;
      redirectedRequest.transferSize = 400;
      requestChain.push(redirectedRequest);
      lanternRequests.push(redirectedRequest);
    }
    requestChain.push(request);
    lanternRequests.push(request);
    for (let i = 0; i < requestChain.length; i++) {
      const request2 = requestChain[i];
      if (i > 0) {
        request2.redirectSource = requestChain[i - 1];
        request2.redirects = requestChain.slice(0, i);
      }
      if (i !== requestChain.length - 1) {
        request2.redirectDestination = requestChain[i + 1];
      }
    }
    for (let i = 1; i < requestChain.length; i++) {
      requestChain[i].requestId = `${requestChain[i - 1].requestId}:redirect`;
    }
  }
  linkInitiators(lanternRequests);
  return lanternRequests;
}
function collectMainThreadEvents(trace, data) {
  const Meta = data.Meta;
  const mainFramePids = Meta.mainFrameNavigations.length ? new Set(Meta.mainFrameNavigations.map((nav) => nav.pid)) : Meta.topLevelRendererIds;
  const rendererPidToTid = /* @__PURE__ */ new Map();
  for (const pid of mainFramePids) {
    const threads = Meta.threadsInProcess.get(pid) ?? [];
    let found = false;
    for (const [tid, thread] of threads) {
      if (thread.args.name === "CrRendererMain") {
        rendererPidToTid.set(pid, tid);
        found = true;
        break;
      }
    }
    if (found) {
      continue;
    }
    for (const [tid, thread] of threads) {
      if (thread.args.name === "CrBrowserMain") {
        rendererPidToTid.set(pid, tid);
        found = true;
        break;
      }
    }
  }
  return trace.traceEvents.filter((e) => rendererPidToTid.get(e.pid) === e.tid);
}
function createGraph(requests, trace, data, url) {
  const mainThreadEvents = collectMainThreadEvents(trace, data);
  if (!url) {
    url = {
      requestedUrl: requests[0].url,
      mainDocumentUrl: ""
    };
    let request = requests[0];
    while (request.redirectDestination) {
      request = request.redirectDestination;
    }
    url.mainDocumentUrl = request.url;
  }
  return Lantern.Graph.PageDependencyGraph.createGraph(mainThreadEvents, requests, url);
}

// gen/front_end/models/trace/ModelImpl.js
var ModelImpl_exports = {};
__export(ModelImpl_exports, {
  Model: () => Model,
  ModelUpdateEvent: () => ModelUpdateEvent,
  isModelUpdateDataComplete: () => isModelUpdateDataComplete
});
import * as Platform from "./../../core/platform/platform.js";
import * as Handlers4 from "./handlers/handlers.js";
import * as Helpers5 from "./helpers/helpers.js";

// gen/front_end/models/trace/Processor.js
var Processor_exports = {};
__export(Processor_exports, {
  TraceParseProgressEvent: () => TraceParseProgressEvent,
  TraceProcessor: () => TraceProcessor,
  sortHandlers: () => sortHandlers
});
import * as Handlers3 from "./handlers/handlers.js";
import * as Helpers4 from "./helpers/helpers.js";
import * as Insights from "./insights/insights.js";
import * as Lantern2 from "./lantern/lantern.js";
import * as Types3 from "./types/types.js";
var _a;
var TraceParseProgressEvent = class _TraceParseProgressEvent extends Event {
  data;
  static eventName = "traceparseprogress";
  constructor(data, init = { bubbles: true }) {
    super(_TraceParseProgressEvent.eventName, init);
    this.data = data;
  }
};
function calculateProgress(value, phase) {
  if (phase === 0.8) {
    return value * (0.8 - 0.2) + 0.2;
  }
  return value * phase;
}
var TraceProcessor = class extends EventTarget {
  // We force the Meta handler to be enabled, so the TraceHandlers type here is
  // the model handlers the user passes in and the Meta handler.
  #traceHandlers;
  #status = "IDLE";
  #modelConfiguration = Types3.Configuration.defaults();
  #data = null;
  #insights = null;
  static createWithAllHandlers() {
    return new _a(Handlers3.ModelHandlers, Types3.Configuration.defaults());
  }
  /**
   * This function is kept for testing with `stub`.
   */
  static getInsightRunners() {
    return { ...Insights.Models };
  }
  constructor(traceHandlers, modelConfiguration) {
    super();
    this.#verifyHandlers(traceHandlers);
    this.#traceHandlers = {
      Meta: Handlers3.ModelHandlers.Meta,
      ...traceHandlers
    };
    if (modelConfiguration) {
      this.#modelConfiguration = modelConfiguration;
    }
    this.#passConfigToHandlers();
  }
  #passConfigToHandlers() {
    for (const handler of Object.values(this.#traceHandlers)) {
      if ("handleUserConfig" in handler && handler.handleUserConfig) {
        handler.handleUserConfig(this.#modelConfiguration);
      }
    }
  }
  /**
   * When the user passes in a set of handlers, we want to ensure that we have all
   * the required handlers. Handlers can depend on other handlers, so if the user
   * passes in FooHandler which depends on BarHandler, they must also pass in
   * BarHandler too. This method verifies that all dependencies are met, and
   * throws if not.
   **/
  #verifyHandlers(providedHandlers) {
    if (Object.keys(providedHandlers).length === Object.keys(Handlers3.ModelHandlers).length) {
      return;
    }
    const requiredHandlerKeys = /* @__PURE__ */ new Set();
    for (const [handlerName, handler] of Object.entries(providedHandlers)) {
      requiredHandlerKeys.add(handlerName);
      const deps = "deps" in handler ? handler.deps() : [];
      for (const depName of deps) {
        requiredHandlerKeys.add(depName);
      }
    }
    const providedHandlerKeys = new Set(Object.keys(providedHandlers));
    requiredHandlerKeys.delete("Meta");
    for (const requiredKey of requiredHandlerKeys) {
      if (!providedHandlerKeys.has(requiredKey)) {
        throw new Error(`Required handler ${requiredKey} not provided.`);
      }
    }
  }
  reset() {
    if (this.#status === "PARSING") {
      throw new Error("Trace processor can't reset while parsing.");
    }
    const handlers = Object.values(this.#traceHandlers);
    for (const handler of handlers) {
      handler.reset();
    }
    this.#data = null;
    this.#insights = null;
    this.#status = "IDLE";
  }
  async parse(traceEvents, options) {
    if (this.#status !== "IDLE") {
      throw new Error(`Trace processor can't start parsing when not idle. Current state: ${this.#status}`);
    }
    if (typeof options.isCPUProfile === "undefined" && options.metadata) {
      options.isCPUProfile = options.metadata.dataOrigin === "CPUProfile";
    }
    options.logger?.start("total");
    try {
      this.#status = "PARSING";
      options.logger?.start("parse");
      await this.#computeParsedTrace(traceEvents, options);
      options.logger?.end("parse");
      if (this.#data && !options.isCPUProfile) {
        options.logger?.start("insights");
        this.#computeInsights(this.#data, traceEvents, options);
        options.logger?.end("insights");
      }
      this.#status = "FINISHED_PARSING";
    } catch (e) {
      this.#status = "ERRORED_WHILE_PARSING";
      throw e;
    } finally {
      options.logger?.end("total");
    }
  }
  /**
   * Run all the handlers and set the result to `#data`.
   */
  async #computeParsedTrace(traceEvents, options) {
    const eventsPerChunk = 5e4;
    const sortedHandlers = [...sortHandlers(this.#traceHandlers).entries()];
    for (const [, handler] of sortedHandlers) {
      handler.reset();
    }
    options.logger?.start("parse:handleEvent");
    for (let i = 0; i < traceEvents.length; ++i) {
      if (i % eventsPerChunk === 0 && i) {
        const percent = calculateProgress(
          i / traceEvents.length,
          0.2
          /* ProgressPhase.HANDLE_EVENT */
        );
        this.dispatchEvent(new TraceParseProgressEvent({ percent }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const event = traceEvents[i];
      for (let j = 0; j < sortedHandlers.length; ++j) {
        const [, handler] = sortedHandlers[j];
        handler.handleEvent(event);
      }
    }
    options.logger?.end("parse:handleEvent");
    const finalizeOptions = {
      ...options,
      allTraceEvents: traceEvents
    };
    for (let i = 0; i < sortedHandlers.length; i++) {
      const [name, handler] = sortedHandlers[i];
      if (handler.finalize) {
        options.logger?.start(`parse:${name}:finalize`);
        await new Promise((resolve) => setTimeout(resolve, 0));
        await handler.finalize(finalizeOptions);
        options.logger?.end(`parse:${name}:finalize`);
      }
      const percent = calculateProgress(
        i / sortedHandlers.length,
        0.8
        /* ProgressPhase.FINALIZE */
      );
      this.dispatchEvent(new TraceParseProgressEvent({ percent }));
    }
    options.logger?.start("parse:handler.data()");
    const parsedTrace = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      Object.assign(parsedTrace, { [name]: handler.data() });
    }
    options.logger?.end("parse:handler.data()");
    this.dispatchEvent(new TraceParseProgressEvent({
      percent: 1
      /* ProgressPhase.CLONE */
    }));
    this.#data = parsedTrace;
  }
  get data() {
    if (this.#status !== "FINISHED_PARSING") {
      return null;
    }
    return this.#data;
  }
  get insights() {
    if (this.#status !== "FINISHED_PARSING") {
      return null;
    }
    return this.#insights;
  }
  #createLanternContext(data, traceEvents, frameId, navigationId, options) {
    if (!data.NetworkRequests || !data.Workers || !data.PageLoadMetrics) {
      return;
    }
    if (!data.NetworkRequests.byTime.length) {
      throw new Lantern2.Core.LanternError("No network requests found in trace");
    }
    const navStarts = data.Meta.navigationsByFrameId.get(frameId);
    const navStartIndex = navStarts?.findIndex((n) => n.args.data?.navigationId === navigationId);
    if (!navStarts || navStartIndex === void 0 || navStartIndex === -1) {
      throw new Lantern2.Core.LanternError("Could not find navigation start");
    }
    const startTime = navStarts[navStartIndex].ts;
    const endTime = navStartIndex + 1 < navStarts.length ? navStarts[navStartIndex + 1].ts : Number.POSITIVE_INFINITY;
    const boundedTraceEvents = traceEvents.filter((e) => e.ts >= startTime && e.ts < endTime);
    const trace = {
      traceEvents: boundedTraceEvents
    };
    const requests = createNetworkRequests(trace, data, startTime, endTime);
    const graph = createGraph(requests, trace, data);
    const processedNavigation = createProcessedNavigation(data, frameId, navigationId);
    const networkAnalysis = Lantern2.Core.NetworkAnalyzer.analyze(requests);
    if (!networkAnalysis) {
      return;
    }
    const lanternSettings = {
      // TODO(crbug.com/372674229): if devtools throttling was on, does this network analysis capture
      // that? Do we need to set 'devtools' throttlingMethod?
      networkAnalysis,
      throttlingMethod: "provided",
      ...options.lanternSettings
    };
    const simulator = Lantern2.Simulation.Simulator.createSimulator(lanternSettings);
    const computeData = { graph, simulator, processedNavigation };
    const fcpResult = Lantern2.Metrics.FirstContentfulPaint.compute(computeData);
    const lcpResult = Lantern2.Metrics.LargestContentfulPaint.compute(computeData, { fcpResult });
    const interactiveResult = Lantern2.Metrics.Interactive.compute(computeData, { lcpResult });
    const tbtResult = Lantern2.Metrics.TotalBlockingTime.compute(computeData, { fcpResult, interactiveResult });
    const metrics = {
      firstContentfulPaint: fcpResult,
      interactive: interactiveResult,
      largestContentfulPaint: lcpResult,
      totalBlockingTime: tbtResult
    };
    return { requests, graph, simulator, metrics };
  }
  /**
   * Sort the insight models based on the impact of each insight's estimated savings, additionally weighted by the
   * worst metrics according to field data (if present).
   */
  sortInsightSet(insightSet, metadata) {
    const baselineOrder = {
      INPBreakdown: null,
      LCPBreakdown: null,
      LCPDiscovery: null,
      CLSCulprits: null,
      RenderBlocking: null,
      NetworkDependencyTree: null,
      ImageDelivery: null,
      DocumentLatency: null,
      FontDisplay: null,
      Viewport: null,
      DOMSize: null,
      ThirdParties: null,
      DuplicatedJavaScript: null,
      SlowCSSSelector: null,
      ForcedReflow: null,
      Cache: null,
      ModernHTTP: null,
      LegacyJavaScript: null
    };
    const weights = Insights.Common.calculateMetricWeightsForSorting(insightSet, metadata);
    const observedLcpMicro = Insights.Common.getLCP(insightSet)?.value;
    const observedLcp = observedLcpMicro ? Helpers4.Timing.microToMilli(observedLcpMicro) : Types3.Timing.Milli(0);
    const observedCls = Insights.Common.getCLS(insightSet).value;
    const observedInpMicro = Insights.Common.getINP(insightSet)?.value;
    const observedInp = observedInpMicro ? Helpers4.Timing.microToMilli(observedInpMicro) : Types3.Timing.Milli(200);
    const observedLcpScore = observedLcp !== void 0 ? Insights.Common.evaluateLCPMetricScore(observedLcp) : void 0;
    const observedInpScore = Insights.Common.evaluateINPMetricScore(observedInp);
    const observedClsScore = Insights.Common.evaluateCLSMetricScore(observedCls);
    const insightToSortingRank = /* @__PURE__ */ new Map();
    for (const [name, model] of Object.entries(insightSet.model)) {
      const lcp = model.metricSavings?.LCP ?? 0;
      const inp = model.metricSavings?.INP ?? 0;
      const cls = model.metricSavings?.CLS ?? 0;
      const lcpPostSavings = observedLcp !== void 0 ? Math.max(0, observedLcp - lcp) : void 0;
      const inpPostSavings = Math.max(0, observedInp - inp);
      const clsPostSavings = Math.max(0, observedCls - cls);
      let score = 0;
      if (weights.lcp && lcp && observedLcpScore !== void 0 && lcpPostSavings !== void 0) {
        score += weights.lcp * (Insights.Common.evaluateLCPMetricScore(lcpPostSavings) - observedLcpScore);
      }
      if (weights.inp && inp && observedInpScore !== void 0) {
        score += weights.inp * (Insights.Common.evaluateINPMetricScore(inpPostSavings) - observedInpScore);
      }
      if (weights.cls && cls && observedClsScore !== void 0) {
        score += weights.cls * (Insights.Common.evaluateCLSMetricScore(clsPostSavings) - observedClsScore);
      }
      insightToSortingRank.set(name, score);
    }
    const baselineOrderKeys = Object.keys(baselineOrder);
    const orderedKeys = Object.keys(insightSet.model);
    orderedKeys.sort((a, b) => {
      const a1 = baselineOrderKeys.indexOf(a);
      const b1 = baselineOrderKeys.indexOf(b);
      if (a1 >= 0 && b1 >= 0) {
        return a1 - b1;
      }
      if (a1 >= 0) {
        return -1;
      }
      if (b1 >= 0) {
        return 1;
      }
      return 0;
    });
    orderedKeys.sort((a, b) => (insightToSortingRank.get(b) ?? 0) - (insightToSortingRank.get(a) ?? 0));
    const newModel = {};
    for (const key of orderedKeys) {
      const model = insightSet.model[key];
      newModel[key] = model;
    }
    insightSet.model = newModel;
  }
  #computeInsightSet(data, context) {
    const logger = context.options.logger;
    let id, urlString, navigation;
    if (context.navigation) {
      id = context.navigationId;
      urlString = data.Meta.finalDisplayUrlByNavigationId.get(context.navigationId) ?? data.Meta.mainFrameURL;
      navigation = context.navigation;
    } else {
      id = Types3.Events.NO_NAVIGATION;
      urlString = data.Meta.finalDisplayUrlByNavigationId.get("") ?? data.Meta.mainFrameURL;
    }
    const insightSetModel = {};
    for (const [name, insight] of Object.entries(_a.getInsightRunners())) {
      let model;
      try {
        logger?.start(`insights:${name}`);
        model = insight.generateInsight(data, context);
        model.frameId = context.frameId;
        const navId = context.navigation?.args.data?.navigationId;
        if (navId) {
          model.navigationId = navId;
        }
        model.createOverlays = () => {
          return insight.createOverlays(model);
        };
      } catch (err) {
        model = err;
      } finally {
        logger?.end(`insights:${name}`);
      }
      Object.assign(insightSetModel, { [name]: model });
    }
    const isNavigation = id === Types3.Events.NO_NAVIGATION;
    const trivialThreshold = Helpers4.Timing.milliToMicro(Types3.Timing.Milli(5e3));
    const everyInsightPasses = Object.values(insightSetModel).filter((model) => !(model instanceof Error)).every((model) => model.state === "pass");
    const noLcp = !insightSetModel.LCPBreakdown.lcpEvent;
    const noInp = !insightSetModel.INPBreakdown.longestInteractionEvent;
    const noLayoutShifts = insightSetModel.CLSCulprits.shifts?.size === 0;
    const shouldExclude = isNavigation && context.bounds.range < trivialThreshold && everyInsightPasses && noLcp && noInp && noLayoutShifts;
    if (shouldExclude) {
      return;
    }
    let url;
    try {
      url = new URL(urlString);
    } catch {
      return;
    }
    const insightSet = {
      id,
      url,
      navigation,
      frameId: context.frameId,
      bounds: context.bounds,
      model: insightSetModel
    };
    if (!this.#insights) {
      this.#insights = /* @__PURE__ */ new Map();
    }
    this.#insights.set(insightSet.id, insightSet);
    this.sortInsightSet(insightSet, context.options.metadata ?? null);
  }
  /**
   * Run all the insights and set the result to `#insights`.
   */
  #computeInsights(data, traceEvents, options) {
    this.#insights = /* @__PURE__ */ new Map();
    const navigations = data.Meta.mainFrameNavigations.filter((navigation) => navigation.args.frame && navigation.args.data?.navigationId);
    this.#computeInsightsForInitialTracePeriod(data, navigations, options);
    for (const [index, navigation] of navigations.entries()) {
      const min = navigation.ts;
      const max = index + 1 < navigations.length ? navigations[index + 1].ts : data.Meta.traceBounds.max;
      const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(min, max);
      this.#computeInsightsForNavigation(navigation, bounds, data, traceEvents, options);
    }
  }
  /**
   * Computes insights for the period before the first navigation, or for the entire trace if no navigations exist.
   */
  #computeInsightsForInitialTracePeriod(data, navigations, options) {
    const bounds = navigations.length > 0 ? Helpers4.Timing.traceWindowFromMicroSeconds(data.Meta.traceBounds.min, navigations[0].ts) : data.Meta.traceBounds;
    const context = {
      options,
      bounds,
      frameId: data.Meta.mainFrameId
      // No navigation or lantern context applies to this initial/no-navigation period.
    };
    this.#computeInsightSet(data, context);
  }
  /**
   * Computes insights for a specific navigation event.
   */
  #computeInsightsForNavigation(navigation, bounds, data, traceEvents, options) {
    const frameId = navigation.args.frame;
    const navigationId = navigation.args.data?.navigationId;
    let lantern;
    try {
      options.logger?.start("insights:createLanternContext");
      lantern = this.#createLanternContext(data, traceEvents, frameId, navigationId, options);
    } catch (e) {
      const expectedErrors = [
        "mainDocumentRequest not found",
        "missing metric scores for main frame",
        "missing metric: FCP",
        "missing metric: LCP",
        "No network requests found in trace",
        "Trace is too old"
      ];
      if (!(e instanceof Lantern2.Core.LanternError)) {
        console.error(e);
      } else if (!expectedErrors.some((err) => e.message === err)) {
        console.error(e);
      }
    } finally {
      options.logger?.end("insights:createLanternContext");
    }
    const context = {
      options,
      bounds,
      frameId,
      navigation,
      navigationId,
      lantern
    };
    this.#computeInsightSet(data, context);
  }
};
_a = TraceProcessor;
function sortHandlers(traceHandlers) {
  const sortedMap = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  const visitHandler = (handlerName) => {
    if (sortedMap.has(handlerName)) {
      return;
    }
    if (visited.has(handlerName)) {
      let stackPath = "";
      for (const handler2 of visited) {
        if (stackPath || handler2 === handlerName) {
          stackPath += `${handler2}->`;
        }
      }
      stackPath += handlerName;
      throw new Error(`Found dependency cycle in trace event handlers: ${stackPath}`);
    }
    visited.add(handlerName);
    const handler = traceHandlers[handlerName];
    if (!handler) {
      return;
    }
    const deps = handler.deps?.();
    if (deps) {
      deps.forEach(visitHandler);
    }
    sortedMap.set(handlerName, handler);
  };
  for (const handlerName of Object.keys(traceHandlers)) {
    visitHandler(handlerName);
  }
  return sortedMap;
}

// gen/front_end/models/trace/ModelImpl.js
import * as Types4 from "./types/types.js";
var Model = class _Model extends EventTarget {
  #traces = [];
  #nextNumberByDomain = /* @__PURE__ */ new Map();
  #recordingsAvailable = [];
  #lastRecordingIndex = 0;
  #processor;
  #config = Types4.Configuration.defaults();
  static createWithAllHandlers(config) {
    return new _Model(Handlers4.ModelHandlers, config);
  }
  /**
   * Runs only the provided handlers.
   *
   * Callers must ensure they are providing all dependant handlers (although Meta is included automatically),
   * and must know that the result of `.parsedTrace` will be limited to the handlers provided, even though
   * the type won't reflect that.
   */
  static createWithSubsetOfHandlers(traceHandlers, config) {
    return new _Model(traceHandlers, config);
  }
  constructor(handlers, config) {
    super();
    if (config) {
      this.#config = config;
    }
    this.#processor = new TraceProcessor(handlers, this.#config);
  }
  /**
   * Parses an array of trace events into a structured object containing all the
   * information parsed by the trace handlers.
   * You can `await` this function to pause execution until parsing is complete,
   * or instead rely on the `ModuleUpdateEvent` that is dispatched when the
   * parsing is finished.
   *
   * Once parsed, you then have to call the `parsedTrace` method, providing an
   * index of the trace you want to have the data for. This is because any model
   * can store a number of traces. Each trace is given an index, which starts at 0
   * and increments by one as a new trace is parsed.
   *
   * @example
   * // Awaiting the parse method() to block until parsing complete
   * await this.traceModel.parse(events);
   * const data = this.traceModel.parsedTrace(0)
   * @example
   * // Using an event listener to be notified when tracing is complete.
   * this.traceModel.addEventListener(Trace.ModelUpdateEvent.eventName, (event) => {
   *   if(event.data.data === 'done') {
   *     // trace complete
   *     const data = this.traceModel.parsedTrace(0);
   *   }
   * });
   * void this.traceModel.parse(events);
   **/
  async parse(traceEvents, config = {}) {
    if (config.showAllEvents === void 0) {
      config.showAllEvents = this.#config.showAllEvents;
    }
    const metadata = config.metadata || {};
    const onTraceUpdate = (event) => {
      const { data } = event;
      this.dispatchEvent(new ModelUpdateEvent({ type: "PROGRESS_UPDATE", data }));
    };
    this.#processor.addEventListener(TraceParseProgressEvent.eventName, onTraceUpdate);
    const syntheticEventsManager = Helpers5.SyntheticEvents.SyntheticEventsManager.createAndActivate(traceEvents);
    try {
      await this.#processor.parse(traceEvents, config);
      if (!this.#processor.data) {
        throw new Error("processor did not parse trace");
      }
      const file = this.#storeAndCreateParsedTraceFile(syntheticEventsManager, traceEvents, metadata, this.#processor.data, this.#processor.insights);
      this.#traces.push(file);
    } catch (e) {
      throw e;
    } finally {
      this.#processor.removeEventListener(TraceParseProgressEvent.eventName, onTraceUpdate);
      this.dispatchEvent(new ModelUpdateEvent({ type: "COMPLETE", data: "done" }));
    }
  }
  #storeAndCreateParsedTraceFile(syntheticEventsManager, traceEvents, metadata, data, traceInsights) {
    this.#lastRecordingIndex++;
    let recordingName = `Trace ${this.#lastRecordingIndex}`;
    const origin = Helpers5.Trace.extractOriginFromTrace(data.Meta.mainFrameURL);
    if (origin) {
      const nextSequenceForDomain = Platform.MapUtilities.getWithDefault(this.#nextNumberByDomain, origin, () => 1);
      recordingName = `${origin} (${nextSequenceForDomain})`;
      this.#nextNumberByDomain.set(origin, nextSequenceForDomain + 1);
    }
    this.#recordingsAvailable.push(recordingName);
    return {
      traceEvents,
      metadata,
      data,
      insights: traceInsights,
      syntheticEventsManager
    };
  }
  lastTraceIndex() {
    return this.size() - 1;
  }
  /**
   * Returns the parsed trace data indexed by the order in which it was stored.
   * If no index is given, the last stored parsed data is returned.
   */
  parsedTrace(index = this.#traces.length - 1) {
    return this.#traces.at(index) ?? null;
  }
  overrideModifications(index, newModifications) {
    if (this.#traces[index]) {
      this.#traces[index].metadata.modifications = newModifications;
    }
  }
  syntheticTraceEventsManager(index = this.#traces.length - 1) {
    return this.#traces.at(index)?.syntheticEventsManager ?? null;
  }
  size() {
    return this.#traces.length;
  }
  deleteTraceByIndex(recordingIndex) {
    this.#traces.splice(recordingIndex, 1);
    this.#recordingsAvailable.splice(recordingIndex, 1);
  }
  getRecordingsAvailable() {
    return this.#recordingsAvailable;
  }
  resetProcessor() {
    this.#processor.reset();
  }
};
var ModelUpdateEvent = class _ModelUpdateEvent extends Event {
  data;
  static eventName = "modelupdate";
  constructor(data) {
    super(_ModelUpdateEvent.eventName);
    this.data = data;
  }
};
function isModelUpdateDataComplete(eventData) {
  return eventData.type === "COMPLETE";
}

// gen/front_end/models/trace/Name.js
var Name_exports = {};
__export(Name_exports, {
  forEntry: () => forEntry
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Handlers6 from "./handlers/handlers.js";

// gen/front_end/models/trace/Styles.js
var Styles_exports = {};
__export(Styles_exports, {
  EventCategory: () => EventCategory,
  TimelineCategory: () => TimelineCategory,
  TimelineRecordStyle: () => TimelineRecordStyle,
  getCategoryStyles: () => getCategoryStyles,
  getEventStyle: () => getEventStyle,
  getTimelineMainEventCategories: () => getTimelineMainEventCategories,
  markerDetailsForEvent: () => markerDetailsForEvent,
  maybeInitSylesMap: () => maybeInitSylesMap,
  setCategories: () => setCategories,
  setEventStylesMap: () => setEventStylesMap,
  setTimelineMainEventCategories: () => setTimelineMainEventCategories,
  stringIsEventCategory: () => stringIsEventCategory,
  visibleTypes: () => visibleTypes
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as Handlers5 from "./handlers/handlers.js";
import * as Helpers6 from "./helpers/helpers.js";
import * as Types5 from "./types/types.js";
var UIStrings = {
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent to load resources
   */
  loading: "Loading",
  /**
   * @description Text in Timeline for the Experience title
   */
  experience: "Experience",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent in script execution
   */
  scripting: "Scripting",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent in rendering the web page
   */
  rendering: "Rendering",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent to visually represent the web page
   */
  painting: "Painting",
  /**
   * @description Event category in the Performance panel for time spent in the GPU
   */
  gpu: "GPU",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  async: "Async",
  /**
   * @description Category in the Summary view of the Performance panel to indicate time spent in the rest of the system
   */
  system: "System",
  /**
   * @description Category in the Summary view of the Performance panel to indicate idle time
   */
  idle: "Idle",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  task: "Task",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  consoleTaskRun: "Run console task",
  /**
   * @description Text for other types of items
   */
  other: "Other",
  /**
   * @description Text that refers to the animation of the web page
   */
  animation: "Animation",
  /**
   * @description Text that refers to some events
   */
  event: "Event",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  requestMainThreadFrame: "Request main thread frame",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  frameStart: "Frame start",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  onMessage: "On message",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  schedulePostMessage: "Schedule postMessage",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  messaging: "Messaging",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  frameStartMainThread: "Frame start (main thread)",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  drawFrame: "Draw frame",
  /**
   * @description Noun for an event in the Performance panel. This marks time
   * spent in an operation that only happens when the profiler is active.
   */
  profilingOverhead: "Profiling overhead",
  /**
   * @description The process the browser uses to determine a target element for a
   *pointer event. Typically, this is determined by considering the pointer's
   *location and also the visual layout of elements on the screen.
   */
  hitTest: "Hit test",
  /**
   * @description Noun for an event in the Performance panel. The browser has decided
   *that the styles for some elements need to be recalculated and scheduled that
   *recalculation process at some time in the future.
   */
  scheduleStyleRecalculation: "Schedule style recalculation",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  recalculateStyle: "Recalculate style",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  invalidateLayout: "Invalidate Layout",
  /**
   * @description Noun for an event in the Performance panel. Layerize is a step
   *where we calculate which layers to create.
   */
  layerize: "Layerize",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  layout: "Layout",
  /**
   * @description Noun for an event in the Performance panel. Paint setup is a
   *step before the 'Paint' event. A paint event is when the browser draws pixels
   *to the screen. This step is the setup beforehand.
   */
  paintSetup: "Paint setup",
  /**
   * @description Noun for a paint event in the Performance panel, where an image
   *was being painted. A paint event is when the browser draws pixels to the
   *screen, in this case specifically for an image in a website.
   */
  paintImage: "Paint image",
  /**
   * @description Noun for an event in the Performance panel. Pre-paint is a
   *step before the 'Paint' event. A paint event is when the browser records the
   *instructions for drawing the page. This step is the setup beforehand.
   */
  prePaint: "Pre-paint",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  updateLayer: "Update layer",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  updateLayerTree: "Update layer tree",
  /**
   * @description Noun for a paint event in the Performance panel. A paint event is when the browser draws pixels to the screen.
   */
  paint: "Paint",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  rasterizePaint: "Rasterize paint",
  /**
   * @description The action to scroll
   */
  scroll: "Scroll",
  /**
   * @description Noun for an event in the Performance panel. Commit is a step
   *where we send (also known as "commit") layers to the compositor thread. This
   *step follows the "Layerize" step which is what calculates which layers to
   *create.
   */
  commit: "Commit",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  compositeLayers: "Composite layers",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  computeIntersections: "Compute intersections",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  parseHtml: "Parse HTML",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  parseStylesheet: "Parse stylesheet",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  installTimer: "Install timer",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  removeTimer: "Remove timer",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  timerFired: "Timer fired",
  /**
   * @description Text for an event. Shown in the timeline in the Performance panel.
   * XHR refers to XmlHttpRequest, a Web API. This particular Web API has a property
   * named 'readyState' (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState). When
   * the 'readyState' property changes the text is shown.
   */
  xhrReadyStateChange: "`XHR` `readyState` change",
  /**
   * @description Text for an event. Shown in the timeline in the Performance panel.
   * XHR refers to XmlHttpRequest, a Web API. (see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
   * The text is shown when a XmlHttpRequest load event happens on the inspected page.
   */
  xhrLoad: "`XHR` load",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  compileScript: "Compile script",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  cacheScript: "Cache script code",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  compileCode: "Compile code",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  optimizeCode: "Optimize code",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  evaluateScript: "Evaluate script",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  compileModule: "Compile module",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  cacheModule: "Cache module code",
  /**
   * @description Text for an event. Shown in the timeline in the Performance panel.
   * "Module" refers to JavaScript modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
   * JavaScript modules are a way to organize JavaScript code.
   * "Evaluate" is the phase when the JavaScript code of a module is executed.
   */
  evaluateModule: "Evaluate module",
  /**
   * @description Noun indicating that a compile task (type: streaming) happened.
   */
  streamingCompileTask: "Streaming compile task",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  waitingForNetwork: "Waiting for network",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  parseAndCompile: "Parse and compile",
  /**
   * @description Text in Timeline UIUtils of the Performance panel.
   * "Code Cache" refers to JavaScript bytecode cache: https://v8.dev/blog/code-caching-for-devs
   * "Deserialize" refers to the process of reading the code cache.
   */
  deserializeCodeCache: "Deserialize code cache",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  streamingWasmResponse: "Streaming Wasm response",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  compiledWasmModule: "Compiled Wasm module",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  cachedWasmModule: "Cached Wasm module",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  wasmModuleCacheHit: "Wasm module cache hit",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  wasmModuleCacheInvalid: "Wasm module cache invalid",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  frameStartedLoading: "Frame started loading",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  onloadEvent: "Onload event",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  domcontentloadedEvent: "DOMContentLoaded event",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  firstPaint: "First Paint",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  firstContentfulPaint: "First Contentful Paint",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  largestContentfulPaint: "Largest Contentful Paint",
  /**
   * @description Text for timestamps of items
   */
  timestamp: "Timestamp",
  /**
   * @description Noun for a 'time' event that happens in the Console (a tool in
   * DevTools). The user can trigger console time events from their code, and
   * they will show up in the Performance panel. Time events are used to measure
   * the duration of something, e.g. the user will emit two time events at the
   * start and end of some interesting task.
   */
  consoleTime: "Console time",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  userTiming: "User timing",
  /**
   * @description Name for an event shown in the Performance panel. When a network
   * request is about to be sent by the browser, the time is recorded and DevTools
   * is notified that a network request will be sent momentarily.
   */
  willSendRequest: "Will send request",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  sendRequest: "Send request",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  receiveResponse: "Receive response",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  finishLoading: "Finish loading",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  receiveData: "Receive data",
  /**
   * @description Event category in the Performance panel for time spent to execute microtasks in JavaScript
   */
  runMicrotasks: "Run microtasks",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  functionCall: "Function call",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  gcEvent: "GC event",
  /**
   * @description Event category in the Performance panel for time spent to perform a full Garbage Collection pass
   */
  majorGc: "Major GC",
  /**
   * @description Event category in the Performance panel for time spent to perform a quick Garbage Collection pass
   */
  minorGc: "Minor GC",
  /**
   * @description Text for the request animation frame event
   */
  requestAnimationFrame: "Request animation frame",
  /**
   * @description Text to cancel the animation frame
   */
  cancelAnimationFrame: "Cancel animation frame",
  /**
   * @description Text for the event that an animation frame is fired
   */
  animationFrameFired: "Animation frame fired",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  requestIdleCallback: "Request idle callback",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  cancelIdleCallback: "Cancel idle callback",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  fireIdleCallback: "Fire idle callback",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  createWebsocket: "Create WebSocket",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  sendWebsocketHandshake: "Send WebSocket handshake",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  receiveWebsocketHandshake: "Receive WebSocket handshake",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  wsMessageReceived: "Receive WebSocket message",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  wsMessageSent: "Send WebSocket message",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  destroyWebsocket: "Destroy WebSocket",
  /**
   * @description Event category in the Performance panel for time spent in the embedder of the WebView
   */
  embedderCallback: "Embedder callback",
  /**
   * @description Event category in the Performance panel for time spent decoding an image
   */
  imageDecode: "Image decode",
  /**
   * @description Event category in the Performance panel for time spent to perform Garbage Collection for the Document Object Model
   */
  domGc: "DOM GC",
  /**
   * @description Event category in the Performance panel for time spent to perform Garbage Collection for C++: https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md
   */
  cppGc: "C++ GC",
  /**
   * @description Event category in the Performance panel for time spent to perform encryption
   */
  encrypt: "Encrypt",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  encryptReply: "Encrypt reply",
  /**
   * @description Event category in the Performance panel for time spent to perform decryption
   */
  decrypt: "Decrypt",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  decryptReply: "Decrypt reply",
  /**
   * @description Noun phrase meaning 'the browser was preparing the digest'.
   * Digest: https://developer.mozilla.org/en-US/docs/Glossary/Digest
   */
  digest: "Digest",
  /**
   * @description Noun phrase meaning 'the browser was preparing the digest
   *reply'. Digest: https://developer.mozilla.org/en-US/docs/Glossary/Digest
   */
  digestReply: "Digest reply",
  /**
   * @description The 'sign' stage of a web crypto event. Shown when displaying what the website was doing at a particular point in time.
   */
  sign: "Sign",
  /**
   * @description Noun phrase for an event of the Web Crypto API. The event is recorded when the signing process is concluded.
   * Signature: https://developer.mozilla.org/en-US/docs/Glossary/Signature/Security
   */
  signReply: "Sign reply",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  verify: "Verify",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  verifyReply: "Verify reply",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  asyncTask: "Async task",
  /**
   * @description Text in Timeline for Layout Shift records
   */
  layoutShift: "Layout shift",
  /**
   * @description Text in Timeline for Layout Shift records
   */
  layoutShiftCluster: "Layout shift cluster",
  /**
   * @description Text in Timeline for an Event Timing record
   */
  eventTiming: "Event timing",
  /**
   * @description Event category in the Performance panel for JavaScript nodes in CPUProfile
   */
  jsFrame: "JS frame",
  /**
   * @description Text in UIDevtools Utils of the Performance panel
   */
  rasterizing: "Rasterizing",
  /**
   * @description Text in UIDevtools Utils of the Performance panel
   */
  drawing: "Drawing",
  /**
   * @description Label for an event in the Performance panel indicating that a
   * callback function has been scheduled to run at a later time using the
   * postTask API.
   */
  schedulePostTaskCallback: "Schedule postTask",
  /**
   * @description Label for an event in the Performance panel indicating that a
   * callback function that was scheduled to run using the postTask API was
   * fired (invoked).
   */
  runPostTaskCallback: "Fire postTask",
  /**
   * @description Label for an event in the Performance panel indicating that a
   * callback function that was scheduled to run at a later time using the
   * postTask API was cancelled, so will no longer run.
   */
  abortPostTaskCallback: "Cancel postTask"
};
var EventCategory;
(function(EventCategory2) {
  EventCategory2["DRAWING"] = "drawing";
  EventCategory2["RASTERIZING"] = "rasterizing";
  EventCategory2["LAYOUT"] = "layout";
  EventCategory2["LOADING"] = "loading";
  EventCategory2["EXPERIENCE"] = "experience";
  EventCategory2["SCRIPTING"] = "scripting";
  EventCategory2["MESSAGING"] = "messaging";
  EventCategory2["RENDERING"] = "rendering";
  EventCategory2["PAINTING"] = "painting";
  EventCategory2["GPU"] = "gpu";
  EventCategory2["ASYNC"] = "async";
  EventCategory2["OTHER"] = "other";
  EventCategory2["IDLE"] = "idle";
})(EventCategory || (EventCategory = {}));
var mainEventCategories;
var str_ = i18n.i18n.registerUIStrings("models/trace/Styles.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var TimelineRecordStyle = class {
  title;
  category;
  hidden;
  constructor(title, category, hidden = false) {
    this.title = title;
    this.category = category;
    this.hidden = hidden;
  }
};
var TimelineCategory = class {
  name;
  title;
  visible;
  #hidden;
  #cssVariable;
  constructor(name, title, visible, cssVariable) {
    this.name = name;
    this.title = title;
    this.visible = visible;
    this.#cssVariable = cssVariable;
    this.hidden = false;
  }
  get hidden() {
    return Boolean(this.#hidden);
  }
  get cssVariable() {
    return this.#cssVariable;
  }
  getCSSValue() {
    return `var(${this.#cssVariable})`;
  }
  set hidden(hidden) {
    this.#hidden = hidden;
  }
};
var categoryStyles;
var eventStylesMap;
function getEventStyle(eventName) {
  return maybeInitSylesMap()[eventName];
}
function stringIsEventCategory(it) {
  return Object.values(EventCategory).includes(it);
}
function getCategoryStyles() {
  if (categoryStyles) {
    return categoryStyles;
  }
  categoryStyles = {
    loading: new TimelineCategory(EventCategory.LOADING, i18nString(UIStrings.loading), true, "--app-color-loading"),
    experience: new TimelineCategory(EventCategory.EXPERIENCE, i18nString(UIStrings.experience), false, "--app-color-rendering"),
    messaging: new TimelineCategory(EventCategory.MESSAGING, i18nString(UIStrings.messaging), true, "--app-color-messaging"),
    scripting: new TimelineCategory(EventCategory.SCRIPTING, i18nString(UIStrings.scripting), true, "--app-color-scripting"),
    rendering: new TimelineCategory(EventCategory.RENDERING, i18nString(UIStrings.rendering), true, "--app-color-rendering"),
    painting: new TimelineCategory(EventCategory.PAINTING, i18nString(UIStrings.painting), true, "--app-color-painting"),
    gpu: new TimelineCategory(EventCategory.GPU, i18nString(UIStrings.gpu), false, "--app-color-painting"),
    async: new TimelineCategory(EventCategory.ASYNC, i18nString(UIStrings.async), false, "--app-color-async"),
    other: new TimelineCategory(EventCategory.OTHER, i18nString(UIStrings.system), false, "--app-color-system"),
    idle: new TimelineCategory(EventCategory.IDLE, i18nString(UIStrings.idle), false, "--app-color-idle"),
    layout: new TimelineCategory(EventCategory.LAYOUT, i18nString(UIStrings.layout), false, "--app-color-loading"),
    rasterizing: new TimelineCategory(EventCategory.RASTERIZING, i18nString(UIStrings.rasterizing), false, "--app-color-scripting"),
    drawing: new TimelineCategory(EventCategory.DRAWING, i18nString(UIStrings.drawing), false, "--app-color-rendering")
  };
  return categoryStyles;
}
function maybeInitSylesMap() {
  if (eventStylesMap) {
    return eventStylesMap;
  }
  const defaultCategoryStyles = getCategoryStyles();
  eventStylesMap = {
    [
      "RunTask"
      /* Types.Events.Name.RUN_TASK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.task), defaultCategoryStyles.other),
    [
      "ProfileCall"
      /* Types.Events.Name.PROFILE_CALL */
    ]: new TimelineRecordStyle(i18nString(UIStrings.jsFrame), defaultCategoryStyles.scripting),
    [
      "JSSample"
      /* Types.Events.Name.JS_SAMPLE */
    ]: new TimelineRecordStyle("JSSample", defaultCategoryStyles.scripting),
    [
      "Program"
      /* Types.Events.Name.PROGRAM */
    ]: new TimelineRecordStyle(i18nString(UIStrings.other), defaultCategoryStyles.other),
    [
      "CpuProfiler::StartProfiling"
      /* Types.Events.Name.START_PROFILING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.profilingOverhead), defaultCategoryStyles.other),
    [
      "Animation"
      /* Types.Events.Name.ANIMATION */
    ]: new TimelineRecordStyle(i18nString(UIStrings.animation), defaultCategoryStyles.rendering),
    [
      "EventDispatch"
      /* Types.Events.Name.EVENT_DISPATCH */
    ]: new TimelineRecordStyle(i18nString(UIStrings.event), defaultCategoryStyles.scripting),
    [
      "RequestMainThreadFrame"
      /* Types.Events.Name.REQUEST_MAIN_THREAD_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.requestMainThreadFrame), defaultCategoryStyles.rendering, true),
    [
      "BeginFrame"
      /* Types.Events.Name.BEGIN_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.frameStart), defaultCategoryStyles.rendering, true),
    [
      "BeginMainThreadFrame"
      /* Types.Events.Name.BEGIN_MAIN_THREAD_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.frameStartMainThread), defaultCategoryStyles.rendering, true),
    [
      "DrawFrame"
      /* Types.Events.Name.DRAW_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.drawFrame), defaultCategoryStyles.rendering, true),
    [
      "HitTest"
      /* Types.Events.Name.HIT_TEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.hitTest), defaultCategoryStyles.rendering),
    [
      "ScheduleStyleRecalculation"
      /* Types.Events.Name.SCHEDULE_STYLE_RECALCULATION */
    ]: new TimelineRecordStyle(i18nString(UIStrings.scheduleStyleRecalculation), defaultCategoryStyles.rendering),
    [
      "UpdateLayoutTree"
      /* Types.Events.Name.RECALC_STYLE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.recalculateStyle), defaultCategoryStyles.rendering),
    [
      "InvalidateLayout"
      /* Types.Events.Name.INVALIDATE_LAYOUT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.invalidateLayout), defaultCategoryStyles.rendering, true),
    [
      "Layerize"
      /* Types.Events.Name.LAYERIZE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.layerize), defaultCategoryStyles.rendering),
    [
      "Layout"
      /* Types.Events.Name.LAYOUT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.layout), defaultCategoryStyles.rendering),
    [
      "PaintSetup"
      /* Types.Events.Name.PAINT_SETUP */
    ]: new TimelineRecordStyle(i18nString(UIStrings.paintSetup), defaultCategoryStyles.painting),
    [
      "PaintImage"
      /* Types.Events.Name.PAINT_IMAGE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.paintImage), defaultCategoryStyles.painting, true),
    [
      "UpdateLayer"
      /* Types.Events.Name.UPDATE_LAYER */
    ]: new TimelineRecordStyle(i18nString(UIStrings.updateLayer), defaultCategoryStyles.painting, true),
    [
      "UpdateLayerTree"
      /* Types.Events.Name.UPDATE_LAYER_TREE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.updateLayerTree), defaultCategoryStyles.rendering),
    [
      "Paint"
      /* Types.Events.Name.PAINT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.paint), defaultCategoryStyles.painting),
    [
      "PrePaint"
      /* Types.Events.Name.PRE_PAINT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.prePaint), defaultCategoryStyles.rendering),
    [
      "RasterTask"
      /* Types.Events.Name.RASTER_TASK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.rasterizePaint), defaultCategoryStyles.painting),
    [
      "ScrollLayer"
      /* Types.Events.Name.SCROLL_LAYER */
    ]: new TimelineRecordStyle(i18nString(UIStrings.scroll), defaultCategoryStyles.rendering),
    [
      "Commit"
      /* Types.Events.Name.COMMIT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.commit), defaultCategoryStyles.painting),
    [
      "CompositeLayers"
      /* Types.Events.Name.COMPOSITE_LAYERS */
    ]: new TimelineRecordStyle(i18nString(UIStrings.compositeLayers), defaultCategoryStyles.painting),
    [
      "ComputeIntersections"
      /* Types.Events.Name.COMPUTE_INTERSECTION */
    ]: new TimelineRecordStyle(i18nString(UIStrings.computeIntersections), defaultCategoryStyles.rendering),
    [
      "ParseHTML"
      /* Types.Events.Name.PARSE_HTML */
    ]: new TimelineRecordStyle(i18nString(UIStrings.parseHtml), defaultCategoryStyles.loading),
    [
      "ParseAuthorStyleSheet"
      /* Types.Events.Name.PARSE_AUTHOR_STYLE_SHEET */
    ]: new TimelineRecordStyle(i18nString(UIStrings.parseStylesheet), defaultCategoryStyles.loading),
    [
      "TimerInstall"
      /* Types.Events.Name.TIMER_INSTALL */
    ]: new TimelineRecordStyle(i18nString(UIStrings.installTimer), defaultCategoryStyles.scripting),
    [
      "TimerRemove"
      /* Types.Events.Name.TIMER_REMOVE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.removeTimer), defaultCategoryStyles.scripting),
    [
      "TimerFire"
      /* Types.Events.Name.TIMER_FIRE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.timerFired), defaultCategoryStyles.scripting),
    [
      "XHRReadyStateChange"
      /* Types.Events.Name.XHR_READY_STATE_CHANGED */
    ]: new TimelineRecordStyle(i18nString(UIStrings.xhrReadyStateChange), defaultCategoryStyles.scripting),
    [
      "XHRLoad"
      /* Types.Events.Name.XHR_LOAD */
    ]: new TimelineRecordStyle(i18nString(UIStrings.xhrLoad), defaultCategoryStyles.scripting),
    [
      "v8.compile"
      /* Types.Events.Name.COMPILE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.compileScript), defaultCategoryStyles.scripting),
    [
      "v8.produceCache"
      /* Types.Events.Name.CACHE_SCRIPT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cacheScript), defaultCategoryStyles.scripting),
    [
      "V8.CompileCode"
      /* Types.Events.Name.COMPILE_CODE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.compileCode), defaultCategoryStyles.scripting),
    [
      "V8.OptimizeCode"
      /* Types.Events.Name.OPTIMIZE_CODE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.optimizeCode), defaultCategoryStyles.scripting),
    [
      "EvaluateScript"
      /* Types.Events.Name.EVALUATE_SCRIPT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.evaluateScript), defaultCategoryStyles.scripting),
    [
      "V8.CompileModule"
      /* Types.Events.Name.COMPILE_MODULE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.compileModule), defaultCategoryStyles.scripting),
    [
      "v8.produceModuleCache"
      /* Types.Events.Name.CACHE_MODULE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cacheModule), defaultCategoryStyles.scripting),
    [
      "v8.evaluateModule"
      /* Types.Events.Name.EVALUATE_MODULE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.evaluateModule), defaultCategoryStyles.scripting),
    [
      "v8.parseOnBackground"
      /* Types.Events.Name.STREAMING_COMPILE_SCRIPT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.streamingCompileTask), defaultCategoryStyles.other),
    [
      "v8.parseOnBackgroundWaiting"
      /* Types.Events.Name.STREAMING_COMPILE_SCRIPT_WAITING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.waitingForNetwork), defaultCategoryStyles.idle),
    [
      "v8.parseOnBackgroundParsing"
      /* Types.Events.Name.STREAMING_COMPILE_SCRIPT_PARSING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.parseAndCompile), defaultCategoryStyles.scripting),
    [
      "v8.deserializeOnBackground"
      /* Types.Events.Name.BACKGROUND_DESERIALIZE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.deserializeCodeCache), defaultCategoryStyles.scripting),
    [
      "V8.FinalizeDeserialization"
      /* Types.Events.Name.FINALIZE_DESERIALIZATION */
    ]: new TimelineRecordStyle(i18nString(UIStrings.profilingOverhead), defaultCategoryStyles.other),
    [
      "v8.wasm.streamFromResponseCallback"
      /* Types.Events.Name.WASM_STREAM_FROM_RESPONSE_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.streamingWasmResponse), defaultCategoryStyles.scripting),
    [
      "v8.wasm.compiledModule"
      /* Types.Events.Name.WASM_COMPILED_MODULE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.compiledWasmModule), defaultCategoryStyles.scripting),
    [
      "v8.wasm.cachedModule"
      /* Types.Events.Name.WASM_CACHED_MODULE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cachedWasmModule), defaultCategoryStyles.scripting),
    [
      "v8.wasm.moduleCacheHit"
      /* Types.Events.Name.WASM_MODULE_CACHE_HIT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.wasmModuleCacheHit), defaultCategoryStyles.scripting),
    [
      "v8.wasm.moduleCacheInvalid"
      /* Types.Events.Name.WASM_MODULE_CACHE_INVALID */
    ]: new TimelineRecordStyle(i18nString(UIStrings.wasmModuleCacheInvalid), defaultCategoryStyles.scripting),
    [
      "FrameStartedLoading"
      /* Types.Events.Name.FRAME_STARTED_LOADING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.frameStartedLoading), defaultCategoryStyles.loading, true),
    [
      "MarkLoad"
      /* Types.Events.Name.MARK_LOAD */
    ]: new TimelineRecordStyle(i18nString(UIStrings.onloadEvent), defaultCategoryStyles.scripting, true),
    [
      "MarkDOMContent"
      /* Types.Events.Name.MARK_DOM_CONTENT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.domcontentloadedEvent), defaultCategoryStyles.scripting, true),
    [
      "firstPaint"
      /* Types.Events.Name.MARK_FIRST_PAINT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.firstPaint), defaultCategoryStyles.painting, true),
    [
      "firstContentfulPaint"
      /* Types.Events.Name.MARK_FCP */
    ]: new TimelineRecordStyle(i18nString(UIStrings.firstContentfulPaint), defaultCategoryStyles.rendering, true),
    [
      "largestContentfulPaint::Candidate"
      /* Types.Events.Name.MARK_LCP_CANDIDATE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.largestContentfulPaint), defaultCategoryStyles.rendering, true),
    [
      "TimeStamp"
      /* Types.Events.Name.TIME_STAMP */
    ]: new TimelineRecordStyle(i18nString(UIStrings.timestamp), defaultCategoryStyles.scripting),
    [
      "ConsoleTime"
      /* Types.Events.Name.CONSOLE_TIME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.consoleTime), defaultCategoryStyles.scripting),
    [
      "UserTiming"
      /* Types.Events.Name.USER_TIMING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.userTiming), defaultCategoryStyles.scripting),
    [
      "ResourceWillSendRequest"
      /* Types.Events.Name.RESOURCE_WILL_SEND_REQUEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.willSendRequest), defaultCategoryStyles.loading),
    [
      "ResourceSendRequest"
      /* Types.Events.Name.RESOURCE_SEND_REQUEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.sendRequest), defaultCategoryStyles.loading),
    [
      "ResourceReceiveResponse"
      /* Types.Events.Name.RESOURCE_RECEIVE_RESPONSE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.receiveResponse), defaultCategoryStyles.loading),
    [
      "ResourceFinish"
      /* Types.Events.Name.RESOURCE_FINISH */
    ]: new TimelineRecordStyle(i18nString(UIStrings.finishLoading), defaultCategoryStyles.loading),
    [
      "ResourceReceivedData"
      /* Types.Events.Name.RESOURCE_RECEIVE_DATA */
    ]: new TimelineRecordStyle(i18nString(UIStrings.receiveData), defaultCategoryStyles.loading),
    [
      "RunMicrotasks"
      /* Types.Events.Name.RUN_MICROTASKS */
    ]: new TimelineRecordStyle(i18nString(UIStrings.runMicrotasks), defaultCategoryStyles.scripting),
    [
      "FunctionCall"
      /* Types.Events.Name.FUNCTION_CALL */
    ]: new TimelineRecordStyle(i18nString(UIStrings.functionCall), defaultCategoryStyles.scripting),
    [
      "GCEvent"
      /* Types.Events.Name.GC */
    ]: new TimelineRecordStyle(i18nString(UIStrings.gcEvent), defaultCategoryStyles.scripting),
    [
      "MajorGC"
      /* Types.Events.Name.MAJOR_GC */
    ]: new TimelineRecordStyle(i18nString(UIStrings.majorGc), defaultCategoryStyles.scripting),
    [
      "MinorGC"
      /* Types.Events.Name.MINOR_GC */
    ]: new TimelineRecordStyle(i18nString(UIStrings.minorGc), defaultCategoryStyles.scripting),
    [
      "CppGC.IncrementalSweep"
      /* Types.Events.Name.CPPGC_SWEEP */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cppGc), defaultCategoryStyles.scripting),
    [
      "RequestAnimationFrame"
      /* Types.Events.Name.REQUEST_ANIMATION_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.requestAnimationFrame), defaultCategoryStyles.scripting),
    [
      "CancelAnimationFrame"
      /* Types.Events.Name.CANCEL_ANIMATION_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cancelAnimationFrame), defaultCategoryStyles.scripting),
    [
      "FireAnimationFrame"
      /* Types.Events.Name.FIRE_ANIMATION_FRAME */
    ]: new TimelineRecordStyle(i18nString(UIStrings.animationFrameFired), defaultCategoryStyles.scripting),
    [
      "RequestIdleCallback"
      /* Types.Events.Name.REQUEST_IDLE_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.requestIdleCallback), defaultCategoryStyles.scripting),
    [
      "CancelIdleCallback"
      /* Types.Events.Name.CANCEL_IDLE_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.cancelIdleCallback), defaultCategoryStyles.scripting),
    [
      "FireIdleCallback"
      /* Types.Events.Name.FIRE_IDLE_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.fireIdleCallback), defaultCategoryStyles.scripting),
    [
      "WebSocketCreate"
      /* Types.Events.Name.WEB_SOCKET_CREATE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.createWebsocket), defaultCategoryStyles.scripting),
    [
      "WebSocketSendHandshakeRequest"
      /* Types.Events.Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.sendWebsocketHandshake), defaultCategoryStyles.scripting),
    [
      "WebSocketReceiveHandshakeResponse"
      /* Types.Events.Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.receiveWebsocketHandshake), defaultCategoryStyles.scripting),
    [
      "WebSocketDestroy"
      /* Types.Events.Name.WEB_SOCKET_DESTROY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.destroyWebsocket), defaultCategoryStyles.scripting),
    [
      "WebSocketSend"
      /* Types.Events.Name.WEB_SOCKET_SEND */
    ]: new TimelineRecordStyle(i18nString(UIStrings.wsMessageSent), defaultCategoryStyles.scripting),
    [
      "WebSocketReceive"
      /* Types.Events.Name.WEB_SOCKET_RECEIVE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.wsMessageReceived), defaultCategoryStyles.scripting),
    [
      "EmbedderCallback"
      /* Types.Events.Name.EMBEDDER_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.embedderCallback), defaultCategoryStyles.scripting),
    [
      "Decode Image"
      /* Types.Events.Name.DECODE_IMAGE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.imageDecode), defaultCategoryStyles.painting),
    [
      "GPUTask"
      /* Types.Events.Name.GPU_TASK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.gpu), defaultCategoryStyles.gpu),
    [
      "BlinkGC.AtomicPhase"
      /* Types.Events.Name.GC_COLLECT_GARBARGE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.domGc), defaultCategoryStyles.scripting),
    [
      "DoEncrypt"
      /* Types.Events.Name.CRYPTO_DO_ENCRYPT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.encrypt), defaultCategoryStyles.scripting),
    [
      "DoEncryptReply"
      /* Types.Events.Name.CRYPTO_DO_ENCRYPT_REPLY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.encryptReply), defaultCategoryStyles.scripting),
    [
      "DoDecrypt"
      /* Types.Events.Name.CRYPTO_DO_DECRYPT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.decrypt), defaultCategoryStyles.scripting),
    [
      "DoDecryptReply"
      /* Types.Events.Name.CRYPTO_DO_DECRYPT_REPLY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.decryptReply), defaultCategoryStyles.scripting),
    [
      "DoDigest"
      /* Types.Events.Name.CRYPTO_DO_DIGEST */
    ]: new TimelineRecordStyle(i18nString(UIStrings.digest), defaultCategoryStyles.scripting),
    [
      "DoDigestReply"
      /* Types.Events.Name.CRYPTO_DO_DIGEST_REPLY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.digestReply), defaultCategoryStyles.scripting),
    [
      "DoSign"
      /* Types.Events.Name.CRYPTO_DO_SIGN */
    ]: new TimelineRecordStyle(i18nString(UIStrings.sign), defaultCategoryStyles.scripting),
    [
      "DoSignReply"
      /* Types.Events.Name.CRYPTO_DO_SIGN_REPLY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.signReply), defaultCategoryStyles.scripting),
    [
      "DoVerify"
      /* Types.Events.Name.CRYPTO_DO_VERIFY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.verify), defaultCategoryStyles.scripting),
    [
      "DoVerifyReply"
      /* Types.Events.Name.CRYPTO_DO_VERIFY_REPLY */
    ]: new TimelineRecordStyle(i18nString(UIStrings.verifyReply), defaultCategoryStyles.scripting),
    [
      "AsyncTask"
      /* Types.Events.Name.ASYNC_TASK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.asyncTask), defaultCategoryStyles.async),
    [
      "LayoutShift"
      /* Types.Events.Name.LAYOUT_SHIFT */
    ]: new TimelineRecordStyle(
      i18nString(UIStrings.layoutShift),
      defaultCategoryStyles.experience,
      /* Mark LayoutShifts as hidden; in the timeline we render
      * SyntheticLayoutShifts so those are the ones visible to the user */
      true
    ),
    [
      "SyntheticLayoutShift"
      /* Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT */
    ]: new TimelineRecordStyle(i18nString(UIStrings.layoutShift), defaultCategoryStyles.experience),
    [
      "SyntheticLayoutShiftCluster"
      /* Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT_CLUSTER */
    ]: new TimelineRecordStyle(i18nString(UIStrings.layoutShiftCluster), defaultCategoryStyles.experience),
    [
      "EventTiming"
      /* Types.Events.Name.EVENT_TIMING */
    ]: new TimelineRecordStyle(i18nString(UIStrings.eventTiming), defaultCategoryStyles.experience),
    [
      "HandlePostMessage"
      /* Types.Events.Name.HANDLE_POST_MESSAGE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.onMessage), defaultCategoryStyles.messaging),
    [
      "SchedulePostMessage"
      /* Types.Events.Name.SCHEDULE_POST_MESSAGE */
    ]: new TimelineRecordStyle(i18nString(UIStrings.schedulePostMessage), defaultCategoryStyles.messaging),
    [
      "SchedulePostTaskCallback"
      /* Types.Events.Name.SCHEDULE_POST_TASK_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.schedulePostTaskCallback), defaultCategoryStyles.scripting),
    [
      "RunPostTaskCallback"
      /* Types.Events.Name.RUN_POST_TASK_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.runPostTaskCallback), defaultCategoryStyles.scripting),
    [
      "AbortPostTaskCallback"
      /* Types.Events.Name.ABORT_POST_TASK_CALLBACK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.abortPostTaskCallback), defaultCategoryStyles.scripting),
    [
      "V8Console::runTask"
      /* Types.Events.Name.V8_CONSOLE_RUN_TASK */
    ]: new TimelineRecordStyle(i18nString(UIStrings.consoleTaskRun), defaultCategoryStyles.scripting)
  };
  const visibleEventStyles = Object.entries(eventStylesMap).filter(([, style]) => style.hidden === false).map(([key]) => key);
  const visibleTraceEventsComplete = visibleEventStyles.every((eventType) => {
    return Helpers6.Trace.VISIBLE_TRACE_EVENT_TYPES.has(eventType);
  });
  const eventStylesMapKeys = Object.keys(eventStylesMap);
  const eventStylesComplete = Array.from(Helpers6.Trace.VISIBLE_TRACE_EVENT_TYPES).every((eventType) => {
    return eventStylesMapKeys.includes(eventType);
  });
  if (!visibleTraceEventsComplete || !eventStylesComplete) {
    throw new Error("eventStylesMap and VISIBLE_TRACE_EVENT_TYPES are out of sync!");
  }
  return eventStylesMap;
}
function setEventStylesMap(eventStyles) {
  eventStylesMap = eventStyles;
}
function setCategories(cats) {
  categoryStyles = cats;
}
function visibleTypes() {
  const eventStyles = maybeInitSylesMap();
  const result = [];
  for (const name in eventStyles) {
    const nameAsKey = name;
    if (!eventStyles[nameAsKey]?.hidden) {
      result.push(name);
    }
  }
  return result;
}
function getTimelineMainEventCategories() {
  if (mainEventCategories) {
    return mainEventCategories;
  }
  mainEventCategories = [
    EventCategory.IDLE,
    EventCategory.LOADING,
    EventCategory.PAINTING,
    EventCategory.RENDERING,
    EventCategory.SCRIPTING,
    EventCategory.OTHER
  ];
  return mainEventCategories;
}
function setTimelineMainEventCategories(categories) {
  mainEventCategories = categories;
}
function markerDetailsForEvent(event) {
  let title = "";
  let color = "var(--color-text-primary)";
  if (Types5.Events.isFirstContentfulPaint(event)) {
    color = "var(--sys-color-green-bright)";
    title = "FCP";
  }
  if (Types5.Events.isLargestContentfulPaintCandidate(event)) {
    color = "var(--sys-color-green)";
    title = "LCP";
  }
  if (Types5.Events.isNavigationStart(event)) {
    color = "var(--color-text-primary)";
    title = "Nav";
  }
  if (Types5.Events.isMarkDOMContent(event)) {
    color = "var(--color-text-disabled)";
    title = "DCL";
  }
  if (Types5.Events.isMarkLoad(event)) {
    color = "var(--color-text-disabled)";
    title = "L";
  }
  return { color, title };
}

// gen/front_end/models/trace/Name.js
import * as Types6 from "./types/types.js";
var UIStrings2 = {
  /**
   * @description Text shown for an entry in the flame chart that has no explicit name.
   */
  anonymous: "(anonymous)",
  /**
   * @description Text used to show an EventDispatch event which has a type associated with it
   * @example {click} PH1
   */
  eventDispatchS: "Event: {PH1}",
  /**
   * @description Text shown for an entry in the flame chart that represents a frame.
   */
  frame: "Frame",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  wsConnectionOpened: "WebSocket opened",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   * @example {ws://example.com} PH1
   */
  wsConnectionOpenedWithUrl: "WebSocket opened: {PH1}",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  wsConnectionClosed: "WebSocket closed",
  /**
   * @description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShift: "Layout shift"
};
var str_2 = i18n3.i18n.registerUIStrings("models/trace/Name.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
function forEntry(entry, parsedTrace) {
  if (Types6.Events.isProfileCall(entry)) {
    if (parsedTrace) {
      const potentialCallName = Handlers6.ModelHandlers.Samples.getProfileCallFunctionName(parsedTrace.data.Samples, entry);
      if (potentialCallName) {
        return potentialCallName;
      }
    }
    return entry.callFrame.functionName || i18nString2(UIStrings2.anonymous);
  }
  if (Types6.Events.isLegacyTimelineFrame(entry)) {
    return i18n3.i18n.lockedString(UIStrings2.frame);
  }
  if (Types6.Events.isDispatch(entry)) {
    return i18nString2(UIStrings2.eventDispatchS, { PH1: entry.args.data.type });
  }
  if (Types6.Events.isSyntheticNetworkRequest(entry)) {
    const parsedURL = new Common2.ParsedURL.ParsedURL(entry.args.data.url);
    const text = parsedURL.isValid ? `${parsedURL.displayName} (${parsedURL.host})` : entry.args.data.url || "Network request";
    return text;
  }
  if (Types6.Events.isWebSocketCreate(entry)) {
    if (entry.args.data.url) {
      return i18nString2(UIStrings2.wsConnectionOpenedWithUrl, { PH1: entry.args.data.url });
    }
    return i18nString2(UIStrings2.wsConnectionOpened);
  }
  if (Types6.Events.isWebSocketDestroy(entry)) {
    return i18nString2(UIStrings2.wsConnectionClosed);
  }
  if (Types6.Events.isSyntheticInteraction(entry)) {
    return nameForInteractionEvent(entry);
  }
  if (Types6.Events.isSyntheticLayoutShift(entry)) {
    return i18nString2(UIStrings2.layoutShift);
  }
  if (Types6.Events.isSyntheticAnimation(entry) && entry.args.data.beginEvent.args.data.displayName) {
    return entry.args.data.beginEvent.args.data.displayName;
  }
  const eventStyleCustomName = getEventStyle(entry.name)?.title;
  return eventStyleCustomName || entry.name;
}
function nameForInteractionEvent(event) {
  const category = Handlers6.ModelHandlers.UserInteractions.categoryOfInteraction(event);
  if (category === "OTHER") {
    return "Other";
  }
  if (category === "KEYBOARD") {
    return "Keyboard";
  }
  if (category === "POINTER") {
    return "Pointer";
  }
  return event.type;
}

// gen/front_end/models/trace/trace.prebundle.js
import * as Types7 from "./types/types.js";
export {
  EntityMapper_exports as EntityMapper,
  EventsSerializer_exports as EventsSerializer,
  Extras,
  Handlers7 as Handlers,
  Helpers7 as Helpers,
  Insights2 as Insights,
  Lantern3 as Lantern,
  LanternComputationData_exports as LanternComputationData,
  Name_exports as Name,
  Processor_exports as Processor,
  Styles_exports as Styles,
  ModelImpl_exports as TraceModel,
  Types7 as Types
};
//# sourceMappingURL=trace.js.map
