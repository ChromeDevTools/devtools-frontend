var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/handlers/helpers.js
var helpers_exports = {};
__export(helpers_exports, {
  addEventToEntityMapping: () => addEventToEntityMapping,
  addNetworkRequestToEntityMapping: () => addNetworkRequestToEntityMapping,
  getEntityForEvent: () => getEntityForEvent,
  getEntityForUrl: () => getEntityForUrl,
  getNonResolvedURL: () => getNonResolvedURL,
  makeUpEntity: () => makeUpEntity
});
import * as ThirdPartyWeb from "./../../../third_party/third-party-web/third-party-web.js";
import * as Types from "./../types/types.js";
function getEntityForEvent(event, entityMappings3) {
  const url = getNonResolvedURL(event);
  if (!url) {
    return;
  }
  return getEntityForUrl(url, entityMappings3);
}
function getEntityForUrl(url, entityMappings3) {
  const cachedByUrl = entityMappings3.entityByUrlCache.get(url);
  if (cachedByUrl) {
    return cachedByUrl;
  }
  const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ?? makeUpEntity(entityMappings3.createdEntityCache, url);
  if (entity) {
    entityMappings3.entityByUrlCache.set(url, entity);
  }
  return entity;
}
function getNonResolvedURL(entry, handlerData) {
  if (Types.Events.isProfileCall(entry)) {
    return entry.callFrame.url;
  }
  if (Types.Events.isSyntheticNetworkRequest(entry)) {
    return entry.args.data.url;
  }
  if (Types.Events.isParseAuthorStyleSheetEvent(entry) && entry.args) {
    return entry.args.data.stylesheetUrl;
  }
  if (entry.args?.data?.stackTrace && entry.args.data.stackTrace.length > 0) {
    return entry.args.data.stackTrace[0].url;
  }
  if (Types.Events.isParseHTML(entry)) {
    return entry.args.beginData.url;
  }
  if (handlerData) {
    if (Types.Events.isDecodeImage(entry)) {
      const paintEvent = handlerData.ImagePainting.paintImageForEvent.get(entry);
      return paintEvent ? getNonResolvedURL(paintEvent, handlerData) : null;
    }
    if (Types.Events.isDrawLazyPixelRef(entry) && entry.args?.LazyPixelRef) {
      const paintEvent = handlerData.ImagePainting.paintImageByDrawLazyPixelRef.get(entry.args.LazyPixelRef);
      return paintEvent ? getNonResolvedURL(paintEvent, handlerData) : null;
    }
  }
  if (entry.args?.data?.url) {
    return entry.args.data.url;
  }
  const requestId = entry.args?.data?.requestId;
  if (handlerData && requestId) {
    const url = handlerData.NetworkRequests.byId.get(requestId)?.args.data.url;
    if (url) {
      return url;
    }
  }
  return null;
}
function makeUpEntity(entityCache, url) {
  if (url.startsWith("chrome-extension:")) {
    return makeUpChromeExtensionEntity(entityCache, url);
  }
  if (!url.startsWith("http")) {
    return;
  }
  const rootDomain = ThirdPartyWeb.ThirdPartyWeb.getRootDomain(url);
  if (!rootDomain) {
    return;
  }
  if (entityCache.has(rootDomain)) {
    return entityCache.get(rootDomain);
  }
  const unrecognizedEntity = {
    name: rootDomain,
    company: rootDomain,
    category: "",
    categories: [],
    domains: [rootDomain],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0,
    isUnrecognized: true
  };
  entityCache.set(rootDomain, unrecognizedEntity);
  return unrecognizedEntity;
}
function getChromeExtensionOrigin(url) {
  return url.protocol + "//" + url.host;
}
function makeUpChromeExtensionEntity(entityCache, url, extensionName) {
  const parsedUrl = new URL(url);
  const origin = getChromeExtensionOrigin(parsedUrl);
  const host = new URL(origin).host;
  const name = extensionName || host;
  const cachedEntity = entityCache.get(origin);
  if (cachedEntity) {
    return cachedEntity;
  }
  const chromeExtensionEntity = {
    name,
    company: name,
    category: "Chrome Extension",
    homepage: "https://chromewebstore.google.com/detail/" + host,
    categories: [],
    domains: [origin],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0
  };
  entityCache.set(origin, chromeExtensionEntity);
  return chromeExtensionEntity;
}
function addEventToEntityMapping(event, entityMappings3) {
  if (entityMappings3.entityByEvent.has(event)) {
    return;
  }
  const entity = getEntityForEvent(event, entityMappings3);
  if (!entity) {
    return;
  }
  const mappedEvents = entityMappings3.eventsByEntity.get(entity);
  if (mappedEvents) {
    mappedEvents.push(event);
  } else {
    entityMappings3.eventsByEntity.set(entity, [event]);
  }
  entityMappings3.entityByEvent.set(event, entity);
}
function addNetworkRequestToEntityMapping(networkRequest, entityMappings3, requestTraceEvents) {
  const entity = getEntityForEvent(networkRequest, entityMappings3);
  if (!entity) {
    return;
  }
  const eventsToMap = [networkRequest, ...Object.values(requestTraceEvents).flat()];
  const mappedEvents = entityMappings3.eventsByEntity.get(entity);
  if (mappedEvents) {
    mappedEvents.push(...eventsToMap);
  } else {
    entityMappings3.eventsByEntity.set(entity, eventsToMap);
  }
  for (const evt of eventsToMap) {
    entityMappings3.entityByEvent.set(evt, entity);
  }
}

// gen/front_end/models/trace/handlers/ModelHandlers.js
var ModelHandlers_exports = {};
__export(ModelHandlers_exports, {
  AnimationFrames: () => AnimationFramesHandler_exports,
  Animations: () => AnimationHandler_exports,
  AsyncJSCalls: () => AsyncJSCallsHandler_exports,
  AuctionWorklets: () => AuctionWorkletsHandler_exports,
  DOMStats: () => DOMStatsHandler_exports,
  ExtensionTraceData: () => ExtensionTraceDataHandler_exports,
  Flows: () => FlowsHandler_exports,
  Frames: () => FramesHandler_exports,
  GPU: () => GPUHandler_exports,
  ImagePainting: () => ImagePaintingHandler_exports,
  Initiators: () => InitiatorsHandler_exports,
  Invalidations: () => InvalidationsHandler_exports,
  LargestImagePaint: () => LargestImagePaintHandler_exports,
  LargestTextPaint: () => LargestTextPaintHandler_exports,
  LayerTree: () => LayerTreeHandler_exports,
  LayoutShifts: () => LayoutShiftsHandler_exports,
  Memory: () => MemoryHandler_exports,
  Meta: () => MetaHandler_exports,
  NetworkRequests: () => NetworkRequestsHandler_exports,
  PageFrames: () => PageFramesHandler_exports,
  PageLoadMetrics: () => PageLoadMetricsHandler_exports,
  Renderer: () => RendererHandler_exports,
  Samples: () => SamplesHandler_exports,
  Screenshots: () => ScreenshotsHandler_exports,
  Scripts: () => ScriptsHandler_exports,
  SelectorStats: () => SelectorStatsHandler_exports,
  UserInteractions: () => UserInteractionsHandler_exports,
  UserTimings: () => UserTimingsHandler_exports,
  Warnings: () => WarningsHandler_exports,
  Workers: () => WorkersHandler_exports
});

// gen/front_end/models/trace/handlers/AnimationFramesHandler.js
var AnimationFramesHandler_exports = {};
__export(AnimationFramesHandler_exports, {
  data: () => data,
  deps: () => deps,
  finalize: () => finalize,
  handleEvent: () => handleEvent,
  handleUserConfig: () => handleUserConfig,
  reset: () => reset
});
import * as Helpers from "./../helpers/helpers.js";
import * as Types2 from "./../types/types.js";
function threadKey(data31) {
  return `${data31.pid}-${data31.tid}`;
}
var animationFrameStarts = /* @__PURE__ */ new Map();
var animationFrameEnds = /* @__PURE__ */ new Map();
var animationFramePresentations = /* @__PURE__ */ new Map();
var animationFrames = [];
var presentationForFrame = /* @__PURE__ */ new Map();
function reset() {
  animationFrameStarts = /* @__PURE__ */ new Map();
  animationFrameEnds = /* @__PURE__ */ new Map();
  animationFrames = [];
  presentationForFrame = /* @__PURE__ */ new Map();
  animationFramePresentations = /* @__PURE__ */ new Map();
  isEnabled = false;
}
var isEnabled = false;
function handleUserConfig(config3) {
  isEnabled = config3.enableAnimationsFrameHandler;
}
function handleEvent(event) {
  if (!isEnabled) {
    return;
  }
  if (Types2.Events.isAnimationFrameAsyncStart(event)) {
    const key = threadKey(event);
    const existing = animationFrameStarts.get(key) ?? [];
    existing.push(event);
    animationFrameStarts.set(key, existing);
  } else if (Types2.Events.isAnimationFrameAsyncEnd(event)) {
    const key = threadKey(event);
    const existing = animationFrameEnds.get(key) ?? [];
    existing.push(event);
    animationFrameEnds.set(key, existing);
  } else if (Types2.Events.isAnimationFramePresentation(event) && event.args?.id) {
    animationFramePresentations.set(event.args.id, event);
  }
}
async function finalize() {
  for (const [key, startEvents] of animationFrameStarts.entries()) {
    const endEvents = animationFrameEnds.get(key);
    if (!endEvents) {
      continue;
    }
    Helpers.Trace.sortTraceEventsInPlace(startEvents);
    Helpers.Trace.sortTraceEventsInPlace(endEvents);
    for (let i = 0; i < startEvents.length; i++) {
      const endEvent = endEvents.at(i);
      if (!endEvent) {
        break;
      }
      const startEvent = startEvents[i];
      const syntheticEvent = Helpers.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
        rawSourceEvent: startEvent,
        ...startEvent,
        dur: Types2.Timing.Micro(endEvent.ts - startEvent.ts),
        args: {
          data: {
            beginEvent: startEvent,
            endEvent
          }
        }
      });
      animationFrames.push(syntheticEvent);
      const id = startEvent.args?.id;
      if (id) {
        const presentationEvent = animationFramePresentations.get(id);
        if (presentationEvent) {
          presentationForFrame.set(syntheticEvent, presentationEvent);
        }
      }
    }
  }
}
function data() {
  return {
    animationFrames,
    presentationForFrame
  };
}
function deps() {
  return ["Meta"];
}

// gen/front_end/models/trace/handlers/AnimationHandler.js
var AnimationHandler_exports = {};
__export(AnimationHandler_exports, {
  data: () => data2,
  finalize: () => finalize2,
  handleEvent: () => handleEvent2,
  reset: () => reset2
});
import * as Helpers2 from "./../helpers/helpers.js";
import * as Types3 from "./../types/types.js";
var animations = [];
var animationsSyntheticEvents = [];
function reset2() {
  animations = [];
  animationsSyntheticEvents = [];
}
function handleEvent2(event) {
  if (Types3.Events.isAnimation(event)) {
    animations.push(event);
    return;
  }
}
async function finalize2() {
  const syntheticEvents2 = Helpers2.Trace.createMatchedSortedSyntheticEvents(animations);
  animationsSyntheticEvents.push(...syntheticEvents2);
}
function data2() {
  return {
    animations: animationsSyntheticEvents
  };
}

// gen/front_end/models/trace/handlers/AsyncJSCallsHandler.js
var AsyncJSCallsHandler_exports = {};
__export(AsyncJSCallsHandler_exports, {
  data: () => data9,
  deps: () => deps4,
  finalize: () => finalize9,
  handleEvent: () => handleEvent9,
  reset: () => reset9
});
import * as Platform6 from "./../../../core/platform/platform.js";
import * as Types10 from "./../types/types.js";

// gen/front_end/models/trace/handlers/FlowsHandler.js
var FlowsHandler_exports = {};
__export(FlowsHandler_exports, {
  data: () => data3,
  finalize: () => finalize3,
  handleEvent: () => handleEvent3,
  reset: () => reset3
});
import * as Platform from "./../../../core/platform/platform.js";
import * as Types4 from "./../types/types.js";
var flowDataByGroupToken = /* @__PURE__ */ new Map();
var boundFlowData = /* @__PURE__ */ new Map();
var flowsById = /* @__PURE__ */ new Map();
var flowEvents = [];
var nonFlowEvents = [];
var flows = [];
var ID_COMPONENT_SEPARATOR = "-$-";
function reset3() {
  flows = [];
  flowEvents = [];
  nonFlowEvents = [];
  flowDataByGroupToken = /* @__PURE__ */ new Map();
  boundFlowData = /* @__PURE__ */ new Map();
  flowsById = /* @__PURE__ */ new Map();
}
function handleEvent3(event) {
  if (Types4.Events.isFlowPhaseEvent(event)) {
    flowEvents.push(event);
    return;
  }
  nonFlowEvents.push(event);
}
function processNonFlowEvent(event) {
  const flowDataForEvent = boundFlowData.get(event.ts)?.get(event.pid)?.get(event.tid)?.get(event.cat);
  if (!flowDataForEvent) {
    return;
  }
  const { flows: flows2, bindingParsed } = flowDataForEvent;
  if (bindingParsed) {
    return;
  }
  for (const flowId of flows2) {
    const flow = Platform.MapUtilities.getWithDefault(flowsById, flowId, () => /* @__PURE__ */ new Map());
    flow.set(event.ts, event);
  }
  flowDataForEvent.bindingParsed = true;
}
function processFlowEvent(flowPhaseEvent) {
  const flowGroup = flowGroupTokenForFlowPhaseEvent(flowPhaseEvent);
  switch (flowPhaseEvent.ph) {
    case "s": {
      const flowMetadata = { flowId: flowPhaseEvent.id, times: /* @__PURE__ */ new Map([[flowPhaseEvent.ts, void 0]]) };
      flowDataByGroupToken.set(flowGroup, flowPhaseEvent.id);
      addFlowIdToEventBinding(flowPhaseEvent, flowMetadata.flowId);
      return;
    }
    case "t": {
      const flowId = flowDataByGroupToken.get(flowGroup);
      if (flowId === void 0) {
        return;
      }
      addFlowIdToEventBinding(flowPhaseEvent, flowId);
      return;
    }
    case "f": {
      const flowId = flowDataByGroupToken.get(flowGroup);
      if (flowId === void 0) {
        return;
      }
      addFlowIdToEventBinding(flowPhaseEvent, flowId);
      flowDataByGroupToken.delete(flowGroup);
    }
  }
}
function addFlowIdToEventBinding(event, flowId) {
  const flowsByPid = Platform.MapUtilities.getWithDefault(boundFlowData, event.ts, () => /* @__PURE__ */ new Map());
  const flowsByTid = Platform.MapUtilities.getWithDefault(flowsByPid, event.pid, () => /* @__PURE__ */ new Map());
  const flowsByCat = Platform.MapUtilities.getWithDefault(flowsByTid, event.tid, () => /* @__PURE__ */ new Map());
  const flowData = Platform.MapUtilities.getWithDefault(flowsByCat, event.cat, () => ({ flows: /* @__PURE__ */ new Set(), bindingParsed: false }));
  flowData.flows.add(flowId);
}
function flowGroupTokenForFlowPhaseEvent(event) {
  return `${event.cat}${ID_COMPONENT_SEPARATOR}${event.name}${ID_COMPONENT_SEPARATOR}${event.id}`;
}
async function finalize3() {
  flowEvents.forEach(processFlowEvent);
  nonFlowEvents.forEach(processNonFlowEvent);
  flows = [...flowsById.values()].map((flowMapping) => [...flowMapping.values()]).map((flow) => flow.filter((event) => event !== void 0)).filter((flow) => flow.length > 1);
}
function data3() {
  return {
    flows
  };
}

// gen/front_end/models/trace/handlers/RendererHandler.js
var RendererHandler_exports = {};
__export(RendererHandler_exports, {
  assignIsMainFrame: () => assignIsMainFrame,
  assignMeta: () => assignMeta,
  assignOrigin: () => assignOrigin,
  assignThreadName: () => assignThreadName,
  buildHierarchy: () => buildHierarchy,
  data: () => data8,
  deps: () => deps3,
  finalize: () => finalize8,
  handleEvent: () => handleEvent8,
  handleUserConfig: () => handleUserConfig2,
  makeCompleteEvent: () => makeCompleteEvent,
  reset: () => reset8,
  sanitizeProcesses: () => sanitizeProcesses,
  sanitizeThreads: () => sanitizeThreads
});
import * as Platform5 from "./../../../core/platform/platform.js";
import * as Helpers7 from "./../helpers/helpers.js";
import * as Types9 from "./../types/types.js";

// gen/front_end/models/trace/handlers/AuctionWorkletsHandler.js
var AuctionWorkletsHandler_exports = {};
__export(AuctionWorkletsHandler_exports, {
  data: () => data4,
  finalize: () => finalize4,
  handleEvent: () => handleEvent4,
  reset: () => reset4
});
import * as Helpers3 from "./../helpers/helpers.js";
import * as Types5 from "./../types/types.js";
var runningInProcessEvents = /* @__PURE__ */ new Map();
var doneWithProcessEvents = /* @__PURE__ */ new Map();
var createdSyntheticEvents = /* @__PURE__ */ new Map();
var utilityThreads = /* @__PURE__ */ new Map();
var v8HelperThreads = /* @__PURE__ */ new Map();
function reset4() {
  runningInProcessEvents = /* @__PURE__ */ new Map();
  doneWithProcessEvents = /* @__PURE__ */ new Map();
  createdSyntheticEvents = /* @__PURE__ */ new Map();
  utilityThreads = /* @__PURE__ */ new Map();
  v8HelperThreads = /* @__PURE__ */ new Map();
}
function handleEvent4(event) {
  if (Types5.Events.isAuctionWorkletRunningInProcess(event)) {
    runningInProcessEvents.set(event.args.data.pid, event);
    return;
  }
  if (Types5.Events.isAuctionWorkletDoneWithProcess(event)) {
    doneWithProcessEvents.set(event.args.data.pid, event);
    return;
  }
  if (Types5.Events.isThreadName(event)) {
    if (event.args.name === "auction_worklet.CrUtilityMain") {
      utilityThreads.set(event.pid, event);
      return;
    }
    if (event.args.name === "AuctionV8HelperThread") {
      v8HelperThreads.set(event.pid, event);
    }
  }
}
function workletType(input) {
  switch (input) {
    case "seller":
      return "seller";
    case "bidder":
      return "bidder";
    default:
      return "unknown";
  }
}
function makeSyntheticEventBase(event) {
  return Helpers3.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
    rawSourceEvent: event,
    name: "SyntheticAuctionWorklet",
    s: "t",
    cat: event.cat,
    tid: event.tid,
    ts: event.ts,
    ph: "I",
    pid: event.args.data.pid,
    host: event.args.data.host,
    target: event.args.data.target,
    type: workletType(event.args.data.type)
  });
}
async function finalize4() {
  for (const [pid, utilityThreadNameEvent] of utilityThreads) {
    const v8HelperEvent = v8HelperThreads.get(pid);
    if (!v8HelperEvent) {
      continue;
    }
    const runningEvent = runningInProcessEvents.get(pid);
    const doneWithEvent = doneWithProcessEvents.get(pid);
    let syntheticEvent = null;
    if (runningEvent) {
      syntheticEvent = {
        ...makeSyntheticEventBase(runningEvent),
        args: {
          data: {
            runningInProcessEvent: runningEvent,
            utilityThread: utilityThreadNameEvent,
            v8HelperThread: v8HelperEvent
          }
        }
      };
      if (doneWithEvent) {
        syntheticEvent.args.data.doneWithProcessEvent = doneWithEvent;
      }
    } else if (doneWithEvent) {
      syntheticEvent = {
        ...makeSyntheticEventBase(doneWithEvent),
        args: {
          data: {
            doneWithProcessEvent: doneWithEvent,
            utilityThread: utilityThreadNameEvent,
            v8HelperThread: v8HelperEvent
          }
        }
      };
      if (runningEvent) {
        syntheticEvent.args.data.runningInProcessEvent = runningEvent;
      }
    }
    if (syntheticEvent === null) {
      continue;
    }
    createdSyntheticEvents.set(pid, syntheticEvent);
  }
}
function data4() {
  return {
    worklets: createdSyntheticEvents
  };
}

// gen/front_end/models/trace/handlers/MetaHandler.js
var MetaHandler_exports = {};
__export(MetaHandler_exports, {
  data: () => data5,
  finalize: () => finalize5,
  handleEvent: () => handleEvent5,
  reset: () => reset5
});
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Helpers4 from "./../helpers/helpers.js";
import * as Types6 from "./../types/types.js";
var config;
var rendererProcessesByFrameId = /* @__PURE__ */ new Map();
var mainFrameId = "";
var mainFrameURL = "";
var framesByProcessId = /* @__PURE__ */ new Map();
var browserProcessId = Types6.Events.ProcessID(-1);
var browserThreadId = Types6.Events.ThreadID(-1);
var gpuProcessId = Types6.Events.ProcessID(-1);
var gpuThreadId = Types6.Events.ThreadID(-1);
var viewportRect = null;
var devicePixelRatio = null;
var processNames = /* @__PURE__ */ new Map();
var topLevelRendererIds = /* @__PURE__ */ new Set();
function makeNewTraceBounds() {
  return {
    min: Types6.Timing.Micro(Number.POSITIVE_INFINITY),
    max: Types6.Timing.Micro(Number.NEGATIVE_INFINITY),
    range: Types6.Timing.Micro(Number.POSITIVE_INFINITY)
  };
}
var traceBounds = makeNewTraceBounds();
var navigationsByFrameId = /* @__PURE__ */ new Map();
var navigationsByNavigationId = /* @__PURE__ */ new Map();
var finalDisplayUrlByNavigationId = /* @__PURE__ */ new Map();
var mainFrameNavigations = [];
var threadsInProcess = /* @__PURE__ */ new Map();
var traceStartedTimeFromTracingStartedEvent = Types6.Timing.Micro(-1);
var eventPhasesOfInterestForTraceBounds = /* @__PURE__ */ new Set([
  "B",
  "E",
  "X",
  "I"
]);
var traceIsGeneric = true;
var CHROME_WEB_TRACE_EVENTS = /* @__PURE__ */ new Set([
  "TracingStartedInPage",
  "TracingSessionIdForWorker",
  "TracingStartedInBrowser",
  "CpuProfile"
]);
function reset5() {
  navigationsByFrameId = /* @__PURE__ */ new Map();
  navigationsByNavigationId = /* @__PURE__ */ new Map();
  finalDisplayUrlByNavigationId = /* @__PURE__ */ new Map();
  processNames = /* @__PURE__ */ new Map();
  mainFrameNavigations = [];
  browserProcessId = Types6.Events.ProcessID(-1);
  browserThreadId = Types6.Events.ThreadID(-1);
  gpuProcessId = Types6.Events.ProcessID(-1);
  gpuThreadId = Types6.Events.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds = /* @__PURE__ */ new Set();
  threadsInProcess = /* @__PURE__ */ new Map();
  rendererProcessesByFrameId = /* @__PURE__ */ new Map();
  framesByProcessId = /* @__PURE__ */ new Map();
  traceBounds = makeNewTraceBounds();
  traceStartedTimeFromTracingStartedEvent = Types6.Timing.Micro(-1);
  traceIsGeneric = true;
}
function updateRendererProcessByFrame(event, frame) {
  const framesInProcessById = Platform2.MapUtilities.getWithDefault(framesByProcessId, frame.processId, () => /* @__PURE__ */ new Map());
  framesInProcessById.set(frame.frame, frame);
  const rendererProcessInFrame = Platform2.MapUtilities.getWithDefault(rendererProcessesByFrameId, frame.frame, () => /* @__PURE__ */ new Map());
  const rendererProcessInfo = Platform2.MapUtilities.getWithDefault(rendererProcessInFrame, frame.processId, () => {
    return [];
  });
  const lastProcessData = rendererProcessInfo.at(-1);
  if (lastProcessData && lastProcessData.frame.url === frame.url) {
    return;
  }
  rendererProcessInfo.push({
    frame,
    window: {
      min: event.ts,
      max: Types6.Timing.Micro(0),
      range: Types6.Timing.Micro(0)
    }
  });
}
function handleEvent5(event) {
  if (traceIsGeneric && CHROME_WEB_TRACE_EVENTS.has(event.name)) {
    traceIsGeneric = false;
  }
  if (Types6.Events.isProcessName(event)) {
    processNames.set(event.pid, event);
  }
  if (event.ts !== 0 && !event.name.endsWith("::UMA") && eventPhasesOfInterestForTraceBounds.has(event.ph)) {
    traceBounds.min = Types6.Timing.Micro(Math.min(event.ts, traceBounds.min));
    const eventDuration = event.dur ?? Types6.Timing.Micro(0);
    traceBounds.max = Types6.Timing.Micro(Math.max(event.ts + eventDuration, traceBounds.max));
  }
  if (Types6.Events.isProcessName(event) && (event.args.name === "Browser" || event.args.name === "HeadlessBrowser")) {
    browserProcessId = event.pid;
    return;
  }
  if (Types6.Events.isProcessName(event) && (event.args.name === "Gpu" || event.args.name === "GPU Process")) {
    gpuProcessId = event.pid;
    return;
  }
  if (Types6.Events.isThreadName(event) && event.args.name === "CrGpuMain") {
    gpuThreadId = event.tid;
    return;
  }
  if (Types6.Events.isThreadName(event) && event.args.name === "CrBrowserMain") {
    browserThreadId = event.tid;
  }
  if (Types6.Events.isMainFrameViewport(event) && viewportRect === null) {
    const rectAsArray = event.args.data.viewport_rect;
    const viewportX = rectAsArray[0];
    const viewportY = rectAsArray[1];
    const viewportWidth = rectAsArray[2];
    const viewportHeight = rectAsArray[5];
    viewportRect = { x: viewportX, y: viewportY, width: viewportWidth, height: viewportHeight };
    devicePixelRatio = event.args.data.dpr;
  }
  if (Types6.Events.isTracingStartedInBrowser(event)) {
    traceStartedTimeFromTracingStartedEvent = event.ts;
    if (!event.args.data) {
      throw new Error("No frames found in trace data");
    }
    for (const frame of event.args.data.frames ?? []) {
      updateRendererProcessByFrame(event, frame);
      if (!frame.parent) {
        topLevelRendererIds.add(frame.processId);
      }
      const traceHasPrimaryMainFrameFlag = "isInPrimaryMainFrame" in frame;
      const traceHasOutermostMainFrameFlag = "isOutermostMainFrame" in frame;
      if (traceHasPrimaryMainFrameFlag && traceHasOutermostMainFrameFlag) {
        if (frame.isInPrimaryMainFrame && frame.isOutermostMainFrame) {
          mainFrameId = frame.frame;
          mainFrameURL = frame.url;
        }
      } else if (traceHasOutermostMainFrameFlag) {
        if (frame.isOutermostMainFrame) {
          mainFrameId = frame.frame;
          mainFrameURL = frame.url;
        }
      } else if (!frame.parent && frame.url) {
        mainFrameId = frame.frame;
        mainFrameURL = frame.url;
      }
    }
    return;
  }
  if (Types6.Events.isFrameCommittedInBrowser(event)) {
    const frame = event.args.data;
    if (!frame) {
      return;
    }
    updateRendererProcessByFrame(event, frame);
    if (frame.parent) {
      return;
    }
    topLevelRendererIds.add(frame.processId);
    return;
  }
  if (Types6.Events.isCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }
    const { frame, name, url } = frameData;
    updateRendererProcessByFrame(event, { processId: event.pid, frame, name, url });
    return;
  }
  if (Types6.Events.isThreadName(event)) {
    const threads = Platform2.MapUtilities.getWithDefault(threadsInProcess, event.pid, () => /* @__PURE__ */ new Map());
    threads.set(event.tid, event);
    return;
  }
  if (Types6.Events.isNavigationStart(event) && event.args.data) {
    const navigationId = event.args.data.navigationId;
    if (navigationsByNavigationId.has(navigationId)) {
      return;
    }
    navigationsByNavigationId.set(navigationId, event);
    finalDisplayUrlByNavigationId.set(navigationId, event.args.data.documentLoaderURL);
    const frameId = event.args.frame;
    const existingFrameNavigations = navigationsByFrameId.get(frameId) || [];
    existingFrameNavigations.push(event);
    navigationsByFrameId.set(frameId, existingFrameNavigations);
    if (frameId === mainFrameId) {
      mainFrameNavigations.push(event);
    }
    return;
  }
  if (Types6.Events.isResourceSendRequest(event)) {
    if (event.args.data.resourceType !== "Document") {
      return;
    }
    const maybeNavigationId = event.args.data.requestId;
    const navigation = navigationsByNavigationId.get(maybeNavigationId);
    if (!navigation) {
      return;
    }
    finalDisplayUrlByNavigationId.set(maybeNavigationId, event.args.data.url);
    return;
  }
  if (Types6.Events.isDidCommitSameDocumentNavigation(event)) {
    if (event.args.render_frame_host.frame_type !== "PRIMARY_MAIN_FRAME") {
      return;
    }
    const navigation = mainFrameNavigations.at(-1);
    const key = navigation?.args.data?.navigationId ?? "";
    finalDisplayUrlByNavigationId.set(key, event.args.url);
    return;
  }
}
async function finalize5(options) {
  config = { showAllEvents: Boolean(options?.showAllEvents) };
  if (traceStartedTimeFromTracingStartedEvent >= 0) {
    traceBounds.min = traceStartedTimeFromTracingStartedEvent;
  }
  traceBounds.range = Types6.Timing.Micro(traceBounds.max - traceBounds.min);
  for (const [, processWindows] of rendererProcessesByFrameId) {
    const processWindowValues = [...processWindows.values()].flat().sort((a, b) => {
      return a.window.min - b.window.min;
    });
    for (let i = 0; i < processWindowValues.length; i++) {
      const currentWindow = processWindowValues[i];
      const nextWindow = processWindowValues[i + 1];
      if (!nextWindow) {
        currentWindow.window.max = Types6.Timing.Micro(traceBounds.max);
        currentWindow.window.range = Types6.Timing.Micro(traceBounds.max - currentWindow.window.min);
      } else {
        currentWindow.window.max = Types6.Timing.Micro(nextWindow.window.min - 1);
        currentWindow.window.range = Types6.Timing.Micro(currentWindow.window.max - currentWindow.window.min);
      }
    }
  }
  for (const [frameId, navigations] of navigationsByFrameId) {
    if (rendererProcessesByFrameId.has(frameId)) {
      continue;
    }
    navigationsByFrameId.delete(frameId);
    for (const navigation of navigations) {
      if (!navigation.args.data) {
        continue;
      }
      navigationsByNavigationId.delete(navigation.args.data.navigationId);
    }
  }
  const firstMainFrameNav = mainFrameNavigations.at(0);
  const firstNavTimeThreshold = Helpers4.Timing.secondsToMicro(Types6.Timing.Seconds(0.5));
  if (firstMainFrameNav) {
    const navigationIsWithinThreshold = firstMainFrameNav.ts - traceBounds.min < firstNavTimeThreshold;
    if (firstMainFrameNav.args.data?.isOutermostMainFrame && firstMainFrameNav.args.data?.documentLoaderURL && navigationIsWithinThreshold) {
      mainFrameURL = firstMainFrameNav.args.data.documentLoaderURL;
    }
  }
}
function data5() {
  return {
    config,
    traceBounds,
    browserProcessId,
    browserThreadId,
    processNames,
    gpuProcessId,
    gpuThreadId: gpuThreadId === Types6.Events.ThreadID(-1) ? void 0 : gpuThreadId,
    viewportRect: viewportRect || void 0,
    devicePixelRatio: devicePixelRatio ?? void 0,
    mainFrameId,
    mainFrameURL,
    navigationsByFrameId,
    navigationsByNavigationId,
    finalDisplayUrlByNavigationId,
    threadsInProcess,
    rendererProcessesByFrame: rendererProcessesByFrameId,
    topLevelRendererIds,
    frameByProcessId: framesByProcessId,
    mainFrameNavigations,
    traceIsGeneric
  };
}

// gen/front_end/models/trace/handlers/NetworkRequestsHandler.js
var NetworkRequestsHandler_exports = {};
__export(NetworkRequestsHandler_exports, {
  data: () => data6,
  deps: () => deps2,
  finalize: () => finalize6,
  handleEvent: () => handleEvent6,
  reset: () => reset6
});
import * as Platform3 from "./../../../core/platform/platform.js";
import * as Helpers5 from "./../helpers/helpers.js";
import * as Types7 from "./../types/types.js";
var MILLISECONDS_TO_MICROSECONDS = 1e3;
var SECONDS_TO_MICROSECONDS = 1e6;
var webSocketData = /* @__PURE__ */ new Map();
var linkPreconnectEvents = [];
var requestMap = /* @__PURE__ */ new Map();
var requestsById = /* @__PURE__ */ new Map();
var requestsByTime = [];
var networkRequestEventByInitiatorUrl = /* @__PURE__ */ new Map();
var eventToInitiatorMap = /* @__PURE__ */ new Map();
var entityMappings = {
  eventsByEntity: /* @__PURE__ */ new Map(),
  entityByEvent: /* @__PURE__ */ new Map(),
  createdEntityCache: /* @__PURE__ */ new Map(),
  entityByUrlCache: /* @__PURE__ */ new Map()
};
function storeTraceEventWithRequestId(requestId, key, value) {
  if (!requestMap.has(requestId)) {
    requestMap.set(requestId, {});
  }
  const traceEvents = requestMap.get(requestId);
  if (!traceEvents) {
    throw new Error(`Unable to locate trace events for request ID ${requestId}`);
  }
  if (Array.isArray(traceEvents[key])) {
    const target = traceEvents[key];
    const values = value;
    target.push(...values);
  } else {
    traceEvents[key] = value;
  }
}
function firstPositiveValueInList(entries) {
  for (const entry of entries) {
    if (entry && entry > 0) {
      return entry;
    }
  }
  return 0;
}
function reset6() {
  requestsById = /* @__PURE__ */ new Map();
  requestMap = /* @__PURE__ */ new Map();
  requestsByTime = [];
  networkRequestEventByInitiatorUrl = /* @__PURE__ */ new Map();
  eventToInitiatorMap = /* @__PURE__ */ new Map();
  webSocketData = /* @__PURE__ */ new Map();
  entityMappings = {
    eventsByEntity: /* @__PURE__ */ new Map(),
    entityByEvent: /* @__PURE__ */ new Map(),
    createdEntityCache: /* @__PURE__ */ new Map(),
    entityByUrlCache: /* @__PURE__ */ new Map()
  };
  linkPreconnectEvents = [];
}
function handleEvent6(event) {
  if (Types7.Events.isResourceChangePriority(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "changePriority", event);
    return;
  }
  if (Types7.Events.isResourceWillSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "willSendRequests", [event]);
    return;
  }
  if (Types7.Events.isResourceSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "sendRequests", [event]);
    return;
  }
  if (Types7.Events.isResourceReceiveResponse(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receiveResponse", event);
    return;
  }
  if (Types7.Events.isResourceReceivedData(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receivedData", [event]);
    return;
  }
  if (Types7.Events.isResourceFinish(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "resourceFinish", event);
    return;
  }
  if (Types7.Events.isResourceMarkAsCached(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "resourceMarkAsCached", event);
    return;
  }
  if (Types7.Events.isPreloadRenderBlockingStatusChangeEvent(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "preloadRenderBlockingStatusChange", [event]);
  }
  if (Types7.Events.isWebSocketCreate(event) || Types7.Events.isWebSocketInfo(event) || Types7.Events.isWebSocketTransfer(event)) {
    const identifier = event.args.data.identifier;
    if (!webSocketData.has(identifier)) {
      if (event.args.data.frame) {
        webSocketData.set(identifier, {
          frame: event.args.data.frame,
          webSocketIdentifier: identifier,
          events: [],
          syntheticConnection: null
        });
      } else if (event.args.data.workerId) {
        webSocketData.set(identifier, {
          workerId: event.args.data.workerId,
          webSocketIdentifier: identifier,
          events: [],
          syntheticConnection: null
        });
      }
    }
    webSocketData.get(identifier)?.events.push(event);
  }
  if (Types7.Events.isLinkPreconnect(event)) {
    linkPreconnectEvents.push(event);
    return;
  }
}
async function finalize6() {
  const { rendererProcessesByFrame } = data5();
  for (const [requestId, request] of requestMap.entries()) {
    if (!request.sendRequests) {
      continue;
    }
    const redirects = [];
    for (let i = 0; i < request.sendRequests.length - 1; i++) {
      const sendRequest = request.sendRequests[i];
      const nextSendRequest = request.sendRequests[i + 1];
      let ts = sendRequest.ts;
      let dur = Types7.Timing.Micro(nextSendRequest.ts - sendRequest.ts);
      if (request.willSendRequests?.[i] && request.willSendRequests[i + 1]) {
        const willSendRequest = request.willSendRequests[i];
        const nextWillSendRequest = request.willSendRequests[i + 1];
        ts = willSendRequest.ts;
        dur = Types7.Timing.Micro(nextWillSendRequest.ts - willSendRequest.ts);
      }
      redirects.push({
        url: sendRequest.args.data.url,
        priority: sendRequest.args.data.priority,
        requestMethod: sendRequest.args.data.requestMethod,
        ts,
        dur
      });
    }
    const firstSendRequest = request.sendRequests[0];
    const finalSendRequest = request.sendRequests[request.sendRequests.length - 1];
    if (finalSendRequest.args.data.url.startsWith("data:")) {
      continue;
    }
    const isLightrider = globalThis.isLightrider;
    if (isLightrider && request.resourceFinish && request.receiveResponse?.args.data.headers) {
      const lrSizeHeader = request.receiveResponse.args.data.headers.find((h) => h.name === "X-TotalFetchedSize");
      if (lrSizeHeader) {
        const size = parseFloat(lrSizeHeader.value);
        if (!isNaN(size)) {
          request.resourceFinish.args.data.encodedDataLength = size;
        }
      }
    }
    const isPushedResource = request.resourceFinish?.args.data.encodedDataLength !== 0;
    const isDiskCached = !!request.receiveResponse && request.receiveResponse.args.data.fromCache && !request.receiveResponse.args.data.fromServiceWorker && !isPushedResource;
    const isMemoryCached = request.resourceMarkAsCached !== void 0;
    let timing = isMemoryCached ? void 0 : request.receiveResponse?.args.data.timing;
    let lrServerResponseTime;
    if (isLightrider && request.receiveResponse?.args.data.headers) {
      timing = {
        requestTime: Helpers5.Timing.microToSeconds(request.sendRequests.at(0)?.ts ?? 0),
        connectEnd: 0,
        connectStart: 0,
        dnsEnd: 0,
        dnsStart: 0,
        proxyEnd: 0,
        proxyStart: 0,
        pushEnd: 0,
        pushStart: 0,
        receiveHeadersEnd: 0,
        receiveHeadersStart: 0,
        sendEnd: 0,
        sendStart: 0,
        sslEnd: 0,
        sslStart: 0,
        workerReady: 0,
        workerStart: 0,
        ...timing
      };
      const TCPMsHeader = request.receiveResponse.args.data.headers.find((h) => h.name === "X-TCPMs");
      const TCPMs = TCPMsHeader ? Math.max(0, parseInt(TCPMsHeader.value, 10)) : 0;
      if (request.receiveResponse.args.data.protocol.startsWith("h3")) {
        timing.connectStart = 0;
        timing.connectEnd = TCPMs;
      } else {
        timing.connectStart = 0;
        timing.sslStart = TCPMs / 2;
        timing.connectEnd = TCPMs;
        timing.sslEnd = TCPMs;
      }
      const ResponseMsHeader = request.receiveResponse.args.data.headers.find((h) => h.name === "X-ResponseMs");
      if (ResponseMsHeader) {
        lrServerResponseTime = Math.max(0, parseInt(ResponseMsHeader.value, 10));
      }
    }
    const allowedProtocols = [
      "blob:",
      "file:",
      "filesystem:",
      "http:",
      "https:"
    ];
    if (!allowedProtocols.some((p) => firstSendRequest.args.data.url.startsWith(p))) {
      continue;
    }
    const initialPriority = finalSendRequest.args.data.priority;
    let finalPriority = initialPriority;
    if (request.changePriority) {
      finalPriority = request.changePriority.args.data.priority;
    }
    const startTime = request.willSendRequests?.length ? Types7.Timing.Micro(request.willSendRequests[0].ts) : Types7.Timing.Micro(firstSendRequest.ts);
    const endRedirectTime = request.willSendRequests?.length ? Types7.Timing.Micro(request.willSendRequests[request.willSendRequests.length - 1].ts) : Types7.Timing.Micro(finalSendRequest.ts);
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish?.args.data.finishTime ? Types7.Timing.Micro(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(endTime);
    const networkDuration = Types7.Timing.Micro(timing ? (finishTime || endRedirectTime) - endRedirectTime : 0);
    const processingDuration = Types7.Timing.Micro(endTime - (finishTime || endTime));
    const redirectionDuration = Types7.Timing.Micro(endRedirectTime - startTime);
    const queueingFromTraceData = timing ? timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime : 0;
    const queueing = Types7.Timing.Micro(Platform3.NumberUtilities.clamp(queueingFromTraceData, 0, Number.MAX_VALUE));
    const stalled = timing ? Types7.Timing.Micro(firstPositiveValueInList([
      timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
      timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
      timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
      request.receiveResponse ? request.receiveResponse.ts - endRedirectTime : null
    ])) : request.receiveResponse ? Types7.Timing.Micro(request.receiveResponse.ts - startTime) : Types7.Timing.Micro(0);
    const sendStartTime = timing ? Types7.Timing.Micro(timing.requestTime * SECONDS_TO_MICROSECONDS + timing.sendStart * MILLISECONDS_TO_MICROSECONDS) : startTime;
    const waiting = timing ? Types7.Timing.Micro((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const serverResponseTime = timing ? Types7.Timing.Micro(((timing.receiveHeadersStart ?? timing.receiveHeadersEnd) - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const downloadStart = timing ? Types7.Timing.Micro(timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS) : startTime;
    const download = timing ? Types7.Timing.Micro((finishTime || downloadStart) - downloadStart) : request.receiveResponse ? Types7.Timing.Micro(endTime - request.receiveResponse.ts) : Types7.Timing.Micro(0);
    const totalTime = Types7.Timing.Micro(networkDuration + processingDuration);
    const dnsLookup = timing ? Types7.Timing.Micro((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const ssl = timing ? Types7.Timing.Micro((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const proxyNegotiation = timing ? Types7.Timing.Micro((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const requestSent = timing ? Types7.Timing.Micro((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const initialConnection = timing ? Types7.Timing.Micro((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS) : Types7.Timing.Micro(0);
    const { frame, url, renderBlocking: sendRequestIsRenderBlocking } = finalSendRequest.args.data;
    const { encodedDataLength, decodedBodyLength } = request.resourceFinish ? request.resourceFinish.args.data : { encodedDataLength: 0, decodedBodyLength: 0 };
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const requestingFrameUrl = Helpers5.Trace.activeURLForFrameAtTime(frame, finalSendRequest.ts, rendererProcessesByFrame) || "";
    const preloadRenderBlockingStatusChange = request.preloadRenderBlockingStatusChange?.at(-1)?.args.data.renderBlocking;
    const isRenderBlocking = preloadRenderBlockingStatusChange ?? sendRequestIsRenderBlocking ?? "non_blocking";
    const networkEvent = Helpers5.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: finalSendRequest,
      args: {
        data: {
          // All data we create from trace events should be added to |syntheticData|.
          syntheticData: {
            dnsLookup,
            download,
            downloadStart,
            finishTime,
            initialConnection,
            isDiskCached,
            isHttps,
            isMemoryCached,
            isPushedResource,
            networkDuration,
            processingDuration,
            proxyNegotiation,
            queueing,
            redirectionDuration,
            requestSent,
            sendStartTime,
            ssl,
            stalled,
            totalTime,
            waiting,
            serverResponseTime
          },
          // All fields below are from TraceEventsForNetworkRequest.
          decodedBodyLength,
          encodedDataLength,
          frame,
          fromServiceWorker: request.receiveResponse?.args.data.fromServiceWorker,
          isLinkPreload: finalSendRequest.args.data.isLinkPreload || false,
          mimeType: request.receiveResponse?.args.data.mimeType ?? "",
          priority: finalPriority,
          initialPriority,
          protocol: request.receiveResponse?.args.data.protocol ?? "unknown",
          redirects,
          renderBlocking: isRenderBlocking,
          requestId,
          requestingFrameUrl,
          requestMethod: finalSendRequest.args.data.requestMethod,
          resourceType: finalSendRequest.args.data.resourceType ?? "Other",
          statusCode: request.receiveResponse?.args.data.statusCode ?? 0,
          responseHeaders: request.receiveResponse?.args.data.headers ?? null,
          fetchPriorityHint: finalSendRequest.args.data.fetchPriorityHint ?? "auto",
          initiator: finalSendRequest.args.data.initiator,
          stackTrace: finalSendRequest.args.data.stackTrace,
          timing,
          lrServerResponseTime,
          url,
          failed: request.resourceFinish?.args.data.didFail ?? false,
          finished: Boolean(request.resourceFinish),
          hasResponse: Boolean(request.receiveResponse),
          connectionId: request.receiveResponse?.args.data.connectionId,
          connectionReused: request.receiveResponse?.args.data.connectionReused
        }
      },
      cat: "loading",
      name: "SyntheticNetworkRequest",
      ph: "X",
      dur: Types7.Timing.Micro(endTime - startTime),
      tdur: Types7.Timing.Micro(endTime - startTime),
      ts: Types7.Timing.Micro(startTime),
      tts: Types7.Timing.Micro(startTime),
      pid: finalSendRequest.pid,
      tid: finalSendRequest.tid
    });
    requestsByTime.push(networkEvent);
    requestsById.set(networkEvent.args.data.requestId, networkEvent);
    addNetworkRequestToEntityMapping(networkEvent, entityMappings, request);
    const initiatorUrl = networkEvent.args.data.initiator?.url || Helpers5.Trace.getStackTraceTopCallFrameInEventPayload(networkEvent)?.url;
    if (initiatorUrl) {
      const events = networkRequestEventByInitiatorUrl.get(initiatorUrl) ?? [];
      events.push(networkEvent);
      networkRequestEventByInitiatorUrl.set(initiatorUrl, events);
    }
  }
  for (const request of requestsByTime) {
    const initiatedEvents = networkRequestEventByInitiatorUrl.get(request.args.data.url);
    if (initiatedEvents) {
      for (const initiatedEvent of initiatedEvents) {
        eventToInitiatorMap.set(initiatedEvent, request);
      }
    }
  }
  finalizeWebSocketData();
}
function data6() {
  return {
    byId: requestsById,
    byTime: requestsByTime,
    eventToInitiator: eventToInitiatorMap,
    webSocket: [...webSocketData.values()],
    entityMappings: {
      entityByEvent: entityMappings.entityByEvent,
      eventsByEntity: entityMappings.eventsByEntity,
      createdEntityCache: entityMappings.createdEntityCache,
      entityByUrlCache: entityMappings.entityByUrlCache
    },
    linkPreconnectEvents
  };
}
function deps2() {
  return ["Meta"];
}
function finalizeWebSocketData() {
  webSocketData.forEach((data31) => {
    let startEvent = null;
    let endEvent = null;
    for (const event of data31.events) {
      if (Types7.Events.isWebSocketCreate(event)) {
        startEvent = event;
      }
      if (Types7.Events.isWebSocketDestroy(event)) {
        endEvent = event;
      }
    }
    data31.syntheticConnection = createSyntheticWebSocketConnection(startEvent, endEvent, data31.events[0]);
  });
}
function createSyntheticWebSocketConnection(startEvent, endEvent, firstRecordedEvent) {
  const { traceBounds: traceBounds2 } = data5();
  const startTs = startEvent ? startEvent.ts : traceBounds2.min;
  const endTs = endEvent ? endEvent.ts : traceBounds2.max;
  const duration = endTs - startTs;
  const mainEvent = startEvent || endEvent || firstRecordedEvent;
  return {
    name: "SyntheticWebSocketConnection",
    cat: mainEvent.cat,
    ph: "X",
    ts: startTs,
    dur: duration,
    pid: mainEvent.pid,
    tid: mainEvent.tid,
    s: mainEvent.s,
    rawSourceEvent: mainEvent,
    _tag: "SyntheticEntryTag",
    args: {
      data: {
        identifier: mainEvent.args.data.identifier,
        priority: "Low",
        url: mainEvent.args.data.url || ""
      }
    }
  };
}

// gen/front_end/models/trace/handlers/SamplesHandler.js
var SamplesHandler_exports = {};
__export(SamplesHandler_exports, {
  data: () => data7,
  finalize: () => finalize7,
  getProfileCallFunctionName: () => getProfileCallFunctionName,
  handleEvent: () => handleEvent7,
  reset: () => reset7
});
import * as Platform4 from "./../../../core/platform/platform.js";
import * as CPUProfile from "./../../cpu_profile/cpu_profile.js";
import * as Helpers6 from "./../helpers/helpers.js";
import * as Types8 from "./../types/types.js";
var profilesInProcess = /* @__PURE__ */ new Map();
var entryToNode = /* @__PURE__ */ new Map();
var preprocessedData = /* @__PURE__ */ new Map();
var PROFILE_SOURCES_BY_PRIORITY = {
  cpuProfile: ["Inspector"],
  performanceTrace: ["Internal", "Inspector"]
};
function parseCPUProfileData(parseOptions) {
  const priorityList = parseOptions.isCPUProfile ? PROFILE_SOURCES_BY_PRIORITY.cpuProfile : PROFILE_SOURCES_BY_PRIORITY.performanceTrace;
  for (const [processId, profiles] of preprocessedData) {
    const profilesByThread = /* @__PURE__ */ new Map();
    for (const [profileId, preProcessedData] of profiles) {
      const threadId = preProcessedData.threadId;
      if (threadId === void 0) {
        continue;
      }
      const listForThread = Platform4.MapUtilities.getWithDefault(profilesByThread, threadId, () => []);
      listForThread.push({ id: profileId, data: preProcessedData });
    }
    for (const [threadId, candidates] of profilesByThread) {
      let buildProfileCallsForCPUProfile = function() {
        profileModel.forEachFrame(openFrameCallback, closeFrameCallback);
        function openFrameCallback(depth, node, sampleIndex, timeStampMilliseconds) {
          if (threadId === void 0) {
            return;
          }
          const ts = Helpers6.Timing.milliToMicro(Types8.Timing.Milli(timeStampMilliseconds));
          const nodeId = node.id;
          const profileCall = Helpers6.Trace.makeProfileCall(node, selectedProfileId, sampleIndex, ts, processId, threadId);
          finalizedData.profileCalls.push(profileCall);
          indexStack.push(finalizedData.profileCalls.length - 1);
          const traceEntryNode = Helpers6.TreeHelpers.makeEmptyTraceEntryNode(profileCall, nodeId);
          entryToNode.set(profileCall, traceEntryNode);
          traceEntryNode.depth = depth;
          if (indexStack.length === 1) {
            finalizedData.profileTree?.roots.add(traceEntryNode);
          }
        }
        function closeFrameCallback(_depth, _node, _sampleIndex, _timeStampMillis, durMs, selfTimeMs) {
          const profileCallIndex = indexStack.pop();
          const profileCall = profileCallIndex !== void 0 && finalizedData.profileCalls[profileCallIndex];
          if (!profileCall) {
            return;
          }
          const { callFrame, ts, pid, tid } = profileCall;
          const traceEntryNode = entryToNode.get(profileCall);
          if (callFrame === void 0 || ts === void 0 || pid === void 0 || selectedProfileId === void 0 || tid === void 0 || traceEntryNode === void 0) {
            return;
          }
          const dur = Helpers6.Timing.milliToMicro(Types8.Timing.Milli(durMs));
          const selfTime = Helpers6.Timing.milliToMicro(Types8.Timing.Milli(selfTimeMs));
          profileCall.dur = dur;
          traceEntryNode.selfTime = selfTime;
          const parentIndex = indexStack.at(-1);
          const parent = parentIndex !== void 0 && finalizedData.profileCalls.at(parentIndex);
          const parentNode = parent && entryToNode.get(parent);
          if (!parentNode) {
            return;
          }
          traceEntryNode.parent = parentNode;
          parentNode.children.push(traceEntryNode);
        }
      };
      if (!candidates.length) {
        continue;
      }
      let chosen = candidates[0];
      for (const source of priorityList) {
        const match = candidates.find((p) => p.data.source === source);
        if (match) {
          chosen = match;
          break;
        }
      }
      const chosenData = chosen.data;
      if (!chosenData.rawProfile.nodes.length) {
        continue;
      }
      const indexStack = [];
      const profileModel = new CPUProfile.CPUProfileDataModel.CPUProfileDataModel(chosenData.rawProfile);
      const profileTree = Helpers6.TreeHelpers.makeEmptyTraceEntryTree();
      profileTree.maxDepth = profileModel.maxDepth;
      const selectedProfileId = chosen.id;
      const finalizedData = {
        rawProfile: chosenData.rawProfile,
        parsedProfile: profileModel,
        profileCalls: [],
        profileTree,
        profileId: selectedProfileId
      };
      const dataByThread = Platform4.MapUtilities.getWithDefault(profilesInProcess, processId, () => /* @__PURE__ */ new Map());
      dataByThread.set(threadId, finalizedData);
      if (parseOptions.isCPUProfile) {
        buildProfileCallsForCPUProfile();
      }
    }
  }
}
function reset7() {
  preprocessedData = /* @__PURE__ */ new Map();
  profilesInProcess = /* @__PURE__ */ new Map();
  entryToNode = /* @__PURE__ */ new Map();
}
function handleEvent7(event) {
  if (Types8.Events.isSyntheticCpuProfile(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    profileData.rawProfile = event.args.data.cpuProfile;
    profileData.threadId = event.tid;
    return;
  }
  if (Types8.Events.isProfile(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    profileData.rawProfile.startTime = event.ts;
    profileData.threadId = event.tid;
    assignProfileSourceIfKnown(profileData, event.args?.data?.source);
    return;
  }
  if (Types8.Events.isProfileChunk(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    const cdpProfile = profileData.rawProfile;
    const nodesAndSamples = event.args?.data?.cpuProfile || { samples: [] };
    const samples = nodesAndSamples?.samples || [];
    const traceIds = event.args?.data?.cpuProfile?.trace_ids;
    for (const n of nodesAndSamples?.nodes || []) {
      const lineNumber = typeof n.callFrame.lineNumber === "undefined" ? -1 : n.callFrame.lineNumber;
      const columnNumber = typeof n.callFrame.columnNumber === "undefined" ? -1 : n.callFrame.columnNumber;
      const scriptId = String(n.callFrame.scriptId);
      const url = n.callFrame.url || "";
      const node = {
        ...n,
        callFrame: {
          ...n.callFrame,
          url,
          lineNumber,
          columnNumber,
          scriptId
        }
      };
      cdpProfile.nodes.push(node);
    }
    const timeDeltas = event.args.data?.timeDeltas || [];
    const lines = event.args.data?.lines || Array(samples.length).fill(0);
    cdpProfile.samples?.push(...samples);
    cdpProfile.timeDeltas?.push(...timeDeltas);
    cdpProfile.lines?.push(...lines);
    if (traceIds) {
      cdpProfile.traceIds ??= {};
      for (const key in traceIds) {
        cdpProfile.traceIds[key] = traceIds[key];
      }
    }
    if (cdpProfile.samples && cdpProfile.timeDeltas && cdpProfile.samples.length !== cdpProfile.timeDeltas.length) {
      console.error("Failed to parse CPU profile.");
      return;
    }
    if (!cdpProfile.endTime && cdpProfile.timeDeltas) {
      const timeDeltas2 = cdpProfile.timeDeltas;
      cdpProfile.endTime = timeDeltas2.reduce((x, y) => x + y, cdpProfile.startTime);
    }
    assignProfileSourceIfKnown(profileData, event.args?.data?.source);
    return;
  }
}
async function finalize7(parseOptions = {}) {
  parseCPUProfileData(parseOptions);
}
function assignProfileSourceIfKnown(profileData, source) {
  if (Types8.Events.VALID_PROFILE_SOURCES.includes(source)) {
    profileData.source = source;
  }
}
function data7() {
  return {
    profilesInProcess,
    entryToNode
  };
}
function getOrCreatePreProcessedData(processId, profileId) {
  const profileById = Platform4.MapUtilities.getWithDefault(preprocessedData, processId, () => /* @__PURE__ */ new Map());
  return Platform4.MapUtilities.getWithDefault(profileById, profileId, () => ({
    rawProfile: {
      startTime: 0,
      endTime: 0,
      nodes: [],
      samples: [],
      timeDeltas: [],
      lines: []
    },
    profileId
  }));
}
function getProfileCallFunctionName(data31, entry) {
  const profile = data31.profilesInProcess.get(entry.pid)?.get(entry.tid);
  const node = profile?.parsedProfile.nodeById(entry.nodeId);
  if (node?.functionName) {
    return node.functionName;
  }
  return entry.callFrame.functionName;
}

// gen/front_end/models/trace/handlers/RendererHandler.js
var processes = /* @__PURE__ */ new Map();
var entityMappings2 = {
  eventsByEntity: /* @__PURE__ */ new Map(),
  entityByEvent: /* @__PURE__ */ new Map(),
  createdEntityCache: /* @__PURE__ */ new Map(),
  entityByUrlCache: /* @__PURE__ */ new Map()
};
var compositorTileWorkers = Array();
var entryToNode2 = /* @__PURE__ */ new Map();
var completeEventStack = [];
var config2 = Types9.Configuration.defaults();
var makeRendererProcess = () => ({
  url: null,
  isOnMainFrame: false,
  threads: /* @__PURE__ */ new Map()
});
var makeRendererThread = () => ({
  name: null,
  entries: [],
  profileCalls: [],
  layoutEvents: [],
  recalcStyleEvents: []
});
var getOrCreateRendererProcess = (processes2, pid) => {
  return Platform5.MapUtilities.getWithDefault(processes2, pid, makeRendererProcess);
};
var getOrCreateRendererThread = (process, tid) => {
  return Platform5.MapUtilities.getWithDefault(process.threads, tid, makeRendererThread);
};
function handleUserConfig2(userConfig) {
  config2 = userConfig;
}
function reset8() {
  processes = /* @__PURE__ */ new Map();
  entryToNode2 = /* @__PURE__ */ new Map();
  entityMappings2 = {
    eventsByEntity: /* @__PURE__ */ new Map(),
    entityByEvent: /* @__PURE__ */ new Map(),
    createdEntityCache: /* @__PURE__ */ new Map(),
    entityByUrlCache: /* @__PURE__ */ new Map()
  };
  completeEventStack = [];
  compositorTileWorkers = [];
}
function handleEvent8(event) {
  if (Types9.Events.isThreadName(event) && event.args.name?.startsWith("CompositorTileWorker")) {
    compositorTileWorkers.push({
      pid: event.pid,
      tid: event.tid
    });
  }
  if (Types9.Events.isBegin(event) || Types9.Events.isEnd(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    const completeEvent = makeCompleteEvent(event);
    if (!completeEvent) {
      return;
    }
    thread.entries.push(completeEvent);
    return;
  }
  if (Types9.Events.isInstant(event) || Types9.Events.isComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.entries.push(event);
  }
  if (Types9.Events.isLayout(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.layoutEvents.push(event);
  }
  if (Types9.Events.isRecalcStyle(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.recalcStyleEvents.push(event);
  }
}
async function finalize8() {
  const { mainFrameId: mainFrameId2, rendererProcessesByFrame, threadsInProcess: threadsInProcess2 } = data5();
  entityMappings2 = data6().entityMappings;
  assignMeta(processes, mainFrameId2, rendererProcessesByFrame, threadsInProcess2);
  sanitizeProcesses(processes);
  buildHierarchy(processes);
  sanitizeThreads(processes);
}
function data8() {
  return {
    processes,
    compositorTileWorkers: gatherCompositorThreads(),
    entryToNode: entryToNode2,
    entityMappings: {
      entityByEvent: entityMappings2.entityByEvent,
      eventsByEntity: entityMappings2.eventsByEntity,
      createdEntityCache: entityMappings2.createdEntityCache,
      entityByUrlCache: entityMappings2.entityByUrlCache
    }
  };
}
function gatherCompositorThreads() {
  const threadsByProcess = /* @__PURE__ */ new Map();
  for (const worker of compositorTileWorkers) {
    const byProcess = threadsByProcess.get(worker.pid) || [];
    byProcess.push(worker.tid);
    threadsByProcess.set(worker.pid, byProcess);
  }
  return threadsByProcess;
}
function assignMeta(processes2, mainFrameId2, rendererProcessesByFrame, threadsInProcess2) {
  assignOrigin(processes2, rendererProcessesByFrame);
  assignIsMainFrame(processes2, mainFrameId2, rendererProcessesByFrame);
  assignThreadName(processes2, threadsInProcess2);
}
function assignOrigin(processes2, rendererProcessesByFrame) {
  for (const renderProcessesByPid of rendererProcessesByFrame.values()) {
    for (const [pid, processWindows] of renderProcessesByPid) {
      for (const processInfo of processWindows.flat()) {
        const process = getOrCreateRendererProcess(processes2, pid);
        if (process.url === null || process.url === "about:blank") {
          try {
            new URL(processInfo.frame.url);
            process.url = processInfo.frame.url;
          } catch {
            process.url = null;
          }
        }
      }
    }
  }
}
function assignIsMainFrame(processes2, mainFrameId2, rendererProcessesByFrame) {
  for (const [frameId, renderProcessesByPid] of rendererProcessesByFrame) {
    for (const [pid] of renderProcessesByPid) {
      const process = getOrCreateRendererProcess(processes2, pid);
      if (frameId === mainFrameId2) {
        process.isOnMainFrame = true;
      }
    }
  }
}
function assignThreadName(processes2, threadsInProcess2) {
  for (const [pid, process] of processes2) {
    for (const [tid, threadInfo] of threadsInProcess2.get(pid) ?? []) {
      const thread = getOrCreateRendererThread(process, tid);
      thread.name = threadInfo?.args.name ?? `${tid}`;
    }
  }
}
function sanitizeProcesses(processes2) {
  const auctionWorklets = data4().worklets;
  const metaData = data5();
  if (metaData.traceIsGeneric) {
    return;
  }
  for (const [pid, process] of processes2) {
    if (process.url === null) {
      const maybeWorklet = auctionWorklets.get(pid);
      if (maybeWorklet) {
        process.url = maybeWorklet.host;
      } else {
        processes2.delete(pid);
      }
      continue;
    }
  }
}
function sanitizeThreads(processes2) {
  for (const [, process] of processes2) {
    for (const [tid, thread] of process.threads) {
      if (!thread.tree?.roots.size) {
        process.threads.delete(tid);
      }
    }
  }
}
function buildHierarchy(processes2, options) {
  const samplesData = data7();
  for (const [pid, process] of processes2) {
    for (const [tid, thread] of process.threads) {
      if (!thread.entries.length) {
        thread.tree = Helpers7.TreeHelpers.makeEmptyTraceEntryTree();
        continue;
      }
      Helpers7.Trace.sortTraceEventsInPlace(thread.entries);
      const samplesDataForThread = samplesData.profilesInProcess.get(pid)?.get(tid);
      if (samplesDataForThread) {
        const cpuProfile = samplesDataForThread.parsedProfile;
        const samplesIntegrator = cpuProfile && new Helpers7.SamplesIntegrator.SamplesIntegrator(cpuProfile, samplesDataForThread.profileId, pid, tid, config2);
        const profileCalls = samplesIntegrator?.buildProfileCalls(thread.entries);
        if (samplesIntegrator && profileCalls) {
          thread.entries = Helpers7.Trace.mergeEventsInOrder(thread.entries, profileCalls);
          thread.profileCalls = profileCalls;
          const jsSamples = samplesIntegrator.jsSampleEvents;
          if (jsSamples.length) {
            thread.entries = Helpers7.Trace.mergeEventsInOrder(thread.entries, jsSamples);
          }
        }
      }
      const treeData = Helpers7.TreeHelpers.treify(thread.entries, options);
      thread.tree = treeData.tree;
      for (const [entry, node] of treeData.entryToNode) {
        entryToNode2.set(entry, node);
        addEventToEntityMapping(entry, entityMappings2);
      }
    }
  }
}
function makeCompleteEvent(event) {
  if (Types9.Events.isEnd(event)) {
    const beginEvent = completeEventStack.pop();
    if (!beginEvent) {
      return null;
    }
    if (beginEvent.name !== event.name || beginEvent.cat !== event.cat) {
      console.error("Begin/End events mismatch at " + beginEvent.ts + " (" + beginEvent.name + ") vs. " + event.ts + " (" + event.name + ")");
      return null;
    }
    beginEvent.dur = Types9.Timing.Micro(event.ts - beginEvent.ts);
    return null;
  }
  const syntheticComplete = {
    ...event,
    ph: "X",
    dur: Types9.Timing.Micro(0)
  };
  completeEventStack.push(syntheticComplete);
  return syntheticComplete;
}
function deps3() {
  return ["Meta", "Samples", "AuctionWorklets", "NetworkRequests"];
}

// gen/front_end/models/trace/handlers/AsyncJSCallsHandler.js
var schedulerToRunEntryPoints = /* @__PURE__ */ new Map();
var taskScheduleForTaskRunEvent = /* @__PURE__ */ new Map();
var asyncCallToScheduler = /* @__PURE__ */ new Map();
var runEntryPointToScheduler = /* @__PURE__ */ new Map();
function reset9() {
  schedulerToRunEntryPoints = /* @__PURE__ */ new Map();
  asyncCallToScheduler = /* @__PURE__ */ new Map();
  taskScheduleForTaskRunEvent = /* @__PURE__ */ new Map();
  runEntryPointToScheduler = /* @__PURE__ */ new Map();
}
function handleEvent9(_) {
}
async function finalize9() {
  const { flows: flows2 } = data3();
  const { entryToNode: entryToNode4 } = data8();
  for (const flow of flows2) {
    let maybeAsyncTaskScheduled = flow.at(0);
    if (!maybeAsyncTaskScheduled) {
      continue;
    }
    if (Types10.Events.isDebuggerAsyncTaskRun(maybeAsyncTaskScheduled)) {
      maybeAsyncTaskScheduled = taskScheduleForTaskRunEvent.get(maybeAsyncTaskScheduled);
    }
    if (!maybeAsyncTaskScheduled || !Types10.Events.isDebuggerAsyncTaskScheduled(maybeAsyncTaskScheduled)) {
      continue;
    }
    const taskName = maybeAsyncTaskScheduled.args.taskName;
    const asyncTaskRun = flow.at(1);
    if (!asyncTaskRun || !Types10.Events.isDebuggerAsyncTaskRun(asyncTaskRun)) {
      continue;
    }
    taskScheduleForTaskRunEvent.set(asyncTaskRun, maybeAsyncTaskScheduled);
    const asyncCaller = findNearestJSAncestor(maybeAsyncTaskScheduled, entryToNode4);
    const asyncEntryPoint = findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode4);
    runEntryPointToScheduler.set(asyncEntryPoint || asyncTaskRun, { taskName, scheduler: asyncCaller || maybeAsyncTaskScheduled });
    if (!asyncCaller || !asyncEntryPoint) {
      continue;
    }
    const entryPoints = Platform6.MapUtilities.getWithDefault(schedulerToRunEntryPoints, asyncCaller, () => []);
    entryPoints.push(asyncEntryPoint);
    const scheduledProfileCalls = findFirstJSCallsForAsyncTaskRun(asyncTaskRun, entryToNode4);
    for (const call of scheduledProfileCalls) {
      asyncCallToScheduler.set(call, { taskName, scheduler: asyncCaller });
    }
  }
}
function findNearestJSAncestor(asyncTaskScheduled, entryToNode4) {
  let node = entryToNode4.get(asyncTaskScheduled)?.parent;
  while (node) {
    if (Types10.Events.isProfileCall(node.entry) || acceptJSInvocationsPredicate(node.entry)) {
      return node.entry;
    }
    node = node.parent;
  }
  return null;
}
function acceptJSInvocationsPredicate(event) {
  const eventIsConsoleRunTask = Types10.Events.isConsoleRunTask(event);
  const eventIsV8EntryPoint = event.name.startsWith("v8") || event.name.startsWith("V8");
  return Types10.Events.isJSInvocationEvent(event) && (eventIsConsoleRunTask || !eventIsV8EntryPoint);
}
function findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode4) {
  return findFirstDescendantsOfType(asyncTaskRun, entryToNode4, acceptJSInvocationsPredicate, Types10.Events.isDebuggerAsyncTaskRun).at(0);
}
function findFirstJSCallsForAsyncTaskRun(asyncTaskRun, entryToNode4) {
  return findFirstDescendantsOfType(asyncTaskRun, entryToNode4, Types10.Events.isProfileCall, Types10.Events.isDebuggerAsyncTaskRun);
}
function findFirstDescendantsOfType(root, entryToNode4, predicateAccept, predicateIgnore) {
  const node = entryToNode4.get(root);
  if (!node) {
    return [];
  }
  const childrenGroups = [[...node.children]];
  const firstDescendants = [];
  for (let i = 0; i < childrenGroups.length; i++) {
    const siblings = childrenGroups[i];
    for (let j = 0; j < siblings.length; j++) {
      const node2 = siblings[j];
      if (predicateAccept(node2.entry)) {
        firstDescendants.push(node2.entry);
      } else if (!predicateIgnore(node2.entry)) {
        childrenGroups.push([...node2.children]);
      }
    }
  }
  return firstDescendants;
}
function data9() {
  return {
    schedulerToRunEntryPoints,
    asyncCallToScheduler,
    runEntryPointToScheduler
  };
}
function deps4() {
  return ["Renderer", "Flows"];
}

// gen/front_end/models/trace/handlers/DOMStatsHandler.js
var DOMStatsHandler_exports = {};
__export(DOMStatsHandler_exports, {
  data: () => data10,
  finalize: () => finalize10,
  handleEvent: () => handleEvent10,
  reset: () => reset10
});
import * as Platform7 from "./../../../core/platform/platform.js";
import * as Types11 from "./../types/types.js";
var domStatsByFrameId = /* @__PURE__ */ new Map();
function reset10() {
  domStatsByFrameId = /* @__PURE__ */ new Map();
}
function handleEvent10(event) {
  if (!Types11.Events.isDOMStats(event)) {
    return;
  }
  const domStatEvents = Platform7.MapUtilities.getWithDefault(domStatsByFrameId, event.args.data.frame, () => []);
  domStatEvents.push(event);
}
async function finalize10() {
}
function data10() {
  return { domStatsByFrameId };
}

// gen/front_end/models/trace/handlers/ExtensionTraceDataHandler.js
var ExtensionTraceDataHandler_exports = {};
__export(ExtensionTraceDataHandler_exports, {
  data: () => data12,
  deps: () => deps5,
  extensionDataInConsoleTimeStamp: () => extensionDataInConsoleTimeStamp,
  extensionDataInPerformanceTiming: () => extensionDataInPerformanceTiming,
  extractConsoleAPIExtensionEntries: () => extractConsoleAPIExtensionEntries,
  extractPerformanceAPIExtensionEntries: () => extractPerformanceAPIExtensionEntries,
  finalize: () => finalize12,
  handleEvent: () => handleEvent12,
  reset: () => reset12
});
import * as Helpers9 from "./../helpers/helpers.js";
import * as Types13 from "./../types/types.js";

// gen/front_end/models/trace/handlers/UserTimingsHandler.js
var UserTimingsHandler_exports = {};
__export(UserTimingsHandler_exports, {
  data: () => data11,
  finalize: () => finalize11,
  handleEvent: () => handleEvent11,
  reset: () => reset11,
  userTimingComparator: () => userTimingComparator
});
import * as Helpers8 from "./../helpers/helpers.js";
import * as Types12 from "./../types/types.js";
var syntheticEvents = [];
var measureTraceByTraceId = /* @__PURE__ */ new Map();
var performanceMeasureEvents = [];
var performanceMarkEvents = [];
var consoleTimings = [];
var timestampEvents = [];
function reset11() {
  syntheticEvents = [];
  performanceMeasureEvents = [];
  performanceMarkEvents = [];
  consoleTimings = [];
  timestampEvents = [];
  measureTraceByTraceId = /* @__PURE__ */ new Map();
}
var resourceTimingNames = [
  "workerStart",
  "redirectStart",
  "redirectEnd",
  "fetchStart",
  "domainLookupStart",
  "domainLookupEnd",
  "connectStart",
  "connectEnd",
  "secureConnectionStart",
  "requestStart",
  "responseStart",
  "responseEnd"
];
var navTimingNames = [
  "navigationStart",
  "unloadEventStart",
  "unloadEventEnd",
  "redirectStart",
  "redirectEnd",
  "fetchStart",
  "commitNavigationEnd",
  "domainLookupStart",
  "domainLookupEnd",
  "connectStart",
  "connectEnd",
  "secureConnectionStart",
  "requestStart",
  "responseStart",
  "responseEnd",
  "domLoading",
  "domInteractive",
  "domContentLoadedEventStart",
  "domContentLoadedEventEnd",
  "domComplete",
  "loadEventStart",
  "loadEventEnd"
];
var ignoredNames = [...resourceTimingNames, ...navTimingNames];
function getEventTimings(event) {
  if ("dur" in event) {
    return { start: event.ts, end: Types12.Timing.Micro(event.ts + (event.dur ?? 0)) };
  }
  if (Types12.Events.isConsoleTimeStamp(event)) {
    const { start, end } = event.args.data || {};
    if (typeof start === "number" && typeof end === "number") {
      return { start: Types12.Timing.Micro(start), end: Types12.Timing.Micro(end) };
    }
  }
  return { start: event.ts, end: event.ts };
}
function getEventTrack(event) {
  if (event.cat === "blink.user_timing") {
    const detailString = event.args.data.beginEvent.args?.detail;
    if (detailString) {
      const details = Helpers8.Trace.parseDevtoolsDetails(detailString, "devtools");
      if (details && "track" in details) {
        return details.track;
      }
    }
  } else if (Types12.Events.isConsoleTimeStamp(event)) {
    const track = event.args.data?.track;
    return typeof track === "string" ? track : void 0;
  }
  return void 0;
}
function userTimingComparator(a, b, originalArray) {
  const { start: aStart, end: aEnd } = getEventTimings(a);
  const { start: bStart, end: bEnd } = getEventTimings(b);
  const timeDifference = Helpers8.Trace.compareBeginAndEnd(aStart, bStart, aEnd, bEnd);
  if (timeDifference) {
    return timeDifference;
  }
  const aTrack = getEventTrack(a);
  const bTrack = getEventTrack(b);
  if (aTrack !== bTrack) {
    return 0;
  }
  const aIndex = originalArray.indexOf(a);
  const bIndex = originalArray.indexOf(b);
  return bIndex - aIndex;
}
function handleEvent11(event) {
  if (ignoredNames.includes(event.name)) {
    return;
  }
  if (Types12.Events.isUserTimingMeasure(event)) {
    measureTraceByTraceId.set(event.args.traceId, event);
  }
  if (Types12.Events.isPerformanceMeasure(event)) {
    performanceMeasureEvents.push(event);
    return;
  }
  if (Types12.Events.isPerformanceMark(event)) {
    performanceMarkEvents.push(event);
  }
  if (Types12.Events.isConsoleTime(event)) {
    consoleTimings.push(event);
  }
  if (Types12.Events.isConsoleTimeStamp(event)) {
    timestampEvents.push(event);
  }
}
async function finalize11() {
  const asyncEvents = [...performanceMeasureEvents, ...consoleTimings];
  syntheticEvents = Helpers8.Trace.createMatchedSortedSyntheticEvents(asyncEvents);
  syntheticEvents = syntheticEvents.sort((a, b) => userTimingComparator(a, b, [...syntheticEvents]));
  timestampEvents = timestampEvents.sort((a, b) => userTimingComparator(a, b, [...timestampEvents]));
}
function data11() {
  return {
    consoleTimings: syntheticEvents.filter((e) => e.cat === "blink.console"),
    performanceMeasures: syntheticEvents.filter((e) => e.cat === "blink.user_timing"),
    performanceMarks: performanceMarkEvents,
    timestampEvents,
    measureTraceByTraceId
  };
}

// gen/front_end/models/trace/handlers/ExtensionTraceDataHandler.js
var extensionTrackEntries = [];
var extensionTrackData = [];
var extensionMarkers = [];
var entryToNode3 = /* @__PURE__ */ new Map();
var timeStampByName = /* @__PURE__ */ new Map();
var syntheticConsoleEntriesForTimingsTrack = [];
function handleEvent12(_event) {
}
function reset12() {
  extensionTrackEntries = [];
  syntheticConsoleEntriesForTimingsTrack = [];
  extensionTrackData = [];
  extensionMarkers = [];
  entryToNode3 = /* @__PURE__ */ new Map();
  timeStampByName = /* @__PURE__ */ new Map();
}
async function finalize12() {
  createExtensionFlameChartEntries();
}
function createExtensionFlameChartEntries() {
  const pairedMeasures = data11().performanceMeasures;
  const marks = data11().performanceMarks;
  const mergedRawExtensionEvents = Helpers9.Trace.mergeEventsInOrder(pairedMeasures, marks);
  extractPerformanceAPIExtensionEntries(mergedRawExtensionEvents);
  extractConsoleAPIExtensionEntries();
  Helpers9.Trace.sortTraceEventsInPlace(extensionTrackEntries);
  Helpers9.Extensions.buildTrackDataFromExtensionEntries(extensionTrackEntries, extensionTrackData, entryToNode3);
}
function extractConsoleAPIExtensionEntries() {
  const consoleTimeStamps = data11().timestampEvents;
  for (const currentTimeStamp of consoleTimeStamps) {
    if (!currentTimeStamp.args.data) {
      continue;
    }
    const timeStampName = String(currentTimeStamp.args.data.name ?? currentTimeStamp.args.data.message);
    timeStampByName.set(timeStampName, currentTimeStamp);
    const { devtoolsObj: extensionData, userDetail } = extensionDataInConsoleTimeStamp(currentTimeStamp);
    const start = currentTimeStamp.args.data.start;
    const end = currentTimeStamp.args.data.end;
    if (!extensionData && !start && !end) {
      continue;
    }
    const startTimeStamp = typeof start === "number" ? Types13.Timing.Micro(start) : timeStampByName.get(String(start))?.ts;
    const endTimeStamp = typeof end === "number" ? Types13.Timing.Micro(end) : timeStampByName.get(String(end))?.ts;
    if (endTimeStamp !== void 0 && startTimeStamp === void 0) {
      continue;
    }
    const entryStartTime = startTimeStamp ?? currentTimeStamp.ts;
    const entryEndTime = endTimeStamp ?? currentTimeStamp.ts;
    if (extensionData) {
      const unregisteredExtensionEntry = {
        ...currentTimeStamp,
        name: timeStampName,
        cat: "devtools.extension",
        devtoolsObj: extensionData,
        userDetail,
        rawSourceEvent: currentTimeStamp,
        dur: Types13.Timing.Micro(entryEndTime - entryStartTime),
        ts: entryStartTime,
        ph: "X"
      };
      const extensionEntry = Helpers9.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(unregisteredExtensionEntry);
      extensionTrackEntries.push(extensionEntry);
      continue;
    }
    const unregisteredSyntheticTimeStamp = {
      ...currentTimeStamp,
      name: timeStampName,
      cat: "disabled-by-default-v8.inspector",
      ph: "X",
      ts: entryStartTime,
      dur: Types13.Timing.Micro(entryEndTime - entryStartTime),
      rawSourceEvent: currentTimeStamp
    };
    const syntheticTimeStamp = Helpers9.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(unregisteredSyntheticTimeStamp);
    syntheticConsoleEntriesForTimingsTrack.push(syntheticTimeStamp);
  }
}
function extractPerformanceAPIExtensionEntries(timings) {
  for (const timing of timings) {
    const { devtoolsObj, userDetail } = extensionDataInPerformanceTiming(timing);
    if (!devtoolsObj) {
      continue;
    }
    const extensionSyntheticEntry = {
      name: timing.name,
      ph: Types13.Extensions.isExtensionPayloadMarker(devtoolsObj) ? "I" : "X",
      pid: timing.pid,
      tid: timing.tid,
      ts: timing.ts,
      dur: timing.dur,
      cat: "devtools.extension",
      devtoolsObj,
      userDetail,
      rawSourceEvent: Types13.Events.isSyntheticUserTiming(timing) ? timing.rawSourceEvent : timing
    };
    if (Types13.Extensions.isExtensionPayloadMarker(devtoolsObj)) {
      const extensionMarker = Helpers9.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(extensionSyntheticEntry);
      extensionMarkers.push(extensionMarker);
      continue;
    }
    if (Types13.Extensions.isExtensionEntryObj(extensionSyntheticEntry.devtoolsObj)) {
      const extensionTrackEntry = Helpers9.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(extensionSyntheticEntry);
      extensionTrackEntries.push(extensionTrackEntry);
      continue;
    }
  }
}
function extensionDataInPerformanceTiming(timing) {
  const timingDetail = Types13.Events.isPerformanceMark(timing) ? timing.args.data?.detail : timing.args.data.beginEvent.args.detail;
  if (!timingDetail) {
    return { devtoolsObj: null, userDetail: null };
  }
  const devtoolsObj = Helpers9.Trace.parseDevtoolsDetails(timingDetail, "devtools");
  let userDetail = null;
  try {
    userDetail = JSON.parse(timingDetail);
    delete userDetail.devtools;
  } catch {
  }
  return { devtoolsObj, userDetail };
}
function extensionDataInConsoleTimeStamp(timeStamp) {
  if (!timeStamp.args.data || !timeStamp.args.data.track) {
    return { devtoolsObj: null, userDetail: null };
  }
  let userDetail = null;
  try {
    userDetail = JSON.parse(timeStamp.args.data?.devtools || '""');
  } catch {
  }
  const devtoolsObj = {
    // the color is defaulted to primary if it's value isn't one from
    // the defined palette (see ExtensionUI::extensionEntryColor) so
    // we don't need to check the value is valid here.
    color: String(timeStamp.args.data.color),
    track: String(timeStamp.args.data.track),
    dataType: "track-entry",
    trackGroup: timeStamp.args.data.trackGroup !== void 0 ? String(timeStamp.args.data.trackGroup) : void 0
  };
  return { devtoolsObj, userDetail };
}
function data12() {
  return {
    entryToNode: entryToNode3,
    extensionTrackData,
    extensionMarkers,
    syntheticConsoleEntriesForTimingsTrack
  };
}
function deps5() {
  return ["UserTimings"];
}

// gen/front_end/models/trace/handlers/FramesHandler.js
var FramesHandler_exports = {};
__export(FramesHandler_exports, {
  LayerPaintEvent: () => LayerPaintEvent,
  PendingFrame: () => PendingFrame,
  TimelineFrameBeginFrameQueue: () => TimelineFrameBeginFrameQueue,
  TimelineFrameModel: () => TimelineFrameModel,
  data: () => data14,
  deps: () => deps7,
  finalize: () => finalize14,
  framesWithinWindow: () => framesWithinWindow,
  handleEvent: () => handleEvent14,
  reset: () => reset14
});
import * as Platform8 from "./../../../core/platform/platform.js";
import * as Helpers11 from "./../helpers/helpers.js";
import * as Types15 from "./../types/types.js";

// gen/front_end/models/trace/handlers/LayerTreeHandler.js
var LayerTreeHandler_exports = {};
__export(LayerTreeHandler_exports, {
  data: () => data13,
  deps: () => deps6,
  finalize: () => finalize13,
  handleEvent: () => handleEvent13,
  reset: () => reset13
});
import * as Helpers10 from "./../helpers/helpers.js";
import * as Types14 from "./../types/types.js";
var paintEvents = [];
var snapshotEvents = [];
var paintToSnapshotMap = /* @__PURE__ */ new Map();
var lastPaintForLayerId = {};
var currentMainFrameLayerTreeId = null;
var updateLayerEvents = [];
var relevantEvents = [];
function reset13() {
  paintEvents = [];
  snapshotEvents = [];
  paintToSnapshotMap = /* @__PURE__ */ new Map();
  lastPaintForLayerId = {};
  currentMainFrameLayerTreeId = null;
  updateLayerEvents = [];
  relevantEvents = [];
}
function handleEvent13(event) {
  if (Types14.Events.isPaint(event) || Types14.Events.isDisplayListItemListSnapshot(event) || Types14.Events.isUpdateLayer(event) || Types14.Events.isSetLayerId(event)) {
    relevantEvents.push(event);
  }
}
async function finalize13() {
  const metaData = data5();
  Helpers10.Trace.sortTraceEventsInPlace(relevantEvents);
  for (const event of relevantEvents) {
    if (Types14.Events.isSetLayerId(event)) {
      if (metaData.mainFrameId !== event.args.data.frame) {
        continue;
      }
      currentMainFrameLayerTreeId = event.args.data.layerTreeId;
    } else if (Types14.Events.isUpdateLayer(event)) {
      updateLayerEvents.push(event);
    } else if (Types14.Events.isPaint(event)) {
      if (!event.args.data.layerId) {
        continue;
      }
      paintEvents.push(event);
      lastPaintForLayerId[event.args.data.layerId] = event;
      continue;
    } else if (Types14.Events.isDisplayListItemListSnapshot(event)) {
      let lastUpdateLayerEventForThread = null;
      for (let i = updateLayerEvents.length - 1; i > -1; i--) {
        const updateEvent = updateLayerEvents[i];
        if (updateEvent.pid === event.pid && updateEvent.tid === event.tid) {
          lastUpdateLayerEventForThread = updateEvent;
          break;
        }
      }
      if (!lastUpdateLayerEventForThread) {
        continue;
      }
      if (lastUpdateLayerEventForThread.args.layerTreeId !== currentMainFrameLayerTreeId) {
        continue;
      }
      const paintEvent = lastPaintForLayerId[lastUpdateLayerEventForThread.args.layerId];
      if (!paintEvent) {
        continue;
      }
      snapshotEvents.push(event);
      paintToSnapshotMap.set(paintEvent, event);
    }
  }
}
function data13() {
  return {
    paints: paintEvents,
    snapshots: snapshotEvents,
    paintsToSnapshots: paintToSnapshotMap
  };
}
function deps6() {
  return ["Meta"];
}

// gen/front_end/models/trace/handlers/Threads.js
var Threads_exports = {};
__export(Threads_exports, {
  threadsInRenderer: () => threadsInRenderer,
  threadsInTrace: () => threadsInTrace
});
function getThreadTypeForRendererThread(pid, thread, auctionWorkletsData) {
  let threadType = "OTHER";
  if (thread.name === "CrRendererMain") {
    threadType = "MAIN_THREAD";
  } else if (thread.name === "DedicatedWorker thread") {
    threadType = "WORKER";
  } else if (thread.name?.startsWith("CompositorTileWorker")) {
    threadType = "RASTERIZER";
  } else if (auctionWorkletsData.worklets.has(pid)) {
    threadType = "AUCTION_WORKLET";
  } else if (thread.name?.startsWith("ThreadPool")) {
    threadType = "THREAD_POOL";
  }
  return threadType;
}
function threadsInRenderer(rendererData, auctionWorkletsData) {
  const foundThreads = [];
  if (rendererData.processes.size) {
    for (const [pid, process] of rendererData.processes) {
      for (const [tid, thread] of process.threads) {
        if (!thread.tree) {
          continue;
        }
        const threadType = getThreadTypeForRendererThread(pid, thread, auctionWorkletsData);
        foundThreads.push({
          name: thread.name,
          pid,
          tid,
          processIsOnMainFrame: process.isOnMainFrame,
          entries: thread.entries,
          tree: thread.tree,
          type: threadType,
          entryToNode: rendererData.entryToNode
        });
      }
    }
  }
  return foundThreads;
}
var threadsInHandlerDataCache = /* @__PURE__ */ new WeakMap();
function threadsInTrace(handlerData) {
  const cached = threadsInHandlerDataCache.get(handlerData);
  if (cached) {
    return cached;
  }
  const threadsFromRenderer = threadsInRenderer(handlerData.Renderer, handlerData.AuctionWorklets);
  if (threadsFromRenderer.length) {
    threadsInHandlerDataCache.set(handlerData, threadsFromRenderer);
    return threadsFromRenderer;
  }
  const foundThreads = [];
  if (handlerData.Samples.profilesInProcess.size) {
    for (const [pid, process] of handlerData.Samples.profilesInProcess) {
      for (const [tid, thread] of process) {
        if (!thread.profileTree) {
          continue;
        }
        foundThreads.push({
          pid,
          tid,
          // CPU Profile threads do not have a name.
          name: null,
          entries: thread.profileCalls,
          // There is no concept of a "Main Frame" in a CPU profile.
          processIsOnMainFrame: false,
          tree: thread.profileTree,
          type: "CPU_PROFILE",
          entryToNode: handlerData.Samples.entryToNode
        });
      }
    }
  }
  threadsInHandlerDataCache.set(handlerData, foundThreads);
  return foundThreads;
}

// gen/front_end/models/trace/handlers/FramesHandler.js
var model = null;
var relevantFrameEvents = [];
function isFrameEvent(event) {
  return Types15.Events.isSetLayerId(event) || Types15.Events.isBeginFrame(event) || Types15.Events.isDroppedFrame(event) || Types15.Events.isRequestMainThreadFrame(event) || Types15.Events.isBeginMainThreadFrame(event) || Types15.Events.isNeedsBeginFrameChanged(event) || // Note that "Commit" is the replacement for "CompositeLayers" so in a trace
  // we wouldn't expect to see a combination of these. All "new" trace
  // recordings use "Commit", but we can easily support "CompositeLayers" too
  // to not break older traces being imported.
  Types15.Events.isCommit(event) || Types15.Events.isCompositeLayers(event) || Types15.Events.isActivateLayerTree(event) || Types15.Events.isDrawFrame(event);
}
function entryIsTopLevel(entry) {
  const devtoolsTimelineCategory = "disabled-by-default-devtools.timeline";
  return entry.name === "RunTask" && entry.cat.includes(devtoolsTimelineCategory);
}
var MAIN_FRAME_MARKERS = /* @__PURE__ */ new Set([
  "ScheduleStyleRecalculation",
  "InvalidateLayout",
  "BeginMainThreadFrame",
  "ScrollLayer"
]);
function reset14() {
  model = null;
  relevantFrameEvents = [];
}
function handleEvent14(event) {
  if (isFrameEvent(event) || Types15.Events.isLayerTreeHostImplSnapshot(event) || entryIsTopLevel(event) || MAIN_FRAME_MARKERS.has(event.name) || Types15.Events.isPaint(event)) {
    relevantFrameEvents.push(event);
  }
}
async function finalize14() {
  Helpers11.Trace.sortTraceEventsInPlace(relevantFrameEvents);
  const modelForTrace = new TimelineFrameModel(relevantFrameEvents, data8(), data4(), data5(), data13());
  model = modelForTrace;
}
function data14() {
  return {
    frames: model?.frames() ?? [],
    framesById: model?.framesById() ?? {}
  };
}
function deps7() {
  return ["Meta", "Renderer", "AuctionWorklets", "LayerTree"];
}
var TimelineFrameModel = class {
  #frames = [];
  #frameById = {};
  #beginFrameQueue = new TimelineFrameBeginFrameQueue();
  #lastFrame = null;
  #mainFrameCommitted = false;
  #mainFrameRequested = false;
  #lastLayerTree = null;
  #framePendingActivation = null;
  #framePendingCommit = null;
  #lastBeginFrame = null;
  #lastNeedsBeginFrame = null;
  #lastTaskBeginTime = null;
  #layerTreeId = null;
  #activeProcessId = null;
  #activeThreadId = null;
  #layerTreeData;
  constructor(allEvents, rendererData, auctionWorkletsData, metaData, layerTreeData) {
    const mainThreads = threadsInRenderer(rendererData, auctionWorkletsData).filter((thread) => {
      return thread.type === "MAIN_THREAD" && thread.processIsOnMainFrame;
    });
    const threadData = mainThreads.map((thread) => {
      return {
        tid: thread.tid,
        pid: thread.pid,
        startTime: thread.entries[0].ts
      };
    });
    this.#layerTreeData = layerTreeData;
    this.#addTraceEvents(allEvents, threadData, metaData.mainFrameId);
  }
  framesById() {
    return this.#frameById;
  }
  frames() {
    return this.#frames;
  }
  #handleBeginFrame(startTime, seqId) {
    if (!this.#lastFrame) {
      this.#startFrame(startTime, seqId);
    }
    this.#lastBeginFrame = startTime;
    this.#beginFrameQueue.addFrameIfNotExists(seqId, startTime, false, false);
  }
  #handleDroppedFrame(startTime, seqId, isPartial) {
    if (!this.#lastFrame) {
      this.#startFrame(startTime, seqId);
    }
    this.#beginFrameQueue.addFrameIfNotExists(seqId, startTime, true, isPartial);
    this.#beginFrameQueue.setDropped(seqId, true);
    this.#beginFrameQueue.setPartial(seqId, isPartial);
  }
  #handleDrawFrame(startTime, seqId) {
    if (!this.#lastFrame) {
      this.#startFrame(startTime, seqId);
      return;
    }
    if (this.#mainFrameCommitted || !this.#mainFrameRequested) {
      if (this.#lastNeedsBeginFrame) {
        const idleTimeEnd = this.#framePendingActivation ? this.#framePendingActivation.triggerTime : this.#lastBeginFrame || this.#lastNeedsBeginFrame;
        if (idleTimeEnd > this.#lastFrame.startTime) {
          this.#lastFrame.idle = true;
          this.#lastBeginFrame = null;
        }
        this.#lastNeedsBeginFrame = null;
      }
      const framesToVisualize = this.#beginFrameQueue.processPendingBeginFramesOnDrawFrame(seqId);
      for (const frame of framesToVisualize) {
        const isLastFrameIdle = this.#lastFrame.idle;
        this.#startFrame(frame.startTime, seqId);
        if (isLastFrameIdle && this.#framePendingActivation) {
          this.#commitPendingFrame();
        }
        if (frame.isDropped) {
          this.#lastFrame.dropped = true;
        }
        if (frame.isPartial) {
          this.#lastFrame.isPartial = true;
        }
      }
    }
    this.#mainFrameCommitted = false;
  }
  #handleActivateLayerTree() {
    if (!this.#lastFrame) {
      return;
    }
    if (this.#framePendingActivation && !this.#lastNeedsBeginFrame) {
      this.#commitPendingFrame();
    }
  }
  #handleRequestMainThreadFrame() {
    if (!this.#lastFrame) {
      return;
    }
    this.#mainFrameRequested = true;
  }
  #handleCommit() {
    if (!this.#framePendingCommit) {
      return;
    }
    this.#framePendingActivation = this.#framePendingCommit;
    this.#framePendingCommit = null;
    this.#mainFrameRequested = false;
    this.#mainFrameCommitted = true;
  }
  #handleLayerTreeSnapshot(layerTree) {
    this.#lastLayerTree = layerTree;
  }
  #handleNeedFrameChanged(startTime, needsBeginFrame) {
    if (needsBeginFrame) {
      this.#lastNeedsBeginFrame = startTime;
    }
  }
  #startFrame(startTime, seqId) {
    if (this.#lastFrame) {
      this.#flushFrame(this.#lastFrame, startTime);
    }
    this.#lastFrame = new TimelineFrame(seqId, startTime, Types15.Timing.Micro(startTime - data5().traceBounds.min));
  }
  #flushFrame(frame, endTime) {
    frame.setLayerTree(this.#lastLayerTree);
    frame.setEndTime(endTime);
    if (this.#lastLayerTree) {
      this.#lastLayerTree.paints = frame.paints;
    }
    const lastFrame = this.#frames[this.#frames.length - 1];
    if (this.#frames.length && lastFrame && (frame.startTime !== lastFrame.endTime || frame.startTime > frame.endTime)) {
      console.assert(false, `Inconsistent frame time for frame ${this.#frames.length} (${frame.startTime} - ${frame.endTime})`);
    }
    const newFramesLength = this.#frames.push(frame);
    frame.setIndex(newFramesLength - 1);
    if (typeof frame.mainFrameId === "number") {
      this.#frameById[frame.mainFrameId] = frame;
    }
  }
  #commitPendingFrame() {
    if (!this.#framePendingActivation || !this.#lastFrame) {
      return;
    }
    this.#lastFrame.paints = this.#framePendingActivation.paints;
    this.#lastFrame.mainFrameId = this.#framePendingActivation.mainFrameId;
    this.#framePendingActivation = null;
  }
  #addTraceEvents(events, threadData, mainFrameId2) {
    let j = 0;
    this.#activeThreadId = threadData.length && threadData[0].tid || null;
    this.#activeProcessId = threadData.length && threadData[0].pid || null;
    for (let i = 0; i < events.length; ++i) {
      while (j + 1 < threadData.length && threadData[j + 1].startTime <= events[i].ts) {
        this.#activeThreadId = threadData[++j].tid;
        this.#activeProcessId = threadData[j].pid;
      }
      this.#addTraceEvent(events[i], mainFrameId2);
    }
    this.#activeThreadId = null;
    this.#activeProcessId = null;
  }
  #addTraceEvent(event, mainFrameId2) {
    if (Types15.Events.isSetLayerId(event) && event.args.data.frame === mainFrameId2) {
      this.#layerTreeId = event.args.data.layerTreeId;
    } else if (Types15.Events.isLayerTreeHostImplSnapshot(event) && Number(event.id) === this.#layerTreeId) {
      this.#handleLayerTreeSnapshot({
        entry: event,
        paints: []
      });
    } else {
      if (isFrameEvent(event)) {
        this.#processCompositorEvents(event);
      }
      if (event.tid === this.#activeThreadId && event.pid === this.#activeProcessId) {
        this.#addMainThreadTraceEvent(event);
      }
    }
  }
  #processCompositorEvents(entry) {
    if (entry.args["layerTreeId"] !== this.#layerTreeId) {
      return;
    }
    if (Types15.Events.isBeginFrame(entry)) {
      this.#handleBeginFrame(entry.ts, entry.args["frameSeqId"]);
    } else if (Types15.Events.isDrawFrame(entry)) {
      this.#handleDrawFrame(entry.ts, entry.args["frameSeqId"]);
    } else if (Types15.Events.isActivateLayerTree(entry)) {
      this.#handleActivateLayerTree();
    } else if (Types15.Events.isRequestMainThreadFrame(entry)) {
      this.#handleRequestMainThreadFrame();
    } else if (Types15.Events.isNeedsBeginFrameChanged(entry)) {
      this.#handleNeedFrameChanged(entry.ts, entry.args["data"] && Boolean(entry.args["data"]["needsBeginFrame"]));
    } else if (Types15.Events.isDroppedFrame(entry)) {
      this.#handleDroppedFrame(entry.ts, entry.args["frameSeqId"], Boolean(entry.args["hasPartialUpdate"]));
    }
  }
  #addMainThreadTraceEvent(entry) {
    if (entryIsTopLevel(entry)) {
      this.#lastTaskBeginTime = entry.ts;
    }
    if (!this.#framePendingCommit && MAIN_FRAME_MARKERS.has(entry.name)) {
      this.#framePendingCommit = new PendingFrame(this.#lastTaskBeginTime || entry.ts);
    }
    if (!this.#framePendingCommit) {
      return;
    }
    if (Types15.Events.isBeginMainThreadFrame(entry) && entry.args.data.frameId) {
      this.#framePendingCommit.mainFrameId = entry.args.data.frameId;
    }
    if (Types15.Events.isPaint(entry)) {
      const snapshot = this.#layerTreeData.paintsToSnapshots.get(entry);
      if (snapshot) {
        this.#framePendingCommit.paints.push(new LayerPaintEvent(entry, snapshot));
      }
    }
    if ((Types15.Events.isCompositeLayers(entry) || Types15.Events.isCommit(entry)) && entry.args["layerTreeId"] === this.#layerTreeId) {
      this.#handleCommit();
    }
  }
};
var TimelineFrame = class {
  // These fields exist to satisfy the base Event type which all
  // "trace events" must implement. They aren't used, but doing this means we
  // can pass `TimelineFrame` instances into places that expect
  // Types.Events.Event.
  cat = "devtools.legacy_frame";
  name = "frame";
  ph = "X";
  ts;
  pid = Types15.Events.ProcessID(-1);
  tid = Types15.Events.ThreadID(-1);
  index = -1;
  startTime;
  startTimeOffset;
  endTime;
  duration;
  idle;
  dropped;
  isPartial;
  layerTree;
  paints;
  mainFrameId;
  seqId;
  constructor(seqId, startTime, startTimeOffset) {
    this.seqId = seqId;
    this.startTime = startTime;
    this.ts = startTime;
    this.startTimeOffset = startTimeOffset;
    this.endTime = this.startTime;
    this.duration = Types15.Timing.Micro(0);
    this.idle = false;
    this.dropped = false;
    this.isPartial = false;
    this.layerTree = null;
    this.paints = [];
    this.mainFrameId = void 0;
  }
  setIndex(i) {
    this.index = i;
  }
  setEndTime(endTime) {
    this.endTime = endTime;
    this.duration = Types15.Timing.Micro(this.endTime - this.startTime);
  }
  setLayerTree(layerTree) {
    this.layerTree = layerTree;
  }
  /**
   * Fake the `dur` field to meet the expected value given that we pretend
   * these TimelineFrame classes are trace events across the codebase.
   */
  get dur() {
    return this.duration;
  }
};
var LayerPaintEvent = class {
  #event;
  #snapshot;
  constructor(event, snapshot) {
    this.#event = event;
    this.#snapshot = snapshot;
  }
  layerId() {
    return this.#event.args.data.layerId;
  }
  event() {
    return this.#event;
  }
  picture() {
    const rect = this.#snapshot.args.snapshot.params?.layer_rect;
    const pictureData = this.#snapshot.args.snapshot.skp64;
    return rect && pictureData ? { rect, serializedPicture: pictureData } : null;
  }
};
var PendingFrame = class {
  paints;
  mainFrameId;
  triggerTime;
  constructor(triggerTime) {
    this.paints = [];
    this.mainFrameId = void 0;
    this.triggerTime = triggerTime;
  }
};
var BeginFrameInfo = class {
  seqId;
  startTime;
  isDropped;
  isPartial;
  constructor(seqId, startTime, isDropped, isPartial) {
    this.seqId = seqId;
    this.startTime = startTime;
    this.isDropped = isDropped;
    this.isPartial = isPartial;
  }
};
var TimelineFrameBeginFrameQueue = class {
  queueFrames = [];
  // Maps frameSeqId to BeginFrameInfo.
  mapFrames = {};
  // Add a BeginFrame to the queue, if it does not already exit.
  addFrameIfNotExists(seqId, startTime, isDropped, isPartial) {
    if (!(seqId in this.mapFrames)) {
      this.mapFrames[seqId] = new BeginFrameInfo(seqId, startTime, isDropped, isPartial);
      this.queueFrames.push(seqId);
    }
  }
  // Set a BeginFrame in queue as dropped.
  setDropped(seqId, isDropped) {
    if (seqId in this.mapFrames) {
      this.mapFrames[seqId].isDropped = isDropped;
    }
  }
  setPartial(seqId, isPartial) {
    if (seqId in this.mapFrames) {
      this.mapFrames[seqId].isPartial = isPartial;
    }
  }
  processPendingBeginFramesOnDrawFrame(seqId) {
    const framesToVisualize = [];
    if (seqId in this.mapFrames) {
      while (this.queueFrames[0] !== seqId) {
        const currentSeqId = this.queueFrames[0];
        if (this.mapFrames[currentSeqId].isDropped) {
          framesToVisualize.push(this.mapFrames[currentSeqId]);
        }
        delete this.mapFrames[currentSeqId];
        this.queueFrames.shift();
      }
      framesToVisualize.push(this.mapFrames[seqId]);
      delete this.mapFrames[seqId];
      this.queueFrames.shift();
    }
    return framesToVisualize;
  }
};
function framesWithinWindow(frames2, startTime, endTime) {
  const firstFrame = Platform8.ArrayUtilities.lowerBound(frames2, startTime || 0, (time, frame) => time - frame.endTime);
  const lastFrame = Platform8.ArrayUtilities.lowerBound(frames2, endTime || Infinity, (time, frame) => time - frame.startTime);
  return frames2.slice(firstFrame, lastFrame);
}

// gen/front_end/models/trace/handlers/GPUHandler.js
var GPUHandler_exports = {};
__export(GPUHandler_exports, {
  data: () => data15,
  deps: () => deps8,
  finalize: () => finalize15,
  handleEvent: () => handleEvent15,
  reset: () => reset15
});
import * as Helpers12 from "./../helpers/helpers.js";
import * as Types16 from "./../types/types.js";
var eventsInProcessThread = /* @__PURE__ */ new Map();
var mainGPUThreadTasks = [];
function reset15() {
  eventsInProcessThread = /* @__PURE__ */ new Map();
  mainGPUThreadTasks = [];
}
function handleEvent15(event) {
  if (!Types16.Events.isGPUTask(event)) {
    return;
  }
  Helpers12.Trace.addEventToProcessThread(event, eventsInProcessThread);
}
async function finalize15() {
  const { gpuProcessId: gpuProcessId2, gpuThreadId: gpuThreadId2 } = data5();
  const gpuThreadsForProcess = eventsInProcessThread.get(gpuProcessId2);
  if (gpuThreadsForProcess && gpuThreadId2) {
    mainGPUThreadTasks = gpuThreadsForProcess.get(gpuThreadId2) || [];
  }
}
function data15() {
  return {
    mainGPUThreadTasks
  };
}
function deps8() {
  return ["Meta"];
}

// gen/front_end/models/trace/handlers/ImagePaintingHandler.js
var ImagePaintingHandler_exports = {};
__export(ImagePaintingHandler_exports, {
  data: () => data16,
  finalize: () => finalize16,
  handleEvent: () => handleEvent16,
  reset: () => reset16
});
import * as Platform9 from "./../../../core/platform/platform.js";
import * as Types17 from "./../types/types.js";
var paintImageEvents = /* @__PURE__ */ new Map();
var decodeLazyPixelRefEvents = /* @__PURE__ */ new Map();
var paintImageByLazyPixelRef = /* @__PURE__ */ new Map();
var eventToPaintImage = /* @__PURE__ */ new Map();
var urlToPaintImage = /* @__PURE__ */ new Map();
var paintEventToCorrectedDisplaySize = /* @__PURE__ */ new Map();
var didCorrectForHostDpr = false;
function reset16() {
  paintImageEvents = /* @__PURE__ */ new Map();
  decodeLazyPixelRefEvents = /* @__PURE__ */ new Map();
  paintImageByLazyPixelRef = /* @__PURE__ */ new Map();
  eventToPaintImage = /* @__PURE__ */ new Map();
  urlToPaintImage = /* @__PURE__ */ new Map();
  paintEventToCorrectedDisplaySize = /* @__PURE__ */ new Map();
  didCorrectForHostDpr = false;
}
function handleEvent16(event) {
  if (Types17.Events.isPaintImage(event)) {
    const forProcess = paintImageEvents.get(event.pid) || /* @__PURE__ */ new Map();
    const forThread = forProcess.get(event.tid) || [];
    forThread.push(event);
    forProcess.set(event.tid, forThread);
    paintImageEvents.set(event.pid, forProcess);
    if (event.args.data.url) {
      const paintsForUrl = Platform9.MapUtilities.getWithDefault(urlToPaintImage, event.args.data.url, () => []);
      paintsForUrl.push(event);
    }
    return;
  }
  if (Types17.Events.isDecodeLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== "undefined") {
    const forProcess = decodeLazyPixelRefEvents.get(event.pid) || /* @__PURE__ */ new Map();
    const forThread = forProcess.get(event.tid) || [];
    forThread.push(event);
    forProcess.set(event.tid, forThread);
    decodeLazyPixelRefEvents.set(event.pid, forProcess);
  }
  if (Types17.Events.isDrawLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== "undefined") {
    const lastPaintEvent = paintImageEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (!lastPaintEvent) {
      return;
    }
    paintImageByLazyPixelRef.set(event.args.LazyPixelRef, lastPaintEvent);
    return;
  }
  if (Types17.Events.isDecodeImage(event)) {
    const lastPaintImageEventOnThread = paintImageEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (lastPaintImageEventOnThread) {
      eventToPaintImage.set(event, lastPaintImageEventOnThread);
      return;
    }
    const lastDecodeLazyPixelRef = decodeLazyPixelRefEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (typeof lastDecodeLazyPixelRef?.args?.LazyPixelRef === "undefined") {
      return;
    }
    const paintEvent = paintImageByLazyPixelRef.get(lastDecodeLazyPixelRef.args.LazyPixelRef);
    if (!paintEvent) {
      return;
    }
    eventToPaintImage.set(event, paintEvent);
  }
}
async function finalize16(options) {
  if (!options.metadata?.hostDPR) {
    return;
  }
  const { devicePixelRatio: emulatedDpr } = data5();
  if (!emulatedDpr) {
    return;
  }
  for (const byThread of paintImageEvents.values()) {
    for (const paintEvents2 of byThread.values()) {
      for (const paintEvent of paintEvents2) {
        const cssPixelsWidth = paintEvent.args.data.width / options.metadata.hostDPR;
        const cssPixelsHeight = paintEvent.args.data.height / options.metadata.hostDPR;
        const width = cssPixelsWidth * emulatedDpr;
        const height = cssPixelsHeight * emulatedDpr;
        paintEventToCorrectedDisplaySize.set(paintEvent, { width, height });
      }
    }
  }
  didCorrectForHostDpr = true;
}
function data16() {
  return {
    paintImageByDrawLazyPixelRef: paintImageByLazyPixelRef,
    paintImageForEvent: eventToPaintImage,
    paintImageEventForUrl: urlToPaintImage,
    paintEventToCorrectedDisplaySize,
    didCorrectForHostDpr
  };
}

// gen/front_end/models/trace/handlers/InitiatorsHandler.js
var InitiatorsHandler_exports = {};
__export(InitiatorsHandler_exports, {
  data: () => data17,
  deps: () => deps9,
  finalize: () => finalize17,
  handleEvent: () => handleEvent17,
  reset: () => reset17
});
import * as Helpers13 from "./../helpers/helpers.js";
import * as Types18 from "./../types/types.js";
var lastScheduleStyleRecalcByFrame = /* @__PURE__ */ new Map();
var lastInvalidationEventForFrame = /* @__PURE__ */ new Map();
var lastRecalcByFrame = /* @__PURE__ */ new Map();
var eventToInitiatorMap2 = /* @__PURE__ */ new Map();
var initiatorToEventsMap = /* @__PURE__ */ new Map();
var timerInstallEventsById = /* @__PURE__ */ new Map();
var requestIdleCallbackEventsById = /* @__PURE__ */ new Map();
var webSocketCreateEventsById = /* @__PURE__ */ new Map();
var schedulePostTaskCallbackEventsById = /* @__PURE__ */ new Map();
function reset17() {
  lastScheduleStyleRecalcByFrame = /* @__PURE__ */ new Map();
  lastInvalidationEventForFrame = /* @__PURE__ */ new Map();
  lastRecalcByFrame = /* @__PURE__ */ new Map();
  timerInstallEventsById = /* @__PURE__ */ new Map();
  eventToInitiatorMap2 = /* @__PURE__ */ new Map();
  initiatorToEventsMap = /* @__PURE__ */ new Map();
  requestIdleCallbackEventsById = /* @__PURE__ */ new Map();
  webSocketCreateEventsById = /* @__PURE__ */ new Map();
  schedulePostTaskCallbackEventsById = /* @__PURE__ */ new Map();
}
function storeInitiator(data31) {
  eventToInitiatorMap2.set(data31.event, data31.initiator);
  const eventsForInitiator = initiatorToEventsMap.get(data31.initiator) || [];
  eventsForInitiator.push(data31.event);
  initiatorToEventsMap.set(data31.initiator, eventsForInitiator);
}
function handleEvent17(event) {
  if (Types18.Events.isScheduleStyleRecalculation(event)) {
    lastScheduleStyleRecalcByFrame.set(event.args.data.frame, event);
  } else if (Types18.Events.isRecalcStyle(event)) {
    if (event.args.beginData) {
      lastRecalcByFrame.set(event.args.beginData.frame, event);
      const scheduledStyleForFrame = lastScheduleStyleRecalcByFrame.get(event.args.beginData.frame);
      if (scheduledStyleForFrame) {
        storeInitiator({
          event,
          initiator: scheduledStyleForFrame
        });
      }
    }
  } else if (Types18.Events.isInvalidateLayout(event)) {
    let invalidationInitiator = event;
    if (!lastInvalidationEventForFrame.has(event.args.data.frame)) {
      const lastRecalcStyleForFrame = lastRecalcByFrame.get(event.args.data.frame);
      if (lastRecalcStyleForFrame) {
        const { endTime } = Helpers13.Timing.eventTimingsMicroSeconds(lastRecalcStyleForFrame);
        const initiatorOfRecalcStyle = eventToInitiatorMap2.get(lastRecalcStyleForFrame);
        if (initiatorOfRecalcStyle && endTime && endTime > event.ts) {
          invalidationInitiator = initiatorOfRecalcStyle;
        }
      }
    }
    lastInvalidationEventForFrame.set(event.args.data.frame, invalidationInitiator);
  } else if (Types18.Events.isLayout(event)) {
    const lastInvalidation = lastInvalidationEventForFrame.get(event.args.beginData.frame);
    if (lastInvalidation) {
      storeInitiator({
        event,
        initiator: lastInvalidation
      });
    }
    lastInvalidationEventForFrame.delete(event.args.beginData.frame);
  } else if (Types18.Events.isTimerInstall(event)) {
    timerInstallEventsById.set(event.args.data.timerId, event);
  } else if (Types18.Events.isTimerFire(event)) {
    const matchingInstall = timerInstallEventsById.get(event.args.data.timerId);
    if (matchingInstall) {
      storeInitiator({ event, initiator: matchingInstall });
    }
  } else if (Types18.Events.isRequestIdleCallback(event)) {
    requestIdleCallbackEventsById.set(event.args.data.id, event);
  } else if (Types18.Events.isFireIdleCallback(event)) {
    const matchingRequestEvent = requestIdleCallbackEventsById.get(event.args.data.id);
    if (matchingRequestEvent) {
      storeInitiator({
        event,
        initiator: matchingRequestEvent
      });
    }
  } else if (Types18.Events.isWebSocketCreate(event)) {
    webSocketCreateEventsById.set(event.args.data.identifier, event);
  } else if (Types18.Events.isWebSocketInfo(event) || Types18.Events.isWebSocketTransfer(event)) {
    const matchingCreateEvent = webSocketCreateEventsById.get(event.args.data.identifier);
    if (matchingCreateEvent) {
      storeInitiator({
        event,
        initiator: matchingCreateEvent
      });
    }
  } else if (Types18.Events.isSchedulePostTaskCallback(event)) {
    schedulePostTaskCallbackEventsById.set(event.args.data.taskId, event);
  } else if (Types18.Events.isRunPostTaskCallback(event) || Types18.Events.isAbortPostTaskCallback(event)) {
    const matchingSchedule = schedulePostTaskCallbackEventsById.get(event.args.data.taskId);
    if (matchingSchedule) {
      storeInitiator({ event, initiator: matchingSchedule });
    }
  }
}
function createRelationshipsFromFlows() {
  const flows2 = data3().flows;
  for (let i = 0; i < flows2.length; i++) {
    const flow = flows2[i];
    for (let j = 0; j < flow.length - 1; j++) {
      storeInitiator({ event: flow[j + 1], initiator: flow[j] });
    }
  }
}
function createRelationshipsFromAsyncJSCalls() {
  const asyncCallEntries = data9().schedulerToRunEntryPoints.entries();
  for (const [asyncCaller, asyncCallees] of asyncCallEntries) {
    for (const asyncCallee of asyncCallees) {
      storeInitiator({ event: asyncCallee, initiator: asyncCaller });
    }
  }
}
async function finalize17() {
  createRelationshipsFromFlows();
  createRelationshipsFromAsyncJSCalls();
}
function data17() {
  return {
    eventToInitiator: eventToInitiatorMap2,
    initiatorToEvents: initiatorToEventsMap
  };
}
function deps9() {
  return ["Flows", "AsyncJSCalls"];
}

// gen/front_end/models/trace/handlers/InvalidationsHandler.js
var InvalidationsHandler_exports = {};
__export(InvalidationsHandler_exports, {
  data: () => data18,
  finalize: () => finalize18,
  handleEvent: () => handleEvent18,
  handleUserConfig: () => handleUserConfig3,
  reset: () => reset18
});
import * as Types19 from "./../types/types.js";
var frameStateByFrame = /* @__PURE__ */ new Map();
var maxInvalidationsPerEvent = null;
function reset18() {
  frameStateByFrame.clear();
  maxInvalidationsPerEvent = null;
}
function handleUserConfig3(userConfig) {
  maxInvalidationsPerEvent = userConfig.maxInvalidationEventsPerEvent;
}
function getState(frameId) {
  let frameState = frameStateByFrame.get(frameId);
  if (!frameState) {
    frameState = {
      invalidationsForEvent: /* @__PURE__ */ new Map(),
      invalidationCountForEvent: /* @__PURE__ */ new Map(),
      lastRecalcStyleEvent: null,
      pendingInvalidations: [],
      hasPainted: false
    };
    frameStateByFrame.set(frameId, frameState);
  }
  return frameState;
}
function getFrameId(event) {
  if (Types19.Events.isRecalcStyle(event) || Types19.Events.isLayout(event)) {
    return event.args.beginData?.frame ?? null;
  }
  return event.args?.data?.frame ?? null;
}
function addInvalidationToEvent(frameState, event, invalidation) {
  const existingInvalidations = frameState.invalidationsForEvent.get(event) || [];
  existingInvalidations.push(invalidation);
  if (maxInvalidationsPerEvent !== null && existingInvalidations.length > maxInvalidationsPerEvent) {
    existingInvalidations.shift();
  }
  frameState.invalidationsForEvent.set(event, existingInvalidations);
  const count = frameState.invalidationCountForEvent.get(event) ?? 0;
  frameState.invalidationCountForEvent.set(event, count + 1);
}
function handleEvent18(event) {
  if (maxInvalidationsPerEvent === 0) {
    return;
  }
  const frameId = getFrameId(event);
  if (!frameId) {
    return;
  }
  const thisFrame = getState(frameId);
  if (Types19.Events.isRecalcStyle(event)) {
    thisFrame.lastRecalcStyleEvent = event;
    for (const invalidation of thisFrame.pendingInvalidations) {
      if (Types19.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
    return;
  }
  if (Types19.Events.isInvalidationTracking(event)) {
    if (thisFrame.hasPainted) {
      thisFrame.pendingInvalidations.length = 0;
      thisFrame.lastRecalcStyleEvent = null;
      thisFrame.hasPainted = false;
    }
    if (thisFrame.lastRecalcStyleEvent && (Types19.Events.isScheduleStyleInvalidationTracking(event) || Types19.Events.isStyleRecalcInvalidationTracking(event) || Types19.Events.isStyleInvalidatorInvalidationTracking(event))) {
      const recalcLastRecalc = thisFrame.lastRecalcStyleEvent;
      const recalcEndTime = recalcLastRecalc.ts + (recalcLastRecalc.dur || 0);
      if (event.ts >= recalcLastRecalc.ts && event.ts <= recalcEndTime) {
        addInvalidationToEvent(thisFrame, recalcLastRecalc, event);
      }
    }
    thisFrame.pendingInvalidations.push(event);
    return;
  }
  if (Types19.Events.isPaint(event)) {
    thisFrame.hasPainted = true;
    return;
  }
  if (Types19.Events.isLayout(event)) {
    for (const invalidation of thisFrame.pendingInvalidations) {
      if (!Types19.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
  }
}
async function finalize18() {
}
function data18() {
  const invalidationsForEvent = /* @__PURE__ */ new Map();
  const invalidationCountForEvent = /* @__PURE__ */ new Map();
  for (const frame of frameStateByFrame.values()) {
    for (const [event, invalidations] of frame.invalidationsForEvent.entries()) {
      invalidationsForEvent.set(event, invalidations);
    }
    for (const [event, count] of frame.invalidationCountForEvent.entries()) {
      invalidationCountForEvent.set(event, count);
    }
  }
  return {
    invalidationsForEvent,
    invalidationCountForEvent
  };
}

// gen/front_end/models/trace/handlers/LargestImagePaintHandler.js
var LargestImagePaintHandler_exports = {};
__export(LargestImagePaintHandler_exports, {
  data: () => data20,
  deps: () => deps11,
  finalize: () => finalize20,
  handleEvent: () => handleEvent20,
  reset: () => reset20
});
import * as Platform11 from "./../../../core/platform/platform.js";
import * as Types21 from "./../types/types.js";

// gen/front_end/models/trace/handlers/PageLoadMetricsHandler.js
var PageLoadMetricsHandler_exports = {};
__export(PageLoadMetricsHandler_exports, {
  data: () => data19,
  deps: () => deps10,
  finalize: () => finalize19,
  getFrameIdForPageLoadEvent: () => getFrameIdForPageLoadEvent,
  handleEvent: () => handleEvent19,
  metricIsLCP: () => metricIsLCP,
  reset: () => reset19,
  scoreClassificationForDOMContentLoaded: () => scoreClassificationForDOMContentLoaded,
  scoreClassificationForFirstContentfulPaint: () => scoreClassificationForFirstContentfulPaint,
  scoreClassificationForLargestContentfulPaint: () => scoreClassificationForLargestContentfulPaint,
  scoreClassificationForTimeToInteractive: () => scoreClassificationForTimeToInteractive,
  scoreClassificationForTotalBlockingTime: () => scoreClassificationForTotalBlockingTime
});
import * as Platform10 from "./../../../core/platform/platform.js";
import * as Helpers14 from "./../helpers/helpers.js";
import * as Types20 from "./../types/types.js";
var metricScoresByFrameId = /* @__PURE__ */ new Map();
var allMarkerEvents = [];
function reset19() {
  metricScoresByFrameId = /* @__PURE__ */ new Map();
  pageLoadEventsArray = [];
  allMarkerEvents = [];
  selectedLCPCandidateEvents = /* @__PURE__ */ new Set();
}
var pageLoadEventsArray = [];
var selectedLCPCandidateEvents = /* @__PURE__ */ new Set();
function handleEvent19(event) {
  if (!Types20.Events.eventIsPageLoadEvent(event)) {
    return;
  }
  pageLoadEventsArray.push(event);
}
function storePageLoadMetricAgainstNavigationId(navigation, event) {
  const navigationId = navigation.args.data?.navigationId;
  if (!navigationId) {
    throw new Error("Navigation event unexpectedly had no navigation ID.");
  }
  const frameId = getFrameIdForPageLoadEvent(event);
  const { rendererProcessesByFrame } = data5();
  const rendererProcessesInFrame = rendererProcessesByFrame.get(frameId);
  if (!rendererProcessesInFrame) {
    return;
  }
  const processData = rendererProcessesInFrame.get(event.pid);
  if (!processData) {
    return;
  }
  if (Types20.Events.isNavigationStart(event)) {
    return;
  }
  if (Types20.Events.isFirstContentfulPaint(event)) {
    const fcpTime = Types20.Timing.Micro(event.ts - navigation.ts);
    const classification = scoreClassificationForFirstContentfulPaint(fcpTime);
    const metricScore = { event, metricName: "FCP", classification, navigation, timing: fcpTime };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types20.Events.isFirstPaint(event)) {
    const paintTime = Types20.Timing.Micro(event.ts - navigation.ts);
    const classification = "unclassified";
    const metricScore = { event, metricName: "FP", classification, navigation, timing: paintTime };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types20.Events.isMarkDOMContent(event)) {
    const dclTime = Types20.Timing.Micro(event.ts - navigation.ts);
    const metricScore = {
      event,
      metricName: "DCL",
      classification: scoreClassificationForDOMContentLoaded(dclTime),
      navigation,
      timing: dclTime
    };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types20.Events.isInteractiveTime(event)) {
    const ttiValue = Types20.Timing.Micro(event.ts - navigation.ts);
    const tti = {
      event,
      metricName: "TTI",
      classification: scoreClassificationForTimeToInteractive(ttiValue),
      navigation,
      timing: ttiValue
    };
    storeMetricScore(frameId, navigationId, tti);
    const tbtValue = Helpers14.Timing.milliToMicro(Types20.Timing.Milli(event.args.args.total_blocking_time_ms));
    const tbt = {
      event,
      metricName: "TBT",
      classification: scoreClassificationForTotalBlockingTime(tbtValue),
      navigation,
      timing: tbtValue
    };
    storeMetricScore(frameId, navigationId, tbt);
    return;
  }
  if (Types20.Events.isMarkLoad(event)) {
    const loadTime = Types20.Timing.Micro(event.ts - navigation.ts);
    const metricScore = {
      event,
      metricName: "L",
      classification: "unclassified",
      navigation,
      timing: loadTime
    };
    storeMetricScore(frameId, navigationId, metricScore);
    return;
  }
  if (Types20.Events.isLargestContentfulPaintCandidate(event)) {
    const candidateIndex = event.args.data?.candidateIndex;
    if (!candidateIndex) {
      throw new Error("Largest Contentful Paint unexpectedly had no candidateIndex.");
    }
    const lcpTime = Types20.Timing.Micro(event.ts - navigation.ts);
    const lcp = {
      event,
      metricName: "LCP",
      classification: scoreClassificationForLargestContentfulPaint(lcpTime),
      navigation,
      timing: lcpTime
    };
    const metricsByNavigation = Platform10.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
    const metrics = Platform10.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => /* @__PURE__ */ new Map());
    const lastLCPCandidate = metrics.get(
      "LCP"
      /* MetricName.LCP */
    );
    if (lastLCPCandidate === void 0) {
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
      return;
    }
    const lastLCPCandidateEvent = lastLCPCandidate.event;
    if (!Types20.Events.isLargestContentfulPaintCandidate(lastLCPCandidateEvent)) {
      return;
    }
    const lastCandidateIndex = lastLCPCandidateEvent.args.data?.candidateIndex;
    if (!lastCandidateIndex) {
      return;
    }
    if (lastCandidateIndex < candidateIndex) {
      selectedLCPCandidateEvents.delete(lastLCPCandidateEvent);
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigationId, lcp);
    }
    return;
  }
  if (Types20.Events.isLayoutShift(event)) {
    return;
  }
  return Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function storeMetricScore(frameId, navigationId, metricScore) {
  const metricsByNavigation = Platform10.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
  const metrics = Platform10.MapUtilities.getWithDefault(metricsByNavigation, navigationId, () => /* @__PURE__ */ new Map());
  metrics.delete(metricScore.metricName);
  metrics.set(metricScore.metricName, metricScore);
}
function getFrameIdForPageLoadEvent(event) {
  if (Types20.Events.isFirstContentfulPaint(event) || Types20.Events.isInteractiveTime(event) || Types20.Events.isLargestContentfulPaintCandidate(event) || Types20.Events.isNavigationStart(event) || Types20.Events.isLayoutShift(event) || Types20.Events.isFirstPaint(event)) {
    return event.args.frame;
  }
  if (Types20.Events.isMarkDOMContent(event) || Types20.Events.isMarkLoad(event)) {
    const frameId = event.args.data?.frame;
    if (!frameId) {
      throw new Error("MarkDOMContent unexpectedly had no frame ID.");
    }
    return frameId;
  }
  Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function getNavigationForPageLoadEvent(event) {
  if (Types20.Events.isFirstContentfulPaint(event) || Types20.Events.isLargestContentfulPaintCandidate(event) || Types20.Events.isFirstPaint(event)) {
    const navigationId = event.args.data?.navigationId;
    if (!navigationId) {
      throw new Error("Trace event unexpectedly had no navigation ID.");
    }
    const { navigationsByNavigationId: navigationsByNavigationId2 } = data5();
    const navigation = navigationsByNavigationId2.get(navigationId);
    if (!navigation) {
      return null;
    }
    return navigation;
  }
  if (Types20.Events.isMarkDOMContent(event) || Types20.Events.isInteractiveTime(event) || Types20.Events.isLayoutShift(event) || Types20.Events.isMarkLoad(event)) {
    const frameId = getFrameIdForPageLoadEvent(event);
    const { navigationsByFrameId: navigationsByFrameId2 } = data5();
    return Helpers14.Trace.getNavigationForTraceEvent(event, frameId, navigationsByFrameId2);
  }
  if (Types20.Events.isNavigationStart(event)) {
    return null;
  }
  return Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function scoreClassificationForFirstContentfulPaint(fcpScoreInMicroseconds) {
  const FCP_GOOD_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(1.8));
  const FCP_MEDIUM_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(3));
  let scoreClassification = "bad";
  if (fcpScoreInMicroseconds <= FCP_MEDIUM_TIMING) {
    scoreClassification = "ok";
  }
  if (fcpScoreInMicroseconds <= FCP_GOOD_TIMING) {
    scoreClassification = "good";
  }
  return scoreClassification;
}
function scoreClassificationForTimeToInteractive(ttiTimeInMicroseconds) {
  const TTI_GOOD_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(3.8));
  const TTI_MEDIUM_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(7.3));
  let scoreClassification = "bad";
  if (ttiTimeInMicroseconds <= TTI_MEDIUM_TIMING) {
    scoreClassification = "ok";
  }
  if (ttiTimeInMicroseconds <= TTI_GOOD_TIMING) {
    scoreClassification = "good";
  }
  return scoreClassification;
}
function scoreClassificationForLargestContentfulPaint(lcpTimeInMicroseconds) {
  const LCP_GOOD_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(2.5));
  const LCP_MEDIUM_TIMING = Helpers14.Timing.secondsToMicro(Types20.Timing.Seconds(4));
  let scoreClassification = "bad";
  if (lcpTimeInMicroseconds <= LCP_MEDIUM_TIMING) {
    scoreClassification = "ok";
  }
  if (lcpTimeInMicroseconds <= LCP_GOOD_TIMING) {
    scoreClassification = "good";
  }
  return scoreClassification;
}
function scoreClassificationForDOMContentLoaded(_dclTimeInMicroseconds) {
  return "unclassified";
}
function scoreClassificationForTotalBlockingTime(tbtTimeInMicroseconds) {
  const TBT_GOOD_TIMING = Helpers14.Timing.milliToMicro(Types20.Timing.Milli(200));
  const TBT_MEDIUM_TIMING = Helpers14.Timing.milliToMicro(Types20.Timing.Milli(600));
  let scoreClassification = "bad";
  if (tbtTimeInMicroseconds <= TBT_MEDIUM_TIMING) {
    scoreClassification = "ok";
  }
  if (tbtTimeInMicroseconds <= TBT_GOOD_TIMING) {
    scoreClassification = "good";
  }
  return scoreClassification;
}
function gatherFinalLCPEvents() {
  const allFinalLCPEvents = [];
  const dataForAllFrames = [...metricScoresByFrameId.values()];
  const dataForAllNavigations = dataForAllFrames.flatMap((frameData) => [...frameData.values()]);
  for (let i = 0; i < dataForAllNavigations.length; i++) {
    const navigationData = dataForAllNavigations[i];
    const lcpInNavigation = navigationData.get(
      "LCP"
      /* MetricName.LCP */
    );
    if (!lcpInNavigation?.event) {
      continue;
    }
    allFinalLCPEvents.push(lcpInNavigation.event);
  }
  return allFinalLCPEvents;
}
async function finalize19() {
  pageLoadEventsArray.sort((a, b) => a.ts - b.ts);
  for (const pageLoadEvent of pageLoadEventsArray) {
    const navigation = getNavigationForPageLoadEvent(pageLoadEvent);
    if (navigation) {
      storePageLoadMetricAgainstNavigationId(navigation, pageLoadEvent);
    }
  }
  const allFinalLCPEvents = gatherFinalLCPEvents();
  const mainFrame = data5().mainFrameId;
  const allEventsButLCP = pageLoadEventsArray.filter((event) => !Types20.Events.isLargestContentfulPaintCandidate(event));
  const markerEvents = [...allFinalLCPEvents, ...allEventsButLCP].filter(Types20.Events.isMarkerEvent);
  allMarkerEvents = markerEvents.filter((event) => getFrameIdForPageLoadEvent(event) === mainFrame).sort((a, b) => a.ts - b.ts);
}
function data19() {
  return {
    metricScoresByFrameId,
    allMarkerEvents
  };
}
function deps10() {
  return ["Meta"];
}
function metricIsLCP(metric) {
  return metric.metricName === "LCP";
}

// gen/front_end/models/trace/handlers/LargestImagePaintHandler.js
var imagePaintsByNodeIdAndProcess = /* @__PURE__ */ new Map();
var lcpRequestByNavigationId = /* @__PURE__ */ new Map();
function reset20() {
  imagePaintsByNodeIdAndProcess = /* @__PURE__ */ new Map();
  lcpRequestByNavigationId = /* @__PURE__ */ new Map();
}
function handleEvent20(event) {
  if (!Types21.Events.isLargestImagePaintCandidate(event) || !event.args.data) {
    return;
  }
  const imagePaintsByNodeId = Platform11.MapUtilities.getWithDefault(imagePaintsByNodeIdAndProcess, event.pid, () => /* @__PURE__ */ new Map());
  imagePaintsByNodeId.set(event.args.data.DOMNodeId, event);
}
async function finalize20() {
  const requests = data6().byTime;
  const { traceBounds: traceBounds2, navigationsByNavigationId: navigationsByNavigationId2 } = data5();
  const metricScoresByFrameId2 = data19().metricScoresByFrameId;
  for (const [navigationId, navigation] of navigationsByNavigationId2) {
    const lcpMetric = metricScoresByFrameId2.get(navigation.args.frame)?.get(navigationId)?.get(
      "LCP"
      /* MetricName.LCP */
    );
    const lcpEvent = lcpMetric?.event;
    if (!lcpEvent || !Types21.Events.isLargestContentfulPaintCandidate(lcpEvent)) {
      continue;
    }
    const nodeId = lcpEvent.args.data?.nodeId;
    if (!nodeId) {
      continue;
    }
    const lcpImagePaintEvent = imagePaintsByNodeIdAndProcess.get(lcpEvent.pid)?.get(nodeId);
    const lcpUrl = lcpImagePaintEvent?.args.data?.imageUrl;
    if (!lcpUrl) {
      continue;
    }
    const startTime = navigation?.ts ?? traceBounds2.min;
    const endTime = lcpImagePaintEvent.ts;
    let lcpRequest;
    for (const request of requests) {
      if (request.ts < startTime) {
        continue;
      }
      if (request.ts >= endTime) {
        break;
      }
      if (request.args.data.url === lcpUrl || request.args.data.redirects.some((r) => r.url === lcpUrl)) {
        lcpRequest = request;
        break;
      }
    }
    if (lcpRequest) {
      lcpRequestByNavigationId.set(navigationId, lcpRequest);
    }
  }
}
function data20() {
  return { lcpRequestByNavigationId };
}
function deps11() {
  return ["Meta", "NetworkRequests", "PageLoadMetrics"];
}

// gen/front_end/models/trace/handlers/LargestTextPaintHandler.js
var LargestTextPaintHandler_exports = {};
__export(LargestTextPaintHandler_exports, {
  data: () => data21,
  finalize: () => finalize21,
  handleEvent: () => handleEvent21,
  reset: () => reset21
});
import * as Types22 from "./../types/types.js";
var textPaintByDOMNodeId = /* @__PURE__ */ new Map();
function reset21() {
  textPaintByDOMNodeId = /* @__PURE__ */ new Map();
}
function handleEvent21(event) {
  if (!Types22.Events.isLargestTextPaintCandidate(event)) {
    return;
  }
  if (!event.args.data) {
    return;
  }
  textPaintByDOMNodeId.set(event.args.data.DOMNodeId, event);
}
async function finalize21() {
}
function data21() {
  return textPaintByDOMNodeId;
}

// gen/front_end/models/trace/handlers/LayoutShiftsHandler.js
var LayoutShiftsHandler_exports = {};
__export(LayoutShiftsHandler_exports, {
  MAX_CLUSTER_DURATION: () => MAX_CLUSTER_DURATION,
  MAX_SHIFT_TIME_DELTA: () => MAX_SHIFT_TIME_DELTA,
  data: () => data23,
  deps: () => deps13,
  finalize: () => finalize23,
  handleEvent: () => handleEvent23,
  reset: () => reset23,
  scoreClassificationForLayoutShift: () => scoreClassificationForLayoutShift
});
import * as Platform12 from "./../../../core/platform/platform.js";
import * as Helpers16 from "./../helpers/helpers.js";
import * as Types24 from "./../types/types.js";

// gen/front_end/models/trace/handlers/ScreenshotsHandler.js
var ScreenshotsHandler_exports = {};
__export(ScreenshotsHandler_exports, {
  data: () => data22,
  deps: () => deps12,
  finalize: () => finalize22,
  handleEvent: () => handleEvent22,
  reset: () => reset22,
  screenshotImageDataUri: () => screenshotImageDataUri
});
import * as Helpers15 from "./../helpers/helpers.js";
import * as Types23 from "./../types/types.js";
var unpairedAsyncEvents = [];
var legacyScreenshotEvents = [];
var modernScreenshotEvents = [];
var syntheticScreenshots = [];
var frameSequenceToTs = {};
function reset22() {
  unpairedAsyncEvents = [];
  legacyScreenshotEvents = [];
  syntheticScreenshots = [];
  modernScreenshotEvents = [];
  frameSequenceToTs = {};
}
function handleEvent22(event) {
  if (Types23.Events.isLegacyScreenshot(event)) {
    legacyScreenshotEvents.push(event);
  } else if (Types23.Events.isScreenshot(event)) {
    modernScreenshotEvents.push(event);
  } else if (Types23.Events.isPipelineReporter(event)) {
    unpairedAsyncEvents.push(event);
  }
}
async function finalize22() {
  const pipelineReporterEvents = Helpers15.Trace.createMatchedSortedSyntheticEvents(unpairedAsyncEvents);
  frameSequenceToTs = Object.fromEntries(pipelineReporterEvents.map((evt) => {
    const args = evt.args.data.beginEvent.args;
    const frameReporter = "frame_reporter" in args ? args.frame_reporter : args.chrome_frame_reporter;
    const frameSequenceId = frameReporter.frame_sequence;
    const presentationTs = Types23.Timing.Micro(evt.ts + evt.dur);
    return [frameSequenceId, presentationTs];
  }));
  for (const snapshotEvent of legacyScreenshotEvents) {
    const { cat, name, ph, pid, tid } = snapshotEvent;
    const syntheticEvent = Helpers15.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: snapshotEvent,
      cat,
      name,
      ph,
      pid,
      tid,
      // TODO(paulirish, crbug.com/41363012): investigate why getPresentationTimestamp(snapshotEvent) seems less accurate. Resolve screenshot timing inaccuracy.
      // `getPresentationTimestamp(snapshotEvent) - snapshotEvent.ts` is how many microsec the screenshot should be adjusted to the right/later
      ts: snapshotEvent.ts,
      args: {
        dataUri: `data:image/jpg;base64,${snapshotEvent.args.snapshot}`
      }
    });
    syntheticScreenshots.push(syntheticEvent);
  }
}
function screenshotImageDataUri(event) {
  if (Types23.Events.isLegacySyntheticScreenshot(event)) {
    return event.args.dataUri;
  }
  return `data:image/jpg;base64,${event.args.snapshot}`;
}
function data22() {
  return {
    legacySyntheticScreenshots: syntheticScreenshots.length ? syntheticScreenshots : null,
    screenshots: modernScreenshotEvents.length ? modernScreenshotEvents : null
  };
}
function deps12() {
  return ["Meta"];
}

// gen/front_end/models/trace/handlers/LayoutShiftsHandler.js
var MAX_CLUSTER_DURATION = Helpers16.Timing.milliToMicro(Types24.Timing.Milli(5e3));
var MAX_SHIFT_TIME_DELTA = Helpers16.Timing.milliToMicro(Types24.Timing.Milli(1e3));
var layoutShiftEvents = [];
var layoutInvalidationEvents = [];
var scheduleStyleInvalidationEvents = [];
var styleRecalcInvalidationEvents = [];
var renderFrameImplCreateChildFrameEvents = [];
var domLoadingEvents = [];
var layoutImageUnsizedEvents = [];
var remoteFonts = [];
var backendNodeIds = /* @__PURE__ */ new Set();
var prePaintEvents = [];
var paintImageEvents2 = [];
var sessionMaxScore = 0;
var clsWindowID = -1;
var clusters = [];
var clustersByNavigationId = /* @__PURE__ */ new Map();
var scoreRecords = [];
function reset23() {
  layoutShiftEvents = [];
  layoutInvalidationEvents = [];
  scheduleStyleInvalidationEvents = [];
  styleRecalcInvalidationEvents = [];
  prePaintEvents = [];
  paintImageEvents2 = [];
  renderFrameImplCreateChildFrameEvents = [];
  layoutImageUnsizedEvents = [];
  domLoadingEvents = [];
  remoteFonts = [];
  backendNodeIds = /* @__PURE__ */ new Set();
  clusters = [];
  sessionMaxScore = 0;
  scoreRecords = [];
  clsWindowID = -1;
  clustersByNavigationId = /* @__PURE__ */ new Map();
}
function handleEvent23(event) {
  if (Types24.Events.isLayoutShift(event) && !event.args.data?.had_recent_input) {
    layoutShiftEvents.push(event);
    return;
  }
  if (Types24.Events.isLayoutInvalidationTracking(event)) {
    layoutInvalidationEvents.push(event);
    return;
  }
  if (Types24.Events.isScheduleStyleInvalidationTracking(event)) {
    scheduleStyleInvalidationEvents.push(event);
  }
  if (Types24.Events.isStyleRecalcInvalidationTracking(event)) {
    styleRecalcInvalidationEvents.push(event);
  }
  if (Types24.Events.isPrePaint(event)) {
    prePaintEvents.push(event);
    return;
  }
  if (Types24.Events.isRenderFrameImplCreateChildFrame(event)) {
    renderFrameImplCreateChildFrameEvents.push(event);
  }
  if (Types24.Events.isDomLoading(event)) {
    domLoadingEvents.push(event);
  }
  if (Types24.Events.isLayoutImageUnsized(event)) {
    layoutImageUnsizedEvents.push(event);
  }
  if (Types24.Events.isBeginRemoteFontLoad(event)) {
    remoteFonts.push({
      display: event.args.display,
      url: event.args.url,
      beginRemoteFontLoadEvent: event
    });
  }
  if (Types24.Events.isRemoteFontLoaded(event)) {
    for (const remoteFont of remoteFonts) {
      if (remoteFont.url === event.args.url) {
        remoteFont.name = event.args.name;
      }
    }
  }
  if (Types24.Events.isPaintImage(event)) {
    paintImageEvents2.push(event);
  }
}
function traceWindowFromTime(time) {
  return {
    min: time,
    max: time,
    range: Types24.Timing.Micro(0)
  };
}
function updateTraceWindowMax(traceWindow, newMax) {
  traceWindow.max = newMax;
  traceWindow.range = Types24.Timing.Micro(traceWindow.max - traceWindow.min);
}
function findScreenshots(timestamp) {
  const data31 = data22();
  if (data31.screenshots) {
    const before = Helpers16.Trace.findPreviousEventBeforeTimestamp(data31.screenshots, timestamp);
    const after = before ? data31.screenshots[data31.screenshots.indexOf(before) + 1] : null;
    return { before, after };
  }
  if (data31.legacySyntheticScreenshots) {
    const before = Helpers16.Trace.findPreviousEventBeforeTimestamp(data31.legacySyntheticScreenshots, timestamp);
    const after = before ? data31.legacySyntheticScreenshots[data31.legacySyntheticScreenshots.indexOf(before) + 1] : null;
    return { before, after };
  }
  return { before: null, after: null };
}
function buildScoreRecords() {
  const { traceBounds: traceBounds2 } = data5();
  scoreRecords.push({ ts: traceBounds2.min, score: 0 });
  for (const cluster of clusters) {
    let clusterScore = 0;
    if (cluster.events[0].args.data) {
      scoreRecords.push({ ts: cluster.clusterWindow.min, score: cluster.events[0].args.data.weighted_score_delta });
    }
    for (let i = 0; i < cluster.events.length; i++) {
      const event = cluster.events[i];
      if (!event.args.data) {
        continue;
      }
      clusterScore += event.args.data.weighted_score_delta;
      scoreRecords.push({ ts: event.ts, score: clusterScore });
    }
    scoreRecords.push({ ts: cluster.clusterWindow.max, score: 0 });
  }
}
function collectNodes() {
  backendNodeIds.clear();
  for (const layoutShift of layoutShiftEvents) {
    if (!layoutShift.args.data?.impacted_nodes) {
      continue;
    }
    for (const node of layoutShift.args.data.impacted_nodes) {
      backendNodeIds.add(node.node_id);
    }
  }
  for (const layoutInvalidation of layoutInvalidationEvents) {
    if (!layoutInvalidation.args.data?.nodeId) {
      continue;
    }
    backendNodeIds.add(layoutInvalidation.args.data.nodeId);
  }
  for (const scheduleStyleInvalidation of scheduleStyleInvalidationEvents) {
    if (!scheduleStyleInvalidation.args.data?.nodeId) {
      continue;
    }
    backendNodeIds.add(scheduleStyleInvalidation.args.data.nodeId);
  }
}
async function finalize23() {
  layoutShiftEvents.sort((a, b) => a.ts - b.ts);
  prePaintEvents.sort((a, b) => a.ts - b.ts);
  layoutInvalidationEvents.sort((a, b) => a.ts - b.ts);
  renderFrameImplCreateChildFrameEvents.sort((a, b) => a.ts - b.ts);
  domLoadingEvents.sort((a, b) => a.ts - b.ts);
  layoutImageUnsizedEvents.sort((a, b) => a.ts - b.ts);
  remoteFonts.sort((a, b) => a.beginRemoteFontLoadEvent.ts - b.beginRemoteFontLoadEvent.ts);
  paintImageEvents2.sort((a, b) => a.ts - b.ts);
  await buildLayoutShiftsClusters();
  buildScoreRecords();
  collectNodes();
}
async function buildLayoutShiftsClusters() {
  const { navigationsByFrameId: navigationsByFrameId2, mainFrameId: mainFrameId2, traceBounds: traceBounds2 } = data5();
  const navigations = navigationsByFrameId2.get(mainFrameId2) || [];
  if (layoutShiftEvents.length === 0) {
    return;
  }
  let firstShiftTime = layoutShiftEvents[0].ts;
  let lastShiftTime = layoutShiftEvents[0].ts;
  let lastShiftNavigation = null;
  for (const event of layoutShiftEvents) {
    const clusterDurationExceeded = event.ts - firstShiftTime > MAX_CLUSTER_DURATION;
    const maxTimeDeltaSinceLastShiftExceeded = event.ts - lastShiftTime > MAX_SHIFT_TIME_DELTA;
    const currentShiftNavigation = Platform12.ArrayUtilities.nearestIndexFromEnd(navigations, (nav) => nav.ts < event.ts);
    const hasNavigated = lastShiftNavigation !== currentShiftNavigation && currentShiftNavigation !== null;
    if (clusterDurationExceeded || maxTimeDeltaSinceLastShiftExceeded || hasNavigated || !clusters.length) {
      const clusterStartTime = event.ts;
      const endTimeByMaxSessionDuration = clusterDurationExceeded ? firstShiftTime + MAX_CLUSTER_DURATION : Infinity;
      const endTimeByMaxShiftGap = maxTimeDeltaSinceLastShiftExceeded ? lastShiftTime + MAX_SHIFT_TIME_DELTA : Infinity;
      const endTimeByNavigation = hasNavigated ? navigations[currentShiftNavigation].ts : Infinity;
      const previousClusterEndTime = Math.min(endTimeByMaxSessionDuration, endTimeByMaxShiftGap, endTimeByNavigation);
      if (clusters.length > 0) {
        const currentCluster2 = clusters[clusters.length - 1];
        updateTraceWindowMax(currentCluster2.clusterWindow, Types24.Timing.Micro(previousClusterEndTime));
      }
      const navigationId = currentShiftNavigation === null ? Types24.Events.NO_NAVIGATION : navigations[currentShiftNavigation].args.data?.navigationId;
      clusters.push(Helpers16.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
        name: "SyntheticLayoutShiftCluster",
        // Will be replaced by the worst layout shift in the next for loop.
        rawSourceEvent: event,
        events: [],
        clusterWindow: traceWindowFromTime(clusterStartTime),
        clusterCumulativeScore: 0,
        scoreWindows: {
          good: traceWindowFromTime(clusterStartTime)
        },
        navigationId,
        // Set default Event so that this event is treated accordingly for the track appender.
        ts: event.ts,
        pid: event.pid,
        tid: event.tid,
        ph: "X",
        cat: "",
        dur: Types24.Timing.Micro(-1)
        // This `cluster.dur` is updated below.
      }));
      firstShiftTime = clusterStartTime;
    }
    const currentCluster = clusters[clusters.length - 1];
    const timeFromNavigation = currentShiftNavigation !== null ? Types24.Timing.Micro(event.ts - navigations[currentShiftNavigation].ts) : void 0;
    currentCluster.clusterCumulativeScore += event.args.data ? event.args.data.weighted_score_delta : 0;
    if (!event.args.data) {
      continue;
    }
    const shift = Helpers16.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: event,
      ...event,
      name: "SyntheticLayoutShift",
      args: {
        frame: event.args.frame,
        data: {
          ...event.args.data,
          rawEvent: event,
          navigationId: currentCluster.navigationId ?? void 0
        }
      },
      parsedData: {
        timeFromNavigation,
        screenshots: findScreenshots(event.ts),
        cumulativeWeightedScoreInWindow: currentCluster.clusterCumulativeScore,
        // The score of the session window is temporarily set to 0 just
        // to initialize it. Since we need to get the score of all shifts
        // in the session window to determine its value, its definite
        // value is set when stepping through the built clusters.
        sessionWindowData: { cumulativeWindowScore: 0, id: clusters.length }
      }
    });
    currentCluster.events.push(shift);
    updateTraceWindowMax(currentCluster.clusterWindow, event.ts);
    lastShiftTime = event.ts;
    lastShiftNavigation = currentShiftNavigation;
  }
  for (const cluster of clusters) {
    let weightedScore = 0;
    let windowID = -1;
    if (cluster === clusters[clusters.length - 1]) {
      const clusterEndByMaxDuration = MAX_CLUSTER_DURATION + cluster.clusterWindow.min;
      const clusterEndByMaxGap = cluster.clusterWindow.max + MAX_SHIFT_TIME_DELTA;
      const nextNavigationIndex = Platform12.ArrayUtilities.nearestIndexFromBeginning(navigations, (nav) => nav.ts > cluster.clusterWindow.max);
      const nextNavigationTime = nextNavigationIndex ? navigations[nextNavigationIndex].ts : Infinity;
      const clusterEnd = Math.min(clusterEndByMaxDuration, clusterEndByMaxGap, traceBounds2.max, nextNavigationTime);
      updateTraceWindowMax(cluster.clusterWindow, Types24.Timing.Micro(clusterEnd));
    }
    let largestScore = 0;
    let worstShiftEvent = null;
    for (const shift of cluster.events) {
      weightedScore += shift.args.data ? shift.args.data.weighted_score_delta : 0;
      windowID = shift.parsedData.sessionWindowData.id;
      const ts = shift.ts;
      shift.parsedData.sessionWindowData.cumulativeWindowScore = cluster.clusterCumulativeScore;
      if (weightedScore < 0.1) {
        updateTraceWindowMax(cluster.scoreWindows.good, ts);
      } else if (weightedScore >= 0.1 && weightedScore < 0.25) {
        if (!cluster.scoreWindows.needsImprovement) {
          updateTraceWindowMax(cluster.scoreWindows.good, Types24.Timing.Micro(ts - 1));
          cluster.scoreWindows.needsImprovement = traceWindowFromTime(ts);
        }
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, ts);
      } else if (weightedScore >= 0.25) {
        if (!cluster.scoreWindows.bad) {
          if (cluster.scoreWindows.needsImprovement) {
            updateTraceWindowMax(cluster.scoreWindows.needsImprovement, Types24.Timing.Micro(ts - 1));
          } else {
            updateTraceWindowMax(cluster.scoreWindows.good, Types24.Timing.Micro(ts - 1));
          }
          cluster.scoreWindows.bad = traceWindowFromTime(shift.ts);
        }
        updateTraceWindowMax(cluster.scoreWindows.bad, ts);
      }
      if (cluster.scoreWindows.bad) {
        updateTraceWindowMax(cluster.scoreWindows.bad, cluster.clusterWindow.max);
      } else if (cluster.scoreWindows.needsImprovement) {
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, cluster.clusterWindow.max);
      } else {
        updateTraceWindowMax(cluster.scoreWindows.good, cluster.clusterWindow.max);
      }
      const score = shift.args.data?.weighted_score_delta;
      if (score !== void 0 && score > largestScore) {
        largestScore = score;
        worstShiftEvent = shift;
      }
    }
    if (worstShiftEvent) {
      cluster.worstShiftEvent = worstShiftEvent;
      cluster.rawSourceEvent = worstShiftEvent;
    }
    cluster.ts = cluster.events[0].ts;
    const lastShiftTimings = Helpers16.Timing.eventTimingsMicroSeconds(cluster.events[cluster.events.length - 1]);
    cluster.dur = Types24.Timing.Micro(lastShiftTimings.endTime - cluster.events[0].ts + MAX_SHIFT_TIME_DELTA);
    if (weightedScore > sessionMaxScore) {
      clsWindowID = windowID;
      sessionMaxScore = weightedScore;
    }
    if (cluster.navigationId) {
      const clustersForId = Platform12.MapUtilities.getWithDefault(clustersByNavigationId, cluster.navigationId, () => {
        return [];
      });
      clustersForId.push(cluster);
    }
  }
}
function data23() {
  return {
    clusters,
    sessionMaxScore,
    clsWindowID,
    prePaintEvents,
    layoutInvalidationEvents,
    scheduleStyleInvalidationEvents,
    styleRecalcInvalidationEvents,
    renderFrameImplCreateChildFrameEvents,
    domLoadingEvents,
    layoutImageUnsizedEvents,
    remoteFonts,
    scoreRecords,
    backendNodeIds,
    clustersByNavigationId,
    paintImageEvents: paintImageEvents2
  };
}
function deps13() {
  return ["Screenshots", "Meta"];
}
function scoreClassificationForLayoutShift(score) {
  let state = "good";
  if (score >= 0.1) {
    state = "ok";
  }
  if (score >= 0.25) {
    state = "bad";
  }
  return state;
}

// gen/front_end/models/trace/handlers/MemoryHandler.js
var MemoryHandler_exports = {};
__export(MemoryHandler_exports, {
  data: () => data24,
  finalize: () => finalize24,
  handleEvent: () => handleEvent24,
  reset: () => reset24
});
import * as Platform13 from "./../../../core/platform/platform.js";
import * as Types25 from "./../types/types.js";
var updateCountersByProcess = /* @__PURE__ */ new Map();
function reset24() {
  updateCountersByProcess = /* @__PURE__ */ new Map();
}
function handleEvent24(event) {
  if (Types25.Events.isUpdateCounters(event)) {
    const countersForProcess = Platform13.MapUtilities.getWithDefault(updateCountersByProcess, event.pid, () => []);
    countersForProcess.push(event);
    updateCountersByProcess.set(event.pid, countersForProcess);
  }
}
async function finalize24() {
}
function data24() {
  return { updateCountersByProcess };
}

// gen/front_end/models/trace/handlers/PageFramesHandler.js
var PageFramesHandler_exports = {};
__export(PageFramesHandler_exports, {
  data: () => data25,
  finalize: () => finalize25,
  handleEvent: () => handleEvent25,
  reset: () => reset25
});
import * as Types26 from "./../types/types.js";
var frames = /* @__PURE__ */ new Map();
function reset25() {
  frames = /* @__PURE__ */ new Map();
}
function handleEvent25(event) {
  if (Types26.Events.isTracingStartedInBrowser(event)) {
    for (const frame of event.args.data?.frames ?? []) {
      frames.set(frame.frame, frame);
    }
    return;
  }
  if (Types26.Events.isCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }
    const frame = frames.get(frameData.frame);
    if (!frame) {
      return;
    }
    frames.set(frameData.frame, {
      ...frame,
      url: frameData.url || frame.url,
      name: frameData.name || frameData.name
    });
  }
}
async function finalize25() {
}
function data25() {
  return {
    frames
  };
}

// gen/front_end/models/trace/handlers/ScriptsHandler.js
var ScriptsHandler_exports = {};
__export(ScriptsHandler_exports, {
  data: () => data26,
  deps: () => deps14,
  finalize: () => finalize26,
  getScriptGeneratedSizes: () => getScriptGeneratedSizes,
  handleEvent: () => handleEvent26,
  reset: () => reset26
});
import * as Common from "./../../../core/common/common.js";
import * as Platform14 from "./../../../core/platform/platform.js";
import * as Types27 from "./../types/types.js";
var scriptById = /* @__PURE__ */ new Map();
var frameIdByIsolate = /* @__PURE__ */ new Map();
function deps14() {
  return ["Meta", "NetworkRequests"];
}
function reset26() {
  scriptById = /* @__PURE__ */ new Map();
  frameIdByIsolate = /* @__PURE__ */ new Map();
}
function handleEvent26(event) {
  const getOrMakeScript = (isolate, scriptIdAsNumber) => {
    const scriptId = String(scriptIdAsNumber);
    const key = `${isolate}.${scriptId}`;
    return Platform14.MapUtilities.getWithDefault(scriptById, key, () => ({ isolate, scriptId, frame: "", ts: event.ts }));
  };
  if (Types27.Events.isRundownScriptCompiled(event) && event.args.data) {
    const { isolate, scriptId, frame } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.frame = frame;
    script.ts = event.ts;
    return;
  }
  if (Types27.Events.isRundownScript(event)) {
    const { isolate, scriptId, url, sourceUrl, sourceMapUrl, sourceMapUrlElided } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    if (!script.frame) {
      script.frame = frameIdByIsolate.get(String(isolate)) ?? "";
    }
    script.url = url;
    script.ts = event.ts;
    if (sourceUrl) {
      script.sourceUrl = sourceUrl;
    }
    if (sourceMapUrlElided) {
      script.sourceMapUrlElided = true;
    } else if (sourceMapUrl) {
      script.sourceMapUrl = sourceMapUrl;
    }
    return;
  }
  if (Types27.Events.isRundownScriptSource(event)) {
    const { isolate, scriptId, sourceText } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = sourceText;
    return;
  }
  if (Types27.Events.isRundownScriptSourceLarge(event)) {
    const { isolate, scriptId, sourceText } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = (script.content ?? "") + sourceText;
    return;
  }
  if (Types27.Events.isFunctionCall(event) && event.args.data?.isolate && event.args.data.frame) {
    const { isolate, frame } = event.args.data;
    const existingValue = frameIdByIsolate.get(isolate);
    if (existingValue !== frame) {
      frameIdByIsolate.set(isolate, frame);
      for (const script of scriptById.values()) {
        if (!script.frame && script.isolate === isolate) {
          script.frame = frame;
        }
      }
    }
  }
}
function findFrame(meta, frameId) {
  for (const frames2 of meta.frameByProcessId?.values()) {
    const frame = frames2.get(frameId);
    if (frame) {
      return frame;
    }
  }
  return null;
}
function findNetworkRequest(networkRequests, script) {
  if (!script.url) {
    return null;
  }
  return networkRequests.find((request) => request.args.data.url === script.url) ?? null;
}
function computeMappingEndColumns(map) {
  const result = /* @__PURE__ */ new Map();
  const mappings = map.mappings();
  for (let i = 0; i < mappings.length - 1; i++) {
    const mapping = mappings[i];
    const nextMapping = mappings[i + 1];
    if (mapping.lineNumber === nextMapping.lineNumber) {
      result.set(mapping, nextMapping.columnNumber);
    }
  }
  return result;
}
function computeGeneratedFileSizes(script) {
  if (!script.sourceMap) {
    throw new Error("expected source map");
  }
  const map = script.sourceMap;
  const content = script.content ?? "";
  const contentLength = content.length;
  const lines = content.split("\n");
  const files = {};
  const totalBytes = contentLength;
  let unmappedBytes = totalBytes;
  const mappingEndCols = computeMappingEndColumns(script.sourceMap);
  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const lineNum = mapping.lineNumber;
    const colNum = mapping.columnNumber;
    const lastColNum = mappingEndCols.get(mapping);
    if (!source) {
      continue;
    }
    const line = lines[lineNum];
    if (line === null || line === void 0) {
      const errorMessage = `${map.url()} mapping for line out of bounds: ${lineNum + 1}`;
      return { errorMessage };
    }
    if (colNum > line.length) {
      const errorMessage = `${map.url()} mapping for column out of bounds: ${lineNum + 1}:${colNum}`;
      return { errorMessage };
    }
    let mappingLength = 0;
    if (lastColNum !== void 0) {
      if (lastColNum > line.length) {
        const errorMessage = `${map.url()} mapping for last column out of bounds: ${lineNum + 1}:${lastColNum}`;
        return { errorMessage };
      }
      mappingLength = lastColNum - colNum;
    } else {
      mappingLength = line.length - colNum + 1;
    }
    files[source] = (files[source] || 0) + mappingLength;
    unmappedBytes -= mappingLength;
  }
  return {
    files,
    unmappedBytes,
    totalBytes
  };
}
function getScriptGeneratedSizes(script) {
  if (script.sourceMap && !script.sizes) {
    script.sizes = computeGeneratedFileSizes(script);
  }
  return script.sizes ?? null;
}
function findCachedRawSourceMap(script, options) {
  if (options.isFreshRecording || !options.metadata?.sourceMaps) {
    return;
  }
  if (script.sourceMapUrlElided) {
    if (!script.url) {
      return;
    }
    const cachedSourceMap = options.metadata.sourceMaps.find((m) => m.url === script.url);
    if (cachedSourceMap) {
      return cachedSourceMap.sourceMap;
    }
    return;
  }
  if (!script.sourceMapUrl) {
    return;
  }
  const isDataUrl = script.sourceMapUrl.startsWith("data:");
  if (!isDataUrl) {
    const cachedSourceMap = options.metadata.sourceMaps.find((m) => m.sourceMapUrl === script.sourceMapUrl);
    if (cachedSourceMap) {
      return cachedSourceMap.sourceMap;
    }
  }
  return;
}
async function finalize26(options) {
  const meta = data5();
  const networkRequests = [...data6().byId.values()];
  const documentUrls = /* @__PURE__ */ new Set();
  for (const frames2 of meta.frameByProcessId.values()) {
    for (const frame of frames2.values()) {
      documentUrls.add(frame.url);
    }
  }
  for (const script of scriptById.values()) {
    script.request = findNetworkRequest(networkRequests, script) ?? void 0;
    script.inline = !!script.url && documentUrls.has(script.url);
  }
  if (!options.resolveSourceMap) {
    return;
  }
  const promises = [];
  for (const script of scriptById.values()) {
    if (!script.frame || !script.url || !script.sourceMapUrl && !script.sourceMapUrlElided) {
      continue;
    }
    const frameUrl = findFrame(meta, script.frame)?.url;
    if (!frameUrl) {
      continue;
    }
    let sourceUrl = script.url;
    if (script.sourceUrl) {
      sourceUrl = Common.ParsedURL.ParsedURL.completeURL(frameUrl, script.sourceUrl) ?? script.sourceUrl;
    }
    let sourceMapUrl;
    if (script.sourceMapUrl) {
      sourceMapUrl = Common.ParsedURL.ParsedURL.completeURL(sourceUrl, script.sourceMapUrl);
      if (!sourceMapUrl) {
        continue;
      }
      script.sourceMapUrl = sourceMapUrl;
    }
    const params = {
      scriptId: script.scriptId,
      scriptUrl: script.url,
      sourceUrl,
      sourceMapUrl: sourceMapUrl ?? "",
      frame: script.frame,
      cachedRawSourceMap: findCachedRawSourceMap(script, options)
    };
    const promise = options.resolveSourceMap(params).then((sourceMap) => {
      if (sourceMap) {
        script.sourceMap = sourceMap;
      }
    });
    promises.push(promise.catch((e) => {
      console.error("Uncaught error when resolving source map", params, e);
    }));
  }
  await Promise.all(promises);
}
function data26() {
  return {
    scripts: [...scriptById.values()]
  };
}

// gen/front_end/models/trace/handlers/SelectorStatsHandler.js
var SelectorStatsHandler_exports = {};
__export(SelectorStatsHandler_exports, {
  data: () => data27,
  finalize: () => finalize27,
  handleEvent: () => handleEvent27,
  reset: () => reset27
});
import * as Types28 from "./../types/types.js";
var lastRecalcStyleEvent = null;
var lastInvalidatedNode = null;
var selectorDataForRecalcStyle = /* @__PURE__ */ new Map();
var invalidatedNodeList = new Array();
function reset27() {
  lastRecalcStyleEvent = null;
  lastInvalidatedNode = null;
  selectorDataForRecalcStyle = /* @__PURE__ */ new Map();
  invalidatedNodeList = [];
}
function handleEvent27(event) {
  if (Types28.Events.isStyleRecalcInvalidationTracking(event)) {
    if (event.args.data.subtree && event.args.data.reason === "Related style rule" && lastInvalidatedNode && event.args.data.nodeId === lastInvalidatedNode.backendNodeId) {
      lastInvalidatedNode.subtree = true;
      return;
    }
  }
  if (Types28.Events.isSelectorStats(event) && lastRecalcStyleEvent && event.args.selector_stats) {
    selectorDataForRecalcStyle.set(lastRecalcStyleEvent, {
      timings: event.args.selector_stats.selector_timings
    });
    return;
  }
  if (Types28.Events.isStyleInvalidatorInvalidationTracking(event)) {
    const selectorList = new Array();
    event.args.data.selectors?.forEach((selector) => {
      selectorList.push({
        selector: selector.selector,
        styleSheetId: selector.style_sheet_id
      });
    });
    if (selectorList.length > 0) {
      lastInvalidatedNode = {
        frame: event.args.data.frame,
        backendNodeId: event.args.data.nodeId,
        type: "StyleInvalidatorInvalidationTracking",
        selectorList,
        ts: event.ts,
        tts: event.tts,
        subtree: false,
        lastRecalcStyleEventTs: lastRecalcStyleEvent ? lastRecalcStyleEvent.ts : Types28.Timing.Micro(0)
      };
      invalidatedNodeList.push(lastInvalidatedNode);
    }
  }
  if (Types28.Events.isRecalcStyle(event)) {
    lastRecalcStyleEvent = event;
    return;
  }
}
async function finalize27() {
}
function data27() {
  return {
    dataForRecalcStyleEvent: selectorDataForRecalcStyle,
    invalidatedNodeList
  };
}

// gen/front_end/models/trace/handlers/UserInteractionsHandler.js
var UserInteractionsHandler_exports = {};
__export(UserInteractionsHandler_exports, {
  LONG_INTERACTION_THRESHOLD: () => LONG_INTERACTION_THRESHOLD,
  categoryOfInteraction: () => categoryOfInteraction,
  data: () => data28,
  deps: () => deps15,
  finalize: () => finalize28,
  handleEvent: () => handleEvent28,
  removeNestedInteractionsAndSetProcessingTime: () => removeNestedInteractionsAndSetProcessingTime,
  reset: () => reset28,
  scoreClassificationForInteractionToNextPaint: () => scoreClassificationForInteractionToNextPaint
});
import * as Platform15 from "./../../../core/platform/platform.js";
import * as Helpers17 from "./../helpers/helpers.js";
import * as Types29 from "./../types/types.js";
var beginCommitCompositorFrameEvents = [];
var parseMetaViewportEvents = [];
var LONG_INTERACTION_THRESHOLD = Helpers17.Timing.milliToMicro(Types29.Timing.Milli(200));
var INP_GOOD_TIMING = LONG_INTERACTION_THRESHOLD;
var INP_MEDIUM_TIMING = Helpers17.Timing.milliToMicro(Types29.Timing.Milli(500));
var longestInteractionEvent = null;
var interactionEvents = [];
var interactionEventsWithNoNesting = [];
var eventTimingStartEventsForInteractions = [];
var eventTimingEndEventsForInteractions = [];
function reset28() {
  beginCommitCompositorFrameEvents = [];
  parseMetaViewportEvents = [];
  interactionEvents = [];
  eventTimingStartEventsForInteractions = [];
  eventTimingEndEventsForInteractions = [];
  interactionEventsWithNoNesting = [];
  longestInteractionEvent = null;
}
function handleEvent28(event) {
  if (Types29.Events.isBeginCommitCompositorFrame(event)) {
    beginCommitCompositorFrameEvents.push(event);
    return;
  }
  if (Types29.Events.isParseMetaViewport(event)) {
    parseMetaViewportEvents.push(event);
    return;
  }
  if (!Types29.Events.isEventTiming(event)) {
    return;
  }
  if (Types29.Events.isEventTimingEnd(event)) {
    eventTimingEndEventsForInteractions.push(event);
  }
  if (!event.args.data || !Types29.Events.isEventTimingStart(event)) {
    return;
  }
  const { duration, interactionId } = event.args.data;
  if (duration < 1 || interactionId === void 0 || interactionId === 0) {
    return;
  }
  eventTimingStartEventsForInteractions.push(event);
}
var pointerEventTypes = /* @__PURE__ */ new Set([
  "pointerdown",
  "touchstart",
  "pointerup",
  "touchend",
  "mousedown",
  "mouseup",
  "click"
]);
var keyboardEventTypes = /* @__PURE__ */ new Set([
  "keydown",
  "keypress",
  "keyup"
]);
function categoryOfInteraction(interaction) {
  if (pointerEventTypes.has(interaction.type)) {
    return "POINTER";
  }
  if (keyboardEventTypes.has(interaction.type)) {
    return "KEYBOARD";
  }
  return "OTHER";
}
function removeNestedInteractionsAndSetProcessingTime(interactions) {
  const earliestEventForEndTimePerCategory = {
    POINTER: /* @__PURE__ */ new Map(),
    KEYBOARD: /* @__PURE__ */ new Map(),
    OTHER: /* @__PURE__ */ new Map()
  };
  function storeEventIfEarliestForCategoryAndEndTime(interaction) {
    const category = categoryOfInteraction(interaction);
    const earliestEventForEndTime = earliestEventForEndTimePerCategory[category];
    const endTime = Types29.Timing.Micro(interaction.ts + interaction.dur);
    const earliestCurrentEvent = earliestEventForEndTime.get(endTime);
    if (!earliestCurrentEvent) {
      earliestEventForEndTime.set(endTime, interaction);
      return;
    }
    if (interaction.ts < earliestCurrentEvent.ts) {
      earliestEventForEndTime.set(endTime, interaction);
    } else if (interaction.ts === earliestCurrentEvent.ts && interaction.interactionId === earliestCurrentEvent.interactionId) {
      const currentProcessingDuration = earliestCurrentEvent.processingEnd - earliestCurrentEvent.processingStart;
      const newProcessingDuration = interaction.processingEnd - interaction.processingStart;
      if (newProcessingDuration > currentProcessingDuration) {
        earliestEventForEndTime.set(endTime, interaction);
      }
    }
    if (interaction.processingStart < earliestCurrentEvent.processingStart) {
      earliestCurrentEvent.processingStart = interaction.processingStart;
      writeSyntheticTimespans(earliestCurrentEvent);
    }
    if (interaction.processingEnd > earliestCurrentEvent.processingEnd) {
      earliestCurrentEvent.processingEnd = interaction.processingEnd;
      writeSyntheticTimespans(earliestCurrentEvent);
    }
  }
  for (const interaction of interactions) {
    storeEventIfEarliestForCategoryAndEndTime(interaction);
  }
  const keptEvents = Object.values(earliestEventForEndTimePerCategory).flatMap((eventsByEndTime) => Array.from(eventsByEndTime.values()));
  keptEvents.sort((eventA, eventB) => {
    return eventA.ts - eventB.ts;
  });
  return keptEvents;
}
function writeSyntheticTimespans(event) {
  const startEvent = event.args.data.beginEvent;
  const endEvent = event.args.data.endEvent;
  event.inputDelay = Types29.Timing.Micro(event.processingStart - startEvent.ts);
  event.mainThreadHandling = Types29.Timing.Micro(event.processingEnd - event.processingStart);
  event.presentationDelay = Types29.Timing.Micro(endEvent.ts - event.processingEnd);
}
async function finalize28() {
  const { navigationsByFrameId: navigationsByFrameId2 } = data5();
  const beginAndEndEvents = Platform15.ArrayUtilities.mergeOrdered(eventTimingStartEventsForInteractions, eventTimingEndEventsForInteractions, Helpers17.Trace.eventTimeComparator);
  const beginEventById = /* @__PURE__ */ new Map();
  for (const event of beginAndEndEvents) {
    if (Types29.Events.isEventTimingStart(event)) {
      const forId = beginEventById.get(event.id) ?? [];
      forId.push(event);
      beginEventById.set(event.id, forId);
    } else if (Types29.Events.isEventTimingEnd(event)) {
      const beginEvents = beginEventById.get(event.id) ?? [];
      const beginEvent = beginEvents.pop();
      if (!beginEvent) {
        continue;
      }
      const { type, interactionId, timeStamp, processingStart, processingEnd } = beginEvent.args.data;
      if (!type || !interactionId || !timeStamp || !processingStart || !processingEnd) {
        continue;
      }
      const processingStartRelativeToTraceTime = Types29.Timing.Micro(Helpers17.Timing.milliToMicro(processingStart) - Helpers17.Timing.milliToMicro(timeStamp) + beginEvent.ts);
      const processingEndRelativeToTraceTime = Types29.Timing.Micro(Helpers17.Timing.milliToMicro(processingEnd) - Helpers17.Timing.milliToMicro(timeStamp) + beginEvent.ts);
      const frameId = beginEvent.args.frame ?? beginEvent.args.data.frame ?? "";
      const navigation = Helpers17.Trace.getNavigationForTraceEvent(beginEvent, frameId, navigationsByFrameId2);
      const navigationId = navigation?.args.data?.navigationId;
      const interactionEvent = Helpers17.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
        // Use the start event to define the common fields.
        rawSourceEvent: beginEvent,
        cat: beginEvent.cat,
        name: beginEvent.name,
        pid: beginEvent.pid,
        tid: beginEvent.tid,
        ph: beginEvent.ph,
        processingStart: processingStartRelativeToTraceTime,
        processingEnd: processingEndRelativeToTraceTime,
        // These will be set in writeSyntheticTimespans()
        inputDelay: Types29.Timing.Micro(-1),
        mainThreadHandling: Types29.Timing.Micro(-1),
        presentationDelay: Types29.Timing.Micro(-1),
        args: {
          data: {
            beginEvent,
            endEvent: event,
            frame: frameId,
            navigationId
          }
        },
        ts: beginEvent.ts,
        dur: Types29.Timing.Micro(event.ts - beginEvent.ts),
        type: beginEvent.args.data.type,
        interactionId: beginEvent.args.data.interactionId
      });
      writeSyntheticTimespans(interactionEvent);
      interactionEvents.push(interactionEvent);
    }
  }
  Helpers17.Trace.sortTraceEventsInPlace(interactionEvents);
  interactionEventsWithNoNesting.push(...removeNestedInteractionsAndSetProcessingTime(interactionEvents));
  for (const interactionEvent of interactionEventsWithNoNesting) {
    if (!longestInteractionEvent || longestInteractionEvent.dur < interactionEvent.dur) {
      longestInteractionEvent = interactionEvent;
    }
  }
}
function data28() {
  return {
    beginCommitCompositorFrameEvents,
    parseMetaViewportEvents,
    interactionEvents,
    interactionEventsWithNoNesting,
    longestInteractionEvent,
    interactionsOverThreshold: new Set(interactionEvents.filter((event) => {
      return event.dur > LONG_INTERACTION_THRESHOLD;
    }))
  };
}
function deps15() {
  return ["Meta"];
}
function scoreClassificationForInteractionToNextPaint(timing) {
  if (timing <= INP_GOOD_TIMING) {
    return "good";
  }
  if (timing <= INP_MEDIUM_TIMING) {
    return "ok";
  }
  return "bad";
}

// gen/front_end/models/trace/handlers/WarningsHandler.js
var WarningsHandler_exports = {};
__export(WarningsHandler_exports, {
  FORCED_REFLOW_THRESHOLD: () => FORCED_REFLOW_THRESHOLD,
  LONG_MAIN_THREAD_TASK_THRESHOLD: () => LONG_MAIN_THREAD_TASK_THRESHOLD,
  data: () => data30,
  deps: () => deps16,
  finalize: () => finalize30,
  handleEvent: () => handleEvent30,
  reset: () => reset30
});
import * as Platform16 from "./../../../core/platform/platform.js";
import * as Helpers18 from "./../helpers/helpers.js";
import * as Types31 from "./../types/types.js";

// gen/front_end/models/trace/handlers/WorkersHandler.js
var WorkersHandler_exports = {};
__export(WorkersHandler_exports, {
  data: () => data29,
  finalize: () => finalize29,
  handleEvent: () => handleEvent29,
  reset: () => reset29
});
import * as Types30 from "./../types/types.js";
var sessionIdEvents = [];
var workerIdByThread = /* @__PURE__ */ new Map();
var workerURLById = /* @__PURE__ */ new Map();
function reset29() {
  sessionIdEvents = [];
  workerIdByThread = /* @__PURE__ */ new Map();
  workerURLById = /* @__PURE__ */ new Map();
}
function handleEvent29(event) {
  if (Types30.Events.isTracingSessionIdForWorker(event)) {
    sessionIdEvents.push(event);
  }
}
async function finalize29() {
  for (const sessionIdEvent of sessionIdEvents) {
    if (!sessionIdEvent.args.data) {
      continue;
    }
    workerIdByThread.set(sessionIdEvent.args.data.workerThreadId, sessionIdEvent.args.data.workerId);
    workerURLById.set(sessionIdEvent.args.data.workerId, sessionIdEvent.args.data.url);
  }
}
function data29() {
  return {
    workerSessionIdEvents: sessionIdEvents,
    workerIdByThread,
    workerURLById
  };
}

// gen/front_end/models/trace/handlers/WarningsHandler.js
var warningsPerEvent = /* @__PURE__ */ new Map();
var eventsPerWarning = /* @__PURE__ */ new Map();
var allEventsStack = [];
var jsInvokeStack = [];
var taskReflowEvents = [];
var longTaskEvents = [];
var FORCED_REFLOW_THRESHOLD = Helpers18.Timing.milliToMicro(Types31.Timing.Milli(30));
var LONG_MAIN_THREAD_TASK_THRESHOLD = Helpers18.Timing.milliToMicro(Types31.Timing.Milli(50));
function reset30() {
  warningsPerEvent = /* @__PURE__ */ new Map();
  eventsPerWarning = /* @__PURE__ */ new Map();
  allEventsStack = [];
  jsInvokeStack = [];
  taskReflowEvents = [];
  longTaskEvents = [];
}
function storeWarning(event, warning) {
  const existingWarnings = Platform16.MapUtilities.getWithDefault(warningsPerEvent, event, () => []);
  existingWarnings.push(warning);
  warningsPerEvent.set(event, existingWarnings);
  const existingEvents = Platform16.MapUtilities.getWithDefault(eventsPerWarning, warning, () => []);
  existingEvents.push(event);
  eventsPerWarning.set(warning, existingEvents);
}
function handleEvent30(event) {
  processForcedReflowWarning(event);
  if (event.name === "RunTask") {
    const { duration } = Helpers18.Timing.eventTimingsMicroSeconds(event);
    if (duration > LONG_MAIN_THREAD_TASK_THRESHOLD) {
      longTaskEvents.push(event);
    }
    return;
  }
  if (Types31.Events.isFireIdleCallback(event)) {
    const { duration } = Helpers18.Timing.eventTimingsMilliSeconds(event);
    if (duration > event.args.data.allottedMilliseconds) {
      storeWarning(event, "IDLE_CALLBACK_OVER_TIME");
    }
    return;
  }
}
function processForcedReflowWarning(event) {
  accomodateEventInStack(event, allEventsStack);
  accomodateEventInStack(
    event,
    jsInvokeStack,
    /* pushEventToStack */
    Types31.Events.isJSInvocationEvent(event)
  );
  if (jsInvokeStack.length) {
    if (event.name === "Layout" || event.name === "UpdateLayoutTree") {
      taskReflowEvents.push(event);
      return;
    }
  }
  if (allEventsStack.length === 1) {
    const totalTime = taskReflowEvents.reduce((time, event2) => time + (event2.dur || 0), 0);
    if (totalTime >= FORCED_REFLOW_THRESHOLD) {
      taskReflowEvents.forEach((reflowEvent) => storeWarning(reflowEvent, "FORCED_REFLOW"));
    }
    taskReflowEvents.length = 0;
  }
}
function accomodateEventInStack(event, stack, pushEventToStack = true) {
  let nextItem = stack.at(-1);
  while (nextItem && event.ts > nextItem.ts + (nextItem.dur || 0)) {
    stack.pop();
    nextItem = stack.at(-1);
  }
  if (!pushEventToStack) {
    return;
  }
  stack.push(event);
}
function deps16() {
  return ["UserInteractions", "Workers"];
}
async function finalize30() {
  const longInteractions = data28().interactionsOverThreshold;
  for (const interaction of longInteractions) {
    storeWarning(interaction, "LONG_INTERACTION");
  }
  for (const event of longTaskEvents) {
    if (!(event.tid, data29().workerIdByThread.has(event.tid))) {
      storeWarning(event, "LONG_TASK");
    }
  }
  longTaskEvents.length = 0;
}
function data30() {
  return {
    perEvent: warningsPerEvent,
    perWarning: eventsPerWarning
  };
}

// gen/front_end/models/trace/handlers/types.js
var types_exports = {};
export {
  helpers_exports as Helpers,
  ModelHandlers_exports as ModelHandlers,
  Threads_exports as Threads,
  types_exports as Types
};
//# sourceMappingURL=handlers.js.map
