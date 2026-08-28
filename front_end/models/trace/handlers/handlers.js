var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/trace/handlers/helpers.ts
var helpers_exports = {};
__export(helpers_exports, {
  addEventToEntityMapping: () => addEventToEntityMapping,
  addNetworkRequestToEntityMapping: () => addNetworkRequestToEntityMapping,
  getEntityForEvent: () => getEntityForEvent,
  getEntityForUrl: () => getEntityForUrl,
  getNonResolvedURL: () => getNonResolvedURL,
  makeUpEntity: () => makeUpEntity
});
import * as ThirdPartyWeb from "../../../third_party/third-party-web/third-party-web.js";
import * as Types from "../types/types.js";
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

// ../../front_end/models/trace/handlers/ModelHandlers.ts
var ModelHandlers_exports = {};
__export(ModelHandlers_exports, {
  AnimationFrames: () => AnimationFramesHandler_exports,
  Animations: () => AnimationHandler_exports,
  AsyncJSCalls: () => AsyncJSCallsHandler_exports,
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

// ../../front_end/models/trace/handlers/AnimationFramesHandler.ts
var AnimationFramesHandler_exports = {};
__export(AnimationFramesHandler_exports, {
  data: () => data,
  deps: () => deps,
  finalize: () => finalize,
  handleEvent: () => handleEvent,
  handleUserConfig: () => handleUserConfig,
  reset: () => reset
});
import * as Helpers from "../helpers/helpers.js";
import * as Types2 from "../types/types.js";
function threadKey(data30) {
  return `${data30.pid}-${data30.tid}`;
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

// ../../front_end/models/trace/handlers/AnimationHandler.ts
var AnimationHandler_exports = {};
__export(AnimationHandler_exports, {
  data: () => data2,
  finalize: () => finalize2,
  handleEvent: () => handleEvent2,
  reset: () => reset2
});
import * as Helpers2 from "../helpers/helpers.js";
import * as Types3 from "../types/types.js";
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

// ../../front_end/models/trace/handlers/AsyncJSCallsHandler.ts
var AsyncJSCallsHandler_exports = {};
__export(AsyncJSCallsHandler_exports, {
  data: () => data8,
  deps: () => deps4,
  finalize: () => finalize8,
  handleEvent: () => handleEvent8,
  reset: () => reset8
});
import * as Platform6 from "../../../core/platform/platform.js";
import * as Types9 from "../types/types.js";

// ../../front_end/models/trace/handlers/FlowsHandler.ts
var FlowsHandler_exports = {};
__export(FlowsHandler_exports, {
  data: () => data3,
  finalize: () => finalize3,
  handleEvent: () => handleEvent3,
  reset: () => reset3
});
import * as Platform from "../../../core/platform/platform.js";
import * as Types4 from "../types/types.js";
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
    const flow = Platform.MapUtilities.getWithDefault(
      flowsById,
      flowId,
      () => /* @__PURE__ */ new Map()
    );
    flow.set(event.ts, event);
  }
  flowDataForEvent.bindingParsed = true;
}
function processFlowEvent(flowPhaseEvent) {
  const flowGroup = flowGroupTokenForFlowPhaseEvent(flowPhaseEvent);
  switch (flowPhaseEvent.ph) {
    case Types4.Events.Phase.FLOW_START: {
      const flowMetadata = { flowId: flowPhaseEvent.id, times: /* @__PURE__ */ new Map([[flowPhaseEvent.ts, void 0]]) };
      flowDataByGroupToken.set(flowGroup, flowPhaseEvent.id);
      addFlowIdToEventBinding(flowPhaseEvent, flowMetadata.flowId);
      return;
    }
    case Types4.Events.Phase.FLOW_STEP: {
      const flowId = flowDataByGroupToken.get(flowGroup);
      if (flowId === void 0) {
        return;
      }
      addFlowIdToEventBinding(flowPhaseEvent, flowId);
      return;
    }
    case Types4.Events.Phase.FLOW_END: {
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
  const flowsByPid = Platform.MapUtilities.getWithDefault(
    boundFlowData,
    event.ts,
    () => /* @__PURE__ */ new Map()
  );
  const flowsByTid = Platform.MapUtilities.getWithDefault(
    flowsByPid,
    event.pid,
    () => /* @__PURE__ */ new Map()
  );
  const flowsByCat = Platform.MapUtilities.getWithDefault(
    flowsByTid,
    event.tid,
    () => /* @__PURE__ */ new Map()
  );
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

// ../../front_end/models/trace/handlers/RendererHandler.ts
var RendererHandler_exports = {};
__export(RendererHandler_exports, {
  assignIsMainFrame: () => assignIsMainFrame,
  assignMeta: () => assignMeta,
  assignOrigin: () => assignOrigin,
  assignThreadName: () => assignThreadName,
  buildHierarchy: () => buildHierarchy,
  data: () => data7,
  deps: () => deps3,
  finalize: () => finalize7,
  handleEvent: () => handleEvent7,
  handleUserConfig: () => handleUserConfig3,
  makeCompleteEvent: () => makeCompleteEvent,
  reset: () => reset7,
  sanitizeProcesses: () => sanitizeProcesses,
  sanitizeThreads: () => sanitizeThreads
});
import * as Platform5 from "../../../core/platform/platform.js";
import * as Helpers6 from "../helpers/helpers.js";
import * as Types8 from "../types/types.js";

// ../../front_end/models/trace/handlers/MetaHandler.ts
var MetaHandler_exports = {};
__export(MetaHandler_exports, {
  data: () => data4,
  finalize: () => finalize4,
  handleEvent: () => handleEvent4,
  handleUserConfig: () => handleUserConfig2,
  reset: () => reset4
});
import * as Platform2 from "../../../core/platform/platform.js";
import * as Helpers3 from "../helpers/helpers.js";
import * as Types5 from "../types/types.js";
var config = Types5.Configuration.defaults();
function handleUserConfig2(userConfig) {
  config = userConfig;
}
var rendererProcessesByFrameId = /* @__PURE__ */ new Map();
var mainFrameId = "";
var mainFrameURL = "";
var framesByProcessId = /* @__PURE__ */ new Map();
var browserProcessId = Types5.Events.ProcessID(-1);
var browserThreadId = Types5.Events.ThreadID(-1);
var gpuProcessId = Types5.Events.ProcessID(-1);
var gpuThreadId = Types5.Events.ThreadID(-1);
var viewportRect = null;
var devicePixelRatio = null;
var processNames = /* @__PURE__ */ new Map();
var topLevelRendererIds = /* @__PURE__ */ new Set();
function makeNewTraceBounds() {
  return {
    min: Types5.Timing.Micro(Number.POSITIVE_INFINITY),
    max: Types5.Timing.Micro(Number.NEGATIVE_INFINITY),
    range: Types5.Timing.Micro(Number.POSITIVE_INFINITY)
  };
}
var traceBounds = makeNewTraceBounds();
var navigationsByFrameId = /* @__PURE__ */ new Map();
var navigationsByNavigationId = /* @__PURE__ */ new Map();
var softNavigationsById = /* @__PURE__ */ new Map();
var finalDisplayUrlByNavigationId = /* @__PURE__ */ new Map();
var mainFrameNavigations = [];
var sameDocumentNavigations = [];
var threadsInProcess = /* @__PURE__ */ new Map();
var traceStartedTimeFromTracingStartedEvent = Types5.Timing.Micro(-1);
var eventPhasesOfInterestForTraceBounds = /* @__PURE__ */ new Set([
  Types5.Events.Phase.BEGIN,
  Types5.Events.Phase.END,
  Types5.Events.Phase.COMPLETE,
  Types5.Events.Phase.INSTANT
]);
var traceIsGeneric = true;
var CHROME_WEB_TRACE_EVENTS = /* @__PURE__ */ new Set([
  Types5.Events.Name.TRACING_STARTED_IN_PAGE,
  Types5.Events.Name.TRACING_SESSION_ID_FOR_WORKER,
  Types5.Events.Name.TRACING_STARTED_IN_BROWSER,
  Types5.Events.Name.CPU_PROFILE
]);
function reset4() {
  navigationsByFrameId = /* @__PURE__ */ new Map();
  navigationsByNavigationId = /* @__PURE__ */ new Map();
  softNavigationsById = /* @__PURE__ */ new Map();
  finalDisplayUrlByNavigationId = /* @__PURE__ */ new Map();
  processNames = /* @__PURE__ */ new Map();
  mainFrameNavigations = [];
  sameDocumentNavigations = [];
  browserProcessId = Types5.Events.ProcessID(-1);
  browserThreadId = Types5.Events.ThreadID(-1);
  gpuProcessId = Types5.Events.ProcessID(-1);
  gpuThreadId = Types5.Events.ThreadID(-1);
  viewportRect = null;
  topLevelRendererIds = /* @__PURE__ */ new Set();
  threadsInProcess = /* @__PURE__ */ new Map();
  rendererProcessesByFrameId = /* @__PURE__ */ new Map();
  framesByProcessId = /* @__PURE__ */ new Map();
  traceBounds = makeNewTraceBounds();
  traceStartedTimeFromTracingStartedEvent = Types5.Timing.Micro(-1);
  traceIsGeneric = true;
}
function updateRendererProcessByFrame(event, frame) {
  const framesInProcessById = Platform2.MapUtilities.getWithDefault(framesByProcessId, frame.processId, () => /* @__PURE__ */ new Map());
  framesInProcessById.set(frame.frame, frame);
  const rendererProcessInFrame = Platform2.MapUtilities.getWithDefault(
    rendererProcessesByFrameId,
    frame.frame,
    () => /* @__PURE__ */ new Map()
  );
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
      max: Types5.Timing.Micro(0),
      range: Types5.Timing.Micro(0)
    }
  });
}
function handleEvent4(event) {
  if (traceIsGeneric && CHROME_WEB_TRACE_EVENTS.has(event.name)) {
    traceIsGeneric = false;
  }
  if (Types5.Events.isProcessName(event)) {
    processNames.set(event.pid, event);
  }
  if (event.ts !== 0 && !event.name.endsWith("::UMA") && eventPhasesOfInterestForTraceBounds.has(event.ph)) {
    traceBounds.min = Types5.Timing.Micro(Math.min(event.ts, traceBounds.min));
    const eventDuration = event.dur ?? Types5.Timing.Micro(0);
    traceBounds.max = Types5.Timing.Micro(Math.max(event.ts + eventDuration, traceBounds.max));
  }
  if (Types5.Events.isProcessName(event) && (event.args.name === "Browser" || event.args.name === "HeadlessBrowser")) {
    browserProcessId = event.pid;
    return;
  }
  if (Types5.Events.isProcessName(event) && (event.args.name === "Gpu" || event.args.name === "GPU Process")) {
    gpuProcessId = event.pid;
    return;
  }
  if (Types5.Events.isThreadName(event) && event.args.name === "CrGpuMain") {
    gpuThreadId = event.tid;
    return;
  }
  if (Types5.Events.isThreadName(event) && event.args.name === "CrBrowserMain") {
    browserThreadId = event.tid;
  }
  if (Types5.Events.isMainFrameViewport(event) && viewportRect === null) {
    const rectAsArray = event.args.data.viewport_rect;
    const viewportX = rectAsArray[0];
    const viewportY = rectAsArray[1];
    const viewportWidth = rectAsArray[2];
    const viewportHeight = rectAsArray[5];
    viewportRect = { x: viewportX, y: viewportY, width: viewportWidth, height: viewportHeight };
    devicePixelRatio = event.args.data.dpr;
  }
  if (Types5.Events.isTracingStartedInBrowser(event)) {
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
  if (Types5.Events.isFrameCommittedInBrowser(event)) {
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
  if (Types5.Events.isCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }
    const { frame, name, url } = frameData;
    updateRendererProcessByFrame(event, { processId: event.pid, frame, name, url });
    return;
  }
  if (Types5.Events.isThreadName(event)) {
    const threads = Platform2.MapUtilities.getWithDefault(threadsInProcess, event.pid, () => /* @__PURE__ */ new Map());
    threads.set(event.tid, event);
    return;
  }
  if (Types5.Events.isNavigationStart(event) && event.args.data) {
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
  if (config.enableSoftNavigation && Types5.Events.isSoftNavigationStart(event)) {
    softNavigationsById.set(event.args.context.performanceTimelineNavigationId, event);
  }
  if (Types5.Events.isResourceSendRequest(event)) {
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
  if (Types5.Events.isDidCommitSameDocumentNavigation(event)) {
    if (event.args.render_frame_host.frame_type !== "PRIMARY_MAIN_FRAME") {
      return;
    }
    sameDocumentNavigations.push(event);
    return;
  }
}
async function finalize4(options) {
  config.showAllEvents = Boolean(options?.showAllEvents);
  if (traceStartedTimeFromTracingStartedEvent >= 0) {
    traceBounds.min = traceStartedTimeFromTracingStartedEvent;
  }
  traceBounds.range = Types5.Timing.Micro(traceBounds.max - traceBounds.min);
  for (const [, processWindows] of rendererProcessesByFrameId) {
    const processWindowValues = [...processWindows.values()].flat().sort((a, b) => {
      return a.window.min - b.window.min;
    });
    for (let i = 0; i < processWindowValues.length; i++) {
      const currentWindow = processWindowValues[i];
      const nextWindow = processWindowValues[i + 1];
      if (!nextWindow) {
        currentWindow.window.max = Types5.Timing.Micro(traceBounds.max);
        currentWindow.window.range = Types5.Timing.Micro(traceBounds.max - currentWindow.window.min);
      } else {
        currentWindow.window.max = Types5.Timing.Micro(nextWindow.window.min - 1);
        currentWindow.window.range = Types5.Timing.Micro(currentWindow.window.max - currentWindow.window.min);
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
  const firstNavTimeThreshold = Helpers3.Timing.secondsToMicro(Types5.Timing.Seconds(0.5));
  if (firstMainFrameNav) {
    const navigationIsWithinThreshold = firstMainFrameNav.ts - traceBounds.min < firstNavTimeThreshold;
    if (firstMainFrameNav.args.data?.isOutermostMainFrame && firstMainFrameNav.args.data?.documentLoaderURL && navigationIsWithinThreshold) {
      mainFrameURL = firstMainFrameNav.args.data.documentLoaderURL;
    }
  }
  const softNavs = Array.from(softNavigationsById.values()).sort((a, b) => a.ts - b.ts);
  const hardNavs = [...mainFrameNavigations];
  const intervals = [
    { minTs: 0, maxTs: hardNavs.length > 0 ? hardNavs[0].ts : Infinity, key: "" },
    ...hardNavs.map((nav, i) => ({
      minTs: nav.ts,
      maxTs: i + 1 < hardNavs.length ? hardNavs[i + 1].ts : Infinity,
      key: nav.args.data?.navigationId ?? ""
    }))
  ];
  for (const { minTs, maxTs, key } of intervals) {
    const firstSoftNav = softNavs.find((sn) => sn.ts >= minTs && sn.ts < maxTs);
    const effectiveMaxTs = firstSoftNav ? firstSoftNav.ts : maxTs;
    const historyEvents = sameDocumentNavigations.filter((hn) => hn.ts >= minTs && hn.ts < effectiveMaxTs);
    const lastHistoryEvent = historyEvents.at(-1);
    if (lastHistoryEvent) {
      finalDisplayUrlByNavigationId.set(key, lastHistoryEvent.args.url);
    }
  }
}
function data4() {
  return {
    config,
    traceBounds,
    browserProcessId,
    browserThreadId,
    processNames,
    gpuProcessId,
    gpuThreadId: gpuThreadId === Types5.Events.ThreadID(-1) ? void 0 : gpuThreadId,
    viewportRect: viewportRect || void 0,
    devicePixelRatio: devicePixelRatio ?? void 0,
    mainFrameId,
    mainFrameURL,
    navigationsByFrameId,
    navigationsByNavigationId,
    softNavigationsById,
    finalDisplayUrlByNavigationId,
    threadsInProcess,
    rendererProcessesByFrame: rendererProcessesByFrameId,
    topLevelRendererIds,
    frameByProcessId: framesByProcessId,
    mainFrameNavigations,
    traceIsGeneric
  };
}

// ../../front_end/models/trace/handlers/NetworkRequestsHandler.ts
var NetworkRequestsHandler_exports = {};
__export(NetworkRequestsHandler_exports, {
  data: () => data5,
  deps: () => deps2,
  finalize: () => finalize5,
  handleEvent: () => handleEvent5,
  reset: () => reset5
});
import * as Platform3 from "../../../core/platform/platform.js";

// ../../front_end/generated/protocol.ts
var Accessibility;
((Accessibility2) => {
  let AXValueType;
  ((AXValueType2) => {
    AXValueType2["Boolean"] = "boolean";
    AXValueType2["Tristate"] = "tristate";
    AXValueType2["BooleanOrUndefined"] = "booleanOrUndefined";
    AXValueType2["Idref"] = "idref";
    AXValueType2["IdrefList"] = "idrefList";
    AXValueType2["Integer"] = "integer";
    AXValueType2["Node"] = "node";
    AXValueType2["NodeList"] = "nodeList";
    AXValueType2["Number"] = "number";
    AXValueType2["String"] = "string";
    AXValueType2["ComputedString"] = "computedString";
    AXValueType2["Token"] = "token";
    AXValueType2["TokenList"] = "tokenList";
    AXValueType2["DomRelation"] = "domRelation";
    AXValueType2["Role"] = "role";
    AXValueType2["InternalRole"] = "internalRole";
    AXValueType2["ValueUndefined"] = "valueUndefined";
  })(AXValueType = Accessibility2.AXValueType || (Accessibility2.AXValueType = {}));
  let AXValueSourceType;
  ((AXValueSourceType2) => {
    AXValueSourceType2["Attribute"] = "attribute";
    AXValueSourceType2["Implicit"] = "implicit";
    AXValueSourceType2["Style"] = "style";
    AXValueSourceType2["Contents"] = "contents";
    AXValueSourceType2["Placeholder"] = "placeholder";
    AXValueSourceType2["RelatedElement"] = "relatedElement";
  })(AXValueSourceType = Accessibility2.AXValueSourceType || (Accessibility2.AXValueSourceType = {}));
  let AXValueNativeSourceType;
  ((AXValueNativeSourceType2) => {
    AXValueNativeSourceType2["Description"] = "description";
    AXValueNativeSourceType2["Figcaption"] = "figcaption";
    AXValueNativeSourceType2["Label"] = "label";
    AXValueNativeSourceType2["Labelfor"] = "labelfor";
    AXValueNativeSourceType2["Labelwrapped"] = "labelwrapped";
    AXValueNativeSourceType2["Legend"] = "legend";
    AXValueNativeSourceType2["Rubyannotation"] = "rubyannotation";
    AXValueNativeSourceType2["Tablecaption"] = "tablecaption";
    AXValueNativeSourceType2["Title"] = "title";
    AXValueNativeSourceType2["Other"] = "other";
  })(AXValueNativeSourceType = Accessibility2.AXValueNativeSourceType || (Accessibility2.AXValueNativeSourceType = {}));
  let AXPropertyName;
  ((AXPropertyName2) => {
    AXPropertyName2["Actions"] = "actions";
    AXPropertyName2["Busy"] = "busy";
    AXPropertyName2["Disabled"] = "disabled";
    AXPropertyName2["Editable"] = "editable";
    AXPropertyName2["Focusable"] = "focusable";
    AXPropertyName2["Focused"] = "focused";
    AXPropertyName2["Hidden"] = "hidden";
    AXPropertyName2["HiddenRoot"] = "hiddenRoot";
    AXPropertyName2["Invalid"] = "invalid";
    AXPropertyName2["Keyshortcuts"] = "keyshortcuts";
    AXPropertyName2["Settable"] = "settable";
    AXPropertyName2["Roledescription"] = "roledescription";
    AXPropertyName2["Live"] = "live";
    AXPropertyName2["Atomic"] = "atomic";
    AXPropertyName2["Relevant"] = "relevant";
    AXPropertyName2["Root"] = "root";
    AXPropertyName2["Autocomplete"] = "autocomplete";
    AXPropertyName2["HasPopup"] = "hasPopup";
    AXPropertyName2["Level"] = "level";
    AXPropertyName2["Multiselectable"] = "multiselectable";
    AXPropertyName2["Orientation"] = "orientation";
    AXPropertyName2["Multiline"] = "multiline";
    AXPropertyName2["Readonly"] = "readonly";
    AXPropertyName2["Required"] = "required";
    AXPropertyName2["Valuemin"] = "valuemin";
    AXPropertyName2["Valuemax"] = "valuemax";
    AXPropertyName2["Valuetext"] = "valuetext";
    AXPropertyName2["Checked"] = "checked";
    AXPropertyName2["Expanded"] = "expanded";
    AXPropertyName2["Modal"] = "modal";
    AXPropertyName2["Pressed"] = "pressed";
    AXPropertyName2["Selected"] = "selected";
    AXPropertyName2["Activedescendant"] = "activedescendant";
    AXPropertyName2["Controls"] = "controls";
    AXPropertyName2["Describedby"] = "describedby";
    AXPropertyName2["Details"] = "details";
    AXPropertyName2["Errormessage"] = "errormessage";
    AXPropertyName2["Flowto"] = "flowto";
    AXPropertyName2["Labelledby"] = "labelledby";
    AXPropertyName2["Owns"] = "owns";
    AXPropertyName2["Url"] = "url";
    AXPropertyName2["ActiveFullscreenElement"] = "activeFullscreenElement";
    AXPropertyName2["ActiveModalDialog"] = "activeModalDialog";
    AXPropertyName2["ActiveAriaModalDialog"] = "activeAriaModalDialog";
    AXPropertyName2["AriaHiddenElement"] = "ariaHiddenElement";
    AXPropertyName2["AriaHiddenSubtree"] = "ariaHiddenSubtree";
    AXPropertyName2["EmptyAlt"] = "emptyAlt";
    AXPropertyName2["EmptyText"] = "emptyText";
    AXPropertyName2["InertElement"] = "inertElement";
    AXPropertyName2["InertSubtree"] = "inertSubtree";
    AXPropertyName2["LabelContainer"] = "labelContainer";
    AXPropertyName2["LabelFor"] = "labelFor";
    AXPropertyName2["NotRendered"] = "notRendered";
    AXPropertyName2["NotVisible"] = "notVisible";
    AXPropertyName2["PresentationalRole"] = "presentationalRole";
    AXPropertyName2["ProbablyPresentational"] = "probablyPresentational";
    AXPropertyName2["InactiveCarouselTabContent"] = "inactiveCarouselTabContent";
    AXPropertyName2["Uninteresting"] = "uninteresting";
  })(AXPropertyName = Accessibility2.AXPropertyName || (Accessibility2.AXPropertyName = {}));
})(Accessibility || (Accessibility = {}));
var Animation;
((Animation2) => {
  let AnimationType;
  ((AnimationType2) => {
    AnimationType2["CSSTransition"] = "CSSTransition";
    AnimationType2["CSSAnimation"] = "CSSAnimation";
    AnimationType2["WebAnimation"] = "WebAnimation";
  })(AnimationType = Animation2.AnimationType || (Animation2.AnimationType = {}));
})(Animation || (Animation = {}));
var Audits;
((Audits2) => {
  let CookieExclusionReason;
  ((CookieExclusionReason2) => {
    CookieExclusionReason2["ExcludeSameSiteUnspecifiedTreatedAsLax"] = "ExcludeSameSiteUnspecifiedTreatedAsLax";
    CookieExclusionReason2["ExcludeSameSiteNoneInsecure"] = "ExcludeSameSiteNoneInsecure";
    CookieExclusionReason2["ExcludeSameSiteLax"] = "ExcludeSameSiteLax";
    CookieExclusionReason2["ExcludeSameSiteStrict"] = "ExcludeSameSiteStrict";
    CookieExclusionReason2["ExcludeDomainNonASCII"] = "ExcludeDomainNonASCII";
    CookieExclusionReason2["ExcludeThirdPartyCookieBlockedInFirstPartySet"] = "ExcludeThirdPartyCookieBlockedInFirstPartySet";
    CookieExclusionReason2["ExcludeThirdPartyPhaseout"] = "ExcludeThirdPartyPhaseout";
    CookieExclusionReason2["ExcludePortMismatch"] = "ExcludePortMismatch";
    CookieExclusionReason2["ExcludeSchemeMismatch"] = "ExcludeSchemeMismatch";
  })(CookieExclusionReason = Audits2.CookieExclusionReason || (Audits2.CookieExclusionReason = {}));
  let CookieWarningReason;
  ((CookieWarningReason2) => {
    CookieWarningReason2["WarnSameSiteUnspecifiedCrossSiteContext"] = "WarnSameSiteUnspecifiedCrossSiteContext";
    CookieWarningReason2["WarnSameSiteNoneInsecure"] = "WarnSameSiteNoneInsecure";
    CookieWarningReason2["WarnSameSiteUnspecifiedLaxAllowUnsafe"] = "WarnSameSiteUnspecifiedLaxAllowUnsafe";
    CookieWarningReason2["WarnSameSiteStrictLaxDowngradeStrict"] = "WarnSameSiteStrictLaxDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeStrict"] = "WarnSameSiteStrictCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeLax"] = "WarnSameSiteStrictCrossDowngradeLax";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeStrict"] = "WarnSameSiteLaxCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeLax"] = "WarnSameSiteLaxCrossDowngradeLax";
    CookieWarningReason2["WarnAttributeValueExceedsMaxSize"] = "WarnAttributeValueExceedsMaxSize";
    CookieWarningReason2["WarnDomainNonASCII"] = "WarnDomainNonASCII";
    CookieWarningReason2["WarnThirdPartyPhaseout"] = "WarnThirdPartyPhaseout";
    CookieWarningReason2["WarnCrossSiteRedirectDowngradeChangesInclusion"] = "WarnCrossSiteRedirectDowngradeChangesInclusion";
    CookieWarningReason2["WarnDeprecationTrialMetadata"] = "WarnDeprecationTrialMetadata";
    CookieWarningReason2["WarnThirdPartyCookieHeuristic"] = "WarnThirdPartyCookieHeuristic";
  })(CookieWarningReason = Audits2.CookieWarningReason || (Audits2.CookieWarningReason = {}));
  let CookieOperation;
  ((CookieOperation2) => {
    CookieOperation2["SetCookie"] = "SetCookie";
    CookieOperation2["ReadCookie"] = "ReadCookie";
  })(CookieOperation = Audits2.CookieOperation || (Audits2.CookieOperation = {}));
  let InsightType;
  ((InsightType2) => {
    InsightType2["GitHubResource"] = "GitHubResource";
    InsightType2["GracePeriod"] = "GracePeriod";
    InsightType2["Heuristics"] = "Heuristics";
  })(InsightType = Audits2.InsightType || (Audits2.InsightType = {}));
  let PerformanceIssueType;
  ((PerformanceIssueType2) => {
    PerformanceIssueType2["DocumentCookie"] = "DocumentCookie";
  })(PerformanceIssueType = Audits2.PerformanceIssueType || (Audits2.PerformanceIssueType = {}));
  let MixedContentResolutionStatus;
  ((MixedContentResolutionStatus2) => {
    MixedContentResolutionStatus2["MixedContentBlocked"] = "MixedContentBlocked";
    MixedContentResolutionStatus2["MixedContentAutomaticallyUpgraded"] = "MixedContentAutomaticallyUpgraded";
    MixedContentResolutionStatus2["MixedContentWarning"] = "MixedContentWarning";
  })(MixedContentResolutionStatus = Audits2.MixedContentResolutionStatus || (Audits2.MixedContentResolutionStatus = {}));
  let MixedContentResourceType;
  ((MixedContentResourceType2) => {
    MixedContentResourceType2["Audio"] = "Audio";
    MixedContentResourceType2["Beacon"] = "Beacon";
    MixedContentResourceType2["CSPReport"] = "CSPReport";
    MixedContentResourceType2["Download"] = "Download";
    MixedContentResourceType2["EventSource"] = "EventSource";
    MixedContentResourceType2["Favicon"] = "Favicon";
    MixedContentResourceType2["Font"] = "Font";
    MixedContentResourceType2["Form"] = "Form";
    MixedContentResourceType2["Frame"] = "Frame";
    MixedContentResourceType2["Image"] = "Image";
    MixedContentResourceType2["Import"] = "Import";
    MixedContentResourceType2["JSON"] = "JSON";
    MixedContentResourceType2["Manifest"] = "Manifest";
    MixedContentResourceType2["Ping"] = "Ping";
    MixedContentResourceType2["PluginData"] = "PluginData";
    MixedContentResourceType2["PluginResource"] = "PluginResource";
    MixedContentResourceType2["Prefetch"] = "Prefetch";
    MixedContentResourceType2["Resource"] = "Resource";
    MixedContentResourceType2["Script"] = "Script";
    MixedContentResourceType2["ServiceWorker"] = "ServiceWorker";
    MixedContentResourceType2["SharedWorker"] = "SharedWorker";
    MixedContentResourceType2["SpeculationRules"] = "SpeculationRules";
    MixedContentResourceType2["Stylesheet"] = "Stylesheet";
    MixedContentResourceType2["Track"] = "Track";
    MixedContentResourceType2["Video"] = "Video";
    MixedContentResourceType2["Worker"] = "Worker";
    MixedContentResourceType2["XMLHttpRequest"] = "XMLHttpRequest";
    MixedContentResourceType2["XSLT"] = "XSLT";
  })(MixedContentResourceType = Audits2.MixedContentResourceType || (Audits2.MixedContentResourceType = {}));
  let BlockedByResponseReason;
  ((BlockedByResponseReason2) => {
    BlockedByResponseReason2["CoepFrameResourceNeedsCoepHeader"] = "CoepFrameResourceNeedsCoepHeader";
    BlockedByResponseReason2["CoopSandboxedIFrameCannotNavigateToCoopPage"] = "CoopSandboxedIFrameCannotNavigateToCoopPage";
    BlockedByResponseReason2["CorpNotSameOrigin"] = "CorpNotSameOrigin";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByDip";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip";
    BlockedByResponseReason2["CorpNotSameSite"] = "CorpNotSameSite";
    BlockedByResponseReason2["SRIMessageSignatureMismatch"] = "SRIMessageSignatureMismatch";
  })(BlockedByResponseReason = Audits2.BlockedByResponseReason || (Audits2.BlockedByResponseReason = {}));
  let HeavyAdResolutionStatus;
  ((HeavyAdResolutionStatus2) => {
    HeavyAdResolutionStatus2["HeavyAdBlocked"] = "HeavyAdBlocked";
    HeavyAdResolutionStatus2["HeavyAdWarning"] = "HeavyAdWarning";
  })(HeavyAdResolutionStatus = Audits2.HeavyAdResolutionStatus || (Audits2.HeavyAdResolutionStatus = {}));
  let HeavyAdReason;
  ((HeavyAdReason2) => {
    HeavyAdReason2["NetworkTotalLimit"] = "NetworkTotalLimit";
    HeavyAdReason2["CpuTotalLimit"] = "CpuTotalLimit";
    HeavyAdReason2["CpuPeakLimit"] = "CpuPeakLimit";
  })(HeavyAdReason = Audits2.HeavyAdReason || (Audits2.HeavyAdReason = {}));
  let ContentSecurityPolicyViolationType;
  ((ContentSecurityPolicyViolationType2) => {
    ContentSecurityPolicyViolationType2["KInlineViolation"] = "kInlineViolation";
    ContentSecurityPolicyViolationType2["KEvalViolation"] = "kEvalViolation";
    ContentSecurityPolicyViolationType2["KURLViolation"] = "kURLViolation";
    ContentSecurityPolicyViolationType2["KSRIViolation"] = "kSRIViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesSinkViolation"] = "kTrustedTypesSinkViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesPolicyViolation"] = "kTrustedTypesPolicyViolation";
    ContentSecurityPolicyViolationType2["KWasmEvalViolation"] = "kWasmEvalViolation";
  })(ContentSecurityPolicyViolationType = Audits2.ContentSecurityPolicyViolationType || (Audits2.ContentSecurityPolicyViolationType = {}));
  let SharedArrayBufferIssueType;
  ((SharedArrayBufferIssueType2) => {
    SharedArrayBufferIssueType2["TransferIssue"] = "TransferIssue";
    SharedArrayBufferIssueType2["CreationIssue"] = "CreationIssue";
  })(SharedArrayBufferIssueType = Audits2.SharedArrayBufferIssueType || (Audits2.SharedArrayBufferIssueType = {}));
  let SharedDictionaryError;
  ((SharedDictionaryError2) => {
    SharedDictionaryError2["UseErrorCrossOriginNoCorsRequest"] = "UseErrorCrossOriginNoCorsRequest";
    SharedDictionaryError2["UseErrorDictionaryLoadFailure"] = "UseErrorDictionaryLoadFailure";
    SharedDictionaryError2["UseErrorMatchingDictionaryNotUsed"] = "UseErrorMatchingDictionaryNotUsed";
    SharedDictionaryError2["UseErrorUnexpectedContentDictionaryHeader"] = "UseErrorUnexpectedContentDictionaryHeader";
    SharedDictionaryError2["WriteErrorCossOriginNoCorsRequest"] = "WriteErrorCossOriginNoCorsRequest";
    SharedDictionaryError2["WriteErrorDisallowedBySettings"] = "WriteErrorDisallowedBySettings";
    SharedDictionaryError2["WriteErrorExpiredResponse"] = "WriteErrorExpiredResponse";
    SharedDictionaryError2["WriteErrorFeatureDisabled"] = "WriteErrorFeatureDisabled";
    SharedDictionaryError2["WriteErrorInsufficientResources"] = "WriteErrorInsufficientResources";
    SharedDictionaryError2["WriteErrorInvalidMatchField"] = "WriteErrorInvalidMatchField";
    SharedDictionaryError2["WriteErrorInvalidStructuredHeader"] = "WriteErrorInvalidStructuredHeader";
    SharedDictionaryError2["WriteErrorInvalidTTLField"] = "WriteErrorInvalidTTLField";
    SharedDictionaryError2["WriteErrorNavigationRequest"] = "WriteErrorNavigationRequest";
    SharedDictionaryError2["WriteErrorNoMatchField"] = "WriteErrorNoMatchField";
    SharedDictionaryError2["WriteErrorNonIntegerTTLField"] = "WriteErrorNonIntegerTTLField";
    SharedDictionaryError2["WriteErrorNonListMatchDestField"] = "WriteErrorNonListMatchDestField";
    SharedDictionaryError2["WriteErrorNonSecureContext"] = "WriteErrorNonSecureContext";
    SharedDictionaryError2["WriteErrorNonStringIdField"] = "WriteErrorNonStringIdField";
    SharedDictionaryError2["WriteErrorNonStringInMatchDestList"] = "WriteErrorNonStringInMatchDestList";
    SharedDictionaryError2["WriteErrorInvalidMatchDestList"] = "WriteErrorInvalidMatchDestList";
    SharedDictionaryError2["WriteErrorNonStringMatchField"] = "WriteErrorNonStringMatchField";
    SharedDictionaryError2["WriteErrorNonTokenTypeField"] = "WriteErrorNonTokenTypeField";
    SharedDictionaryError2["WriteErrorRequestAborted"] = "WriteErrorRequestAborted";
    SharedDictionaryError2["WriteErrorShuttingDown"] = "WriteErrorShuttingDown";
    SharedDictionaryError2["WriteErrorTooLongIdField"] = "WriteErrorTooLongIdField";
    SharedDictionaryError2["WriteErrorUnsupportedType"] = "WriteErrorUnsupportedType";
  })(SharedDictionaryError = Audits2.SharedDictionaryError || (Audits2.SharedDictionaryError = {}));
  let SRIMessageSignatureError;
  ((SRIMessageSignatureError2) => {
    SRIMessageSignatureError2["MissingSignatureHeader"] = "MissingSignatureHeader";
    SRIMessageSignatureError2["MissingSignatureInputHeader"] = "MissingSignatureInputHeader";
    SRIMessageSignatureError2["InvalidSignatureHeader"] = "InvalidSignatureHeader";
    SRIMessageSignatureError2["InvalidSignatureInputHeader"] = "InvalidSignatureInputHeader";
    SRIMessageSignatureError2["SignatureHeaderValueIsNotByteSequence"] = "SignatureHeaderValueIsNotByteSequence";
    SRIMessageSignatureError2["SignatureHeaderValueIsParameterized"] = "SignatureHeaderValueIsParameterized";
    SRIMessageSignatureError2["SignatureHeaderValueIsIncorrectLength"] = "SignatureHeaderValueIsIncorrectLength";
    SRIMessageSignatureError2["SignatureInputHeaderMissingLabel"] = "SignatureInputHeaderMissingLabel";
    SRIMessageSignatureError2["SignatureInputHeaderValueNotInnerList"] = "SignatureInputHeaderValueNotInnerList";
    SRIMessageSignatureError2["SignatureInputHeaderValueMissingComponents"] = "SignatureInputHeaderValueMissingComponents";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentType"] = "SignatureInputHeaderInvalidComponentType";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentName"] = "SignatureInputHeaderInvalidComponentName";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidHeaderComponentParameter"] = "SignatureInputHeaderInvalidHeaderComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidDerivedComponentParameter"] = "SignatureInputHeaderInvalidDerivedComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderKeyIdLength"] = "SignatureInputHeaderKeyIdLength";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidParameter"] = "SignatureInputHeaderInvalidParameter";
    SRIMessageSignatureError2["SignatureInputHeaderMissingRequiredParameters"] = "SignatureInputHeaderMissingRequiredParameters";
    SRIMessageSignatureError2["ValidationFailedSignatureExpired"] = "ValidationFailedSignatureExpired";
    SRIMessageSignatureError2["ValidationFailedInvalidLength"] = "ValidationFailedInvalidLength";
    SRIMessageSignatureError2["ValidationFailedSignatureMismatch"] = "ValidationFailedSignatureMismatch";
    SRIMessageSignatureError2["ValidationFailedIntegrityMismatch"] = "ValidationFailedIntegrityMismatch";
    SRIMessageSignatureError2["SignatureBaseUnknownDerivedComponent"] = "SignatureBaseUnknownDerivedComponent";
    SRIMessageSignatureError2["SignatureBaseMissingHeader"] = "SignatureBaseMissingHeader";
    SRIMessageSignatureError2["SignatureBaseInvalidUnencodedDigest"] = "SignatureBaseInvalidUnencodedDigest";
    SRIMessageSignatureError2["SignatureBaseUnsupportedComponent"] = "SignatureBaseUnsupportedComponent";
  })(SRIMessageSignatureError = Audits2.SRIMessageSignatureError || (Audits2.SRIMessageSignatureError = {}));
  let UnencodedDigestError;
  ((UnencodedDigestError2) => {
    UnencodedDigestError2["MalformedDictionary"] = "MalformedDictionary";
    UnencodedDigestError2["UnknownAlgorithm"] = "UnknownAlgorithm";
    UnencodedDigestError2["IncorrectDigestType"] = "IncorrectDigestType";
    UnencodedDigestError2["IncorrectDigestLength"] = "IncorrectDigestLength";
  })(UnencodedDigestError = Audits2.UnencodedDigestError || (Audits2.UnencodedDigestError = {}));
  let ConnectionAllowlistError;
  ((ConnectionAllowlistError2) => {
    ConnectionAllowlistError2["InvalidHeader"] = "InvalidHeader";
    ConnectionAllowlistError2["MoreThanOneList"] = "MoreThanOneList";
    ConnectionAllowlistError2["ItemNotInnerList"] = "ItemNotInnerList";
    ConnectionAllowlistError2["InvalidAllowlistItemType"] = "InvalidAllowlistItemType";
    ConnectionAllowlistError2["ReportingEndpointNotToken"] = "ReportingEndpointNotToken";
    ConnectionAllowlistError2["InvalidUrlPattern"] = "InvalidUrlPattern";
    ConnectionAllowlistError2["IFrameAttributeLoosensEmbeddingRequirement"] = "IFrameAttributeLoosensEmbeddingRequirement";
    ConnectionAllowlistError2["InvalidAllowConnectionAllowlistFrom"] = "InvalidAllowConnectionAllowlistFrom";
    ConnectionAllowlistError2["EmbeddingRequirementNotSatisfied"] = "EmbeddingRequirementNotSatisfied";
  })(ConnectionAllowlistError = Audits2.ConnectionAllowlistError || (Audits2.ConnectionAllowlistError = {}));
  let GenericIssueErrorType;
  ((GenericIssueErrorType2) => {
    GenericIssueErrorType2["FormLabelForNameError"] = "FormLabelForNameError";
    GenericIssueErrorType2["FormDuplicateIdForInputError"] = "FormDuplicateIdForInputError";
    GenericIssueErrorType2["FormInputWithNoLabelError"] = "FormInputWithNoLabelError";
    GenericIssueErrorType2["FormAutocompleteAttributeEmptyError"] = "FormAutocompleteAttributeEmptyError";
    GenericIssueErrorType2["FormEmptyIdAndNameAttributesForInputError"] = "FormEmptyIdAndNameAttributesForInputError";
    GenericIssueErrorType2["FormAriaLabelledByToNonExistingIdError"] = "FormAriaLabelledByToNonExistingIdError";
    GenericIssueErrorType2["FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = "FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    GenericIssueErrorType2["FormLabelHasNeitherForNorNestedInputError"] = "FormLabelHasNeitherForNorNestedInputError";
    GenericIssueErrorType2["FormLabelForMatchesNonExistingIdError"] = "FormLabelForMatchesNonExistingIdError";
    GenericIssueErrorType2["FormInputHasWrongButWellIntendedAutocompleteValueError"] = "FormInputHasWrongButWellIntendedAutocompleteValueError";
    GenericIssueErrorType2["ResponseWasBlockedByORB"] = "ResponseWasBlockedByORB";
    GenericIssueErrorType2["NavigationEntryMarkedSkippable"] = "NavigationEntryMarkedSkippable";
    GenericIssueErrorType2["BackUINavigationWouldSkipAd"] = "BackUINavigationWouldSkipAd";
    GenericIssueErrorType2["AutofillAndManualTextPolicyControlledFeaturesInfo"] = "AutofillAndManualTextPolicyControlledFeaturesInfo";
    GenericIssueErrorType2["AutofillPolicyControlledFeatureInfo"] = "AutofillPolicyControlledFeatureInfo";
    GenericIssueErrorType2["ManualTextPolicyControlledFeatureInfo"] = "ManualTextPolicyControlledFeatureInfo";
    GenericIssueErrorType2["FormModelContextParameterMissingTitleAndDescription"] = "FormModelContextParameterMissingTitleAndDescription";
    GenericIssueErrorType2["FormModelContextMissingToolName"] = "FormModelContextMissingToolName";
    GenericIssueErrorType2["FormModelContextMissingToolDescription"] = "FormModelContextMissingToolDescription";
    GenericIssueErrorType2["FormModelContextRequiredParameterMissingName"] = "FormModelContextRequiredParameterMissingName";
    GenericIssueErrorType2["FormModelContextParameterMissingName"] = "FormModelContextParameterMissingName";
  })(GenericIssueErrorType = Audits2.GenericIssueErrorType || (Audits2.GenericIssueErrorType = {}));
  let ClientHintIssueReason;
  ((ClientHintIssueReason2) => {
    ClientHintIssueReason2["MetaTagAllowListInvalidOrigin"] = "MetaTagAllowListInvalidOrigin";
    ClientHintIssueReason2["MetaTagModifiedHTML"] = "MetaTagModifiedHTML";
  })(ClientHintIssueReason = Audits2.ClientHintIssueReason || (Audits2.ClientHintIssueReason = {}));
  let FederatedAuthRequestIssueReason;
  ((FederatedAuthRequestIssueReason2) => {
    FederatedAuthRequestIssueReason2["ShouldEmbargo"] = "ShouldEmbargo";
    FederatedAuthRequestIssueReason2["TooManyRequests"] = "TooManyRequests";
    FederatedAuthRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    FederatedAuthRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    FederatedAuthRequestIssueReason2["WellKnownBlockedByConnectionAllowlist"] = "WellKnownBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    FederatedAuthRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    FederatedAuthRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    FederatedAuthRequestIssueReason2["ConfigNotInWellKnown"] = "ConfigNotInWellKnown";
    FederatedAuthRequestIssueReason2["WellKnownTooBig"] = "WellKnownTooBig";
    FederatedAuthRequestIssueReason2["ConfigHttpNotFound"] = "ConfigHttpNotFound";
    FederatedAuthRequestIssueReason2["ConfigNoResponse"] = "ConfigNoResponse";
    FederatedAuthRequestIssueReason2["ConfigBlockedByConnectionAllowlist"] = "ConfigBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["ConfigInvalidResponse"] = "ConfigInvalidResponse";
    FederatedAuthRequestIssueReason2["ConfigInvalidContentType"] = "ConfigInvalidContentType";
    FederatedAuthRequestIssueReason2["IdpNotPotentiallyTrustworthy"] = "IdpNotPotentiallyTrustworthy";
    FederatedAuthRequestIssueReason2["DisabledInSettings"] = "DisabledInSettings";
    FederatedAuthRequestIssueReason2["DisabledInFlags"] = "DisabledInFlags";
    FederatedAuthRequestIssueReason2["ErrorFetchingSignin"] = "ErrorFetchingSignin";
    FederatedAuthRequestIssueReason2["InvalidSigninResponse"] = "InvalidSigninResponse";
    FederatedAuthRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    FederatedAuthRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    FederatedAuthRequestIssueReason2["AccountsBlockedByConnectionAllowlist"] = "AccountsBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    FederatedAuthRequestIssueReason2["AccountsListEmpty"] = "AccountsListEmpty";
    FederatedAuthRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    FederatedAuthRequestIssueReason2["IdTokenHttpNotFound"] = "IdTokenHttpNotFound";
    FederatedAuthRequestIssueReason2["IdTokenNoResponse"] = "IdTokenNoResponse";
    FederatedAuthRequestIssueReason2["IdTokenBlockedByConnectionAllowlist"] = "IdTokenBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["IdTokenInvalidResponse"] = "IdTokenInvalidResponse";
    FederatedAuthRequestIssueReason2["IdTokenIdpErrorResponse"] = "IdTokenIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenCrossSiteIdpErrorResponse"] = "IdTokenCrossSiteIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenInvalidRequest"] = "IdTokenInvalidRequest";
    FederatedAuthRequestIssueReason2["IdTokenInvalidContentType"] = "IdTokenInvalidContentType";
    FederatedAuthRequestIssueReason2["ErrorIdToken"] = "ErrorIdToken";
    FederatedAuthRequestIssueReason2["Canceled"] = "Canceled";
    FederatedAuthRequestIssueReason2["RpPageNotVisible"] = "RpPageNotVisible";
    FederatedAuthRequestIssueReason2["SilentMediationFailure"] = "SilentMediationFailure";
    FederatedAuthRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthRequestIssueReason2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
    FederatedAuthRequestIssueReason2["ReplacedByActiveMode"] = "ReplacedByActiveMode";
    FederatedAuthRequestIssueReason2["RelyingPartyOriginIsOpaque"] = "RelyingPartyOriginIsOpaque";
    FederatedAuthRequestIssueReason2["TypeNotMatching"] = "TypeNotMatching";
    FederatedAuthRequestIssueReason2["UiDismissedNoEmbargo"] = "UiDismissedNoEmbargo";
    FederatedAuthRequestIssueReason2["CorsError"] = "CorsError";
    FederatedAuthRequestIssueReason2["SuppressedBySegmentationPlatform"] = "SuppressedBySegmentationPlatform";
  })(FederatedAuthRequestIssueReason = Audits2.FederatedAuthRequestIssueReason || (Audits2.FederatedAuthRequestIssueReason = {}));
  let FederatedAuthUserInfoRequestIssueReason;
  ((FederatedAuthUserInfoRequestIssueReason2) => {
    FederatedAuthUserInfoRequestIssueReason2["NotSameOrigin"] = "NotSameOrigin";
    FederatedAuthUserInfoRequestIssueReason2["NotIframe"] = "NotIframe";
    FederatedAuthUserInfoRequestIssueReason2["NotPotentiallyTrustworthy"] = "NotPotentiallyTrustworthy";
    FederatedAuthUserInfoRequestIssueReason2["NoAPIPermission"] = "NoApiPermission";
    FederatedAuthUserInfoRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthUserInfoRequestIssueReason2["NoAccountSharingPermission"] = "NoAccountSharingPermission";
    FederatedAuthUserInfoRequestIssueReason2["InvalidConfigOrWellKnown"] = "InvalidConfigOrWellKnown";
    FederatedAuthUserInfoRequestIssueReason2["InvalidAccountsResponse"] = "InvalidAccountsResponse";
    FederatedAuthUserInfoRequestIssueReason2["NoReturningUserFromFetchedAccounts"] = "NoReturningUserFromFetchedAccounts";
  })(FederatedAuthUserInfoRequestIssueReason = Audits2.FederatedAuthUserInfoRequestIssueReason || (Audits2.FederatedAuthUserInfoRequestIssueReason = {}));
  let EmailVerificationRequestIssueReason;
  ((EmailVerificationRequestIssueReason2) => {
    EmailVerificationRequestIssueReason2["InvalidEmail"] = "InvalidEmail";
    EmailVerificationRequestIssueReason2["DnsFetchFailed"] = "DnsFetchFailed";
    EmailVerificationRequestIssueReason2["DnsInvalidRecord"] = "DnsInvalidRecord";
    EmailVerificationRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    EmailVerificationRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    EmailVerificationRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["WellKnownMissingIssuanceEndpoint"] = "WellKnownMissingIssuanceEndpoint";
    EmailVerificationRequestIssueReason2["WellKnownIssuanceEndpointCrossOrigin"] = "WellKnownIssuanceEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["WellKnownUnsupportedSigningAlgorithm"] = "WellKnownUnsupportedSigningAlgorithm";
    EmailVerificationRequestIssueReason2["TokenHttpNotFound"] = "TokenHttpNotFound";
    EmailVerificationRequestIssueReason2["TokenNoResponse"] = "TokenNoResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidResponse"] = "TokenInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidContentType"] = "TokenInvalidContentType";
    EmailVerificationRequestIssueReason2["TokenMalformedSdJwt"] = "TokenMalformedSdJwt";
    EmailVerificationRequestIssueReason2["TokenInvalidSdJwt"] = "TokenInvalidSdJwt";
    EmailVerificationRequestIssueReason2["KeyBindingSigningFailed"] = "KeyBindingSigningFailed";
    EmailVerificationRequestIssueReason2["RpOriginIsOpaque"] = "RpOriginIsOpaque";
    EmailVerificationRequestIssueReason2["WellKnownMissingAccountsEndpoint"] = "WellKnownMissingAccountsEndpoint";
    EmailVerificationRequestIssueReason2["UserLoggedOut"] = "UserLoggedOut";
    EmailVerificationRequestIssueReason2["WellKnownAccountsEndpointCrossOrigin"] = "WellKnownAccountsEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    EmailVerificationRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    EmailVerificationRequestIssueReason2["AccountsEmptyList"] = "AccountsEmptyList";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownHttpNotFound"] = "EmailVerificationWellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownNoResponse"] = "EmailVerificationWellKnownNoResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidResponse"] = "EmailVerificationWellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidContentType"] = "EmailVerificationWellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["JwksHttpNotFound"] = "JwksHttpNotFound";
    EmailVerificationRequestIssueReason2["JwksInvalidResponse"] = "JwksInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtUnsupportedHeaderAlg"] = "TokenVerificationSdJwtUnsupportedHeaderAlg";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidTyp"] = "TokenVerificationSdJwtInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIss"] = "TokenVerificationSdJwtMissingIss";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIat"] = "TokenVerificationSdJwtMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingCnf"] = "TokenVerificationSdJwtMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingEmail"] = "TokenVerificationSdJwtMissingEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuedAt"] = "TokenVerificationSdJwtInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuer"] = "TokenVerificationSdJwtInvalidIssuer";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtJwksMissingKeys"] = "TokenVerificationSdJwtJwksMissingKeys";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtSignatureFailed"] = "TokenVerificationSdJwtSignatureFailed";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmailVerified"] = "TokenVerificationSdJwtInvalidEmailVerified";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmail"] = "TokenVerificationSdJwtInvalidEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidHolderKey"] = "TokenVerificationSdJwtInvalidHolderKey";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidTyp"] = "TokenVerificationKbInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingAud"] = "TokenVerificationKbMissingAud";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingNonce"] = "TokenVerificationKbMissingNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingIat"] = "TokenVerificationKbMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingSdHash"] = "TokenVerificationKbMissingSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidIssuedAt"] = "TokenVerificationKbInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidAudience"] = "TokenVerificationKbInvalidAudience";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidNonce"] = "TokenVerificationKbInvalidNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidSdHash"] = "TokenVerificationKbInvalidSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingCnf"] = "TokenVerificationKbMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationKbSignatureFailed"] = "TokenVerificationKbSignatureFailed";
  })(EmailVerificationRequestIssueReason = Audits2.EmailVerificationRequestIssueReason || (Audits2.EmailVerificationRequestIssueReason = {}));
  let PartitioningBlobURLInfo;
  ((PartitioningBlobURLInfo2) => {
    PartitioningBlobURLInfo2["BlockedCrossPartitionFetching"] = "BlockedCrossPartitionFetching";
    PartitioningBlobURLInfo2["EnforceNoopenerForNavigation"] = "EnforceNoopenerForNavigation";
  })(PartitioningBlobURLInfo = Audits2.PartitioningBlobURLInfo || (Audits2.PartitioningBlobURLInfo = {}));
  let ElementAccessibilityIssueReason;
  ((ElementAccessibilityIssueReason2) => {
    ElementAccessibilityIssueReason2["DisallowedSelectChild"] = "DisallowedSelectChild";
    ElementAccessibilityIssueReason2["DisallowedOptGroupChild"] = "DisallowedOptGroupChild";
    ElementAccessibilityIssueReason2["NonPhrasingContentOptionChild"] = "NonPhrasingContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentOptionChild"] = "InteractiveContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentLegendChild"] = "InteractiveContentLegendChild";
    ElementAccessibilityIssueReason2["InteractiveContentSummaryDescendant"] = "InteractiveContentSummaryDescendant";
  })(ElementAccessibilityIssueReason = Audits2.ElementAccessibilityIssueReason || (Audits2.ElementAccessibilityIssueReason = {}));
  let StyleSheetLoadingIssueReason;
  ((StyleSheetLoadingIssueReason2) => {
    StyleSheetLoadingIssueReason2["LateImportRule"] = "LateImportRule";
    StyleSheetLoadingIssueReason2["RequestFailed"] = "RequestFailed";
  })(StyleSheetLoadingIssueReason = Audits2.StyleSheetLoadingIssueReason || (Audits2.StyleSheetLoadingIssueReason = {}));
  let PropertyRuleIssueReason;
  ((PropertyRuleIssueReason2) => {
    PropertyRuleIssueReason2["InvalidSyntax"] = "InvalidSyntax";
    PropertyRuleIssueReason2["InvalidInitialValue"] = "InvalidInitialValue";
    PropertyRuleIssueReason2["InvalidInherits"] = "InvalidInherits";
    PropertyRuleIssueReason2["InvalidName"] = "InvalidName";
  })(PropertyRuleIssueReason = Audits2.PropertyRuleIssueReason || (Audits2.PropertyRuleIssueReason = {}));
  let UserReidentificationIssueType;
  ((UserReidentificationIssueType2) => {
    UserReidentificationIssueType2["BlockedFrameNavigation"] = "BlockedFrameNavigation";
    UserReidentificationIssueType2["BlockedSubresource"] = "BlockedSubresource";
    UserReidentificationIssueType2["NoisedCanvasReadback"] = "NoisedCanvasReadback";
  })(UserReidentificationIssueType = Audits2.UserReidentificationIssueType || (Audits2.UserReidentificationIssueType = {}));
  let PermissionElementIssueType;
  ((PermissionElementIssueType2) => {
    PermissionElementIssueType2["InvalidType"] = "InvalidType";
    PermissionElementIssueType2["FencedFrameDisallowed"] = "FencedFrameDisallowed";
    PermissionElementIssueType2["CspFrameAncestorsMissing"] = "CspFrameAncestorsMissing";
    PermissionElementIssueType2["PermissionsPolicyBlocked"] = "PermissionsPolicyBlocked";
    PermissionElementIssueType2["PaddingRightUnsupported"] = "PaddingRightUnsupported";
    PermissionElementIssueType2["PaddingBottomUnsupported"] = "PaddingBottomUnsupported";
    PermissionElementIssueType2["InsetBoxShadowUnsupported"] = "InsetBoxShadowUnsupported";
    PermissionElementIssueType2["RequestInProgress"] = "RequestInProgress";
    PermissionElementIssueType2["UntrustedEvent"] = "UntrustedEvent";
    PermissionElementIssueType2["RegistrationFailed"] = "RegistrationFailed";
    PermissionElementIssueType2["TypeNotSupported"] = "TypeNotSupported";
    PermissionElementIssueType2["InvalidTypeActivation"] = "InvalidTypeActivation";
    PermissionElementIssueType2["SecurityChecksFailed"] = "SecurityChecksFailed";
    PermissionElementIssueType2["ActivationDisabled"] = "ActivationDisabled";
    PermissionElementIssueType2["GeolocationDeprecated"] = "GeolocationDeprecated";
    PermissionElementIssueType2["InvalidDisplayStyle"] = "InvalidDisplayStyle";
    PermissionElementIssueType2["NonOpaqueColor"] = "NonOpaqueColor";
    PermissionElementIssueType2["LowContrast"] = "LowContrast";
    PermissionElementIssueType2["FontSizeTooSmall"] = "FontSizeTooSmall";
    PermissionElementIssueType2["FontSizeTooLarge"] = "FontSizeTooLarge";
    PermissionElementIssueType2["InvalidSizeValue"] = "InvalidSizeValue";
    PermissionElementIssueType2["NonSecureContext"] = "NonSecureContext";
    PermissionElementIssueType2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
  })(PermissionElementIssueType = Audits2.PermissionElementIssueType || (Audits2.PermissionElementIssueType = {}));
  let InspectorIssueCode;
  ((InspectorIssueCode2) => {
    InspectorIssueCode2["CookieIssue"] = "CookieIssue";
    InspectorIssueCode2["MixedContentIssue"] = "MixedContentIssue";
    InspectorIssueCode2["BlockedByResponseIssue"] = "BlockedByResponseIssue";
    InspectorIssueCode2["HeavyAdIssue"] = "HeavyAdIssue";
    InspectorIssueCode2["ContentSecurityPolicyIssue"] = "ContentSecurityPolicyIssue";
    InspectorIssueCode2["SharedArrayBufferIssue"] = "SharedArrayBufferIssue";
    InspectorIssueCode2["CorsIssue"] = "CorsIssue";
    InspectorIssueCode2["QuirksModeIssue"] = "QuirksModeIssue";
    InspectorIssueCode2["PartitioningBlobURLIssue"] = "PartitioningBlobURLIssue";
    InspectorIssueCode2["NavigatorUserAgentIssue"] = "NavigatorUserAgentIssue";
    InspectorIssueCode2["GenericIssue"] = "GenericIssue";
    InspectorIssueCode2["DeprecationIssue"] = "DeprecationIssue";
    InspectorIssueCode2["ClientHintIssue"] = "ClientHintIssue";
    InspectorIssueCode2["FederatedAuthRequestIssue"] = "FederatedAuthRequestIssue";
    InspectorIssueCode2["BounceTrackingIssue"] = "BounceTrackingIssue";
    InspectorIssueCode2["CookieDeprecationMetadataIssue"] = "CookieDeprecationMetadataIssue";
    InspectorIssueCode2["StylesheetLoadingIssue"] = "StylesheetLoadingIssue";
    InspectorIssueCode2["FederatedAuthUserInfoRequestIssue"] = "FederatedAuthUserInfoRequestIssue";
    InspectorIssueCode2["PropertyRuleIssue"] = "PropertyRuleIssue";
    InspectorIssueCode2["SharedDictionaryIssue"] = "SharedDictionaryIssue";
    InspectorIssueCode2["ElementAccessibilityIssue"] = "ElementAccessibilityIssue";
    InspectorIssueCode2["SRIMessageSignatureIssue"] = "SRIMessageSignatureIssue";
    InspectorIssueCode2["UnencodedDigestIssue"] = "UnencodedDigestIssue";
    InspectorIssueCode2["ConnectionAllowlistIssue"] = "ConnectionAllowlistIssue";
    InspectorIssueCode2["UserReidentificationIssue"] = "UserReidentificationIssue";
    InspectorIssueCode2["PermissionElementIssue"] = "PermissionElementIssue";
    InspectorIssueCode2["PerformanceIssue"] = "PerformanceIssue";
    InspectorIssueCode2["SelectivePermissionsInterventionIssue"] = "SelectivePermissionsInterventionIssue";
    InspectorIssueCode2["EmailVerificationRequestIssue"] = "EmailVerificationRequestIssue";
    InspectorIssueCode2["LazyLoadImageIssue"] = "LazyLoadImageIssue";
  })(InspectorIssueCode = Audits2.InspectorIssueCode || (Audits2.InspectorIssueCode = {}));
  let GetEncodedResponseRequestEncoding;
  ((GetEncodedResponseRequestEncoding2) => {
    GetEncodedResponseRequestEncoding2["Webp"] = "webp";
    GetEncodedResponseRequestEncoding2["Jpeg"] = "jpeg";
    GetEncodedResponseRequestEncoding2["Png"] = "png";
  })(GetEncodedResponseRequestEncoding = Audits2.GetEncodedResponseRequestEncoding || (Audits2.GetEncodedResponseRequestEncoding = {}));
})(Audits || (Audits = {}));
var Autofill;
((Autofill2) => {
  let FillingStrategy;
  ((FillingStrategy2) => {
    FillingStrategy2["AutocompleteAttribute"] = "autocompleteAttribute";
    FillingStrategy2["AutofillInferred"] = "autofillInferred";
  })(FillingStrategy = Autofill2.FillingStrategy || (Autofill2.FillingStrategy = {}));
})(Autofill || (Autofill = {}));
var BackgroundService;
((BackgroundService2) => {
  let ServiceName;
  ((ServiceName2) => {
    ServiceName2["BackgroundFetch"] = "backgroundFetch";
    ServiceName2["BackgroundSync"] = "backgroundSync";
    ServiceName2["PushMessaging"] = "pushMessaging";
    ServiceName2["Notifications"] = "notifications";
    ServiceName2["PaymentHandler"] = "paymentHandler";
    ServiceName2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
  })(ServiceName = BackgroundService2.ServiceName || (BackgroundService2.ServiceName = {}));
})(BackgroundService || (BackgroundService = {}));
var BluetoothEmulation;
((BluetoothEmulation2) => {
  let CentralState;
  ((CentralState2) => {
    CentralState2["Absent"] = "absent";
    CentralState2["PoweredOff"] = "powered-off";
    CentralState2["PoweredOn"] = "powered-on";
  })(CentralState = BluetoothEmulation2.CentralState || (BluetoothEmulation2.CentralState = {}));
  let GATTOperationType;
  ((GATTOperationType2) => {
    GATTOperationType2["Connection"] = "connection";
    GATTOperationType2["Discovery"] = "discovery";
  })(GATTOperationType = BluetoothEmulation2.GATTOperationType || (BluetoothEmulation2.GATTOperationType = {}));
  let CharacteristicWriteType;
  ((CharacteristicWriteType2) => {
    CharacteristicWriteType2["WriteDefaultDeprecated"] = "write-default-deprecated";
    CharacteristicWriteType2["WriteWithResponse"] = "write-with-response";
    CharacteristicWriteType2["WriteWithoutResponse"] = "write-without-response";
  })(CharacteristicWriteType = BluetoothEmulation2.CharacteristicWriteType || (BluetoothEmulation2.CharacteristicWriteType = {}));
  let CharacteristicOperationType;
  ((CharacteristicOperationType2) => {
    CharacteristicOperationType2["Read"] = "read";
    CharacteristicOperationType2["Write"] = "write";
    CharacteristicOperationType2["SubscribeToNotifications"] = "subscribe-to-notifications";
    CharacteristicOperationType2["UnsubscribeFromNotifications"] = "unsubscribe-from-notifications";
  })(CharacteristicOperationType = BluetoothEmulation2.CharacteristicOperationType || (BluetoothEmulation2.CharacteristicOperationType = {}));
  let DescriptorOperationType;
  ((DescriptorOperationType2) => {
    DescriptorOperationType2["Read"] = "read";
    DescriptorOperationType2["Write"] = "write";
  })(DescriptorOperationType = BluetoothEmulation2.DescriptorOperationType || (BluetoothEmulation2.DescriptorOperationType = {}));
})(BluetoothEmulation || (BluetoothEmulation = {}));
var Browser;
((Browser2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Browser2.WindowState || (Browser2.WindowState = {}));
  let PermissionType;
  ((PermissionType2) => {
    PermissionType2["Ar"] = "ar";
    PermissionType2["AudioCapture"] = "audioCapture";
    PermissionType2["AutomaticFullscreen"] = "automaticFullscreen";
    PermissionType2["BackgroundFetch"] = "backgroundFetch";
    PermissionType2["BackgroundSync"] = "backgroundSync";
    PermissionType2["CameraPanTiltZoom"] = "cameraPanTiltZoom";
    PermissionType2["CapturedSurfaceControl"] = "capturedSurfaceControl";
    PermissionType2["ClipboardReadWrite"] = "clipboardReadWrite";
    PermissionType2["ClipboardSanitizedWrite"] = "clipboardSanitizedWrite";
    PermissionType2["DisplayCapture"] = "displayCapture";
    PermissionType2["DurableStorage"] = "durableStorage";
    PermissionType2["Geolocation"] = "geolocation";
    PermissionType2["HandTracking"] = "handTracking";
    PermissionType2["IdleDetection"] = "idleDetection";
    PermissionType2["KeyboardLock"] = "keyboardLock";
    PermissionType2["LocalFonts"] = "localFonts";
    PermissionType2["LocalNetwork"] = "localNetwork";
    PermissionType2["LocalNetworkAccess"] = "localNetworkAccess";
    PermissionType2["LoopbackNetwork"] = "loopbackNetwork";
    PermissionType2["Midi"] = "midi";
    PermissionType2["MidiSysex"] = "midiSysex";
    PermissionType2["Nfc"] = "nfc";
    PermissionType2["Notifications"] = "notifications";
    PermissionType2["PaymentHandler"] = "paymentHandler";
    PermissionType2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
    PermissionType2["PointerLock"] = "pointerLock";
    PermissionType2["ProtectedMediaIdentifier"] = "protectedMediaIdentifier";
    PermissionType2["Sensors"] = "sensors";
    PermissionType2["SmartCard"] = "smartCard";
    PermissionType2["SpeakerSelection"] = "speakerSelection";
    PermissionType2["StorageAccess"] = "storageAccess";
    PermissionType2["TopLevelStorageAccess"] = "topLevelStorageAccess";
    PermissionType2["VideoCapture"] = "videoCapture";
    PermissionType2["Vr"] = "vr";
    PermissionType2["WakeLockScreen"] = "wakeLockScreen";
    PermissionType2["WakeLockSystem"] = "wakeLockSystem";
    PermissionType2["WebAppInstallation"] = "webAppInstallation";
    PermissionType2["WebPrinting"] = "webPrinting";
    PermissionType2["WindowManagement"] = "windowManagement";
  })(PermissionType = Browser2.PermissionType || (Browser2.PermissionType = {}));
  let PermissionSetting;
  ((PermissionSetting2) => {
    PermissionSetting2["Granted"] = "granted";
    PermissionSetting2["Denied"] = "denied";
    PermissionSetting2["Prompt"] = "prompt";
  })(PermissionSetting = Browser2.PermissionSetting || (Browser2.PermissionSetting = {}));
  let BrowserCommandId;
  ((BrowserCommandId2) => {
    BrowserCommandId2["OpenTabSearch"] = "openTabSearch";
    BrowserCommandId2["CloseTabSearch"] = "closeTabSearch";
    BrowserCommandId2["OpenGlic"] = "openGlic";
  })(BrowserCommandId = Browser2.BrowserCommandId || (Browser2.BrowserCommandId = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["AllowAndName"] = "allowAndName";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Browser2.SetDownloadBehaviorRequestBehavior || (Browser2.SetDownloadBehaviorRequestBehavior = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Browser2.DownloadProgressEventState || (Browser2.DownloadProgressEventState = {}));
})(Browser || (Browser = {}));
var CSS;
((CSS2) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS2.StyleSheetOrigin || (CSS2.StyleSheetOrigin = {}));
  let CSSRuleType;
  ((CSSRuleType2) => {
    CSSRuleType2["MediaRule"] = "MediaRule";
    CSSRuleType2["SupportsRule"] = "SupportsRule";
    CSSRuleType2["ContainerRule"] = "ContainerRule";
    CSSRuleType2["LayerRule"] = "LayerRule";
    CSSRuleType2["ScopeRule"] = "ScopeRule";
    CSSRuleType2["StyleRule"] = "StyleRule";
    CSSRuleType2["StartingStyleRule"] = "StartingStyleRule";
    CSSRuleType2["NavigationRule"] = "NavigationRule";
  })(CSSRuleType = CSS2.CSSRuleType || (CSS2.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS2.CSSMediaSource || (CSS2.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS2.CSSAtRuleType || (CSS2.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS2.CSSAtRuleSubsection || (CSS2.CSSAtRuleSubsection = {}));
})(CSS || (CSS = {}));
var CacheStorage;
((CacheStorage2) => {
  let CachedResponseType;
  ((CachedResponseType2) => {
    CachedResponseType2["Basic"] = "basic";
    CachedResponseType2["Cors"] = "cors";
    CachedResponseType2["Default"] = "default";
    CachedResponseType2["Error"] = "error";
    CachedResponseType2["OpaqueResponse"] = "opaqueResponse";
    CachedResponseType2["OpaqueRedirect"] = "opaqueRedirect";
  })(CachedResponseType = CacheStorage2.CachedResponseType || (CacheStorage2.CachedResponseType = {}));
})(CacheStorage || (CacheStorage = {}));
var DOM;
((DOM2) => {
  let PseudoType;
  ((PseudoType2) => {
    PseudoType2["FirstLine"] = "first-line";
    PseudoType2["FirstLetter"] = "first-letter";
    PseudoType2["Checkmark"] = "checkmark";
    PseudoType2["Before"] = "before";
    PseudoType2["After"] = "after";
    PseudoType2["ExpandIcon"] = "expand-icon";
    PseudoType2["PickerIcon"] = "picker-icon";
    PseudoType2["InterestButton"] = "interest-button";
    PseudoType2["Marker"] = "marker";
    PseudoType2["Backdrop"] = "backdrop";
    PseudoType2["Column"] = "column";
    PseudoType2["Selection"] = "selection";
    PseudoType2["SearchText"] = "search-text";
    PseudoType2["TargetText"] = "target-text";
    PseudoType2["SpellingError"] = "spelling-error";
    PseudoType2["GrammarError"] = "grammar-error";
    PseudoType2["Highlight"] = "highlight";
    PseudoType2["FirstLineInherited"] = "first-line-inherited";
    PseudoType2["ScrollMarker"] = "scroll-marker";
    PseudoType2["ScrollMarkerGroup"] = "scroll-marker-group";
    PseudoType2["ScrollButton"] = "scroll-button";
    PseudoType2["Scrollbar"] = "scrollbar";
    PseudoType2["ScrollbarThumb"] = "scrollbar-thumb";
    PseudoType2["ScrollbarButton"] = "scrollbar-button";
    PseudoType2["ScrollbarTrack"] = "scrollbar-track";
    PseudoType2["ScrollbarTrackPiece"] = "scrollbar-track-piece";
    PseudoType2["ScrollbarCorner"] = "scrollbar-corner";
    PseudoType2["Resizer"] = "resizer";
    PseudoType2["InputListButton"] = "input-list-button";
    PseudoType2["ViewTransition"] = "view-transition";
    PseudoType2["ViewTransitionGroup"] = "view-transition-group";
    PseudoType2["ViewTransitionImagePair"] = "view-transition-image-pair";
    PseudoType2["ViewTransitionGroupChildren"] = "view-transition-group-children";
    PseudoType2["ViewTransitionOld"] = "view-transition-old";
    PseudoType2["ViewTransitionNew"] = "view-transition-new";
    PseudoType2["Placeholder"] = "placeholder";
    PseudoType2["FileSelectorButton"] = "file-selector-button";
    PseudoType2["DetailsContent"] = "details-content";
    PseudoType2["Picker"] = "picker";
    PseudoType2["SelectListbox"] = "select-listbox";
    PseudoType2["PermissionIcon"] = "permission-icon";
    PseudoType2["OverscrollAreaParent"] = "overscroll-area-parent";
    PseudoType2["OverscrollBackdrop"] = "overscroll-backdrop";
    PseudoType2["Skeleton"] = "skeleton";
  })(PseudoType = DOM2.PseudoType || (DOM2.PseudoType = {}));
  let ShadowRootType;
  ((ShadowRootType2) => {
    ShadowRootType2["UserAgent"] = "user-agent";
    ShadowRootType2["Open"] = "open";
    ShadowRootType2["Closed"] = "closed";
  })(ShadowRootType = DOM2.ShadowRootType || (DOM2.ShadowRootType = {}));
  let CompatibilityMode;
  ((CompatibilityMode2) => {
    CompatibilityMode2["QuirksMode"] = "QuirksMode";
    CompatibilityMode2["LimitedQuirksMode"] = "LimitedQuirksMode";
    CompatibilityMode2["NoQuirksMode"] = "NoQuirksMode";
  })(CompatibilityMode = DOM2.CompatibilityMode || (DOM2.CompatibilityMode = {}));
  let PhysicalAxes;
  ((PhysicalAxes2) => {
    PhysicalAxes2["Horizontal"] = "Horizontal";
    PhysicalAxes2["Vertical"] = "Vertical";
    PhysicalAxes2["Both"] = "Both";
  })(PhysicalAxes = DOM2.PhysicalAxes || (DOM2.PhysicalAxes = {}));
  let LogicalAxes;
  ((LogicalAxes2) => {
    LogicalAxes2["Inline"] = "Inline";
    LogicalAxes2["Block"] = "Block";
    LogicalAxes2["Both"] = "Both";
  })(LogicalAxes = DOM2.LogicalAxes || (DOM2.LogicalAxes = {}));
  let ScrollOrientation;
  ((ScrollOrientation2) => {
    ScrollOrientation2["Horizontal"] = "horizontal";
    ScrollOrientation2["Vertical"] = "vertical";
  })(ScrollOrientation = DOM2.ScrollOrientation || (DOM2.ScrollOrientation = {}));
  let EnableRequestIncludeWhitespace;
  ((EnableRequestIncludeWhitespace2) => {
    EnableRequestIncludeWhitespace2["None"] = "none";
    EnableRequestIncludeWhitespace2["All"] = "all";
  })(EnableRequestIncludeWhitespace = DOM2.EnableRequestIncludeWhitespace || (DOM2.EnableRequestIncludeWhitespace = {}));
  let GetElementByRelationRequestRelation;
  ((GetElementByRelationRequestRelation2) => {
    GetElementByRelationRequestRelation2["PopoverTarget"] = "PopoverTarget";
    GetElementByRelationRequestRelation2["InterestTarget"] = "InterestTarget";
    GetElementByRelationRequestRelation2["CommandFor"] = "CommandFor";
  })(GetElementByRelationRequestRelation = DOM2.GetElementByRelationRequestRelation || (DOM2.GetElementByRelationRequestRelation = {}));
})(DOM || (DOM = {}));
var DOMDebugger;
((DOMDebugger2) => {
  let DOMBreakpointType;
  ((DOMBreakpointType2) => {
    DOMBreakpointType2["SubtreeModified"] = "subtree-modified";
    DOMBreakpointType2["AttributeModified"] = "attribute-modified";
    DOMBreakpointType2["NodeRemoved"] = "node-removed";
  })(DOMBreakpointType = DOMDebugger2.DOMBreakpointType || (DOMDebugger2.DOMBreakpointType = {}));
  let CSPViolationType;
  ((CSPViolationType2) => {
    CSPViolationType2["TrustedtypeSinkViolation"] = "trustedtype-sink-violation";
    CSPViolationType2["TrustedtypePolicyViolation"] = "trustedtype-policy-violation";
  })(CSPViolationType = DOMDebugger2.CSPViolationType || (DOMDebugger2.CSPViolationType = {}));
})(DOMDebugger || (DOMDebugger = {}));
var DigitalCredentials;
((DigitalCredentials2) => {
  let VirtualWalletAction;
  ((VirtualWalletAction2) => {
    VirtualWalletAction2["Respond"] = "respond";
    VirtualWalletAction2["Decline"] = "decline";
    VirtualWalletAction2["Wait"] = "wait";
    VirtualWalletAction2["Clear"] = "clear";
  })(VirtualWalletAction = DigitalCredentials2.VirtualWalletAction || (DigitalCredentials2.VirtualWalletAction = {}));
})(DigitalCredentials || (DigitalCredentials = {}));
var Emulation;
((Emulation2) => {
  let ScreenOrientationType;
  ((ScreenOrientationType2) => {
    ScreenOrientationType2["PortraitPrimary"] = "portraitPrimary";
    ScreenOrientationType2["PortraitSecondary"] = "portraitSecondary";
    ScreenOrientationType2["LandscapePrimary"] = "landscapePrimary";
    ScreenOrientationType2["LandscapeSecondary"] = "landscapeSecondary";
  })(ScreenOrientationType = Emulation2.ScreenOrientationType || (Emulation2.ScreenOrientationType = {}));
  let DisplayFeatureOrientation;
  ((DisplayFeatureOrientation2) => {
    DisplayFeatureOrientation2["Vertical"] = "vertical";
    DisplayFeatureOrientation2["Horizontal"] = "horizontal";
  })(DisplayFeatureOrientation = Emulation2.DisplayFeatureOrientation || (Emulation2.DisplayFeatureOrientation = {}));
  let DevicePostureType;
  ((DevicePostureType2) => {
    DevicePostureType2["Continuous"] = "continuous";
    DevicePostureType2["Folded"] = "folded";
  })(DevicePostureType = Emulation2.DevicePostureType || (Emulation2.DevicePostureType = {}));
  let VirtualTimePolicy;
  ((VirtualTimePolicy2) => {
    VirtualTimePolicy2["Advance"] = "advance";
    VirtualTimePolicy2["Pause"] = "pause";
    VirtualTimePolicy2["PauseIfNetworkFetchesPending"] = "pauseIfNetworkFetchesPending";
  })(VirtualTimePolicy = Emulation2.VirtualTimePolicy || (Emulation2.VirtualTimePolicy = {}));
  let SensorType;
  ((SensorType2) => {
    SensorType2["AbsoluteOrientation"] = "absolute-orientation";
    SensorType2["Accelerometer"] = "accelerometer";
    SensorType2["AmbientLight"] = "ambient-light";
    SensorType2["Gravity"] = "gravity";
    SensorType2["Gyroscope"] = "gyroscope";
    SensorType2["LinearAcceleration"] = "linear-acceleration";
    SensorType2["Magnetometer"] = "magnetometer";
    SensorType2["RelativeOrientation"] = "relative-orientation";
  })(SensorType = Emulation2.SensorType || (Emulation2.SensorType = {}));
  let PressureSource;
  ((PressureSource2) => {
    PressureSource2["Cpu"] = "cpu";
  })(PressureSource = Emulation2.PressureSource || (Emulation2.PressureSource = {}));
  let PressureState;
  ((PressureState2) => {
    PressureState2["Nominal"] = "nominal";
    PressureState2["Fair"] = "fair";
    PressureState2["Serious"] = "serious";
    PressureState2["Critical"] = "critical";
  })(PressureState = Emulation2.PressureState || (Emulation2.PressureState = {}));
  let DisabledImageType;
  ((DisabledImageType2) => {
    DisabledImageType2["Avif"] = "avif";
    DisabledImageType2["Jxl"] = "jxl";
    DisabledImageType2["Webp"] = "webp";
  })(DisabledImageType = Emulation2.DisabledImageType || (Emulation2.DisabledImageType = {}));
  let SetDeviceMetricsOverrideRequestScrollbarType;
  ((SetDeviceMetricsOverrideRequestScrollbarType2) => {
    SetDeviceMetricsOverrideRequestScrollbarType2["Overlay"] = "overlay";
    SetDeviceMetricsOverrideRequestScrollbarType2["Default"] = "default";
  })(SetDeviceMetricsOverrideRequestScrollbarType = Emulation2.SetDeviceMetricsOverrideRequestScrollbarType || (Emulation2.SetDeviceMetricsOverrideRequestScrollbarType = {}));
  let SetEmitTouchEventsForMouseRequestConfiguration;
  ((SetEmitTouchEventsForMouseRequestConfiguration2) => {
    SetEmitTouchEventsForMouseRequestConfiguration2["Mobile"] = "mobile";
    SetEmitTouchEventsForMouseRequestConfiguration2["Desktop"] = "desktop";
  })(SetEmitTouchEventsForMouseRequestConfiguration = Emulation2.SetEmitTouchEventsForMouseRequestConfiguration || (Emulation2.SetEmitTouchEventsForMouseRequestConfiguration = {}));
  let SetEmulatedVisionDeficiencyRequestType;
  ((SetEmulatedVisionDeficiencyRequestType2) => {
    SetEmulatedVisionDeficiencyRequestType2["None"] = "none";
    SetEmulatedVisionDeficiencyRequestType2["BlurredVision"] = "blurredVision";
    SetEmulatedVisionDeficiencyRequestType2["ReducedContrast"] = "reducedContrast";
    SetEmulatedVisionDeficiencyRequestType2["Achromatopsia"] = "achromatopsia";
    SetEmulatedVisionDeficiencyRequestType2["Deuteranopia"] = "deuteranopia";
    SetEmulatedVisionDeficiencyRequestType2["Protanopia"] = "protanopia";
    SetEmulatedVisionDeficiencyRequestType2["Tritanopia"] = "tritanopia";
  })(SetEmulatedVisionDeficiencyRequestType = Emulation2.SetEmulatedVisionDeficiencyRequestType || (Emulation2.SetEmulatedVisionDeficiencyRequestType = {}));
  let SetCPUPerformanceOverrideRequestPerformanceTier;
  ((SetCPUPerformanceOverrideRequestPerformanceTier2) => {
    SetCPUPerformanceOverrideRequestPerformanceTier2["Unknown"] = "unknown";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Low"] = "low";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Mid"] = "mid";
    SetCPUPerformanceOverrideRequestPerformanceTier2["High"] = "high";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Ultra"] = "ultra";
  })(SetCPUPerformanceOverrideRequestPerformanceTier = Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier || (Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier = {}));
})(Emulation || (Emulation = {}));
var Extensions;
((Extensions4) => {
  let StorageArea;
  ((StorageArea2) => {
    StorageArea2["Session"] = "session";
    StorageArea2["Local"] = "local";
    StorageArea2["Sync"] = "sync";
    StorageArea2["Managed"] = "managed";
  })(StorageArea = Extensions4.StorageArea || (Extensions4.StorageArea = {}));
})(Extensions || (Extensions = {}));
var FedCm;
((FedCm2) => {
  let LoginState;
  ((LoginState2) => {
    LoginState2["SignIn"] = "SignIn";
    LoginState2["SignUp"] = "SignUp";
  })(LoginState = FedCm2.LoginState || (FedCm2.LoginState = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["AccountChooser"] = "AccountChooser";
    DialogType2["AutoReauthn"] = "AutoReauthn";
    DialogType2["ConfirmIdpLogin"] = "ConfirmIdpLogin";
    DialogType2["Error"] = "Error";
  })(DialogType = FedCm2.DialogType || (FedCm2.DialogType = {}));
  let DialogButton;
  ((DialogButton2) => {
    DialogButton2["ConfirmIdpLoginContinue"] = "ConfirmIdpLoginContinue";
    DialogButton2["ErrorGotIt"] = "ErrorGotIt";
    DialogButton2["ErrorMoreDetails"] = "ErrorMoreDetails";
  })(DialogButton = FedCm2.DialogButton || (FedCm2.DialogButton = {}));
  let AccountUrlType;
  ((AccountUrlType2) => {
    AccountUrlType2["TermsOfService"] = "TermsOfService";
    AccountUrlType2["PrivacyPolicy"] = "PrivacyPolicy";
  })(AccountUrlType = FedCm2.AccountUrlType || (FedCm2.AccountUrlType = {}));
})(FedCm || (FedCm = {}));
var Fetch;
((Fetch2) => {
  let RequestStage;
  ((RequestStage2) => {
    RequestStage2["Request"] = "Request";
    RequestStage2["Response"] = "Response";
  })(RequestStage = Fetch2.RequestStage || (Fetch2.RequestStage = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Fetch2.AuthChallengeSource || (Fetch2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Fetch2.AuthChallengeResponseResponse || (Fetch2.AuthChallengeResponseResponse = {}));
})(Fetch || (Fetch = {}));
var HeadlessExperimental;
((HeadlessExperimental2) => {
  let ScreenshotParamsFormat;
  ((ScreenshotParamsFormat2) => {
    ScreenshotParamsFormat2["Jpeg"] = "jpeg";
    ScreenshotParamsFormat2["Png"] = "png";
    ScreenshotParamsFormat2["Webp"] = "webp";
  })(ScreenshotParamsFormat = HeadlessExperimental2.ScreenshotParamsFormat || (HeadlessExperimental2.ScreenshotParamsFormat = {}));
})(HeadlessExperimental || (HeadlessExperimental = {}));
var IndexedDB;
((IndexedDB2) => {
  let KeyType;
  ((KeyType2) => {
    KeyType2["Number"] = "number";
    KeyType2["String"] = "string";
    KeyType2["Date"] = "date";
    KeyType2["Array"] = "array";
  })(KeyType = IndexedDB2.KeyType || (IndexedDB2.KeyType = {}));
  let KeyPathType;
  ((KeyPathType2) => {
    KeyPathType2["Null"] = "null";
    KeyPathType2["String"] = "string";
    KeyPathType2["Array"] = "array";
  })(KeyPathType = IndexedDB2.KeyPathType || (IndexedDB2.KeyPathType = {}));
})(IndexedDB || (IndexedDB = {}));
var Input;
((Input2) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input2.GestureSourceType || (Input2.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input2.MouseButton || (Input2.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input2.DispatchDragEventRequestType || (Input2.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input2.DispatchKeyEventRequestType || (Input2.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input2.DispatchMouseEventRequestType || (Input2.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input2.DispatchMouseEventRequestPointerType || (Input2.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input2.DispatchTouchEventRequestType || (Input2.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input2.EmulateTouchFromMouseEventRequestType || (Input2.EmulateTouchFromMouseEventRequestType = {}));
})(Input || (Input = {}));
var LayerTree;
((LayerTree2) => {
  let ScrollRectType;
  ((ScrollRectType2) => {
    ScrollRectType2["RepaintsOnScroll"] = "RepaintsOnScroll";
    ScrollRectType2["TouchEventHandler"] = "TouchEventHandler";
    ScrollRectType2["WheelEventHandler"] = "WheelEventHandler";
  })(ScrollRectType = LayerTree2.ScrollRectType || (LayerTree2.ScrollRectType = {}));
})(LayerTree || (LayerTree = {}));
var Log;
((Log2) => {
  let LogEntrySource;
  ((LogEntrySource2) => {
    LogEntrySource2["XML"] = "xml";
    LogEntrySource2["Javascript"] = "javascript";
    LogEntrySource2["Network"] = "network";
    LogEntrySource2["Storage"] = "storage";
    LogEntrySource2["Appcache"] = "appcache";
    LogEntrySource2["Rendering"] = "rendering";
    LogEntrySource2["Security"] = "security";
    LogEntrySource2["Deprecation"] = "deprecation";
    LogEntrySource2["Worker"] = "worker";
    LogEntrySource2["Violation"] = "violation";
    LogEntrySource2["Intervention"] = "intervention";
    LogEntrySource2["Recommendation"] = "recommendation";
    LogEntrySource2["Other"] = "other";
  })(LogEntrySource = Log2.LogEntrySource || (Log2.LogEntrySource = {}));
  let LogEntryLevel;
  ((LogEntryLevel2) => {
    LogEntryLevel2["Verbose"] = "verbose";
    LogEntryLevel2["Info"] = "info";
    LogEntryLevel2["Warning"] = "warning";
    LogEntryLevel2["Error"] = "error";
  })(LogEntryLevel = Log2.LogEntryLevel || (Log2.LogEntryLevel = {}));
  let LogEntryCategory;
  ((LogEntryCategory2) => {
    LogEntryCategory2["Cors"] = "cors";
  })(LogEntryCategory = Log2.LogEntryCategory || (Log2.LogEntryCategory = {}));
  let ViolationSettingName;
  ((ViolationSettingName2) => {
    ViolationSettingName2["LongTask"] = "longTask";
    ViolationSettingName2["LongLayout"] = "longLayout";
    ViolationSettingName2["BlockedEvent"] = "blockedEvent";
    ViolationSettingName2["BlockedParser"] = "blockedParser";
    ViolationSettingName2["DiscouragedAPIUse"] = "discouragedAPIUse";
    ViolationSettingName2["Handler"] = "handler";
    ViolationSettingName2["RecurringHandler"] = "recurringHandler";
  })(ViolationSettingName = Log2.ViolationSettingName || (Log2.ViolationSettingName = {}));
})(Log || (Log = {}));
var Media;
((Media2) => {
  let PlayerMessageLevel;
  ((PlayerMessageLevel2) => {
    PlayerMessageLevel2["Error"] = "error";
    PlayerMessageLevel2["Warning"] = "warning";
    PlayerMessageLevel2["Info"] = "info";
    PlayerMessageLevel2["Debug"] = "debug";
  })(PlayerMessageLevel = Media2.PlayerMessageLevel || (Media2.PlayerMessageLevel = {}));
})(Media || (Media = {}));
var Memory;
((Memory2) => {
  let PressureLevel;
  ((PressureLevel2) => {
    PressureLevel2["Moderate"] = "moderate";
    PressureLevel2["Critical"] = "critical";
  })(PressureLevel = Memory2.PressureLevel || (Memory2.PressureLevel = {}));
})(Memory || (Memory = {}));
var Network;
((Network2) => {
  let ResourceType;
  ((ResourceType2) => {
    ResourceType2["Document"] = "Document";
    ResourceType2["Stylesheet"] = "Stylesheet";
    ResourceType2["Image"] = "Image";
    ResourceType2["Media"] = "Media";
    ResourceType2["Font"] = "Font";
    ResourceType2["Script"] = "Script";
    ResourceType2["TextTrack"] = "TextTrack";
    ResourceType2["XHR"] = "XHR";
    ResourceType2["Fetch"] = "Fetch";
    ResourceType2["Prefetch"] = "Prefetch";
    ResourceType2["EventSource"] = "EventSource";
    ResourceType2["WebSocket"] = "WebSocket";
    ResourceType2["Manifest"] = "Manifest";
    ResourceType2["SignedExchange"] = "SignedExchange";
    ResourceType2["Ping"] = "Ping";
    ResourceType2["CSPViolationReport"] = "CSPViolationReport";
    ResourceType2["Preflight"] = "Preflight";
    ResourceType2["FedCM"] = "FedCM";
    ResourceType2["Other"] = "Other";
  })(ResourceType = Network2.ResourceType || (Network2.ResourceType = {}));
  let ErrorReason;
  ((ErrorReason2) => {
    ErrorReason2["Failed"] = "Failed";
    ErrorReason2["Aborted"] = "Aborted";
    ErrorReason2["TimedOut"] = "TimedOut";
    ErrorReason2["AccessDenied"] = "AccessDenied";
    ErrorReason2["ConnectionClosed"] = "ConnectionClosed";
    ErrorReason2["ConnectionReset"] = "ConnectionReset";
    ErrorReason2["ConnectionRefused"] = "ConnectionRefused";
    ErrorReason2["ConnectionAborted"] = "ConnectionAborted";
    ErrorReason2["ConnectionFailed"] = "ConnectionFailed";
    ErrorReason2["NameNotResolved"] = "NameNotResolved";
    ErrorReason2["InternetDisconnected"] = "InternetDisconnected";
    ErrorReason2["AddressUnreachable"] = "AddressUnreachable";
    ErrorReason2["BlockedByClient"] = "BlockedByClient";
    ErrorReason2["BlockedByResponse"] = "BlockedByResponse";
  })(ErrorReason = Network2.ErrorReason || (Network2.ErrorReason = {}));
  let ConnectionType;
  ((ConnectionType2) => {
    ConnectionType2["None"] = "none";
    ConnectionType2["Cellular2g"] = "cellular2g";
    ConnectionType2["Cellular3g"] = "cellular3g";
    ConnectionType2["Cellular4g"] = "cellular4g";
    ConnectionType2["Bluetooth"] = "bluetooth";
    ConnectionType2["Ethernet"] = "ethernet";
    ConnectionType2["Wifi"] = "wifi";
    ConnectionType2["Wimax"] = "wimax";
    ConnectionType2["Other"] = "other";
  })(ConnectionType = Network2.ConnectionType || (Network2.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network2.CookieSameSite || (Network2.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network2.CookiePriority || (Network2.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network2.CookieSourceScheme || (Network2.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network2.ResourcePriority || (Network2.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network2.RenderBlockingBehavior || (Network2.RenderBlockingBehavior = {}));
  let RequestReferrerPolicy;
  ((RequestReferrerPolicy2) => {
    RequestReferrerPolicy2["UnsafeUrl"] = "unsafe-url";
    RequestReferrerPolicy2["NoReferrerWhenDowngrade"] = "no-referrer-when-downgrade";
    RequestReferrerPolicy2["NoReferrer"] = "no-referrer";
    RequestReferrerPolicy2["Origin"] = "origin";
    RequestReferrerPolicy2["OriginWhenCrossOrigin"] = "origin-when-cross-origin";
    RequestReferrerPolicy2["SameOrigin"] = "same-origin";
    RequestReferrerPolicy2["StrictOrigin"] = "strict-origin";
    RequestReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strict-origin-when-cross-origin";
  })(RequestReferrerPolicy = Network2.RequestReferrerPolicy || (Network2.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network2.CertificateTransparencyCompliance || (Network2.CertificateTransparencyCompliance = {}));
  let BlockedReason;
  ((BlockedReason2) => {
    BlockedReason2["Other"] = "other";
    BlockedReason2["Csp"] = "csp";
    BlockedReason2["MixedContent"] = "mixed-content";
    BlockedReason2["Origin"] = "origin";
    BlockedReason2["Inspector"] = "inspector";
    BlockedReason2["Integrity"] = "integrity";
    BlockedReason2["SubresourceFilter"] = "subresource-filter";
    BlockedReason2["ContentType"] = "content-type";
    BlockedReason2["CoepFrameResourceNeedsCoepHeader"] = "coep-frame-resource-needs-coep-header";
    BlockedReason2["CoopSandboxedIframeCannotNavigateToCoopPage"] = "coop-sandboxed-iframe-cannot-navigate-to-coop-page";
    BlockedReason2["CorpNotSameOrigin"] = "corp-not-same-origin";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-dip";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep-and-dip";
    BlockedReason2["CorpNotSameSite"] = "corp-not-same-site";
    BlockedReason2["SriMessageSignatureMismatch"] = "sri-message-signature-mismatch";
  })(BlockedReason = Network2.BlockedReason || (Network2.BlockedReason = {}));
  let CorsError;
  ((CorsError2) => {
    CorsError2["DisallowedByMode"] = "DisallowedByMode";
    CorsError2["InvalidResponse"] = "InvalidResponse";
    CorsError2["WildcardOriginNotAllowed"] = "WildcardOriginNotAllowed";
    CorsError2["MissingAllowOriginHeader"] = "MissingAllowOriginHeader";
    CorsError2["MultipleAllowOriginValues"] = "MultipleAllowOriginValues";
    CorsError2["InvalidAllowOriginValue"] = "InvalidAllowOriginValue";
    CorsError2["AllowOriginMismatch"] = "AllowOriginMismatch";
    CorsError2["InvalidAllowCredentials"] = "InvalidAllowCredentials";
    CorsError2["CorsDisabledScheme"] = "CorsDisabledScheme";
    CorsError2["PreflightInvalidStatus"] = "PreflightInvalidStatus";
    CorsError2["PreflightDisallowedRedirect"] = "PreflightDisallowedRedirect";
    CorsError2["PreflightWildcardOriginNotAllowed"] = "PreflightWildcardOriginNotAllowed";
    CorsError2["PreflightMissingAllowOriginHeader"] = "PreflightMissingAllowOriginHeader";
    CorsError2["PreflightMultipleAllowOriginValues"] = "PreflightMultipleAllowOriginValues";
    CorsError2["PreflightInvalidAllowOriginValue"] = "PreflightInvalidAllowOriginValue";
    CorsError2["PreflightAllowOriginMismatch"] = "PreflightAllowOriginMismatch";
    CorsError2["PreflightInvalidAllowCredentials"] = "PreflightInvalidAllowCredentials";
    CorsError2["PreflightMissingAllowExternal"] = "PreflightMissingAllowExternal";
    CorsError2["PreflightInvalidAllowExternal"] = "PreflightInvalidAllowExternal";
    CorsError2["InvalidAllowMethodsPreflightResponse"] = "InvalidAllowMethodsPreflightResponse";
    CorsError2["InvalidAllowHeadersPreflightResponse"] = "InvalidAllowHeadersPreflightResponse";
    CorsError2["MethodDisallowedByPreflightResponse"] = "MethodDisallowedByPreflightResponse";
    CorsError2["HeaderDisallowedByPreflightResponse"] = "HeaderDisallowedByPreflightResponse";
    CorsError2["RedirectContainsCredentials"] = "RedirectContainsCredentials";
    CorsError2["InsecureLocalNetwork"] = "InsecureLocalNetwork";
    CorsError2["InvalidLocalNetworkAccess"] = "InvalidLocalNetworkAccess";
    CorsError2["NoCorsRedirectModeNotFollow"] = "NoCorsRedirectModeNotFollow";
    CorsError2["LocalNetworkAccessPermissionDenied"] = "LocalNetworkAccessPermissionDenied";
  })(CorsError = Network2.CorsError || (Network2.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network2.ServiceWorkerResponseSource || (Network2.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network2.TrustTokenParamsRefreshPolicy || (Network2.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network2.TrustTokenOperationType || (Network2.TrustTokenOperationType = {}));
  let AlternateProtocolUsage;
  ((AlternateProtocolUsage2) => {
    AlternateProtocolUsage2["AlternativeJobWonWithoutRace"] = "alternativeJobWonWithoutRace";
    AlternateProtocolUsage2["AlternativeJobWonRace"] = "alternativeJobWonRace";
    AlternateProtocolUsage2["MainJobWonRace"] = "mainJobWonRace";
    AlternateProtocolUsage2["MappingMissing"] = "mappingMissing";
    AlternateProtocolUsage2["Broken"] = "broken";
    AlternateProtocolUsage2["DnsAlpnH3JobWonWithoutRace"] = "dnsAlpnH3JobWonWithoutRace";
    AlternateProtocolUsage2["DnsAlpnH3JobWonRace"] = "dnsAlpnH3JobWonRace";
    AlternateProtocolUsage2["UnspecifiedReason"] = "unspecifiedReason";
  })(AlternateProtocolUsage = Network2.AlternateProtocolUsage || (Network2.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network2.ServiceWorkerRouterSource || (Network2.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network2.InitiatorType || (Network2.InitiatorType = {}));
  let SetCookieBlockedReason;
  ((SetCookieBlockedReason2) => {
    SetCookieBlockedReason2["SecureOnly"] = "SecureOnly";
    SetCookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    SetCookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    SetCookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    SetCookieBlockedReason2["UserPreferences"] = "UserPreferences";
    SetCookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    SetCookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    SetCookieBlockedReason2["SyntaxError"] = "SyntaxError";
    SetCookieBlockedReason2["SchemeNotSupported"] = "SchemeNotSupported";
    SetCookieBlockedReason2["OverwriteSecure"] = "OverwriteSecure";
    SetCookieBlockedReason2["InvalidDomain"] = "InvalidDomain";
    SetCookieBlockedReason2["InvalidPrefix"] = "InvalidPrefix";
    SetCookieBlockedReason2["UnknownError"] = "UnknownError";
    SetCookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    SetCookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    SetCookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    SetCookieBlockedReason2["DisallowedCharacter"] = "DisallowedCharacter";
    SetCookieBlockedReason2["NoCookieContent"] = "NoCookieContent";
  })(SetCookieBlockedReason = Network2.SetCookieBlockedReason || (Network2.SetCookieBlockedReason = {}));
  let CookieBlockedReason;
  ((CookieBlockedReason2) => {
    CookieBlockedReason2["SecureOnly"] = "SecureOnly";
    CookieBlockedReason2["NotOnPath"] = "NotOnPath";
    CookieBlockedReason2["DomainMismatch"] = "DomainMismatch";
    CookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    CookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    CookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    CookieBlockedReason2["UserPreferences"] = "UserPreferences";
    CookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    CookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    CookieBlockedReason2["UnknownError"] = "UnknownError";
    CookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    CookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    CookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    CookieBlockedReason2["PortMismatch"] = "PortMismatch";
    CookieBlockedReason2["SchemeMismatch"] = "SchemeMismatch";
    CookieBlockedReason2["AnonymousContext"] = "AnonymousContext";
  })(CookieBlockedReason = Network2.CookieBlockedReason || (Network2.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network2.CookieExemptionReason || (Network2.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network2.AuthChallengeSource || (Network2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network2.AuthChallengeResponseResponse || (Network2.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network2.SignedExchangeErrorField || (Network2.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network2.DirectSocketDnsQueryType || (Network2.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network2.LocalNetworkAccessRequestPolicy || (Network2.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network2.IPAddressSpace || (Network2.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network2.CrossOriginOpenerPolicyValue || (Network2.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network2.CrossOriginEmbedderPolicyValue || (Network2.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network2.ContentSecurityPolicySource || (Network2.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network2.ReportStatus || (Network2.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network2.DeviceBoundSessionWithUsageUsage || (Network2.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network2.DeviceBoundSessionUrlRuleRuleType || (Network2.DeviceBoundSessionUrlRuleRuleType = {}));
  let DeviceBoundSessionFetchResult;
  ((DeviceBoundSessionFetchResult2) => {
    DeviceBoundSessionFetchResult2["Success"] = "Success";
    DeviceBoundSessionFetchResult2["SigningKeyGenerationError"] = "SigningKeyGenerationError";
    DeviceBoundSessionFetchResult2["AttestationKeyGenerationError"] = "AttestationKeyGenerationError";
    DeviceBoundSessionFetchResult2["SigningError"] = "SigningError";
    DeviceBoundSessionFetchResult2["TransientSigningError"] = "TransientSigningError";
    DeviceBoundSessionFetchResult2["ServerRequestedTermination"] = "ServerRequestedTermination";
    DeviceBoundSessionFetchResult2["InvalidSessionId"] = "InvalidSessionId";
    DeviceBoundSessionFetchResult2["InvalidChallenge"] = "InvalidChallenge";
    DeviceBoundSessionFetchResult2["TooManyChallenges"] = "TooManyChallenges";
    DeviceBoundSessionFetchResult2["InvalidFetcherUrl"] = "InvalidFetcherUrl";
    DeviceBoundSessionFetchResult2["InvalidRefreshUrl"] = "InvalidRefreshUrl";
    DeviceBoundSessionFetchResult2["TransientHttpError"] = "TransientHttpError";
    DeviceBoundSessionFetchResult2["ScopeOriginSameSiteMismatch"] = "ScopeOriginSameSiteMismatch";
    DeviceBoundSessionFetchResult2["RefreshUrlSameSiteMismatch"] = "RefreshUrlSameSiteMismatch";
    DeviceBoundSessionFetchResult2["MismatchedSessionId"] = "MismatchedSessionId";
    DeviceBoundSessionFetchResult2["MissingScope"] = "MissingScope";
    DeviceBoundSessionFetchResult2["NoCredentials"] = "NoCredentials";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownUnavailable"] = "SubdomainRegistrationWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationUnauthorized"] = "SubdomainRegistrationUnauthorized";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownMalformed"] = "SubdomainRegistrationWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownUnavailable"] = "SessionProviderWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownUnavailable"] = "RelyingPartyWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["FederatedKeyThumbprintMismatch"] = "FederatedKeyThumbprintMismatch";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionUrl"] = "InvalidFederatedSessionUrl";
    DeviceBoundSessionFetchResult2["InvalidFederatedKey"] = "InvalidFederatedKey";
    DeviceBoundSessionFetchResult2["TooManyRelyingOriginLabels"] = "TooManyRelyingOriginLabels";
    DeviceBoundSessionFetchResult2["BoundCookieSetForbidden"] = "BoundCookieSetForbidden";
    DeviceBoundSessionFetchResult2["NetError"] = "NetError";
    DeviceBoundSessionFetchResult2["ProxyError"] = "ProxyError";
    DeviceBoundSessionFetchResult2["EmptySessionConfig"] = "EmptySessionConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsConfig"] = "InvalidCredentialsConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsType"] = "InvalidCredentialsType";
    DeviceBoundSessionFetchResult2["InvalidCredentialsEmptyName"] = "InvalidCredentialsEmptyName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookie"] = "InvalidCredentialsCookie";
    DeviceBoundSessionFetchResult2["PersistentHttpError"] = "PersistentHttpError";
    DeviceBoundSessionFetchResult2["RegistrationAttemptedChallenge"] = "RegistrationAttemptedChallenge";
    DeviceBoundSessionFetchResult2["InvalidScopeOrigin"] = "InvalidScopeOrigin";
    DeviceBoundSessionFetchResult2["ScopeOriginContainsPath"] = "ScopeOriginContainsPath";
    DeviceBoundSessionFetchResult2["RefreshInitiatorNotString"] = "RefreshInitiatorNotString";
    DeviceBoundSessionFetchResult2["RefreshInitiatorInvalidHostPattern"] = "RefreshInitiatorInvalidHostPattern";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecification"] = "InvalidScopeSpecification";
    DeviceBoundSessionFetchResult2["MissingScopeSpecificationType"] = "MissingScopeSpecificationType";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationDomain"] = "EmptyScopeSpecificationDomain";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationPath"] = "EmptyScopeSpecificationPath";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecificationType"] = "InvalidScopeSpecificationType";
    DeviceBoundSessionFetchResult2["InvalidScopeIncludeSite"] = "InvalidScopeIncludeSite";
    DeviceBoundSessionFetchResult2["MissingScopeIncludeSite"] = "MissingScopeIncludeSite";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByProvider"] = "FederatedNotAuthorizedByProvider";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByRelyingParty"] = "FederatedNotAuthorizedByRelyingParty";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownMalformed"] = "SessionProviderWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownHasProviderOrigin"] = "SessionProviderWellKnownHasProviderOrigin";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownMalformed"] = "RelyingPartyWellKnownMalformed";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownHasRelyingOrigins"] = "RelyingPartyWellKnownHasRelyingOrigins";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderSessionMissing"] = "InvalidFederatedSessionProviderSessionMissing";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionWrongProviderOrigin"] = "InvalidFederatedSessionWrongProviderOrigin";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieCreationTime"] = "InvalidCredentialsCookieCreationTime";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieName"] = "InvalidCredentialsCookieName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieParsing"] = "InvalidCredentialsCookieParsing";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieUnpermittedAttribute"] = "InvalidCredentialsCookieUnpermittedAttribute";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieInvalidDomain"] = "InvalidCredentialsCookieInvalidDomain";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookiePrefix"] = "InvalidCredentialsCookiePrefix";
    DeviceBoundSessionFetchResult2["InvalidScopeRulePath"] = "InvalidScopeRulePath";
    DeviceBoundSessionFetchResult2["InvalidScopeRuleHostPattern"] = "InvalidScopeRuleHostPattern";
    DeviceBoundSessionFetchResult2["ScopeRuleOriginScopedHostPatternMismatch"] = "ScopeRuleOriginScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["ScopeRuleSiteScopedHostPatternMismatch"] = "ScopeRuleSiteScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    DeviceBoundSessionFetchResult2["InvalidConfigJson"] = "InvalidConfigJson";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderFailedToRestoreKey"] = "InvalidFederatedSessionProviderFailedToRestoreKey";
    DeviceBoundSessionFetchResult2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    DeviceBoundSessionFetchResult2["SessionDeletedDuringRefresh"] = "SessionDeletedDuringRefresh";
    DeviceBoundSessionFetchResult2["CrossOriginRegistrationSiteNotIncluded"] = "CrossOriginRegistrationSiteNotIncluded";
    DeviceBoundSessionFetchResult2["InvalidPreProvisionedKeyInitiatorMissing"] = "InvalidPreProvisionedKeyInitiatorMissing";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyAccessNotGranted"] = "PreProvisionedKeyAccessNotGranted";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyNotFound"] = "PreProvisionedKeyNotFound";
    DeviceBoundSessionFetchResult2["AttestationCertificationError"] = "AttestationCertificationError";
    DeviceBoundSessionFetchResult2["AttestationSigningError"] = "AttestationSigningError";
  })(DeviceBoundSessionFetchResult = Network2.DeviceBoundSessionFetchResult || (Network2.DeviceBoundSessionFetchResult = {}));
  let RefreshEventDetailsRefreshResult;
  ((RefreshEventDetailsRefreshResult2) => {
    RefreshEventDetailsRefreshResult2["Refreshed"] = "Refreshed";
    RefreshEventDetailsRefreshResult2["InitializedService"] = "InitializedService";
    RefreshEventDetailsRefreshResult2["Unreachable"] = "Unreachable";
    RefreshEventDetailsRefreshResult2["ServerError"] = "ServerError";
    RefreshEventDetailsRefreshResult2["FatalError"] = "FatalError";
    RefreshEventDetailsRefreshResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    RefreshEventDetailsRefreshResult2["RefreshedAsWaiter"] = "RefreshedAsWaiter";
    RefreshEventDetailsRefreshResult2["TransientSigningError"] = "TransientSigningError";
    RefreshEventDetailsRefreshResult2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
  })(RefreshEventDetailsRefreshResult = Network2.RefreshEventDetailsRefreshResult || (Network2.RefreshEventDetailsRefreshResult = {}));
  let TerminationEventDetailsDeletionReason;
  ((TerminationEventDetailsDeletionReason2) => {
    TerminationEventDetailsDeletionReason2["Expired"] = "Expired";
    TerminationEventDetailsDeletionReason2["FailedToRestoreKey"] = "FailedToRestoreKey";
    TerminationEventDetailsDeletionReason2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    TerminationEventDetailsDeletionReason2["StoragePartitionCleared"] = "StoragePartitionCleared";
    TerminationEventDetailsDeletionReason2["ClearBrowsingData"] = "ClearBrowsingData";
    TerminationEventDetailsDeletionReason2["ServerRequested"] = "ServerRequested";
    TerminationEventDetailsDeletionReason2["InvalidSessionParams"] = "InvalidSessionParams";
    TerminationEventDetailsDeletionReason2["RefreshFatalError"] = "RefreshFatalError";
    TerminationEventDetailsDeletionReason2["DevTools"] = "DevTools";
  })(TerminationEventDetailsDeletionReason = Network2.TerminationEventDetailsDeletionReason || (Network2.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network2.ChallengeEventDetailsChallengeResult || (Network2.ChallengeEventDetailsChallengeResult = {}));
  let TrustTokenOperationDoneEventStatus;
  ((TrustTokenOperationDoneEventStatus2) => {
    TrustTokenOperationDoneEventStatus2["Ok"] = "Ok";
    TrustTokenOperationDoneEventStatus2["InvalidArgument"] = "InvalidArgument";
    TrustTokenOperationDoneEventStatus2["MissingIssuerKeys"] = "MissingIssuerKeys";
    TrustTokenOperationDoneEventStatus2["FailedPrecondition"] = "FailedPrecondition";
    TrustTokenOperationDoneEventStatus2["ResourceExhausted"] = "ResourceExhausted";
    TrustTokenOperationDoneEventStatus2["AlreadyExists"] = "AlreadyExists";
    TrustTokenOperationDoneEventStatus2["ResourceLimited"] = "ResourceLimited";
    TrustTokenOperationDoneEventStatus2["Unauthorized"] = "Unauthorized";
    TrustTokenOperationDoneEventStatus2["BadResponse"] = "BadResponse";
    TrustTokenOperationDoneEventStatus2["InternalError"] = "InternalError";
    TrustTokenOperationDoneEventStatus2["UnknownError"] = "UnknownError";
    TrustTokenOperationDoneEventStatus2["FulfilledLocally"] = "FulfilledLocally";
    TrustTokenOperationDoneEventStatus2["SiteIssuerLimit"] = "SiteIssuerLimit";
  })(TrustTokenOperationDoneEventStatus = Network2.TrustTokenOperationDoneEventStatus || (Network2.TrustTokenOperationDoneEventStatus = {}));
})(Network || (Network = {}));
var Overlay;
((Overlay2) => {
  let LineStylePattern;
  ((LineStylePattern2) => {
    LineStylePattern2["Dashed"] = "dashed";
    LineStylePattern2["Dotted"] = "dotted";
  })(LineStylePattern = Overlay2.LineStylePattern || (Overlay2.LineStylePattern = {}));
  let ContrastAlgorithm;
  ((ContrastAlgorithm2) => {
    ContrastAlgorithm2["Aa"] = "aa";
    ContrastAlgorithm2["Aaa"] = "aaa";
    ContrastAlgorithm2["Apca"] = "apca";
  })(ContrastAlgorithm = Overlay2.ContrastAlgorithm || (Overlay2.ContrastAlgorithm = {}));
  let ColorFormat;
  ((ColorFormat2) => {
    ColorFormat2["Rgb"] = "rgb";
    ColorFormat2["Hsl"] = "hsl";
    ColorFormat2["Hwb"] = "hwb";
    ColorFormat2["Hex"] = "hex";
  })(ColorFormat = Overlay2.ColorFormat || (Overlay2.ColorFormat = {}));
  let DisplayCutoutShape;
  ((DisplayCutoutShape2) => {
    DisplayCutoutShape2["Pill"] = "pill";
    DisplayCutoutShape2["Notch"] = "notch";
    DisplayCutoutShape2["Circle"] = "circle";
    DisplayCutoutShape2["Rectangle"] = "rectangle";
  })(DisplayCutoutShape = Overlay2.DisplayCutoutShape || (Overlay2.DisplayCutoutShape = {}));
  let InspectMode;
  ((InspectMode2) => {
    InspectMode2["SearchForNode"] = "searchForNode";
    InspectMode2["SearchForUAShadowDOM"] = "searchForUAShadowDOM";
    InspectMode2["CaptureAreaScreenshot"] = "captureAreaScreenshot";
    InspectMode2["None"] = "none";
  })(InspectMode = Overlay2.InspectMode || (Overlay2.InspectMode = {}));
})(Overlay || (Overlay = {}));
var PWA;
((PWA2) => {
  let DisplayMode;
  ((DisplayMode2) => {
    DisplayMode2["Standalone"] = "standalone";
    DisplayMode2["Browser"] = "browser";
  })(DisplayMode = PWA2.DisplayMode || (PWA2.DisplayMode = {}));
})(PWA || (PWA = {}));
var Page;
((Page2) => {
  let AdFrameType;
  ((AdFrameType2) => {
    AdFrameType2["None"] = "none";
    AdFrameType2["Child"] = "child";
    AdFrameType2["Root"] = "root";
  })(AdFrameType = Page2.AdFrameType || (Page2.AdFrameType = {}));
  let AdFrameExplanation;
  ((AdFrameExplanation2) => {
    AdFrameExplanation2["ParentIsAd"] = "ParentIsAd";
    AdFrameExplanation2["CreatedByAdScript"] = "CreatedByAdScript";
    AdFrameExplanation2["MatchedBlockingRule"] = "MatchedBlockingRule";
  })(AdFrameExplanation = Page2.AdFrameExplanation || (Page2.AdFrameExplanation = {}));
  let SecureContextType;
  ((SecureContextType2) => {
    SecureContextType2["Secure"] = "Secure";
    SecureContextType2["SecureLocalhost"] = "SecureLocalhost";
    SecureContextType2["InsecureScheme"] = "InsecureScheme";
    SecureContextType2["InsecureAncestor"] = "InsecureAncestor";
  })(SecureContextType = Page2.SecureContextType || (Page2.SecureContextType = {}));
  let CrossOriginIsolatedContextType;
  ((CrossOriginIsolatedContextType2) => {
    CrossOriginIsolatedContextType2["Isolated"] = "Isolated";
    CrossOriginIsolatedContextType2["NotIsolated"] = "NotIsolated";
    CrossOriginIsolatedContextType2["NotIsolatedFeatureDisabled"] = "NotIsolatedFeatureDisabled";
  })(CrossOriginIsolatedContextType = Page2.CrossOriginIsolatedContextType || (Page2.CrossOriginIsolatedContextType = {}));
  let GatedAPIFeatures;
  ((GatedAPIFeatures2) => {
    GatedAPIFeatures2["SharedArrayBuffers"] = "SharedArrayBuffers";
    GatedAPIFeatures2["SharedArrayBuffersTransferAllowed"] = "SharedArrayBuffersTransferAllowed";
    GatedAPIFeatures2["PerformanceMeasureMemory"] = "PerformanceMeasureMemory";
    GatedAPIFeatures2["PerformanceProfile"] = "PerformanceProfile";
  })(GatedAPIFeatures = Page2.GatedAPIFeatures || (Page2.GatedAPIFeatures = {}));
  let PermissionsPolicyFeature;
  ((PermissionsPolicyFeature2) => {
    PermissionsPolicyFeature2["Accelerometer"] = "accelerometer";
    PermissionsPolicyFeature2["AllScreensCapture"] = "all-screens-capture";
    PermissionsPolicyFeature2["AmbientLightSensor"] = "ambient-light-sensor";
    PermissionsPolicyFeature2["AriaNotify"] = "aria-notify";
    PermissionsPolicyFeature2["Autofill"] = "autofill";
    PermissionsPolicyFeature2["Autoplay"] = "autoplay";
    PermissionsPolicyFeature2["Bluetooth"] = "bluetooth";
    PermissionsPolicyFeature2["BrowsingTopics"] = "browsing-topics";
    PermissionsPolicyFeature2["Camera"] = "camera";
    PermissionsPolicyFeature2["CapturedSurfaceControl"] = "captured-surface-control";
    PermissionsPolicyFeature2["ChDpr"] = "ch-dpr";
    PermissionsPolicyFeature2["ChDeviceMemory"] = "ch-device-memory";
    PermissionsPolicyFeature2["ChDownlink"] = "ch-downlink";
    PermissionsPolicyFeature2["ChEct"] = "ch-ect";
    PermissionsPolicyFeature2["ChPrefersColorScheme"] = "ch-prefers-color-scheme";
    PermissionsPolicyFeature2["ChPrefersReducedMotion"] = "ch-prefers-reduced-motion";
    PermissionsPolicyFeature2["ChPrefersReducedTransparency"] = "ch-prefers-reduced-transparency";
    PermissionsPolicyFeature2["ChRtt"] = "ch-rtt";
    PermissionsPolicyFeature2["ChSaveData"] = "ch-save-data";
    PermissionsPolicyFeature2["ChUa"] = "ch-ua";
    PermissionsPolicyFeature2["ChUaArch"] = "ch-ua-arch";
    PermissionsPolicyFeature2["ChUaBitness"] = "ch-ua-bitness";
    PermissionsPolicyFeature2["ChUaHighEntropyValues"] = "ch-ua-high-entropy-values";
    PermissionsPolicyFeature2["ChUaPlatform"] = "ch-ua-platform";
    PermissionsPolicyFeature2["ChUaModel"] = "ch-ua-model";
    PermissionsPolicyFeature2["ChUaMobile"] = "ch-ua-mobile";
    PermissionsPolicyFeature2["ChUaFormFactors"] = "ch-ua-form-factors";
    PermissionsPolicyFeature2["ChUaFullVersion"] = "ch-ua-full-version";
    PermissionsPolicyFeature2["ChUaFullVersionList"] = "ch-ua-full-version-list";
    PermissionsPolicyFeature2["ChUaPlatformVersion"] = "ch-ua-platform-version";
    PermissionsPolicyFeature2["ChUaWow64"] = "ch-ua-wow64";
    PermissionsPolicyFeature2["ChViewportHeight"] = "ch-viewport-height";
    PermissionsPolicyFeature2["ChViewportWidth"] = "ch-viewport-width";
    PermissionsPolicyFeature2["ChWidth"] = "ch-width";
    PermissionsPolicyFeature2["ClipboardRead"] = "clipboard-read";
    PermissionsPolicyFeature2["ClipboardWrite"] = "clipboard-write";
    PermissionsPolicyFeature2["ComputePressure"] = "compute-pressure";
    PermissionsPolicyFeature2["ControlledFrame"] = "controlled-frame";
    PermissionsPolicyFeature2["CrossOriginIsolated"] = "cross-origin-isolated";
    PermissionsPolicyFeature2["DeferredFetch"] = "deferred-fetch";
    PermissionsPolicyFeature2["DeferredFetchMinimal"] = "deferred-fetch-minimal";
    PermissionsPolicyFeature2["DeviceAttributes"] = "device-attributes";
    PermissionsPolicyFeature2["DigitalCredentialsCreate"] = "digital-credentials-create";
    PermissionsPolicyFeature2["DigitalCredentialsGet"] = "digital-credentials-get";
    PermissionsPolicyFeature2["DirectSockets"] = "direct-sockets";
    PermissionsPolicyFeature2["DirectSocketsMulticast"] = "direct-sockets-multicast";
    PermissionsPolicyFeature2["DisplayCapture"] = "display-capture";
    PermissionsPolicyFeature2["DocumentDomain"] = "document-domain";
    PermissionsPolicyFeature2["EncryptedMedia"] = "encrypted-media";
    PermissionsPolicyFeature2["ExecutionWhileOutOfViewport"] = "execution-while-out-of-viewport";
    PermissionsPolicyFeature2["ExecutionWhileNotRendered"] = "execution-while-not-rendered";
    PermissionsPolicyFeature2["FocusWithoutUserActivation"] = "focus-without-user-activation";
    PermissionsPolicyFeature2["Fullscreen"] = "fullscreen";
    PermissionsPolicyFeature2["Frobulate"] = "frobulate";
    PermissionsPolicyFeature2["Gamepad"] = "gamepad";
    PermissionsPolicyFeature2["Geolocation"] = "geolocation";
    PermissionsPolicyFeature2["Gyroscope"] = "gyroscope";
    PermissionsPolicyFeature2["Hid"] = "hid";
    PermissionsPolicyFeature2["IdentityCredentialsGet"] = "identity-credentials-get";
    PermissionsPolicyFeature2["IdleDetection"] = "idle-detection";
    PermissionsPolicyFeature2["InterestCohort"] = "interest-cohort";
    PermissionsPolicyFeature2["KeyboardMap"] = "keyboard-map";
    PermissionsPolicyFeature2["LanguageDetector"] = "language-detector";
    PermissionsPolicyFeature2["LanguageModel"] = "language-model";
    PermissionsPolicyFeature2["LocalFonts"] = "local-fonts";
    PermissionsPolicyFeature2["LocalNetwork"] = "local-network";
    PermissionsPolicyFeature2["LocalNetworkAccess"] = "local-network-access";
    PermissionsPolicyFeature2["LoopbackNetwork"] = "loopback-network";
    PermissionsPolicyFeature2["Magnetometer"] = "magnetometer";
    PermissionsPolicyFeature2["ManualText"] = "manual-text";
    PermissionsPolicyFeature2["MediaPlaybackWhileNotVisible"] = "media-playback-while-not-visible";
    PermissionsPolicyFeature2["Microphone"] = "microphone";
    PermissionsPolicyFeature2["Midi"] = "midi";
    PermissionsPolicyFeature2["OnDeviceSpeechRecognition"] = "on-device-speech-recognition";
    PermissionsPolicyFeature2["OtpCredentials"] = "otp-credentials";
    PermissionsPolicyFeature2["Payment"] = "payment";
    PermissionsPolicyFeature2["PictureInPicture"] = "picture-in-picture";
    PermissionsPolicyFeature2["PrivateStateTokenIssuance"] = "private-state-token-issuance";
    PermissionsPolicyFeature2["PrivateStateTokenRedemption"] = "private-state-token-redemption";
    PermissionsPolicyFeature2["PublickeyCredentialsCreate"] = "publickey-credentials-create";
    PermissionsPolicyFeature2["PublickeyCredentialsGet"] = "publickey-credentials-get";
    PermissionsPolicyFeature2["Rewriter"] = "rewriter";
    PermissionsPolicyFeature2["ScreenWakeLock"] = "screen-wake-lock";
    PermissionsPolicyFeature2["Serial"] = "serial";
    PermissionsPolicyFeature2["SharedStorage"] = "shared-storage";
    PermissionsPolicyFeature2["SharedStorageSelectUrl"] = "shared-storage-select-url";
    PermissionsPolicyFeature2["SmartCard"] = "smart-card";
    PermissionsPolicyFeature2["SpeakerSelection"] = "speaker-selection";
    PermissionsPolicyFeature2["StorageAccess"] = "storage-access";
    PermissionsPolicyFeature2["SubApps"] = "sub-apps";
    PermissionsPolicyFeature2["Summarizer"] = "summarizer";
    PermissionsPolicyFeature2["SyncXhr"] = "sync-xhr";
    PermissionsPolicyFeature2["Tools"] = "tools";
    PermissionsPolicyFeature2["Translator"] = "translator";
    PermissionsPolicyFeature2["Unload"] = "unload";
    PermissionsPolicyFeature2["Usb"] = "usb";
    PermissionsPolicyFeature2["UsbUnrestricted"] = "usb-unrestricted";
    PermissionsPolicyFeature2["VerticalScroll"] = "vertical-scroll";
    PermissionsPolicyFeature2["WebAppInstallation"] = "web-app-installation";
    PermissionsPolicyFeature2["Webnn"] = "webnn";
    PermissionsPolicyFeature2["WebPrinting"] = "web-printing";
    PermissionsPolicyFeature2["WebShare"] = "web-share";
    PermissionsPolicyFeature2["WindowManagement"] = "window-management";
    PermissionsPolicyFeature2["Writer"] = "writer";
    PermissionsPolicyFeature2["XrSpatialTracking"] = "xr-spatial-tracking";
  })(PermissionsPolicyFeature = Page2.PermissionsPolicyFeature || (Page2.PermissionsPolicyFeature = {}));
  let PermissionsPolicyBlockReason;
  ((PermissionsPolicyBlockReason2) => {
    PermissionsPolicyBlockReason2["Header"] = "Header";
    PermissionsPolicyBlockReason2["IframeAttribute"] = "IframeAttribute";
    PermissionsPolicyBlockReason2["InFencedFrameTree"] = "InFencedFrameTree";
    PermissionsPolicyBlockReason2["InIsolatedApp"] = "InIsolatedApp";
  })(PermissionsPolicyBlockReason = Page2.PermissionsPolicyBlockReason || (Page2.PermissionsPolicyBlockReason = {}));
  let OriginTrialTokenStatus;
  ((OriginTrialTokenStatus2) => {
    OriginTrialTokenStatus2["Success"] = "Success";
    OriginTrialTokenStatus2["NotSupported"] = "NotSupported";
    OriginTrialTokenStatus2["Insecure"] = "Insecure";
    OriginTrialTokenStatus2["Expired"] = "Expired";
    OriginTrialTokenStatus2["WrongOrigin"] = "WrongOrigin";
    OriginTrialTokenStatus2["InvalidSignature"] = "InvalidSignature";
    OriginTrialTokenStatus2["Malformed"] = "Malformed";
    OriginTrialTokenStatus2["WrongVersion"] = "WrongVersion";
    OriginTrialTokenStatus2["FeatureDisabled"] = "FeatureDisabled";
    OriginTrialTokenStatus2["TokenDisabled"] = "TokenDisabled";
    OriginTrialTokenStatus2["FeatureDisabledForUser"] = "FeatureDisabledForUser";
    OriginTrialTokenStatus2["UnknownTrial"] = "UnknownTrial";
  })(OriginTrialTokenStatus = Page2.OriginTrialTokenStatus || (Page2.OriginTrialTokenStatus = {}));
  let OriginTrialStatus;
  ((OriginTrialStatus2) => {
    OriginTrialStatus2["Enabled"] = "Enabled";
    OriginTrialStatus2["ValidTokenNotProvided"] = "ValidTokenNotProvided";
    OriginTrialStatus2["OSNotSupported"] = "OSNotSupported";
    OriginTrialStatus2["TrialNotAllowed"] = "TrialNotAllowed";
  })(OriginTrialStatus = Page2.OriginTrialStatus || (Page2.OriginTrialStatus = {}));
  let OriginTrialUsageRestriction;
  ((OriginTrialUsageRestriction2) => {
    OriginTrialUsageRestriction2["None"] = "None";
    OriginTrialUsageRestriction2["Subset"] = "Subset";
  })(OriginTrialUsageRestriction = Page2.OriginTrialUsageRestriction || (Page2.OriginTrialUsageRestriction = {}));
  let TransitionType;
  ((TransitionType2) => {
    TransitionType2["Link"] = "link";
    TransitionType2["Typed"] = "typed";
    TransitionType2["Address_bar"] = "address_bar";
    TransitionType2["Auto_bookmark"] = "auto_bookmark";
    TransitionType2["Auto_subframe"] = "auto_subframe";
    TransitionType2["Manual_subframe"] = "manual_subframe";
    TransitionType2["Generated"] = "generated";
    TransitionType2["Auto_toplevel"] = "auto_toplevel";
    TransitionType2["Form_submit"] = "form_submit";
    TransitionType2["Reload"] = "reload";
    TransitionType2["Keyword"] = "keyword";
    TransitionType2["Keyword_generated"] = "keyword_generated";
    TransitionType2["Other"] = "other";
  })(TransitionType = Page2.TransitionType || (Page2.TransitionType = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["Alert"] = "alert";
    DialogType2["Confirm"] = "confirm";
    DialogType2["Prompt"] = "prompt";
    DialogType2["Beforeunload"] = "beforeunload";
  })(DialogType = Page2.DialogType || (Page2.DialogType = {}));
  let ClientNavigationReason;
  ((ClientNavigationReason2) => {
    ClientNavigationReason2["AnchorClick"] = "anchorClick";
    ClientNavigationReason2["FormSubmissionGet"] = "formSubmissionGet";
    ClientNavigationReason2["FormSubmissionPost"] = "formSubmissionPost";
    ClientNavigationReason2["HttpHeaderRefresh"] = "httpHeaderRefresh";
    ClientNavigationReason2["InitialFrameNavigation"] = "initialFrameNavigation";
    ClientNavigationReason2["MetaTagRefresh"] = "metaTagRefresh";
    ClientNavigationReason2["Other"] = "other";
    ClientNavigationReason2["PageBlockInterstitial"] = "pageBlockInterstitial";
    ClientNavigationReason2["Reload"] = "reload";
    ClientNavigationReason2["ScriptInitiated"] = "scriptInitiated";
  })(ClientNavigationReason = Page2.ClientNavigationReason || (Page2.ClientNavigationReason = {}));
  let ClientNavigationDisposition;
  ((ClientNavigationDisposition2) => {
    ClientNavigationDisposition2["CurrentTab"] = "currentTab";
    ClientNavigationDisposition2["NewTab"] = "newTab";
    ClientNavigationDisposition2["NewWindow"] = "newWindow";
    ClientNavigationDisposition2["Download"] = "download";
  })(ClientNavigationDisposition = Page2.ClientNavigationDisposition || (Page2.ClientNavigationDisposition = {}));
  let ReferrerPolicy;
  ((ReferrerPolicy2) => {
    ReferrerPolicy2["NoReferrer"] = "noReferrer";
    ReferrerPolicy2["NoReferrerWhenDowngrade"] = "noReferrerWhenDowngrade";
    ReferrerPolicy2["Origin"] = "origin";
    ReferrerPolicy2["OriginWhenCrossOrigin"] = "originWhenCrossOrigin";
    ReferrerPolicy2["SameOrigin"] = "sameOrigin";
    ReferrerPolicy2["StrictOrigin"] = "strictOrigin";
    ReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strictOriginWhenCrossOrigin";
    ReferrerPolicy2["UnsafeUrl"] = "unsafeUrl";
  })(ReferrerPolicy = Page2.ReferrerPolicy || (Page2.ReferrerPolicy = {}));
  let NavigationType;
  ((NavigationType2) => {
    NavigationType2["Navigation"] = "Navigation";
    NavigationType2["BackForwardCacheRestore"] = "BackForwardCacheRestore";
  })(NavigationType = Page2.NavigationType || (Page2.NavigationType = {}));
  let BackForwardCacheNotRestoredReason;
  ((BackForwardCacheNotRestoredReason2) => {
    BackForwardCacheNotRestoredReason2["NotPrimaryMainFrame"] = "NotPrimaryMainFrame";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabled"] = "BackForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["RelatedActiveContentsExist"] = "RelatedActiveContentsExist";
    BackForwardCacheNotRestoredReason2["HTTPStatusNotOK"] = "HTTPStatusNotOK";
    BackForwardCacheNotRestoredReason2["SchemeNotHTTPOrHTTPS"] = "SchemeNotHTTPOrHTTPS";
    BackForwardCacheNotRestoredReason2["Loading"] = "Loading";
    BackForwardCacheNotRestoredReason2["WasGrantedMediaAccess"] = "WasGrantedMediaAccess";
    BackForwardCacheNotRestoredReason2["DisableForRenderFrameHostCalled"] = "DisableForRenderFrameHostCalled";
    BackForwardCacheNotRestoredReason2["DomainNotAllowed"] = "DomainNotAllowed";
    BackForwardCacheNotRestoredReason2["HTTPMethodNotGET"] = "HTTPMethodNotGET";
    BackForwardCacheNotRestoredReason2["SubframeIsNavigating"] = "SubframeIsNavigating";
    BackForwardCacheNotRestoredReason2["Timeout"] = "Timeout";
    BackForwardCacheNotRestoredReason2["CacheLimit"] = "CacheLimit";
    BackForwardCacheNotRestoredReason2["JavaScriptExecution"] = "JavaScriptExecution";
    BackForwardCacheNotRestoredReason2["RendererProcessKilled"] = "RendererProcessKilled";
    BackForwardCacheNotRestoredReason2["RendererProcessCrashed"] = "RendererProcessCrashed";
    BackForwardCacheNotRestoredReason2["SchedulerTrackedFeatureUsed"] = "SchedulerTrackedFeatureUsed";
    BackForwardCacheNotRestoredReason2["ConflictingBrowsingInstance"] = "ConflictingBrowsingInstance";
    BackForwardCacheNotRestoredReason2["CacheFlushed"] = "CacheFlushed";
    BackForwardCacheNotRestoredReason2["ServiceWorkerVersionActivation"] = "ServiceWorkerVersionActivation";
    BackForwardCacheNotRestoredReason2["SessionRestored"] = "SessionRestored";
    BackForwardCacheNotRestoredReason2["ServiceWorkerPostMessage"] = "ServiceWorkerPostMessage";
    BackForwardCacheNotRestoredReason2["EnteredBackForwardCacheBeforeServiceWorkerHostAdded"] = "EnteredBackForwardCacheBeforeServiceWorkerHostAdded";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_SameSite"] = "RenderFrameHostReused_SameSite";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_CrossSite"] = "RenderFrameHostReused_CrossSite";
    BackForwardCacheNotRestoredReason2["ServiceWorkerClaim"] = "ServiceWorkerClaim";
    BackForwardCacheNotRestoredReason2["IgnoreEventAndEvict"] = "IgnoreEventAndEvict";
    BackForwardCacheNotRestoredReason2["HaveInnerContents"] = "HaveInnerContents";
    BackForwardCacheNotRestoredReason2["TimeoutPuttingInCache"] = "TimeoutPuttingInCache";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByLowMemory"] = "BackForwardCacheDisabledByLowMemory";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByCommandLine"] = "BackForwardCacheDisabledByCommandLine";
    BackForwardCacheNotRestoredReason2["NetworkRequestDatAPIpeDrainedAsBytesConsumer"] = "NetworkRequestDatapipeDrainedAsBytesConsumer";
    BackForwardCacheNotRestoredReason2["NetworkRequestRedirected"] = "NetworkRequestRedirected";
    BackForwardCacheNotRestoredReason2["NetworkRequestTimeout"] = "NetworkRequestTimeout";
    BackForwardCacheNotRestoredReason2["NetworkExceedsBufferLimit"] = "NetworkExceedsBufferLimit";
    BackForwardCacheNotRestoredReason2["NavigationCancelledWhileRestoring"] = "NavigationCancelledWhileRestoring";
    BackForwardCacheNotRestoredReason2["NotMostRecentNavigationEntry"] = "NotMostRecentNavigationEntry";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForPrerender"] = "BackForwardCacheDisabledForPrerender";
    BackForwardCacheNotRestoredReason2["UserAgentOverrideDiffers"] = "UserAgentOverrideDiffers";
    BackForwardCacheNotRestoredReason2["ForegroundCacheLimit"] = "ForegroundCacheLimit";
    BackForwardCacheNotRestoredReason2["ForwardCacheDisabled"] = "ForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["BrowsingInstanceNotSwapped"] = "BrowsingInstanceNotSwapped";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForDelegate"] = "BackForwardCacheDisabledForDelegate";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInMainFrame"] = "UnloadHandlerExistsInMainFrame";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInSubFrame"] = "UnloadHandlerExistsInSubFrame";
    BackForwardCacheNotRestoredReason2["ServiceWorkerUnregistration"] = "ServiceWorkerUnregistration";
    BackForwardCacheNotRestoredReason2["CacheControlNoStore"] = "CacheControlNoStore";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreCookieModified"] = "CacheControlNoStoreCookieModified";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreHTTPOnlyCookieModified"] = "CacheControlNoStoreHTTPOnlyCookieModified";
    BackForwardCacheNotRestoredReason2["NoResponseHead"] = "NoResponseHead";
    BackForwardCacheNotRestoredReason2["Unknown"] = "Unknown";
    BackForwardCacheNotRestoredReason2["ActivationNavigationsDisallowedForBug1234857"] = "ActivationNavigationsDisallowedForBug1234857";
    BackForwardCacheNotRestoredReason2["ErrorDocument"] = "ErrorDocument";
    BackForwardCacheNotRestoredReason2["FencedFramesEmbedder"] = "FencedFramesEmbedder";
    BackForwardCacheNotRestoredReason2["CookieDisabled"] = "CookieDisabled";
    BackForwardCacheNotRestoredReason2["HTTPAuthRequired"] = "HTTPAuthRequired";
    BackForwardCacheNotRestoredReason2["CookieFlushed"] = "CookieFlushed";
    BackForwardCacheNotRestoredReason2["BroadcastChannelOnMessage"] = "BroadcastChannelOnMessage";
    BackForwardCacheNotRestoredReason2["WebViewSettingsChanged"] = "WebViewSettingsChanged";
    BackForwardCacheNotRestoredReason2["WebViewJavaScriptObjectChanged"] = "WebViewJavaScriptObjectChanged";
    BackForwardCacheNotRestoredReason2["WebViewMessageListenerInjected"] = "WebViewMessageListenerInjected";
    BackForwardCacheNotRestoredReason2["WebViewSafeBrowsingAllowlistChanged"] = "WebViewSafeBrowsingAllowlistChanged";
    BackForwardCacheNotRestoredReason2["WebViewDocumentStartJavascriptChanged"] = "WebViewDocumentStartJavascriptChanged";
    BackForwardCacheNotRestoredReason2["WebSocket"] = "WebSocket";
    BackForwardCacheNotRestoredReason2["WebTransport"] = "WebTransport";
    BackForwardCacheNotRestoredReason2["WebRTC"] = "WebRTC";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoStore"] = "MainResourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoCache"] = "MainResourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoStore"] = "SubresourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoCache"] = "SubresourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["ContainsPlugins"] = "ContainsPlugins";
    BackForwardCacheNotRestoredReason2["DocumentLoaded"] = "DocumentLoaded";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestOthers"] = "OutstandingNetworkRequestOthers";
    BackForwardCacheNotRestoredReason2["RequestedMIDIPermission"] = "RequestedMIDIPermission";
    BackForwardCacheNotRestoredReason2["RequestedAudioCapturePermission"] = "RequestedAudioCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedVideoCapturePermission"] = "RequestedVideoCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedBackForwardCacheBlockedSensors"] = "RequestedBackForwardCacheBlockedSensors";
    BackForwardCacheNotRestoredReason2["RequestedBackgroundWorkPermission"] = "RequestedBackgroundWorkPermission";
    BackForwardCacheNotRestoredReason2["BroadcastChannel"] = "BroadcastChannel";
    BackForwardCacheNotRestoredReason2["WebXR"] = "WebXR";
    BackForwardCacheNotRestoredReason2["SharedWorker"] = "SharedWorker";
    BackForwardCacheNotRestoredReason2["SharedWorkerMessage"] = "SharedWorkerMessage";
    BackForwardCacheNotRestoredReason2["SharedWorkerWithNoActiveClient"] = "SharedWorkerWithNoActiveClient";
    BackForwardCacheNotRestoredReason2["WebLocks"] = "WebLocks";
    BackForwardCacheNotRestoredReason2["WebLocksContention"] = "WebLocksContention";
    BackForwardCacheNotRestoredReason2["WebHID"] = "WebHID";
    BackForwardCacheNotRestoredReason2["WebBluetooth"] = "WebBluetooth";
    BackForwardCacheNotRestoredReason2["WebShare"] = "WebShare";
    BackForwardCacheNotRestoredReason2["RequestedStorageAccessGrant"] = "RequestedStorageAccessGrant";
    BackForwardCacheNotRestoredReason2["WebNfc"] = "WebNfc";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestFetch"] = "OutstandingNetworkRequestFetch";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestXHR"] = "OutstandingNetworkRequestXHR";
    BackForwardCacheNotRestoredReason2["AppBanner"] = "AppBanner";
    BackForwardCacheNotRestoredReason2["Printing"] = "Printing";
    BackForwardCacheNotRestoredReason2["WebDatabase"] = "WebDatabase";
    BackForwardCacheNotRestoredReason2["PictureInPicture"] = "PictureInPicture";
    BackForwardCacheNotRestoredReason2["SpeechRecognizer"] = "SpeechRecognizer";
    BackForwardCacheNotRestoredReason2["IdleManager"] = "IdleManager";
    BackForwardCacheNotRestoredReason2["PaymentManager"] = "PaymentManager";
    BackForwardCacheNotRestoredReason2["SpeechSynthesis"] = "SpeechSynthesis";
    BackForwardCacheNotRestoredReason2["KeyboardLock"] = "KeyboardLock";
    BackForwardCacheNotRestoredReason2["WebOTPService"] = "WebOTPService";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestDirectSocket"] = "OutstandingNetworkRequestDirectSocket";
    BackForwardCacheNotRestoredReason2["InjectedJavascript"] = "InjectedJavascript";
    BackForwardCacheNotRestoredReason2["InjectedStyleSheet"] = "InjectedStyleSheet";
    BackForwardCacheNotRestoredReason2["KeepaliveRequest"] = "KeepaliveRequest";
    BackForwardCacheNotRestoredReason2["IndexedDBEvent"] = "IndexedDBEvent";
    BackForwardCacheNotRestoredReason2["Dummy"] = "Dummy";
    BackForwardCacheNotRestoredReason2["JsNetworkRequestReceivedCacheControlNoStoreResource"] = "JsNetworkRequestReceivedCacheControlNoStoreResource";
    BackForwardCacheNotRestoredReason2["WebRTCUsedWithCCNS"] = "WebRTCUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebTransportUsedWithCCNS"] = "WebTransportUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebSocketUsedWithCCNS"] = "WebSocketUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["SmartCard"] = "SmartCard";
    BackForwardCacheNotRestoredReason2["LiveMediaStreamTrack"] = "LiveMediaStreamTrack";
    BackForwardCacheNotRestoredReason2["UnloadHandler"] = "UnloadHandler";
    BackForwardCacheNotRestoredReason2["ParserAborted"] = "ParserAborted";
    BackForwardCacheNotRestoredReason2["ContentSecurityHandler"] = "ContentSecurityHandler";
    BackForwardCacheNotRestoredReason2["ContentWebAuthenticationAPI"] = "ContentWebAuthenticationAPI";
    BackForwardCacheNotRestoredReason2["ContentFileChooser"] = "ContentFileChooser";
    BackForwardCacheNotRestoredReason2["ContentSerial"] = "ContentSerial";
    BackForwardCacheNotRestoredReason2["ContentFileSystemAccess"] = "ContentFileSystemAccess";
    BackForwardCacheNotRestoredReason2["ContentMediaDevicesDispatcherHost"] = "ContentMediaDevicesDispatcherHost";
    BackForwardCacheNotRestoredReason2["ContentWebBluetooth"] = "ContentWebBluetooth";
    BackForwardCacheNotRestoredReason2["ContentWebUSB"] = "ContentWebUSB";
    BackForwardCacheNotRestoredReason2["ContentMediaSessionService"] = "ContentMediaSessionService";
    BackForwardCacheNotRestoredReason2["ContentScreenReader"] = "ContentScreenReader";
    BackForwardCacheNotRestoredReason2["ContentDiscarded"] = "ContentDiscarded";
    BackForwardCacheNotRestoredReason2["EmbedderPopupBlockerTabHelper"] = "EmbedderPopupBlockerTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingTriggeredPopupBlocker"] = "EmbedderSafeBrowsingTriggeredPopupBlocker";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingThreatDetails"] = "EmbedderSafeBrowsingThreatDetails";
    BackForwardCacheNotRestoredReason2["EmbedderAppBannerManager"] = "EmbedderAppBannerManager";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerViewerSource"] = "EmbedderDomDistillerViewerSource";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerSelfDeletingRequestDelegate"] = "EmbedderDomDistillerSelfDeletingRequestDelegate";
    BackForwardCacheNotRestoredReason2["EmbedderOomInterventionTabHelper"] = "EmbedderOomInterventionTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderOfflinePage"] = "EmbedderOfflinePage";
    BackForwardCacheNotRestoredReason2["EmbedderChromePasswordManagerClientBindCredentialManager"] = "EmbedderChromePasswordManagerClientBindCredentialManager";
    BackForwardCacheNotRestoredReason2["EmbedderPermissionRequestManager"] = "EmbedderPermissionRequestManager";
    BackForwardCacheNotRestoredReason2["EmbedderModalDialog"] = "EmbedderModalDialog";
    BackForwardCacheNotRestoredReason2["EmbedderExtensions"] = "EmbedderExtensions";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessaging"] = "EmbedderExtensionMessaging";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessagingForOpenPort"] = "EmbedderExtensionMessagingForOpenPort";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionSentMessageToCachedFrame"] = "EmbedderExtensionSentMessageToCachedFrame";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionFrame"] = "EmbedderExtensionFrame";
    BackForwardCacheNotRestoredReason2["EmbedderPrivilegedWebContents"] = "EmbedderPrivilegedWebContents";
    BackForwardCacheNotRestoredReason2["RequestedByWebViewClient"] = "RequestedByWebViewClient";
    BackForwardCacheNotRestoredReason2["PostMessageByWebViewClient"] = "PostMessageByWebViewClient";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreDeviceBoundSessionTerminated"] = "CacheControlNoStoreDeviceBoundSessionTerminated";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnModerateMemoryPressure"] = "CacheLimitPrunedOnModerateMemoryPressure";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnCriticalMemoryPressure"] = "CacheLimitPrunedOnCriticalMemoryPressure";
  })(BackForwardCacheNotRestoredReason = Page2.BackForwardCacheNotRestoredReason || (Page2.BackForwardCacheNotRestoredReason = {}));
  let BackForwardCacheNotRestoredReasonType;
  ((BackForwardCacheNotRestoredReasonType2) => {
    BackForwardCacheNotRestoredReasonType2["SupportPending"] = "SupportPending";
    BackForwardCacheNotRestoredReasonType2["PageSupportNeeded"] = "PageSupportNeeded";
    BackForwardCacheNotRestoredReasonType2["Circumstantial"] = "Circumstantial";
  })(BackForwardCacheNotRestoredReasonType = Page2.BackForwardCacheNotRestoredReasonType || (Page2.BackForwardCacheNotRestoredReasonType = {}));
  let CaptureScreenshotRequestFormat;
  ((CaptureScreenshotRequestFormat2) => {
    CaptureScreenshotRequestFormat2["Jpeg"] = "jpeg";
    CaptureScreenshotRequestFormat2["Png"] = "png";
    CaptureScreenshotRequestFormat2["Webp"] = "webp";
  })(CaptureScreenshotRequestFormat = Page2.CaptureScreenshotRequestFormat || (Page2.CaptureScreenshotRequestFormat = {}));
  let CaptureSnapshotRequestFormat;
  ((CaptureSnapshotRequestFormat2) => {
    CaptureSnapshotRequestFormat2["MHTML"] = "mhtml";
  })(CaptureSnapshotRequestFormat = Page2.CaptureSnapshotRequestFormat || (Page2.CaptureSnapshotRequestFormat = {}));
  let PrintToPDFRequestTransferMode;
  ((PrintToPDFRequestTransferMode2) => {
    PrintToPDFRequestTransferMode2["ReturnAsBase64"] = "ReturnAsBase64";
    PrintToPDFRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(PrintToPDFRequestTransferMode = Page2.PrintToPDFRequestTransferMode || (Page2.PrintToPDFRequestTransferMode = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Page2.SetDownloadBehaviorRequestBehavior || (Page2.SetDownloadBehaviorRequestBehavior = {}));
  let SetTouchEmulationEnabledRequestConfiguration;
  ((SetTouchEmulationEnabledRequestConfiguration2) => {
    SetTouchEmulationEnabledRequestConfiguration2["Mobile"] = "mobile";
    SetTouchEmulationEnabledRequestConfiguration2["Desktop"] = "desktop";
  })(SetTouchEmulationEnabledRequestConfiguration = Page2.SetTouchEmulationEnabledRequestConfiguration || (Page2.SetTouchEmulationEnabledRequestConfiguration = {}));
  let StartScreencastRequestFormat;
  ((StartScreencastRequestFormat2) => {
    StartScreencastRequestFormat2["Jpeg"] = "jpeg";
    StartScreencastRequestFormat2["Png"] = "png";
  })(StartScreencastRequestFormat = Page2.StartScreencastRequestFormat || (Page2.StartScreencastRequestFormat = {}));
  let SetWebLifecycleStateRequestState;
  ((SetWebLifecycleStateRequestState2) => {
    SetWebLifecycleStateRequestState2["Frozen"] = "frozen";
    SetWebLifecycleStateRequestState2["Active"] = "active";
  })(SetWebLifecycleStateRequestState = Page2.SetWebLifecycleStateRequestState || (Page2.SetWebLifecycleStateRequestState = {}));
  let SetSPCTransactionModeRequestMode;
  ((SetSPCTransactionModeRequestMode2) => {
    SetSPCTransactionModeRequestMode2["None"] = "none";
    SetSPCTransactionModeRequestMode2["AutoAccept"] = "autoAccept";
    SetSPCTransactionModeRequestMode2["AutoChooseToAuthAnotherWay"] = "autoChooseToAuthAnotherWay";
    SetSPCTransactionModeRequestMode2["AutoReject"] = "autoReject";
    SetSPCTransactionModeRequestMode2["AutoOptOut"] = "autoOptOut";
  })(SetSPCTransactionModeRequestMode = Page2.SetSPCTransactionModeRequestMode || (Page2.SetSPCTransactionModeRequestMode = {}));
  let SetRPHRegistrationModeRequestMode;
  ((SetRPHRegistrationModeRequestMode2) => {
    SetRPHRegistrationModeRequestMode2["None"] = "none";
    SetRPHRegistrationModeRequestMode2["AutoAccept"] = "autoAccept";
    SetRPHRegistrationModeRequestMode2["AutoReject"] = "autoReject";
  })(SetRPHRegistrationModeRequestMode = Page2.SetRPHRegistrationModeRequestMode || (Page2.SetRPHRegistrationModeRequestMode = {}));
  let FileChooserOpenedEventMode;
  ((FileChooserOpenedEventMode2) => {
    FileChooserOpenedEventMode2["SelectSingle"] = "selectSingle";
    FileChooserOpenedEventMode2["SelectMultiple"] = "selectMultiple";
  })(FileChooserOpenedEventMode = Page2.FileChooserOpenedEventMode || (Page2.FileChooserOpenedEventMode = {}));
  let FrameDetachedEventReason;
  ((FrameDetachedEventReason2) => {
    FrameDetachedEventReason2["Remove"] = "remove";
    FrameDetachedEventReason2["Swap"] = "swap";
  })(FrameDetachedEventReason = Page2.FrameDetachedEventReason || (Page2.FrameDetachedEventReason = {}));
  let FrameStartedNavigatingEventNavigationType;
  ((FrameStartedNavigatingEventNavigationType2) => {
    FrameStartedNavigatingEventNavigationType2["Reload"] = "reload";
    FrameStartedNavigatingEventNavigationType2["ReloadBypassingCache"] = "reloadBypassingCache";
    FrameStartedNavigatingEventNavigationType2["Restore"] = "restore";
    FrameStartedNavigatingEventNavigationType2["RestoreWithPost"] = "restoreWithPost";
    FrameStartedNavigatingEventNavigationType2["HistorySameDocument"] = "historySameDocument";
    FrameStartedNavigatingEventNavigationType2["HistoryDifferentDocument"] = "historyDifferentDocument";
    FrameStartedNavigatingEventNavigationType2["SameDocument"] = "sameDocument";
    FrameStartedNavigatingEventNavigationType2["DifferentDocument"] = "differentDocument";
  })(FrameStartedNavigatingEventNavigationType = Page2.FrameStartedNavigatingEventNavigationType || (Page2.FrameStartedNavigatingEventNavigationType = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Page2.DownloadProgressEventState || (Page2.DownloadProgressEventState = {}));
  let NavigatedWithinDocumentEventNavigationType;
  ((NavigatedWithinDocumentEventNavigationType2) => {
    NavigatedWithinDocumentEventNavigationType2["Fragment"] = "fragment";
    NavigatedWithinDocumentEventNavigationType2["HistoryAPI"] = "historyApi";
    NavigatedWithinDocumentEventNavigationType2["Other"] = "other";
  })(NavigatedWithinDocumentEventNavigationType = Page2.NavigatedWithinDocumentEventNavigationType || (Page2.NavigatedWithinDocumentEventNavigationType = {}));
})(Page || (Page = {}));
var Performance;
((Performance2) => {
  let EnableRequestTimeDomain;
  ((EnableRequestTimeDomain2) => {
    EnableRequestTimeDomain2["TimeTicks"] = "timeTicks";
    EnableRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(EnableRequestTimeDomain = Performance2.EnableRequestTimeDomain || (Performance2.EnableRequestTimeDomain = {}));
  let SetTimeDomainRequestTimeDomain;
  ((SetTimeDomainRequestTimeDomain2) => {
    SetTimeDomainRequestTimeDomain2["TimeTicks"] = "timeTicks";
    SetTimeDomainRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(SetTimeDomainRequestTimeDomain = Performance2.SetTimeDomainRequestTimeDomain || (Performance2.SetTimeDomainRequestTimeDomain = {}));
})(Performance || (Performance = {}));
var Preload;
((Preload2) => {
  let RuleSetErrorType;
  ((RuleSetErrorType2) => {
    RuleSetErrorType2["SourceIsNotJsonObject"] = "SourceIsNotJsonObject";
    RuleSetErrorType2["InvalidRulesSkipped"] = "InvalidRulesSkipped";
    RuleSetErrorType2["InvalidRulesetLevelTag"] = "InvalidRulesetLevelTag";
  })(RuleSetErrorType = Preload2.RuleSetErrorType || (Preload2.RuleSetErrorType = {}));
  let SpeculationAction;
  ((SpeculationAction2) => {
    SpeculationAction2["Prefetch"] = "Prefetch";
    SpeculationAction2["Prerender"] = "Prerender";
    SpeculationAction2["PrerenderUntilScript"] = "PrerenderUntilScript";
  })(SpeculationAction = Preload2.SpeculationAction || (Preload2.SpeculationAction = {}));
  let SpeculationTargetHint;
  ((SpeculationTargetHint2) => {
    SpeculationTargetHint2["Blank"] = "Blank";
    SpeculationTargetHint2["Self"] = "Self";
  })(SpeculationTargetHint = Preload2.SpeculationTargetHint || (Preload2.SpeculationTargetHint = {}));
  let PrerenderFinalStatus;
  ((PrerenderFinalStatus2) => {
    PrerenderFinalStatus2["Activated"] = "Activated";
    PrerenderFinalStatus2["Destroyed"] = "Destroyed";
    PrerenderFinalStatus2["LowEndDevice"] = "LowEndDevice";
    PrerenderFinalStatus2["InvalidSchemeRedirect"] = "InvalidSchemeRedirect";
    PrerenderFinalStatus2["InvalidSchemeNavigation"] = "InvalidSchemeNavigation";
    PrerenderFinalStatus2["NavigationRequestBlockedByCsp"] = "NavigationRequestBlockedByCsp";
    PrerenderFinalStatus2["MojoBinderPolicy"] = "MojoBinderPolicy";
    PrerenderFinalStatus2["RendererProcessCrashed"] = "RendererProcessCrashed";
    PrerenderFinalStatus2["RendererProcessKilled"] = "RendererProcessKilled";
    PrerenderFinalStatus2["Download"] = "Download";
    PrerenderFinalStatus2["TriggerDestroyed"] = "TriggerDestroyed";
    PrerenderFinalStatus2["NavigationNotCommitted"] = "NavigationNotCommitted";
    PrerenderFinalStatus2["NavigationBadHttpStatus"] = "NavigationBadHttpStatus";
    PrerenderFinalStatus2["ClientCertRequested"] = "ClientCertRequested";
    PrerenderFinalStatus2["NavigationRequestNetworkError"] = "NavigationRequestNetworkError";
    PrerenderFinalStatus2["CancelAllHostsForTesting"] = "CancelAllHostsForTesting";
    PrerenderFinalStatus2["DidFailLoad"] = "DidFailLoad";
    PrerenderFinalStatus2["Stop"] = "Stop";
    PrerenderFinalStatus2["SslCertificateError"] = "SslCertificateError";
    PrerenderFinalStatus2["LoginAuthRequested"] = "LoginAuthRequested";
    PrerenderFinalStatus2["UaChangeRequiresReload"] = "UaChangeRequiresReload";
    PrerenderFinalStatus2["BlockedByClient"] = "BlockedByClient";
    PrerenderFinalStatus2["AudioOutputDeviceRequested"] = "AudioOutputDeviceRequested";
    PrerenderFinalStatus2["MixedContent"] = "MixedContent";
    PrerenderFinalStatus2["TriggerBackgrounded"] = "TriggerBackgrounded";
    PrerenderFinalStatus2["MemoryLimitExceeded"] = "MemoryLimitExceeded";
    PrerenderFinalStatus2["DataSaverEnabled"] = "DataSaverEnabled";
    PrerenderFinalStatus2["TriggerUrlHasEffectiveUrl"] = "TriggerUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivatedBeforeStarted"] = "ActivatedBeforeStarted";
    PrerenderFinalStatus2["InactivePageRestriction"] = "InactivePageRestriction";
    PrerenderFinalStatus2["StartFailed"] = "StartFailed";
    PrerenderFinalStatus2["TimeoutBackgrounded"] = "TimeoutBackgrounded";
    PrerenderFinalStatus2["CrossSiteRedirectInInitialNavigation"] = "CrossSiteRedirectInInitialNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInInitialNavigation"] = "CrossSiteNavigationInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInInitialNavigation"] = "SameSiteCrossOriginRedirectNotOptInInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInInitialNavigation"] = "SameSiteCrossOriginNavigationNotOptInInInitialNavigation";
    PrerenderFinalStatus2["ActivationNavigationParameterMismatch"] = "ActivationNavigationParameterMismatch";
    PrerenderFinalStatus2["ActivatedInBackground"] = "ActivatedInBackground";
    PrerenderFinalStatus2["EmbedderHostDisallowed"] = "EmbedderHostDisallowed";
    PrerenderFinalStatus2["ActivationNavigationDestroyedBeforeSuccess"] = "ActivationNavigationDestroyedBeforeSuccess";
    PrerenderFinalStatus2["TabClosedByUserGesture"] = "TabClosedByUserGesture";
    PrerenderFinalStatus2["TabClosedWithoutUserGesture"] = "TabClosedWithoutUserGesture";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessCrashed"] = "PrimaryMainFrameRendererProcessCrashed";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessKilled"] = "PrimaryMainFrameRendererProcessKilled";
    PrerenderFinalStatus2["ActivationFramePolicyNotCompatible"] = "ActivationFramePolicyNotCompatible";
    PrerenderFinalStatus2["PreloadingDisabled"] = "PreloadingDisabled";
    PrerenderFinalStatus2["BatterySaverEnabled"] = "BatterySaverEnabled";
    PrerenderFinalStatus2["ActivatedDuringMainFrameNavigation"] = "ActivatedDuringMainFrameNavigation";
    PrerenderFinalStatus2["PreloadingUnsupportedByWebContents"] = "PreloadingUnsupportedByWebContents";
    PrerenderFinalStatus2["CrossSiteRedirectInMainFrameNavigation"] = "CrossSiteRedirectInMainFrameNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInMainFrameNavigation"] = "CrossSiteNavigationInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["MemoryPressureOnTrigger"] = "MemoryPressureOnTrigger";
    PrerenderFinalStatus2["MemoryPressureAfterTriggered"] = "MemoryPressureAfterTriggered";
    PrerenderFinalStatus2["PrerenderingDisabledByDevTools"] = "PrerenderingDisabledByDevTools";
    PrerenderFinalStatus2["SpeculationRuleRemoved"] = "SpeculationRuleRemoved";
    PrerenderFinalStatus2["ActivatedWithAuxiliaryBrowsingContexts"] = "ActivatedWithAuxiliaryBrowsingContexts";
    PrerenderFinalStatus2["MaxNumOfRunningEagerPrerendersExceeded"] = "MaxNumOfRunningEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningNonEagerPrerendersExceeded"] = "MaxNumOfRunningNonEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningEmbedderPrerendersExceeded"] = "MaxNumOfRunningEmbedderPrerendersExceeded";
    PrerenderFinalStatus2["PrerenderingUrlHasEffectiveUrl"] = "PrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["RedirectedPrerenderingUrlHasEffectiveUrl"] = "RedirectedPrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivationUrlHasEffectiveUrl"] = "ActivationUrlHasEffectiveUrl";
    PrerenderFinalStatus2["JavaScriptInterfaceAdded"] = "JavaScriptInterfaceAdded";
    PrerenderFinalStatus2["JavaScriptInterfaceRemoved"] = "JavaScriptInterfaceRemoved";
    PrerenderFinalStatus2["AllPrerenderingCanceled"] = "AllPrerenderingCanceled";
    PrerenderFinalStatus2["WindowClosed"] = "WindowClosed";
    PrerenderFinalStatus2["SlowNetwork"] = "SlowNetwork";
    PrerenderFinalStatus2["OtherPrerenderedPageActivated"] = "OtherPrerenderedPageActivated";
    PrerenderFinalStatus2["V8OptimizerDisabled"] = "V8OptimizerDisabled";
    PrerenderFinalStatus2["PrerenderFailedDuringPrefetch"] = "PrerenderFailedDuringPrefetch";
    PrerenderFinalStatus2["BrowsingDataRemoved"] = "BrowsingDataRemoved";
    PrerenderFinalStatus2["PrerenderHostReused"] = "PrerenderHostReused";
    PrerenderFinalStatus2["FormSubmitWhenPrerendering"] = "FormSubmitWhenPrerendering";
    PrerenderFinalStatus2["CrossDocumentRestart"] = "CrossDocumentRestart";
  })(PrerenderFinalStatus = Preload2.PrerenderFinalStatus || (Preload2.PrerenderFinalStatus = {}));
  let PreloadingStatus;
  ((PreloadingStatus2) => {
    PreloadingStatus2["Pending"] = "Pending";
    PreloadingStatus2["Running"] = "Running";
    PreloadingStatus2["Ready"] = "Ready";
    PreloadingStatus2["Success"] = "Success";
    PreloadingStatus2["Failure"] = "Failure";
    PreloadingStatus2["NotSupported"] = "NotSupported";
  })(PreloadingStatus = Preload2.PreloadingStatus || (Preload2.PreloadingStatus = {}));
  let PrefetchStatus;
  ((PrefetchStatus2) => {
    PrefetchStatus2["PrefetchAllowed"] = "PrefetchAllowed";
    PrefetchStatus2["PrefetchFailedIneligibleRedirect"] = "PrefetchFailedIneligibleRedirect";
    PrefetchStatus2["PrefetchFailedInvalidRedirect"] = "PrefetchFailedInvalidRedirect";
    PrefetchStatus2["PrefetchFailedMIMENotSupported"] = "PrefetchFailedMIMENotSupported";
    PrefetchStatus2["PrefetchFailedNetError"] = "PrefetchFailedNetError";
    PrefetchStatus2["PrefetchFailedNon2XX"] = "PrefetchFailedNon2XX";
    PrefetchStatus2["PrefetchEvictedAfterBrowsingDataRemoved"] = "PrefetchEvictedAfterBrowsingDataRemoved";
    PrefetchStatus2["PrefetchEvictedAfterCandidateRemoved"] = "PrefetchEvictedAfterCandidateRemoved";
    PrefetchStatus2["PrefetchEvictedForNewerPrefetch"] = "PrefetchEvictedForNewerPrefetch";
    PrefetchStatus2["PrefetchHeldback"] = "PrefetchHeldback";
    PrefetchStatus2["PrefetchIneligibleRetryAfter"] = "PrefetchIneligibleRetryAfter";
    PrefetchStatus2["PrefetchIsPrivacyDecoy"] = "PrefetchIsPrivacyDecoy";
    PrefetchStatus2["PrefetchIsStale"] = "PrefetchIsStale";
    PrefetchStatus2["PrefetchNotEligibleBlockedByConnectionAllowlist"] = "PrefetchNotEligibleBlockedByConnectionAllowlist";
    PrefetchStatus2["PrefetchNotEligibleBrowserContextOffTheRecord"] = "PrefetchNotEligibleBrowserContextOffTheRecord";
    PrefetchStatus2["PrefetchNotEligibleCrossOrigin"] = "PrefetchNotEligibleCrossOrigin";
    PrefetchStatus2["PrefetchNotEligibleDataSaverEnabled"] = "PrefetchNotEligibleDataSaverEnabled";
    PrefetchStatus2["PrefetchNotEligibleExistingProxy"] = "PrefetchNotEligibleExistingProxy";
    PrefetchStatus2["PrefetchNotEligibleHostIsNonUnique"] = "PrefetchNotEligibleHostIsNonUnique";
    PrefetchStatus2["PrefetchNotEligibleNonDefaultStoragePartition"] = "PrefetchNotEligibleNonDefaultStoragePartition";
    PrefetchStatus2["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"] = "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy";
    PrefetchStatus2["PrefetchNotEligibleSchemeIsNotHttps"] = "PrefetchNotEligibleSchemeIsNotHttps";
    PrefetchStatus2["PrefetchNotEligibleUserHasCookies"] = "PrefetchNotEligibleUserHasCookies";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorker"] = "PrefetchNotEligibleUserHasServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"] = "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler";
    PrefetchStatus2["PrefetchNotEligibleRedirectFromServiceWorker"] = "PrefetchNotEligibleRedirectFromServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleRedirectToServiceWorker"] = "PrefetchNotEligibleRedirectToServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleBatterySaverEnabled"] = "PrefetchNotEligibleBatterySaverEnabled";
    PrefetchStatus2["PrefetchNotEligiblePreloadingDisabled"] = "PrefetchNotEligiblePreloadingDisabled";
    PrefetchStatus2["PrefetchNotFinishedInTime"] = "PrefetchNotFinishedInTime";
    PrefetchStatus2["PrefetchNotStarted"] = "PrefetchNotStarted";
    PrefetchStatus2["PrefetchNotUsedCookiesChanged"] = "PrefetchNotUsedCookiesChanged";
    PrefetchStatus2["PrefetchProxyNotAvailable"] = "PrefetchProxyNotAvailable";
    PrefetchStatus2["PrefetchResponseUsed"] = "PrefetchResponseUsed";
    PrefetchStatus2["PrefetchSuccessfulButNotUsed"] = "PrefetchSuccessfulButNotUsed";
    PrefetchStatus2["PrefetchNotUsedProbeFailed"] = "PrefetchNotUsedProbeFailed";
    PrefetchStatus2["PrefetchCancelledOnUserNavigation"] = "PrefetchCancelledOnUserNavigation";
  })(PrefetchStatus = Preload2.PrefetchStatus || (Preload2.PrefetchStatus = {}));
})(Preload || (Preload = {}));
var Security;
((Security2) => {
  let MixedContentType;
  ((MixedContentType2) => {
    MixedContentType2["Blockable"] = "blockable";
    MixedContentType2["OptionallyBlockable"] = "optionally-blockable";
    MixedContentType2["None"] = "none";
  })(MixedContentType = Security2.MixedContentType || (Security2.MixedContentType = {}));
  let SecurityState;
  ((SecurityState2) => {
    SecurityState2["Unknown"] = "unknown";
    SecurityState2["Neutral"] = "neutral";
    SecurityState2["Insecure"] = "insecure";
    SecurityState2["Secure"] = "secure";
    SecurityState2["Info"] = "info";
    SecurityState2["InsecureBroken"] = "insecure-broken";
  })(SecurityState = Security2.SecurityState || (Security2.SecurityState = {}));
  let SafetyTipStatus;
  ((SafetyTipStatus2) => {
    SafetyTipStatus2["BadReputation"] = "badReputation";
    SafetyTipStatus2["Lookalike"] = "lookalike";
  })(SafetyTipStatus = Security2.SafetyTipStatus || (Security2.SafetyTipStatus = {}));
  let CertificateErrorAction;
  ((CertificateErrorAction2) => {
    CertificateErrorAction2["Continue"] = "continue";
    CertificateErrorAction2["Cancel"] = "cancel";
  })(CertificateErrorAction = Security2.CertificateErrorAction || (Security2.CertificateErrorAction = {}));
})(Security || (Security = {}));
var ServiceWorker;
((ServiceWorker2) => {
  let ServiceWorkerVersionRunningStatus;
  ((ServiceWorkerVersionRunningStatus2) => {
    ServiceWorkerVersionRunningStatus2["Stopped"] = "stopped";
    ServiceWorkerVersionRunningStatus2["Starting"] = "starting";
    ServiceWorkerVersionRunningStatus2["Running"] = "running";
    ServiceWorkerVersionRunningStatus2["Stopping"] = "stopping";
  })(ServiceWorkerVersionRunningStatus = ServiceWorker2.ServiceWorkerVersionRunningStatus || (ServiceWorker2.ServiceWorkerVersionRunningStatus = {}));
  let ServiceWorkerVersionStatus;
  ((ServiceWorkerVersionStatus2) => {
    ServiceWorkerVersionStatus2["New"] = "new";
    ServiceWorkerVersionStatus2["Installing"] = "installing";
    ServiceWorkerVersionStatus2["Installed"] = "installed";
    ServiceWorkerVersionStatus2["Activating"] = "activating";
    ServiceWorkerVersionStatus2["Activated"] = "activated";
    ServiceWorkerVersionStatus2["Redundant"] = "redundant";
  })(ServiceWorkerVersionStatus = ServiceWorker2.ServiceWorkerVersionStatus || (ServiceWorker2.ServiceWorkerVersionStatus = {}));
  let ServiceWorkerRouterSourceType;
  ((ServiceWorkerRouterSourceType2) => {
    ServiceWorkerRouterSourceType2["Cache"] = "cache";
    ServiceWorkerRouterSourceType2["FetchEvent"] = "fetchEvent";
    ServiceWorkerRouterSourceType2["Network"] = "network";
    ServiceWorkerRouterSourceType2["RaceNetworkAndFetchHandler"] = "raceNetworkAndFetchHandler";
    ServiceWorkerRouterSourceType2["RaceNetworkAndCache"] = "raceNetworkAndCache";
    ServiceWorkerRouterSourceType2["SourceDict"] = "sourceDict";
  })(ServiceWorkerRouterSourceType = ServiceWorker2.ServiceWorkerRouterSourceType || (ServiceWorker2.ServiceWorkerRouterSourceType = {}));
})(ServiceWorker || (ServiceWorker = {}));
var SmartCardEmulation;
((SmartCardEmulation2) => {
  let ResultCode;
  ((ResultCode2) => {
    ResultCode2["Success"] = "success";
    ResultCode2["RemovedCard"] = "removed-card";
    ResultCode2["ResetCard"] = "reset-card";
    ResultCode2["UnpoweredCard"] = "unpowered-card";
    ResultCode2["UnresponsiveCard"] = "unresponsive-card";
    ResultCode2["UnsupportedCard"] = "unsupported-card";
    ResultCode2["ReaderUnavailable"] = "reader-unavailable";
    ResultCode2["SharingViolation"] = "sharing-violation";
    ResultCode2["NotTransacted"] = "not-transacted";
    ResultCode2["NoSmartcard"] = "no-smartcard";
    ResultCode2["ProtoMismatch"] = "proto-mismatch";
    ResultCode2["SystemCancelled"] = "system-cancelled";
    ResultCode2["NotReady"] = "not-ready";
    ResultCode2["Cancelled"] = "cancelled";
    ResultCode2["InsufficientBuffer"] = "insufficient-buffer";
    ResultCode2["InvalidHandle"] = "invalid-handle";
    ResultCode2["InvalidParameter"] = "invalid-parameter";
    ResultCode2["InvalidValue"] = "invalid-value";
    ResultCode2["NoMemory"] = "no-memory";
    ResultCode2["Timeout"] = "timeout";
    ResultCode2["UnknownReader"] = "unknown-reader";
    ResultCode2["UnsupportedFeature"] = "unsupported-feature";
    ResultCode2["NoReadersAvailable"] = "no-readers-available";
    ResultCode2["ServiceStopped"] = "service-stopped";
    ResultCode2["NoService"] = "no-service";
    ResultCode2["CommError"] = "comm-error";
    ResultCode2["InternalError"] = "internal-error";
    ResultCode2["ServerTooBusy"] = "server-too-busy";
    ResultCode2["Unexpected"] = "unexpected";
    ResultCode2["Shutdown"] = "shutdown";
    ResultCode2["UnknownCard"] = "unknown-card";
    ResultCode2["Unknown"] = "unknown";
  })(ResultCode = SmartCardEmulation2.ResultCode || (SmartCardEmulation2.ResultCode = {}));
  let ShareMode;
  ((ShareMode2) => {
    ShareMode2["Shared"] = "shared";
    ShareMode2["Exclusive"] = "exclusive";
    ShareMode2["Direct"] = "direct";
  })(ShareMode = SmartCardEmulation2.ShareMode || (SmartCardEmulation2.ShareMode = {}));
  let Disposition;
  ((Disposition2) => {
    Disposition2["LeaveCard"] = "leave-card";
    Disposition2["ResetCard"] = "reset-card";
    Disposition2["UnpowerCard"] = "unpower-card";
    Disposition2["EjectCard"] = "eject-card";
  })(Disposition = SmartCardEmulation2.Disposition || (SmartCardEmulation2.Disposition = {}));
  let ConnectionState;
  ((ConnectionState2) => {
    ConnectionState2["Absent"] = "absent";
    ConnectionState2["Present"] = "present";
    ConnectionState2["Swallowed"] = "swallowed";
    ConnectionState2["Powered"] = "powered";
    ConnectionState2["Negotiable"] = "negotiable";
    ConnectionState2["Specific"] = "specific";
  })(ConnectionState = SmartCardEmulation2.ConnectionState || (SmartCardEmulation2.ConnectionState = {}));
  let Protocol;
  ((Protocol2) => {
    Protocol2["T0"] = "t0";
    Protocol2["T1"] = "t1";
    Protocol2["Raw"] = "raw";
  })(Protocol = SmartCardEmulation2.Protocol || (SmartCardEmulation2.Protocol = {}));
})(SmartCardEmulation || (SmartCardEmulation = {}));
var Storage;
((Storage2) => {
  let StorageType;
  ((StorageType2) => {
    StorageType2["Cookies"] = "cookies";
    StorageType2["File_systems"] = "file_systems";
    StorageType2["Indexeddb"] = "indexeddb";
    StorageType2["Local_storage"] = "local_storage";
    StorageType2["Shader_cache"] = "shader_cache";
    StorageType2["Websql"] = "websql";
    StorageType2["Service_workers"] = "service_workers";
    StorageType2["Cache_storage"] = "cache_storage";
    StorageType2["Storage_buckets"] = "storage_buckets";
    StorageType2["All"] = "all";
    StorageType2["Other"] = "other";
  })(StorageType = Storage2.StorageType || (Storage2.StorageType = {}));
  let StorageBucketsDurability;
  ((StorageBucketsDurability2) => {
    StorageBucketsDurability2["Relaxed"] = "relaxed";
    StorageBucketsDurability2["Strict"] = "strict";
  })(StorageBucketsDurability = Storage2.StorageBucketsDurability || (Storage2.StorageBucketsDurability = {}));
})(Storage || (Storage = {}));
var SystemInfo;
((SystemInfo2) => {
  let SubsamplingFormat;
  ((SubsamplingFormat2) => {
    SubsamplingFormat2["Yuv420"] = "yuv420";
    SubsamplingFormat2["Yuv422"] = "yuv422";
    SubsamplingFormat2["Yuv444"] = "yuv444";
  })(SubsamplingFormat = SystemInfo2.SubsamplingFormat || (SystemInfo2.SubsamplingFormat = {}));
  let ImageType;
  ((ImageType2) => {
    ImageType2["Jpeg"] = "jpeg";
    ImageType2["Webp"] = "webp";
    ImageType2["Unknown"] = "unknown";
  })(ImageType = SystemInfo2.ImageType || (SystemInfo2.ImageType = {}));
})(SystemInfo || (SystemInfo = {}));
var Target;
((Target2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target2.WindowState || (Target2.WindowState = {}));
})(Target || (Target = {}));
var Tracing;
((Tracing2) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing2.TraceConfigRecordMode || (Tracing2.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing2.StreamFormat || (Tracing2.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing2.StreamCompression || (Tracing2.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing2.MemoryDumpLevelOfDetail || (Tracing2.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing2.TracingBackend || (Tracing2.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing2.StartRequestTransferMode || (Tracing2.StartRequestTransferMode = {}));
})(Tracing || (Tracing = {}));
var WebAudio;
((WebAudio2) => {
  let ContextType;
  ((ContextType2) => {
    ContextType2["Realtime"] = "realtime";
    ContextType2["Offline"] = "offline";
  })(ContextType = WebAudio2.ContextType || (WebAudio2.ContextType = {}));
  let ContextState;
  ((ContextState2) => {
    ContextState2["Suspended"] = "suspended";
    ContextState2["Running"] = "running";
    ContextState2["Closed"] = "closed";
    ContextState2["Interrupted"] = "interrupted";
  })(ContextState = WebAudio2.ContextState || (WebAudio2.ContextState = {}));
  let ChannelCountMode;
  ((ChannelCountMode2) => {
    ChannelCountMode2["ClampedMax"] = "clamped-max";
    ChannelCountMode2["Explicit"] = "explicit";
    ChannelCountMode2["Max"] = "max";
  })(ChannelCountMode = WebAudio2.ChannelCountMode || (WebAudio2.ChannelCountMode = {}));
  let ChannelInterpretation;
  ((ChannelInterpretation2) => {
    ChannelInterpretation2["Discrete"] = "discrete";
    ChannelInterpretation2["Speakers"] = "speakers";
  })(ChannelInterpretation = WebAudio2.ChannelInterpretation || (WebAudio2.ChannelInterpretation = {}));
  let AutomationRate;
  ((AutomationRate2) => {
    AutomationRate2["ARate"] = "a-rate";
    AutomationRate2["KRate"] = "k-rate";
  })(AutomationRate = WebAudio2.AutomationRate || (WebAudio2.AutomationRate = {}));
})(WebAudio || (WebAudio = {}));
var WebAuthn;
((WebAuthn2) => {
  let AuthenticatorProtocol;
  ((AuthenticatorProtocol2) => {
    AuthenticatorProtocol2["U2f"] = "u2f";
    AuthenticatorProtocol2["Ctap2"] = "ctap2";
  })(AuthenticatorProtocol = WebAuthn2.AuthenticatorProtocol || (WebAuthn2.AuthenticatorProtocol = {}));
  let Ctap2Version;
  ((Ctap2Version2) => {
    Ctap2Version2["Ctap2_0"] = "ctap2_0";
    Ctap2Version2["Ctap2_1"] = "ctap2_1";
    Ctap2Version2["Ctap2_2"] = "ctap2_2";
  })(Ctap2Version = WebAuthn2.Ctap2Version || (WebAuthn2.Ctap2Version = {}));
  let AuthenticatorTransport;
  ((AuthenticatorTransport2) => {
    AuthenticatorTransport2["Usb"] = "usb";
    AuthenticatorTransport2["Nfc"] = "nfc";
    AuthenticatorTransport2["Ble"] = "ble";
    AuthenticatorTransport2["Cable"] = "cable";
    AuthenticatorTransport2["Hybrid"] = "hybrid";
    AuthenticatorTransport2["SmartCard"] = "smart-card";
    AuthenticatorTransport2["Internal"] = "internal";
  })(AuthenticatorTransport = WebAuthn2.AuthenticatorTransport || (WebAuthn2.AuthenticatorTransport = {}));
})(WebAuthn || (WebAuthn = {}));
var WebMCP;
((WebMCP2) => {
  let InvocationStatus;
  ((InvocationStatus2) => {
    InvocationStatus2["Completed"] = "Completed";
    InvocationStatus2["Canceled"] = "Canceled";
    InvocationStatus2["Error"] = "Error";
  })(InvocationStatus = WebMCP2.InvocationStatus || (WebMCP2.InvocationStatus = {}));
})(WebMCP || (WebMCP = {}));
var Debugger;
((Debugger2) => {
  let ScopeType;
  ((ScopeType2) => {
    ScopeType2["Global"] = "global";
    ScopeType2["Local"] = "local";
    ScopeType2["With"] = "with";
    ScopeType2["Closure"] = "closure";
    ScopeType2["Catch"] = "catch";
    ScopeType2["Block"] = "block";
    ScopeType2["Script"] = "script";
    ScopeType2["Eval"] = "eval";
    ScopeType2["Module"] = "module";
    ScopeType2["WasmExpressionStack"] = "wasm-expression-stack";
  })(ScopeType = Debugger2.ScopeType || (Debugger2.ScopeType = {}));
  let BreakLocationType;
  ((BreakLocationType2) => {
    BreakLocationType2["DebuggerStatement"] = "debuggerStatement";
    BreakLocationType2["Call"] = "call";
    BreakLocationType2["Return"] = "return";
  })(BreakLocationType = Debugger2.BreakLocationType || (Debugger2.BreakLocationType = {}));
  let ScriptLanguage;
  ((ScriptLanguage2) => {
    ScriptLanguage2["JavaScript"] = "JavaScript";
    ScriptLanguage2["WebAssembly"] = "WebAssembly";
  })(ScriptLanguage = Debugger2.ScriptLanguage || (Debugger2.ScriptLanguage = {}));
  let DebugSymbolsType;
  ((DebugSymbolsType2) => {
    DebugSymbolsType2["SourceMap"] = "SourceMap";
    DebugSymbolsType2["EmbeddedDWARF"] = "EmbeddedDWARF";
    DebugSymbolsType2["ExternalDWARF"] = "ExternalDWARF";
  })(DebugSymbolsType = Debugger2.DebugSymbolsType || (Debugger2.DebugSymbolsType = {}));
  let ContinueToLocationRequestTargetCallFrames;
  ((ContinueToLocationRequestTargetCallFrames2) => {
    ContinueToLocationRequestTargetCallFrames2["Any"] = "any";
    ContinueToLocationRequestTargetCallFrames2["Current"] = "current";
  })(ContinueToLocationRequestTargetCallFrames = Debugger2.ContinueToLocationRequestTargetCallFrames || (Debugger2.ContinueToLocationRequestTargetCallFrames = {}));
  let RestartFrameRequestMode;
  ((RestartFrameRequestMode2) => {
    RestartFrameRequestMode2["StepInto"] = "StepInto";
  })(RestartFrameRequestMode = Debugger2.RestartFrameRequestMode || (Debugger2.RestartFrameRequestMode = {}));
  let SetInstrumentationBreakpointRequestInstrumentation;
  ((SetInstrumentationBreakpointRequestInstrumentation2) => {
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptExecution"] = "beforeScriptExecution";
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptWithSourceMapExecution"] = "beforeScriptWithSourceMapExecution";
  })(SetInstrumentationBreakpointRequestInstrumentation = Debugger2.SetInstrumentationBreakpointRequestInstrumentation || (Debugger2.SetInstrumentationBreakpointRequestInstrumentation = {}));
  let SetPauseOnExceptionsRequestState;
  ((SetPauseOnExceptionsRequestState2) => {
    SetPauseOnExceptionsRequestState2["None"] = "none";
    SetPauseOnExceptionsRequestState2["Caught"] = "caught";
    SetPauseOnExceptionsRequestState2["Uncaught"] = "uncaught";
    SetPauseOnExceptionsRequestState2["All"] = "all";
  })(SetPauseOnExceptionsRequestState = Debugger2.SetPauseOnExceptionsRequestState || (Debugger2.SetPauseOnExceptionsRequestState = {}));
  let SetScriptSourceResponseStatus;
  ((SetScriptSourceResponseStatus2) => {
    SetScriptSourceResponseStatus2["Ok"] = "Ok";
    SetScriptSourceResponseStatus2["CompileError"] = "CompileError";
    SetScriptSourceResponseStatus2["BlockedByActiveGenerator"] = "BlockedByActiveGenerator";
    SetScriptSourceResponseStatus2["BlockedByActiveFunction"] = "BlockedByActiveFunction";
    SetScriptSourceResponseStatus2["BlockedByTopLevelEsModuleChange"] = "BlockedByTopLevelEsModuleChange";
  })(SetScriptSourceResponseStatus = Debugger2.SetScriptSourceResponseStatus || (Debugger2.SetScriptSourceResponseStatus = {}));
  let PausedEventReason;
  ((PausedEventReason2) => {
    PausedEventReason2["Ambiguous"] = "ambiguous";
    PausedEventReason2["Assert"] = "assert";
    PausedEventReason2["CSPViolation"] = "CSPViolation";
    PausedEventReason2["DebugCommand"] = "debugCommand";
    PausedEventReason2["DOM"] = "DOM";
    PausedEventReason2["EventListener"] = "EventListener";
    PausedEventReason2["Exception"] = "exception";
    PausedEventReason2["Instrumentation"] = "instrumentation";
    PausedEventReason2["OOM"] = "OOM";
    PausedEventReason2["Other"] = "other";
    PausedEventReason2["PromiseRejection"] = "promiseRejection";
    PausedEventReason2["XHR"] = "XHR";
    PausedEventReason2["Step"] = "step";
  })(PausedEventReason = Debugger2.PausedEventReason || (Debugger2.PausedEventReason = {}));
})(Debugger || (Debugger = {}));
var Runtime;
((Runtime2) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime2.SerializationOptionsSerialization || (Runtime2.SerializationOptionsSerialization = {}));
  let DeepSerializedValueType;
  ((DeepSerializedValueType2) => {
    DeepSerializedValueType2["Undefined"] = "undefined";
    DeepSerializedValueType2["Null"] = "null";
    DeepSerializedValueType2["String"] = "string";
    DeepSerializedValueType2["Number"] = "number";
    DeepSerializedValueType2["Boolean"] = "boolean";
    DeepSerializedValueType2["Bigint"] = "bigint";
    DeepSerializedValueType2["Regexp"] = "regexp";
    DeepSerializedValueType2["Date"] = "date";
    DeepSerializedValueType2["Symbol"] = "symbol";
    DeepSerializedValueType2["Array"] = "array";
    DeepSerializedValueType2["Object"] = "object";
    DeepSerializedValueType2["Function"] = "function";
    DeepSerializedValueType2["Map"] = "map";
    DeepSerializedValueType2["Set"] = "set";
    DeepSerializedValueType2["Weakmap"] = "weakmap";
    DeepSerializedValueType2["Weakset"] = "weakset";
    DeepSerializedValueType2["Error"] = "error";
    DeepSerializedValueType2["Proxy"] = "proxy";
    DeepSerializedValueType2["Promise"] = "promise";
    DeepSerializedValueType2["Typedarray"] = "typedarray";
    DeepSerializedValueType2["Arraybuffer"] = "arraybuffer";
    DeepSerializedValueType2["Node"] = "node";
    DeepSerializedValueType2["Window"] = "window";
    DeepSerializedValueType2["Generator"] = "generator";
  })(DeepSerializedValueType = Runtime2.DeepSerializedValueType || (Runtime2.DeepSerializedValueType = {}));
  let RemoteObjectType;
  ((RemoteObjectType2) => {
    RemoteObjectType2["Object"] = "object";
    RemoteObjectType2["Function"] = "function";
    RemoteObjectType2["Undefined"] = "undefined";
    RemoteObjectType2["String"] = "string";
    RemoteObjectType2["Number"] = "number";
    RemoteObjectType2["Boolean"] = "boolean";
    RemoteObjectType2["Symbol"] = "symbol";
    RemoteObjectType2["Bigint"] = "bigint";
  })(RemoteObjectType = Runtime2.RemoteObjectType || (Runtime2.RemoteObjectType = {}));
  let RemoteObjectSubtype;
  ((RemoteObjectSubtype2) => {
    RemoteObjectSubtype2["Array"] = "array";
    RemoteObjectSubtype2["Null"] = "null";
    RemoteObjectSubtype2["Node"] = "node";
    RemoteObjectSubtype2["Regexp"] = "regexp";
    RemoteObjectSubtype2["Date"] = "date";
    RemoteObjectSubtype2["Map"] = "map";
    RemoteObjectSubtype2["Set"] = "set";
    RemoteObjectSubtype2["Weakmap"] = "weakmap";
    RemoteObjectSubtype2["Weakset"] = "weakset";
    RemoteObjectSubtype2["Iterator"] = "iterator";
    RemoteObjectSubtype2["Generator"] = "generator";
    RemoteObjectSubtype2["Error"] = "error";
    RemoteObjectSubtype2["Proxy"] = "proxy";
    RemoteObjectSubtype2["Promise"] = "promise";
    RemoteObjectSubtype2["Typedarray"] = "typedarray";
    RemoteObjectSubtype2["Arraybuffer"] = "arraybuffer";
    RemoteObjectSubtype2["Dataview"] = "dataview";
    RemoteObjectSubtype2["Webassemblymemory"] = "webassemblymemory";
    RemoteObjectSubtype2["Wasmvalue"] = "wasmvalue";
    RemoteObjectSubtype2["Trustedtype"] = "trustedtype";
  })(RemoteObjectSubtype = Runtime2.RemoteObjectSubtype || (Runtime2.RemoteObjectSubtype = {}));
  let ObjectPreviewType;
  ((ObjectPreviewType2) => {
    ObjectPreviewType2["Object"] = "object";
    ObjectPreviewType2["Function"] = "function";
    ObjectPreviewType2["Undefined"] = "undefined";
    ObjectPreviewType2["String"] = "string";
    ObjectPreviewType2["Number"] = "number";
    ObjectPreviewType2["Boolean"] = "boolean";
    ObjectPreviewType2["Symbol"] = "symbol";
    ObjectPreviewType2["Bigint"] = "bigint";
  })(ObjectPreviewType = Runtime2.ObjectPreviewType || (Runtime2.ObjectPreviewType = {}));
  let ObjectPreviewSubtype;
  ((ObjectPreviewSubtype2) => {
    ObjectPreviewSubtype2["Array"] = "array";
    ObjectPreviewSubtype2["Null"] = "null";
    ObjectPreviewSubtype2["Node"] = "node";
    ObjectPreviewSubtype2["Regexp"] = "regexp";
    ObjectPreviewSubtype2["Date"] = "date";
    ObjectPreviewSubtype2["Map"] = "map";
    ObjectPreviewSubtype2["Set"] = "set";
    ObjectPreviewSubtype2["Weakmap"] = "weakmap";
    ObjectPreviewSubtype2["Weakset"] = "weakset";
    ObjectPreviewSubtype2["Iterator"] = "iterator";
    ObjectPreviewSubtype2["Generator"] = "generator";
    ObjectPreviewSubtype2["Error"] = "error";
    ObjectPreviewSubtype2["Proxy"] = "proxy";
    ObjectPreviewSubtype2["Promise"] = "promise";
    ObjectPreviewSubtype2["Typedarray"] = "typedarray";
    ObjectPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    ObjectPreviewSubtype2["Dataview"] = "dataview";
    ObjectPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    ObjectPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    ObjectPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(ObjectPreviewSubtype = Runtime2.ObjectPreviewSubtype || (Runtime2.ObjectPreviewSubtype = {}));
  let PropertyPreviewType;
  ((PropertyPreviewType2) => {
    PropertyPreviewType2["Object"] = "object";
    PropertyPreviewType2["Function"] = "function";
    PropertyPreviewType2["Undefined"] = "undefined";
    PropertyPreviewType2["String"] = "string";
    PropertyPreviewType2["Number"] = "number";
    PropertyPreviewType2["Boolean"] = "boolean";
    PropertyPreviewType2["Symbol"] = "symbol";
    PropertyPreviewType2["Accessor"] = "accessor";
    PropertyPreviewType2["Bigint"] = "bigint";
  })(PropertyPreviewType = Runtime2.PropertyPreviewType || (Runtime2.PropertyPreviewType = {}));
  let PropertyPreviewSubtype;
  ((PropertyPreviewSubtype2) => {
    PropertyPreviewSubtype2["Array"] = "array";
    PropertyPreviewSubtype2["Null"] = "null";
    PropertyPreviewSubtype2["Node"] = "node";
    PropertyPreviewSubtype2["Regexp"] = "regexp";
    PropertyPreviewSubtype2["Date"] = "date";
    PropertyPreviewSubtype2["Map"] = "map";
    PropertyPreviewSubtype2["Set"] = "set";
    PropertyPreviewSubtype2["Weakmap"] = "weakmap";
    PropertyPreviewSubtype2["Weakset"] = "weakset";
    PropertyPreviewSubtype2["Iterator"] = "iterator";
    PropertyPreviewSubtype2["Generator"] = "generator";
    PropertyPreviewSubtype2["Error"] = "error";
    PropertyPreviewSubtype2["Proxy"] = "proxy";
    PropertyPreviewSubtype2["Promise"] = "promise";
    PropertyPreviewSubtype2["Typedarray"] = "typedarray";
    PropertyPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    PropertyPreviewSubtype2["Dataview"] = "dataview";
    PropertyPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    PropertyPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    PropertyPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(PropertyPreviewSubtype = Runtime2.PropertyPreviewSubtype || (Runtime2.PropertyPreviewSubtype = {}));
  let ConsoleAPICalledEventType;
  ((ConsoleAPICalledEventType2) => {
    ConsoleAPICalledEventType2["Log"] = "log";
    ConsoleAPICalledEventType2["Debug"] = "debug";
    ConsoleAPICalledEventType2["Info"] = "info";
    ConsoleAPICalledEventType2["Error"] = "error";
    ConsoleAPICalledEventType2["Warning"] = "warning";
    ConsoleAPICalledEventType2["Dir"] = "dir";
    ConsoleAPICalledEventType2["DirXML"] = "dirxml";
    ConsoleAPICalledEventType2["Table"] = "table";
    ConsoleAPICalledEventType2["Trace"] = "trace";
    ConsoleAPICalledEventType2["Clear"] = "clear";
    ConsoleAPICalledEventType2["StartGroup"] = "startGroup";
    ConsoleAPICalledEventType2["StartGroupCollapsed"] = "startGroupCollapsed";
    ConsoleAPICalledEventType2["EndGroup"] = "endGroup";
    ConsoleAPICalledEventType2["Assert"] = "assert";
    ConsoleAPICalledEventType2["Profile"] = "profile";
    ConsoleAPICalledEventType2["ProfileEnd"] = "profileEnd";
    ConsoleAPICalledEventType2["Count"] = "count";
    ConsoleAPICalledEventType2["TimeEnd"] = "timeEnd";
  })(ConsoleAPICalledEventType = Runtime2.ConsoleAPICalledEventType || (Runtime2.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/models/trace/handlers/NetworkRequestsHandler.ts
import * as Helpers4 from "../helpers/helpers.js";
import * as Types6 from "../types/types.js";
var MILLISECONDS_TO_MICROSECONDS = 1e3;
var SECONDS_TO_MICROSECONDS = 1e6;
var webSocketData = /* @__PURE__ */ new Map();
var linkPreconnectEvents = [];
var requestMap = /* @__PURE__ */ new Map();
var requestsById = /* @__PURE__ */ new Map();
var requestsByTime = [];
var requestIdsByURL = /* @__PURE__ */ new Map();
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
function reset5() {
  requestsById = /* @__PURE__ */ new Map();
  requestMap = /* @__PURE__ */ new Map();
  requestsByTime = [];
  networkRequestEventByInitiatorUrl = /* @__PURE__ */ new Map();
  eventToInitiatorMap = /* @__PURE__ */ new Map();
  webSocketData = /* @__PURE__ */ new Map();
  requestIdsByURL = /* @__PURE__ */ new Map();
  entityMappings = {
    eventsByEntity: /* @__PURE__ */ new Map(),
    entityByEvent: /* @__PURE__ */ new Map(),
    createdEntityCache: /* @__PURE__ */ new Map(),
    entityByUrlCache: /* @__PURE__ */ new Map()
  };
  linkPreconnectEvents = [];
}
function handleEvent5(event) {
  if (Types6.Events.isResourceChangePriority(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "changePriority", event);
    return;
  }
  if (Types6.Events.isResourceWillSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "willSendRequests", [event]);
    return;
  }
  if (Types6.Events.isResourceSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "sendRequests", [event]);
    return;
  }
  if (Types6.Events.isResourceReceiveResponse(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receiveResponse", event);
    return;
  }
  if (Types6.Events.isResourceReceivedData(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "receivedData", [event]);
    return;
  }
  if (Types6.Events.isResourceFinish(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "resourceFinish", event);
    return;
  }
  if (Types6.Events.isResourceMarkAsCached(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "resourceMarkAsCached", event);
    return;
  }
  if (Types6.Events.isPreloadRenderBlockingStatusChangeEvent(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, "preloadRenderBlockingStatusChange", [event]);
  }
  if (Types6.Events.isWebSocketCreate(event) || Types6.Events.isWebSocketInfo(event) || Types6.Events.isWebSocketTransfer(event)) {
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
  if (Types6.Events.isLinkPreconnect(event)) {
    linkPreconnectEvents.push(event);
    return;
  }
}
async function finalize5() {
  const { rendererProcessesByFrame } = data4();
  const allowedProtocols = [
    "blob:",
    "file:",
    "filesystem:",
    "http:",
    "https:"
  ];
  for (const [requestId, request] of requestMap.entries()) {
    if (!request.sendRequests) {
      continue;
    }
    const redirects = [];
    for (let i = 0; i < request.sendRequests.length - 1; i++) {
      const sendRequest = request.sendRequests[i];
      const nextSendRequest = request.sendRequests[i + 1];
      let ts = sendRequest.ts;
      let dur = Types6.Timing.Micro(nextSendRequest.ts - sendRequest.ts);
      if (request.willSendRequests?.[i] && request.willSendRequests[i + 1]) {
        const willSendRequest = request.willSendRequests[i];
        const nextWillSendRequest = request.willSendRequests[i + 1];
        ts = willSendRequest.ts;
        dur = Types6.Timing.Micro(nextWillSendRequest.ts - willSendRequest.ts);
      }
      redirects.push({
        url: allowedProtocols.some((p) => sendRequest.args.data.url.startsWith(p)) ? sendRequest.args.data.url : "",
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
        requestTime: Helpers4.Timing.microToSeconds(request.sendRequests.at(0)?.ts ?? 0),
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
    if (!allowedProtocols.some((p) => finalSendRequest.args.data.url.startsWith(p))) {
      continue;
    }
    const initialPriority = finalSendRequest.args.data.priority;
    let finalPriority = initialPriority;
    if (request.changePriority) {
      finalPriority = request.changePriority.args.data.priority;
    }
    const startTime = request.willSendRequests?.length ? Types6.Timing.Micro(request.willSendRequests[0].ts) : Types6.Timing.Micro(firstSendRequest.ts);
    const endRedirectTime = request.willSendRequests?.length ? Types6.Timing.Micro(request.willSendRequests[request.willSendRequests.length - 1].ts) : Types6.Timing.Micro(finalSendRequest.ts);
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish?.args.data.finishTime ? Types6.Timing.Micro(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(endTime);
    const networkDuration = Types6.Timing.Micro(timing ? (finishTime || endRedirectTime) - endRedirectTime : 0);
    const processingDuration = Types6.Timing.Micro(endTime - (finishTime || endTime));
    const redirectionDuration = Types6.Timing.Micro(endRedirectTime - startTime);
    const queueingFromTraceData = timing ? timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime : 0;
    const queueing = Types6.Timing.Micro(Platform3.NumberUtilities.clamp(queueingFromTraceData, 0, Number.MAX_VALUE));
    const stalled = timing ? Types6.Timing.Micro(firstPositiveValueInList([
      timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
      timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
      timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
      request.receiveResponse ? request.receiveResponse.ts - endRedirectTime : null
    ])) : request.receiveResponse ? Types6.Timing.Micro(request.receiveResponse.ts - startTime) : Types6.Timing.Micro(0);
    const sendStartTime = timing ? Types6.Timing.Micro(
      timing.requestTime * SECONDS_TO_MICROSECONDS + timing.sendStart * MILLISECONDS_TO_MICROSECONDS
    ) : startTime;
    const waiting = timing ? Types6.Timing.Micro((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const serverResponseTime = timing ? Types6.Timing.Micro(
      ((timing.receiveHeadersStart ?? timing.receiveHeadersEnd) - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS
    ) : Types6.Timing.Micro(0);
    const downloadStart = timing ? Types6.Timing.Micro(
      timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS
    ) : startTime;
    const download = timing ? Types6.Timing.Micro((finishTime || downloadStart) - downloadStart) : request.receiveResponse ? Types6.Timing.Micro(endTime - request.receiveResponse.ts) : Types6.Timing.Micro(0);
    const totalTime = Types6.Timing.Micro(networkDuration + processingDuration);
    const dnsLookup = timing ? Types6.Timing.Micro((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const ssl = timing ? Types6.Timing.Micro((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const proxyNegotiation = timing ? Types6.Timing.Micro((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const requestSent = timing ? Types6.Timing.Micro((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const initialConnection = timing ? Types6.Timing.Micro((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS) : Types6.Timing.Micro(0);
    const { frame, url, renderBlocking: sendRequestIsRenderBlocking } = finalSendRequest.args.data;
    const { encodedDataLength, decodedBodyLength } = request.resourceFinish ? request.resourceFinish.args.data : { encodedDataLength: 0, decodedBodyLength: 0 };
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const requestingFrameUrl = Helpers4.Trace.activeURLForFrameAtTime(frame, finalSendRequest.ts, rendererProcessesByFrame) || "";
    const preloadRenderBlockingStatusChange = request.preloadRenderBlockingStatusChange?.at(-1)?.args.data.renderBlocking;
    const isRenderBlocking = preloadRenderBlockingStatusChange ?? sendRequestIsRenderBlocking ?? "non_blocking";
    const networkEvent = Helpers4.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
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
          resourceType: finalSendRequest.args.data.resourceType ?? Network.ResourceType.Other,
          statusCode: request.receiveResponse?.args.data.statusCode ?? 0,
          responseHeaders: request.receiveResponse?.args.data.headers ?? null,
          fetchPriorityHint: finalSendRequest.args.data.fetchPriorityHint ?? "auto",
          initiator: finalSendRequest.args.data.initiator,
          stackTrace: finalSendRequest.args.data.stackTrace?.map(
            (frame2) => ({
              ...frame2,
              url: allowedProtocols.some((p) => frame2.url.startsWith(p)) ? frame2.url : ""
            })
          ),
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
      name: Types6.Events.Name.SYNTHETIC_NETWORK_REQUEST,
      ph: Types6.Events.Phase.COMPLETE,
      dur: Types6.Timing.Micro(endTime - startTime),
      tdur: Types6.Timing.Micro(endTime - startTime),
      ts: Types6.Timing.Micro(startTime),
      tts: Types6.Timing.Micro(startTime),
      pid: finalSendRequest.pid,
      tid: finalSendRequest.tid
    });
    requestsByTime.push(networkEvent);
    requestsById.set(networkEvent.args.data.requestId, networkEvent);
    const requestsForUrl = requestIdsByURL.get(networkEvent.args.data.url) ?? [];
    requestsForUrl.push(networkEvent.args.data.requestId);
    requestIdsByURL.set(networkEvent.args.data.url, requestsForUrl);
    addNetworkRequestToEntityMapping(networkEvent, entityMappings, request);
    const initiatorUrl = networkEvent.args.data.initiator?.url || Helpers4.Trace.getStackTraceTopCallFrameInEventPayload(networkEvent)?.url;
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
function data5() {
  return {
    byId: requestsById,
    byTime: requestsByTime,
    requestIdsByURL,
    incompleteInitiator: eventToInitiatorMap,
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
  webSocketData.forEach((data30) => {
    let startEvent = null;
    let endEvent = null;
    for (const event of data30.events) {
      if (Types6.Events.isWebSocketCreate(event)) {
        startEvent = event;
      }
      if (Types6.Events.isWebSocketDestroy(event)) {
        endEvent = event;
      }
    }
    data30.syntheticConnection = createSyntheticWebSocketConnection(startEvent, endEvent, data30.events[0]);
  });
}
function createSyntheticWebSocketConnection(startEvent, endEvent, firstRecordedEvent) {
  const { traceBounds: traceBounds2 } = data4();
  const startTs = startEvent ? startEvent.ts : traceBounds2.min;
  const endTs = endEvent ? endEvent.ts : traceBounds2.max;
  const duration = endTs - startTs;
  const mainEvent = startEvent || endEvent || firstRecordedEvent;
  return {
    name: "SyntheticWebSocketConnection",
    cat: mainEvent.cat,
    ph: Types6.Events.Phase.COMPLETE,
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
        priority: Network.ResourcePriority.Low,
        url: mainEvent.args.data.url || ""
      }
    }
  };
}

// ../../front_end/models/trace/handlers/SamplesHandler.ts
var SamplesHandler_exports = {};
__export(SamplesHandler_exports, {
  data: () => data6,
  finalize: () => finalize6,
  getProfileCallFunctionName: () => getProfileCallFunctionName,
  handleEvent: () => handleEvent6,
  reset: () => reset6
});
import * as Platform4 from "../../../core/platform/platform.js";
import * as CPUProfile from "../../cpu_profile/cpu_profile.js";
import * as Helpers5 from "../helpers/helpers.js";
import * as Types7 from "../types/types.js";
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
          const ts = Helpers5.Timing.milliToMicro(Types7.Timing.Milli(timeStampMilliseconds));
          const nodeId = node.id;
          const profileCall = Helpers5.Trace.makeProfileCall(node, selectedProfileId, sampleIndex, ts, processId, threadId);
          finalizedData.profileCalls.push(profileCall);
          indexStack.push(finalizedData.profileCalls.length - 1);
          const traceEntryNode = Helpers5.TreeHelpers.makeEmptyTraceEntryNode(profileCall, nodeId);
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
          const dur = Helpers5.Timing.milliToMicro(Types7.Timing.Milli(durMs));
          const selfTime = Helpers5.Timing.milliToMicro(Types7.Timing.Milli(selfTimeMs));
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
      const profileTree = Helpers5.TreeHelpers.makeEmptyTraceEntryTree();
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
function reset6() {
  preprocessedData = /* @__PURE__ */ new Map();
  profilesInProcess = /* @__PURE__ */ new Map();
  entryToNode = /* @__PURE__ */ new Map();
}
function handleEvent6(event) {
  if (Types7.Events.isSyntheticCpuProfile(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    profileData.rawProfile = event.args.data.cpuProfile;
    profileData.threadId = event.tid;
    return;
  }
  if (Types7.Events.isProfile(event)) {
    const profileData = getOrCreatePreProcessedData(event.pid, event.id);
    profileData.rawProfile.startTime = event.ts;
    profileData.threadId = event.tid;
    assignProfileSourceIfKnown(profileData, event.args?.data?.source);
    return;
  }
  if (Types7.Events.isProfileChunk(event)) {
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
    const columns = event.args.data?.columns || Array(samples.length).fill(0);
    cdpProfile.samples?.push(...samples);
    cdpProfile.timeDeltas?.push(...timeDeltas);
    cdpProfile.lines?.push(...lines);
    cdpProfile.columns?.push(...columns);
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
async function finalize6(parseOptions = {}) {
  parseCPUProfileData(parseOptions);
}
function assignProfileSourceIfKnown(profileData, source) {
  if (Types7.Events.VALID_PROFILE_SOURCES.includes(source)) {
    profileData.source = source;
  }
}
function data6() {
  return {
    profilesInProcess,
    entryToNode
  };
}
function getOrCreatePreProcessedData(processId, profileId) {
  const profileById = Platform4.MapUtilities.getWithDefault(preprocessedData, processId, () => /* @__PURE__ */ new Map());
  return Platform4.MapUtilities.getWithDefault(
    profileById,
    profileId,
    () => ({
      rawProfile: {
        startTime: 0,
        endTime: 0,
        nodes: [],
        samples: [],
        timeDeltas: [],
        lines: [],
        columns: []
      },
      profileId
    })
  );
}
function getProfileCallFunctionName(data30, entry) {
  const profile = data30.profilesInProcess.get(entry.pid)?.get(entry.tid);
  const node = profile?.parsedProfile.nodeById(entry.nodeId);
  if (node?.functionName) {
    return node.functionName;
  }
  return entry.callFrame.functionName;
}

// ../../front_end/models/trace/handlers/RendererHandler.ts
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
var config2 = Types8.Configuration.defaults();
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
function handleUserConfig3(userConfig) {
  config2 = userConfig;
}
function reset7() {
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
function handleEvent7(event) {
  if (Types8.Events.isThreadName(event) && event.args.name?.startsWith("CompositorTileWorker")) {
    compositorTileWorkers.push({
      pid: event.pid,
      tid: event.tid
    });
  }
  if (Types8.Events.isBegin(event) || Types8.Events.isEnd(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    const completeEvent = makeCompleteEvent(event);
    if (!completeEvent) {
      return;
    }
    thread.entries.push(completeEvent);
    return;
  }
  if (Types8.Events.isInstant(event) || Types8.Events.isComplete(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.entries.push(event);
  }
  if (Types8.Events.isLayout(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.layoutEvents.push(event);
  }
  if (Types8.Events.isRecalcStyle(event)) {
    const process = getOrCreateRendererProcess(processes, event.pid);
    const thread = getOrCreateRendererThread(process, event.tid);
    thread.recalcStyleEvents.push(event);
  }
}
async function finalize7() {
  const { mainFrameId: mainFrameId2, rendererProcessesByFrame, threadsInProcess: threadsInProcess2 } = data4();
  entityMappings2 = data5().entityMappings;
  assignMeta(processes, mainFrameId2, rendererProcessesByFrame, threadsInProcess2);
  sanitizeProcesses(processes);
  buildHierarchy(processes);
  sanitizeThreads(processes);
}
function data7() {
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
  const metaData = data4();
  if (metaData.traceIsGeneric) {
    return;
  }
  for (const [pid, process] of processes2) {
    if (process.url === null) {
      processes2.delete(pid);
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
  const samplesData = data6();
  for (const [pid, profilesByThread] of samplesData.profilesInProcess) {
    const process = processes2.get(pid);
    if (!process) {
      continue;
    }
    for (const [tid] of profilesByThread) {
      getOrCreateRendererThread(process, tid);
    }
  }
  for (const [pid, process] of processes2) {
    for (const [tid, thread] of process.threads) {
      Helpers6.Trace.sortTraceEventsInPlace(thread.entries);
      const samplesDataForThread = samplesData.profilesInProcess.get(pid)?.get(tid);
      if (samplesDataForThread) {
        const cpuProfile = samplesDataForThread.parsedProfile;
        const samplesIntegrator = cpuProfile && new Helpers6.SamplesIntegrator.SamplesIntegrator(
          cpuProfile,
          samplesDataForThread.profileId,
          pid,
          tid,
          config2
        );
        const profileCalls = samplesIntegrator?.buildProfileCalls(thread.entries);
        if (samplesIntegrator && profileCalls) {
          thread.entries = Helpers6.Trace.mergeEventsInOrder(thread.entries, profileCalls);
          thread.profileCalls = profileCalls;
          const jsSamples = samplesIntegrator.jsSampleEvents;
          if (jsSamples.length) {
            thread.entries = Helpers6.Trace.mergeEventsInOrder(thread.entries, jsSamples);
          }
        }
      }
      if (!thread.entries.length) {
        thread.tree = Helpers6.TreeHelpers.makeEmptyTraceEntryTree();
        continue;
      }
      const treeData = Helpers6.TreeHelpers.treify(thread.entries, options);
      thread.tree = treeData.tree;
      for (const [entry, node] of treeData.entryToNode) {
        entryToNode2.set(entry, node);
        addEventToEntityMapping(entry, entityMappings2);
      }
    }
  }
}
function makeCompleteEvent(event) {
  if (Types8.Events.isEnd(event)) {
    const beginEvent = completeEventStack.pop();
    if (!beginEvent) {
      return null;
    }
    if (beginEvent.name !== event.name || beginEvent.cat !== event.cat) {
      console.error(
        "Begin/End events mismatch at " + beginEvent.ts + " (" + beginEvent.name + ") vs. " + event.ts + " (" + event.name + ")"
      );
      return null;
    }
    beginEvent.dur = Types8.Timing.Micro(event.ts - beginEvent.ts);
    return null;
  }
  const syntheticComplete = {
    ...event,
    ph: Types8.Events.Phase.COMPLETE,
    dur: Types8.Timing.Micro(0)
  };
  completeEventStack.push(syntheticComplete);
  return syntheticComplete;
}
function deps3() {
  return ["Meta", "Samples", "NetworkRequests"];
}

// ../../front_end/models/trace/handlers/AsyncJSCallsHandler.ts
var schedulerToRunEntryPoints = /* @__PURE__ */ new Map();
var taskScheduleForTaskRunEvent = /* @__PURE__ */ new Map();
var asyncCallToScheduler = /* @__PURE__ */ new Map();
var runEntryPointToScheduler = /* @__PURE__ */ new Map();
function reset8() {
  schedulerToRunEntryPoints = /* @__PURE__ */ new Map();
  asyncCallToScheduler = /* @__PURE__ */ new Map();
  taskScheduleForTaskRunEvent = /* @__PURE__ */ new Map();
  runEntryPointToScheduler = /* @__PURE__ */ new Map();
}
function handleEvent8(_) {
}
async function finalize8() {
  const { flows: flows2 } = data3();
  const { entryToNode: entryToNode4 } = data7();
  for (const flow of flows2) {
    let maybeAsyncTaskScheduled = flow.at(0);
    if (!maybeAsyncTaskScheduled) {
      continue;
    }
    if (Types9.Events.isDebuggerAsyncTaskRun(maybeAsyncTaskScheduled)) {
      maybeAsyncTaskScheduled = taskScheduleForTaskRunEvent.get(maybeAsyncTaskScheduled);
    }
    if (!maybeAsyncTaskScheduled || !Types9.Events.isDebuggerAsyncTaskScheduled(maybeAsyncTaskScheduled)) {
      continue;
    }
    const taskName = maybeAsyncTaskScheduled.args.taskName;
    const asyncTaskRun = flow.at(1);
    if (!asyncTaskRun || !Types9.Events.isDebuggerAsyncTaskRun(asyncTaskRun)) {
      continue;
    }
    taskScheduleForTaskRunEvent.set(asyncTaskRun, maybeAsyncTaskScheduled);
    const asyncCaller = findNearestJSAncestor(maybeAsyncTaskScheduled, entryToNode4);
    const asyncEntryPoint = findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode4);
    runEntryPointToScheduler.set(
      asyncEntryPoint || asyncTaskRun,
      { taskName, scheduler: asyncCaller || maybeAsyncTaskScheduled }
    );
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
    if (Types9.Events.isProfileCall(node.entry) || acceptJSInvocationsPredicate(node.entry)) {
      return node.entry;
    }
    node = node.parent;
  }
  return null;
}
function acceptJSInvocationsPredicate(event) {
  const eventIsConsoleRunTask = Types9.Events.isConsoleRunTask(event);
  const eventIsV8EntryPoint = event.name.startsWith("v8") || event.name.startsWith("V8");
  return Types9.Events.isJSInvocationEvent(event) && (eventIsConsoleRunTask || !eventIsV8EntryPoint);
}
function findFirstJsInvocationForAsyncTaskRun(asyncTaskRun, entryToNode4) {
  return findFirstDescendantsOfType(
    asyncTaskRun,
    entryToNode4,
    acceptJSInvocationsPredicate,
    Types9.Events.isDebuggerAsyncTaskRun
  ).at(0);
}
function findFirstJSCallsForAsyncTaskRun(asyncTaskRun, entryToNode4) {
  return findFirstDescendantsOfType(
    asyncTaskRun,
    entryToNode4,
    Types9.Events.isProfileCall,
    Types9.Events.isDebuggerAsyncTaskRun
  );
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
function data8() {
  return {
    schedulerToRunEntryPoints,
    asyncCallToScheduler,
    runEntryPointToScheduler
  };
}
function deps4() {
  return ["Renderer", "Flows"];
}

// ../../front_end/models/trace/handlers/DOMStatsHandler.ts
var DOMStatsHandler_exports = {};
__export(DOMStatsHandler_exports, {
  data: () => data9,
  finalize: () => finalize9,
  handleEvent: () => handleEvent9,
  reset: () => reset9
});
import * as Platform7 from "../../../core/platform/platform.js";
import * as Types10 from "../types/types.js";
var domStatsByFrameId = /* @__PURE__ */ new Map();
function reset9() {
  domStatsByFrameId = /* @__PURE__ */ new Map();
}
function handleEvent9(event) {
  if (!Types10.Events.isDOMStats(event)) {
    return;
  }
  const domStatEvents = Platform7.MapUtilities.getWithDefault(domStatsByFrameId, event.args.data.frame, () => []);
  domStatEvents.push(event);
}
async function finalize9() {
}
function data9() {
  return { domStatsByFrameId };
}

// ../../front_end/models/trace/handlers/ExtensionTraceDataHandler.ts
var ExtensionTraceDataHandler_exports = {};
__export(ExtensionTraceDataHandler_exports, {
  data: () => data11,
  deps: () => deps5,
  extensionDataInConsoleTimeStamp: () => extensionDataInConsoleTimeStamp,
  extensionDataInPerformanceTiming: () => extensionDataInPerformanceTiming,
  extractConsoleAPIExtensionEntries: () => extractConsoleAPIExtensionEntries,
  extractPerformanceAPIExtensionEntries: () => extractPerformanceAPIExtensionEntries,
  finalize: () => finalize11,
  handleEvent: () => handleEvent11,
  reset: () => reset11
});
import * as Helpers8 from "../helpers/helpers.js";
import * as Types12 from "../types/types.js";

// ../../front_end/models/trace/handlers/UserTimingsHandler.ts
var UserTimingsHandler_exports = {};
__export(UserTimingsHandler_exports, {
  data: () => data10,
  finalize: () => finalize10,
  handleEvent: () => handleEvent10,
  reset: () => reset10,
  userTimingComparator: () => userTimingComparator
});
import * as Helpers7 from "../helpers/helpers.js";
import * as Types11 from "../types/types.js";
var syntheticEvents = [];
var measureTraceByTraceId = /* @__PURE__ */ new Map();
var performanceMeasureEvents = [];
var performanceMarkEvents = [];
var consoleTimings = [];
var timestampEvents = [];
function reset10() {
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
    return { start: event.ts, end: Types11.Timing.Micro(event.ts + (event.dur ?? 0)) };
  }
  if (Types11.Events.isConsoleTimeStamp(event)) {
    const { start, end } = event.args.data || {};
    if (typeof start === "number" && typeof end === "number") {
      return { start: Types11.Timing.Micro(start), end: Types11.Timing.Micro(end) };
    }
  }
  return { start: event.ts, end: event.ts };
}
function getEventTrack(event) {
  if (event.cat === "blink.user_timing") {
    const detailString = event.args.data.beginEvent.args?.detail;
    if (detailString) {
      const details = Helpers7.Trace.parseDevtoolsDetails(detailString, "devtools");
      if (details && "track" in details) {
        return details.track;
      }
    }
  } else if (Types11.Events.isConsoleTimeStamp(event)) {
    const track = event.args.data?.track;
    return typeof track === "string" ? track : void 0;
  }
  return void 0;
}
function userTimingComparator(a, b, originalIndex) {
  const { start: aStart, end: aEnd } = getEventTimings(a);
  const { start: bStart, end: bEnd } = getEventTimings(b);
  const timeDifference = Helpers7.Trace.compareBeginAndEnd(aStart, bStart, aEnd, bEnd);
  if (timeDifference) {
    return timeDifference;
  }
  const aTrack = getEventTrack(a);
  const bTrack = getEventTrack(b);
  if (aTrack !== bTrack) {
    return 0;
  }
  const aIndex = originalIndex.get(a) ?? -1;
  const bIndex = originalIndex.get(b) ?? -1;
  return bIndex - aIndex;
}
function handleEvent10(event) {
  if (ignoredNames.includes(event.name)) {
    return;
  }
  if (Types11.Events.isUserTimingMeasure(event)) {
    measureTraceByTraceId.set(event.args.traceId, event);
  }
  if (Types11.Events.isPerformanceMeasure(event)) {
    performanceMeasureEvents.push(event);
    return;
  }
  if (Types11.Events.isPerformanceMark(event)) {
    performanceMarkEvents.push(event);
  }
  if (Types11.Events.isConsoleTime(event)) {
    consoleTimings.push(event);
  }
  if (Types11.Events.isConsoleTimeStamp(event)) {
    timestampEvents.push(event);
  }
}
async function finalize10() {
  const asyncEvents = [...performanceMeasureEvents, ...consoleTimings];
  syntheticEvents = Helpers7.Trace.createMatchedSortedSyntheticEvents(asyncEvents);
  const syntheticIndex = new Map(syntheticEvents.map((e, i) => [e, i]));
  syntheticEvents = syntheticEvents.sort((a, b) => userTimingComparator(a, b, syntheticIndex));
  const timestampIndex = new Map(timestampEvents.map((e, i) => [e, i]));
  timestampEvents = timestampEvents.sort((a, b) => userTimingComparator(a, b, timestampIndex));
}
function data10() {
  return {
    consoleTimings: syntheticEvents.filter((e) => e.cat === "blink.console"),
    performanceMeasures: syntheticEvents.filter((e) => e.cat === "blink.user_timing"),
    performanceMarks: performanceMarkEvents,
    timestampEvents,
    measureTraceByTraceId
  };
}

// ../../front_end/models/trace/handlers/ExtensionTraceDataHandler.ts
var extensionTrackEntries = [];
var extensionTrackData = [];
var extensionMarkers = [];
var entryToNode3 = /* @__PURE__ */ new Map();
var timeStampByName = /* @__PURE__ */ new Map();
var syntheticConsoleEntriesForTimingsTrack = [];
function handleEvent11(_event) {
}
function reset11() {
  extensionTrackEntries = [];
  syntheticConsoleEntriesForTimingsTrack = [];
  extensionTrackData = [];
  extensionMarkers = [];
  entryToNode3 = /* @__PURE__ */ new Map();
  timeStampByName = /* @__PURE__ */ new Map();
}
async function finalize11() {
  createExtensionFlameChartEntries();
}
function createExtensionFlameChartEntries() {
  const pairedMeasures = data10().performanceMeasures;
  const marks = data10().performanceMarks;
  const mergedRawExtensionEvents = Helpers8.Trace.mergeEventsInOrder(pairedMeasures, marks);
  extractPerformanceAPIExtensionEntries(mergedRawExtensionEvents);
  extractConsoleAPIExtensionEntries();
  Helpers8.Trace.sortTraceEventsInPlace(extensionTrackEntries);
  Helpers8.Extensions.buildTrackDataFromExtensionEntries(extensionTrackEntries, extensionTrackData, entryToNode3);
}
function extractConsoleAPIExtensionEntries() {
  const consoleTimeStamps = data10().timestampEvents;
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
    const startTimeStamp = typeof start === "number" ? Types12.Timing.Micro(start) : timeStampByName.get(String(start))?.ts;
    const endTimeStamp = typeof end === "number" ? Types12.Timing.Micro(end) : timeStampByName.get(String(end))?.ts;
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
        dur: Types12.Timing.Micro(entryEndTime - entryStartTime),
        ts: entryStartTime,
        ph: Types12.Events.Phase.COMPLETE
      };
      const extensionEntry = Helpers8.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(unregisteredExtensionEntry);
      extensionTrackEntries.push(extensionEntry);
      continue;
    }
    const unregisteredSyntheticTimeStamp = {
      ...currentTimeStamp,
      name: timeStampName,
      cat: "disabled-by-default-v8.inspector",
      ph: Types12.Events.Phase.COMPLETE,
      ts: entryStartTime,
      dur: Types12.Timing.Micro(entryEndTime - entryStartTime),
      rawSourceEvent: currentTimeStamp
    };
    const syntheticTimeStamp = Helpers8.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(
      unregisteredSyntheticTimeStamp
    );
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
      ph: Types12.Extensions.isExtensionPayloadMarker(devtoolsObj) ? Types12.Events.Phase.INSTANT : Types12.Events.Phase.COMPLETE,
      pid: timing.pid,
      tid: timing.tid,
      ts: timing.ts,
      dur: timing.dur,
      cat: "devtools.extension",
      devtoolsObj,
      userDetail,
      rawSourceEvent: Types12.Events.isSyntheticUserTiming(timing) ? timing.rawSourceEvent : timing
    };
    if (Types12.Extensions.isExtensionPayloadMarker(devtoolsObj)) {
      const extensionMarker = Helpers8.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(
        extensionSyntheticEntry
      );
      extensionMarkers.push(extensionMarker);
      continue;
    }
    if (Types12.Extensions.isExtensionEntryObj(extensionSyntheticEntry.devtoolsObj)) {
      const extensionTrackEntry = Helpers8.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent(
        extensionSyntheticEntry
      );
      extensionTrackEntries.push(extensionTrackEntry);
      continue;
    }
  }
}
function extensionDataInPerformanceTiming(timing) {
  const timingDetail = Types12.Events.isPerformanceMark(timing) ? timing.args.data?.detail : timing.args.data.beginEvent.args.detail;
  if (!timingDetail) {
    return { devtoolsObj: null, userDetail: null };
  }
  const devtoolsObj = Helpers8.Trace.parseDevtoolsDetails(timingDetail, "devtools");
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
function data11() {
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

// ../../front_end/models/trace/handlers/FramesHandler.ts
var FramesHandler_exports = {};
__export(FramesHandler_exports, {
  LayerPaintEvent: () => LayerPaintEvent,
  PendingFrame: () => PendingFrame,
  TimelineFrameBeginFrameQueue: () => TimelineFrameBeginFrameQueue,
  TimelineFrameModel: () => TimelineFrameModel,
  data: () => data13,
  deps: () => deps7,
  finalize: () => finalize13,
  framesWithinWindow: () => framesWithinWindow,
  handleEvent: () => handleEvent13,
  reset: () => reset13
});
import * as Platform8 from "../../../core/platform/platform.js";
import * as Helpers10 from "../helpers/helpers.js";
import * as Types14 from "../types/types.js";

// ../../front_end/models/trace/handlers/LayerTreeHandler.ts
var LayerTreeHandler_exports = {};
__export(LayerTreeHandler_exports, {
  data: () => data12,
  deps: () => deps6,
  finalize: () => finalize12,
  handleEvent: () => handleEvent12,
  reset: () => reset12
});
import * as Helpers9 from "../helpers/helpers.js";
import * as Types13 from "../types/types.js";
var paintEvents = [];
var snapshotEvents = [];
var paintToSnapshotMap = /* @__PURE__ */ new Map();
var lastPaintForLayerId = {};
var currentMainFrameLayerTreeId = null;
var updateLayerEvents = [];
var relevantEvents = [];
function reset12() {
  paintEvents = [];
  snapshotEvents = [];
  paintToSnapshotMap = /* @__PURE__ */ new Map();
  lastPaintForLayerId = {};
  currentMainFrameLayerTreeId = null;
  updateLayerEvents = [];
  relevantEvents = [];
}
function handleEvent12(event) {
  if (Types13.Events.isPaint(event) || Types13.Events.isDisplayListItemListSnapshot(event) || Types13.Events.isUpdateLayer(event) || Types13.Events.isSetLayerId(event)) {
    relevantEvents.push(event);
  }
}
async function finalize12() {
  const metaData = data4();
  Helpers9.Trace.sortTraceEventsInPlace(relevantEvents);
  for (const event of relevantEvents) {
    if (Types13.Events.isSetLayerId(event)) {
      if (metaData.mainFrameId !== event.args.data.frame) {
        continue;
      }
      currentMainFrameLayerTreeId = event.args.data.layerTreeId;
    } else if (Types13.Events.isUpdateLayer(event)) {
      updateLayerEvents.push(event);
    } else if (Types13.Events.isPaint(event)) {
      if (!event.args.data.layerId) {
        continue;
      }
      paintEvents.push(event);
      lastPaintForLayerId[event.args.data.layerId] = event;
      continue;
    } else if (Types13.Events.isDisplayListItemListSnapshot(event)) {
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
function data12() {
  return {
    paints: paintEvents,
    snapshots: snapshotEvents,
    paintsToSnapshots: paintToSnapshotMap
  };
}
function deps6() {
  return ["Meta"];
}

// ../../front_end/models/trace/handlers/Threads.ts
var Threads_exports = {};
__export(Threads_exports, {
  ThreadType: () => ThreadType,
  threadsInRenderer: () => threadsInRenderer,
  threadsInTrace: () => threadsInTrace
});
var ThreadType = /* @__PURE__ */ ((ThreadType2) => {
  ThreadType2["MAIN_THREAD"] = "MAIN_THREAD";
  ThreadType2["WORKER"] = "WORKER";
  ThreadType2["RASTERIZER"] = "RASTERIZER";
  ThreadType2["OTHER"] = "OTHER";
  ThreadType2["CPU_PROFILE"] = "CPU_PROFILE";
  ThreadType2["THREAD_POOL"] = "THREAD_POOL";
  return ThreadType2;
})(ThreadType || {});
function getThreadTypeForRendererThread(pid, thread) {
  let threadType = "OTHER" /* OTHER */;
  if (thread.name === "CrRendererMain") {
    threadType = "MAIN_THREAD" /* MAIN_THREAD */;
  } else if (thread.name === "DedicatedWorker thread") {
    threadType = "WORKER" /* WORKER */;
  } else if (thread.name?.startsWith("CompositorTileWorker")) {
    threadType = "RASTERIZER" /* RASTERIZER */;
  } else if (thread.name?.startsWith("ThreadPool")) {
    threadType = "THREAD_POOL" /* THREAD_POOL */;
  }
  return threadType;
}
function threadsInRenderer(rendererData) {
  const foundThreads = [];
  if (rendererData.processes.size) {
    for (const [pid, process] of rendererData.processes) {
      for (const [tid, thread] of process.threads) {
        if (!thread.tree) {
          continue;
        }
        const threadType = getThreadTypeForRendererThread(pid, thread);
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
  const threadsFromRenderer = threadsInRenderer(handlerData.Renderer);
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
          type: "CPU_PROFILE" /* CPU_PROFILE */,
          entryToNode: handlerData.Samples.entryToNode
        });
      }
    }
  }
  threadsInHandlerDataCache.set(handlerData, foundThreads);
  return foundThreads;
}

// ../../front_end/models/trace/handlers/FramesHandler.ts
var model = null;
var relevantFrameEvents = [];
function isFrameEvent(event) {
  return Types14.Events.isSetLayerId(event) || Types14.Events.isBeginFrame(event) || Types14.Events.isDroppedFrame(event) || Types14.Events.isRequestMainThreadFrame(event) || Types14.Events.isBeginMainThreadFrame(event) || Types14.Events.isNeedsBeginFrameChanged(event) || // Note that "Commit" is the replacement for "CompositeLayers" so in a trace
  // we wouldn't expect to see a combination of these. All "new" trace
  // recordings use "Commit", but we can easily support "CompositeLayers" too
  // to not break older traces being imported.
  Types14.Events.isCommit(event) || Types14.Events.isCompositeLayers(event) || Types14.Events.isActivateLayerTree(event) || Types14.Events.isDrawFrame(event);
}
function entryIsTopLevel(entry) {
  const devtoolsTimelineCategory = "disabled-by-default-devtools.timeline";
  return entry.name === Types14.Events.Name.RUN_TASK && entry.cat.includes(devtoolsTimelineCategory);
}
var MAIN_FRAME_MARKERS = /* @__PURE__ */ new Set([
  Types14.Events.Name.SCHEDULE_STYLE_RECALCULATION,
  Types14.Events.Name.INVALIDATE_LAYOUT,
  Types14.Events.Name.BEGIN_MAIN_THREAD_FRAME,
  Types14.Events.Name.SCROLL_LAYER
]);
function reset13() {
  model = null;
  relevantFrameEvents = [];
}
function handleEvent13(event) {
  if (isFrameEvent(event) || Types14.Events.isLayerTreeHostImplSnapshot(event) || entryIsTopLevel(event) || MAIN_FRAME_MARKERS.has(event.name) || Types14.Events.isPaint(event)) {
    relevantFrameEvents.push(event);
  }
}
async function finalize13() {
  Helpers10.Trace.sortTraceEventsInPlace(relevantFrameEvents);
  const modelForTrace = new TimelineFrameModel(
    relevantFrameEvents,
    data7(),
    data4(),
    data12()
  );
  model = modelForTrace;
}
function data13() {
  return {
    frames: model?.frames() ?? [],
    framesById: model?.framesById() ?? {}
  };
}
function deps7() {
  return ["Meta", "Renderer", "LayerTree"];
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
  constructor(allEvents, rendererData, metaData, layerTreeData) {
    const mainThreads = threadsInRenderer(rendererData).filter((thread) => {
      return thread.type === "MAIN_THREAD" /* MAIN_THREAD */ && thread.processIsOnMainFrame;
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
    this.#lastFrame = new TimelineFrame(seqId, startTime, Types14.Timing.Micro(startTime - data4().traceBounds.min));
  }
  #flushFrame(frame, endTime) {
    frame.setLayerTree(this.#lastLayerTree);
    frame.setEndTime(endTime);
    if (this.#lastLayerTree) {
      this.#lastLayerTree.paints = frame.paints;
    }
    const lastFrame = this.#frames[this.#frames.length - 1];
    if (this.#frames.length && lastFrame && (frame.startTime !== lastFrame.endTime || frame.startTime > frame.endTime)) {
      console.assert(
        false,
        `Inconsistent frame time for frame ${this.#frames.length} (${frame.startTime} - ${frame.endTime})`
      );
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
    if (Types14.Events.isSetLayerId(event) && event.args.data.frame === mainFrameId2) {
      this.#layerTreeId = event.args.data.layerTreeId;
    } else if (Types14.Events.isLayerTreeHostImplSnapshot(event) && Number(event.id) === this.#layerTreeId) {
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
    if (Types14.Events.isBeginFrame(entry)) {
      this.#handleBeginFrame(entry.ts, entry.args["frameSeqId"]);
    } else if (Types14.Events.isDrawFrame(entry)) {
      this.#handleDrawFrame(entry.ts, entry.args["frameSeqId"]);
    } else if (Types14.Events.isActivateLayerTree(entry)) {
      this.#handleActivateLayerTree();
    } else if (Types14.Events.isRequestMainThreadFrame(entry)) {
      this.#handleRequestMainThreadFrame();
    } else if (Types14.Events.isNeedsBeginFrameChanged(entry)) {
      this.#handleNeedFrameChanged(entry.ts, entry.args["data"] && Boolean(entry.args["data"]["needsBeginFrame"]));
    } else if (Types14.Events.isDroppedFrame(entry)) {
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
    if (Types14.Events.isBeginMainThreadFrame(entry) && entry.args.data.frameId) {
      this.#framePendingCommit.mainFrameId = entry.args.data.frameId;
    }
    if (Types14.Events.isPaint(entry)) {
      const snapshot = this.#layerTreeData.paintsToSnapshots.get(entry);
      if (snapshot) {
        this.#framePendingCommit.paints.push(new LayerPaintEvent(entry, snapshot));
      }
    }
    if ((Types14.Events.isCompositeLayers(entry) || Types14.Events.isCommit(entry)) && entry.args["layerTreeId"] === this.#layerTreeId) {
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
  ph = Types14.Events.Phase.COMPLETE;
  ts;
  pid = Types14.Events.ProcessID(-1);
  tid = Types14.Events.ThreadID(-1);
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
    this.duration = Types14.Timing.Micro(0);
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
    this.duration = Types14.Timing.Micro(this.endTime - this.startTime);
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
  mapFrames = /* @__PURE__ */ new Map();
  // Add a BeginFrame to the queue, if it does not already exit.
  addFrameIfNotExists(seqId, startTime, isDropped, isPartial) {
    if (!this.mapFrames.has(seqId)) {
      this.mapFrames.set(seqId, new BeginFrameInfo(seqId, startTime, isDropped, isPartial));
      this.queueFrames.push(seqId);
    }
  }
  // Set a BeginFrame in queue as dropped.
  setDropped(seqId, isDropped) {
    const frame = this.mapFrames.get(seqId);
    if (frame) {
      frame.isDropped = isDropped;
    }
  }
  setPartial(seqId, isPartial) {
    const frame = this.mapFrames.get(seqId);
    if (frame) {
      frame.isPartial = isPartial;
    }
  }
  processPendingBeginFramesOnDrawFrame(seqId) {
    const framesToVisualize = [];
    if (this.mapFrames.has(seqId)) {
      while (this.queueFrames[0] !== seqId) {
        const currentSeqId = this.queueFrames[0];
        const currentFrame = this.mapFrames.get(currentSeqId);
        if (currentFrame && currentFrame.isDropped) {
          framesToVisualize.push(currentFrame);
        }
        this.mapFrames.delete(currentSeqId);
        this.queueFrames.shift();
      }
      const frame = this.mapFrames.get(seqId);
      if (frame) {
        framesToVisualize.push(frame);
      }
      this.mapFrames.delete(seqId);
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

// ../../front_end/models/trace/handlers/GPUHandler.ts
var GPUHandler_exports = {};
__export(GPUHandler_exports, {
  data: () => data14,
  deps: () => deps8,
  finalize: () => finalize14,
  handleEvent: () => handleEvent14,
  reset: () => reset14
});
import * as Helpers11 from "../helpers/helpers.js";
import * as Types15 from "../types/types.js";
var eventsInProcessThread = /* @__PURE__ */ new Map();
var mainGPUThreadTasks = [];
function reset14() {
  eventsInProcessThread = /* @__PURE__ */ new Map();
  mainGPUThreadTasks = [];
}
function handleEvent14(event) {
  if (!Types15.Events.isGPUTask(event)) {
    return;
  }
  Helpers11.Trace.addEventToProcessThread(event, eventsInProcessThread);
}
async function finalize14() {
  const { gpuProcessId: gpuProcessId2, gpuThreadId: gpuThreadId2 } = data4();
  const gpuThreadsForProcess = eventsInProcessThread.get(gpuProcessId2);
  if (gpuThreadsForProcess && gpuThreadId2) {
    mainGPUThreadTasks = gpuThreadsForProcess.get(gpuThreadId2) || [];
  }
}
function data14() {
  return {
    mainGPUThreadTasks
  };
}
function deps8() {
  return ["Meta"];
}

// ../../front_end/models/trace/handlers/ImagePaintingHandler.ts
var ImagePaintingHandler_exports = {};
__export(ImagePaintingHandler_exports, {
  data: () => data15,
  finalize: () => finalize15,
  handleEvent: () => handleEvent15,
  reset: () => reset15
});
import * as Platform9 from "../../../core/platform/platform.js";
import * as Types16 from "../types/types.js";
var paintImageEvents = /* @__PURE__ */ new Map();
var decodeLazyPixelRefEvents = /* @__PURE__ */ new Map();
var paintImageByLazyPixelRef = /* @__PURE__ */ new Map();
var eventToPaintImage = /* @__PURE__ */ new Map();
var urlToPaintImage = /* @__PURE__ */ new Map();
var paintEventToCorrectedDisplaySize = /* @__PURE__ */ new Map();
var didCorrectForHostDpr = false;
function reset15() {
  paintImageEvents = /* @__PURE__ */ new Map();
  decodeLazyPixelRefEvents = /* @__PURE__ */ new Map();
  paintImageByLazyPixelRef = /* @__PURE__ */ new Map();
  eventToPaintImage = /* @__PURE__ */ new Map();
  urlToPaintImage = /* @__PURE__ */ new Map();
  paintEventToCorrectedDisplaySize = /* @__PURE__ */ new Map();
  didCorrectForHostDpr = false;
}
function handleEvent15(event) {
  if (Types16.Events.isPaintImage(event)) {
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
  if (Types16.Events.isDecodeLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== "undefined") {
    const forProcess = decodeLazyPixelRefEvents.get(event.pid) || /* @__PURE__ */ new Map();
    const forThread = forProcess.get(event.tid) || [];
    forThread.push(event);
    forProcess.set(event.tid, forThread);
    decodeLazyPixelRefEvents.set(event.pid, forProcess);
  }
  if (Types16.Events.isDrawLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== "undefined") {
    const lastPaintEvent = paintImageEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (!lastPaintEvent) {
      return;
    }
    paintImageByLazyPixelRef.set(event.args.LazyPixelRef, lastPaintEvent);
    return;
  }
  if (Types16.Events.isDecodeImage(event)) {
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
async function finalize15(options) {
  if (!options.metadata?.hostDPR) {
    return;
  }
  const { devicePixelRatio: emulatedDpr } = data4();
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
function data15() {
  return {
    paintImageByDrawLazyPixelRef: paintImageByLazyPixelRef,
    paintImageForEvent: eventToPaintImage,
    paintImageEventForUrl: urlToPaintImage,
    paintEventToCorrectedDisplaySize,
    didCorrectForHostDpr
  };
}

// ../../front_end/models/trace/handlers/InitiatorsHandler.ts
var InitiatorsHandler_exports = {};
__export(InitiatorsHandler_exports, {
  data: () => data16,
  deps: () => deps9,
  finalize: () => finalize16,
  handleEvent: () => handleEvent16,
  reset: () => reset16
});
import * as Helpers12 from "../helpers/helpers.js";
import * as Types17 from "../types/types.js";
var lastScheduleStyleRecalcByFrame = /* @__PURE__ */ new Map();
var lastInvalidationEventForFrame = /* @__PURE__ */ new Map();
var lastRecalcByFrame = /* @__PURE__ */ new Map();
var eventToInitiatorMap2 = /* @__PURE__ */ new Map();
var initiatorToEventsMap = /* @__PURE__ */ new Map();
var timerInstallEventsById = /* @__PURE__ */ new Map();
var requestIdleCallbackEventsById = /* @__PURE__ */ new Map();
var webSocketCreateEventsById = /* @__PURE__ */ new Map();
var schedulePostTaskCallbackEventsById = /* @__PURE__ */ new Map();
function reset16() {
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
function storeInitiator(data30) {
  eventToInitiatorMap2.set(data30.event, data30.initiator);
  const eventsForInitiator = initiatorToEventsMap.get(data30.initiator) || [];
  eventsForInitiator.push(data30.event);
  initiatorToEventsMap.set(data30.initiator, eventsForInitiator);
}
function handleEvent16(event) {
  if (Types17.Events.isScheduleStyleRecalculation(event)) {
    lastScheduleStyleRecalcByFrame.set(event.args.data.frame, event);
  } else if (Types17.Events.isRecalcStyle(event)) {
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
  } else if (Types17.Events.isInvalidateLayout(event)) {
    let invalidationInitiator = event;
    if (!lastInvalidationEventForFrame.has(event.args.data.frame)) {
      const lastRecalcStyleForFrame = lastRecalcByFrame.get(event.args.data.frame);
      if (lastRecalcStyleForFrame) {
        const { endTime } = Helpers12.Timing.eventTimingsMicroSeconds(lastRecalcStyleForFrame);
        const initiatorOfRecalcStyle = eventToInitiatorMap2.get(lastRecalcStyleForFrame);
        if (initiatorOfRecalcStyle && endTime && endTime > event.ts) {
          invalidationInitiator = initiatorOfRecalcStyle;
        }
      }
    }
    lastInvalidationEventForFrame.set(event.args.data.frame, invalidationInitiator);
  } else if (Types17.Events.isLayout(event)) {
    const lastInvalidation = lastInvalidationEventForFrame.get(event.args.beginData.frame);
    if (lastInvalidation) {
      storeInitiator({
        event,
        initiator: lastInvalidation
      });
    }
    lastInvalidationEventForFrame.delete(event.args.beginData.frame);
  } else if (Types17.Events.isTimerInstall(event)) {
    timerInstallEventsById.set(event.args.data.timerId, event);
  } else if (Types17.Events.isTimerFire(event)) {
    const matchingInstall = timerInstallEventsById.get(event.args.data.timerId);
    if (matchingInstall) {
      storeInitiator({ event, initiator: matchingInstall });
    }
  } else if (Types17.Events.isRequestIdleCallback(event)) {
    requestIdleCallbackEventsById.set(event.args.data.id, event);
  } else if (Types17.Events.isFireIdleCallback(event)) {
    const matchingRequestEvent = requestIdleCallbackEventsById.get(event.args.data.id);
    if (matchingRequestEvent) {
      storeInitiator({
        event,
        initiator: matchingRequestEvent
      });
    }
  } else if (Types17.Events.isWebSocketCreate(event)) {
    webSocketCreateEventsById.set(event.args.data.identifier, event);
  } else if (Types17.Events.isWebSocketInfo(event) || Types17.Events.isWebSocketTransfer(event)) {
    const matchingCreateEvent = webSocketCreateEventsById.get(event.args.data.identifier);
    if (matchingCreateEvent) {
      storeInitiator({
        event,
        initiator: matchingCreateEvent
      });
    }
  } else if (Types17.Events.isSchedulePostTaskCallback(event)) {
    schedulePostTaskCallbackEventsById.set(event.args.data.taskId, event);
  } else if (Types17.Events.isRunPostTaskCallback(event) || Types17.Events.isAbortPostTaskCallback(event)) {
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
  const asyncCallEntries = data8().schedulerToRunEntryPoints.entries();
  for (const [asyncCaller, asyncCallees] of asyncCallEntries) {
    for (const asyncCallee of asyncCallees) {
      storeInitiator({ event: asyncCallee, initiator: asyncCaller });
    }
  }
}
async function finalize16() {
  createRelationshipsFromFlows();
  createRelationshipsFromAsyncJSCalls();
}
function data16() {
  return {
    eventToInitiator: eventToInitiatorMap2,
    initiatorToEvents: initiatorToEventsMap
  };
}
function deps9() {
  return ["Flows", "AsyncJSCalls"];
}

// ../../front_end/models/trace/handlers/InvalidationsHandler.ts
var InvalidationsHandler_exports = {};
__export(InvalidationsHandler_exports, {
  data: () => data17,
  finalize: () => finalize17,
  handleEvent: () => handleEvent17,
  handleUserConfig: () => handleUserConfig4,
  reset: () => reset17
});
import * as Types18 from "../types/types.js";
var frameStateByFrame = /* @__PURE__ */ new Map();
var maxInvalidationsPerEvent = null;
function reset17() {
  frameStateByFrame.clear();
  maxInvalidationsPerEvent = null;
}
function handleUserConfig4(userConfig) {
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
  if (Types18.Events.isRecalcStyle(event) || Types18.Events.isLayout(event)) {
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
function handleEvent17(event) {
  if (maxInvalidationsPerEvent === 0) {
    return;
  }
  const frameId = getFrameId(event);
  if (!frameId) {
    return;
  }
  const thisFrame = getState(frameId);
  if (Types18.Events.isRecalcStyle(event)) {
    thisFrame.lastRecalcStyleEvent = event;
    for (const invalidation of thisFrame.pendingInvalidations) {
      if (Types18.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
    return;
  }
  if (Types18.Events.isInvalidationTracking(event)) {
    if (thisFrame.hasPainted) {
      thisFrame.pendingInvalidations.length = 0;
      thisFrame.lastRecalcStyleEvent = null;
      thisFrame.hasPainted = false;
    }
    if (thisFrame.lastRecalcStyleEvent && (Types18.Events.isScheduleStyleInvalidationTracking(event) || Types18.Events.isStyleRecalcInvalidationTracking(event) || Types18.Events.isStyleInvalidatorInvalidationTracking(event))) {
      const recalcLastRecalc = thisFrame.lastRecalcStyleEvent;
      const recalcEndTime = recalcLastRecalc.ts + (recalcLastRecalc.dur || 0);
      if (event.ts >= recalcLastRecalc.ts && event.ts <= recalcEndTime) {
        addInvalidationToEvent(thisFrame, recalcLastRecalc, event);
      }
    }
    thisFrame.pendingInvalidations.push(event);
    return;
  }
  if (Types18.Events.isPaint(event)) {
    thisFrame.hasPainted = true;
    return;
  }
  if (Types18.Events.isLayout(event)) {
    for (const invalidation of thisFrame.pendingInvalidations) {
      if (!Types18.Events.isLayoutInvalidationTracking(invalidation)) {
        continue;
      }
      addInvalidationToEvent(thisFrame, event, invalidation);
    }
  }
}
async function finalize17() {
}
function data17() {
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

// ../../front_end/models/trace/handlers/LargestImagePaintHandler.ts
var LargestImagePaintHandler_exports = {};
__export(LargestImagePaintHandler_exports, {
  data: () => data19,
  deps: () => deps11,
  finalize: () => finalize19,
  handleEvent: () => handleEvent19,
  reset: () => reset19
});
import * as Platform11 from "../../../core/platform/platform.js";
import * as Types20 from "../types/types.js";

// ../../front_end/models/trace/handlers/PageLoadMetricsHandler.ts
var PageLoadMetricsHandler_exports = {};
__export(PageLoadMetricsHandler_exports, {
  MetricName: () => MetricName,
  ScoreClassification: () => ScoreClassification,
  data: () => data18,
  deps: () => deps10,
  finalize: () => finalize18,
  getFrameIdForPageLoadEvent: () => getFrameIdForPageLoadEvent,
  handleEvent: () => handleEvent18,
  handleUserConfig: () => handleUserConfig5,
  metricIsLCP: () => metricIsLCP,
  reset: () => reset18,
  scoreClassificationForDOMContentLoaded: () => scoreClassificationForDOMContentLoaded,
  scoreClassificationForFirstContentfulPaint: () => scoreClassificationForFirstContentfulPaint,
  scoreClassificationForLargestContentfulPaint: () => scoreClassificationForLargestContentfulPaint,
  scoreClassificationForTimeToInteractive: () => scoreClassificationForTimeToInteractive,
  scoreClassificationForTotalBlockingTime: () => scoreClassificationForTotalBlockingTime
});
import * as Platform10 from "../../../core/platform/platform.js";
import * as Helpers13 from "../helpers/helpers.js";
import * as Types19 from "../types/types.js";
var metricScoresByFrameId = /* @__PURE__ */ new Map();
var allMarkerEvents = [];
var metaCharsetCheckEventsByNavigation = /* @__PURE__ */ new Map();
var metaCharsetCheckEventsArray = [];
function reset18() {
  metricScoresByFrameId = /* @__PURE__ */ new Map();
  pageLoadEventsArray = [];
  allMarkerEvents = [];
  selectedLCPCandidateEvents = /* @__PURE__ */ new Set();
  metaCharsetCheckEventsByNavigation = /* @__PURE__ */ new Map();
  metaCharsetCheckEventsArray = [];
}
var enableSoftNavigation = true;
function handleUserConfig5(userConfig) {
  enableSoftNavigation = userConfig.enableSoftNavigation;
}
var pageLoadEventsArray = [];
var selectedLCPCandidateEvents = /* @__PURE__ */ new Set();
function handleEvent18(event) {
  if (Types19.Events.isMetaCharsetCheck(event)) {
    metaCharsetCheckEventsArray.push(event);
    return;
  }
  if (!Types19.Events.eventIsPageLoadEvent(event)) {
    return;
  }
  if (!enableSoftNavigation && (Types19.Events.isSoftNavigationStart(event) || event.name === Types19.Events.Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION || Types19.Events.isSoftFirstContentfulPaint(event))) {
    return;
  }
  pageLoadEventsArray.push(event);
  if (Types19.Events.isSoftNavigationStart(event) && event.args?.context?.firstContentfulPaint) {
    const syntheticSoftFcpEvent = Helpers13.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      name: Types19.Events.Name.MARK_SOFT_FCP,
      ph: Types19.Events.Phase.MARK,
      rawSourceEvent: event,
      pid: event.pid,
      tid: event.tid,
      ts: Types19.Timing.Micro(event.args.context.firstContentfulPaint),
      cat: event.cat,
      args: {
        frame: event.args.frame,
        context: {
          ...event.args.context
        }
      }
    });
    pageLoadEventsArray.push(syntheticSoftFcpEvent);
  }
}
function storePageLoadMetricAgainstNavigationId(navigation, event) {
  const frameId = getFrameIdForPageLoadEvent(event);
  const { rendererProcessesByFrame } = data4();
  const rendererProcessesInFrame = rendererProcessesByFrame.get(frameId);
  if (!rendererProcessesInFrame) {
    return;
  }
  const processData = rendererProcessesInFrame.get(event.pid);
  if (!processData) {
    return;
  }
  if (Types19.Events.isNavigationStart(event)) {
    return;
  }
  if (Types19.Events.isAnyFirstContentfulPaint(event)) {
    const fcpTime = Types19.Timing.Micro(event.ts - navigation.ts);
    const classification = scoreClassificationForFirstContentfulPaint(fcpTime);
    const metricScore = { event, metricName: "FCP" /* FCP */, classification, navigation, timing: fcpTime };
    storeMetricScore(frameId, navigation, metricScore);
    return;
  }
  if (Types19.Events.isFirstPaint(event)) {
    const paintTime = Types19.Timing.Micro(event.ts - navigation.ts);
    const classification = "unclassified" /* UNCLASSIFIED */;
    const metricScore = { event, metricName: "FP" /* FP */, classification, navigation, timing: paintTime };
    storeMetricScore(frameId, navigation, metricScore);
    return;
  }
  if (Types19.Events.isMarkDOMContent(event)) {
    const dclTime = Types19.Timing.Micro(event.ts - navigation.ts);
    const metricScore = {
      event,
      metricName: "DCL" /* DCL */,
      classification: scoreClassificationForDOMContentLoaded(dclTime),
      navigation,
      timing: dclTime
    };
    storeMetricScore(frameId, navigation, metricScore);
    return;
  }
  if (Types19.Events.isInteractiveTime(event)) {
    const ttiValue = Types19.Timing.Micro(event.ts - navigation.ts);
    const tti = {
      event,
      metricName: "TTI" /* TTI */,
      classification: scoreClassificationForTimeToInteractive(ttiValue),
      navigation,
      timing: ttiValue
    };
    storeMetricScore(frameId, navigation, tti);
    const tbtValue = Helpers13.Timing.milliToMicro(Types19.Timing.Milli(event.args.args.total_blocking_time_ms));
    const tbt = {
      event,
      metricName: "TBT" /* TBT */,
      classification: scoreClassificationForTotalBlockingTime(tbtValue),
      navigation,
      timing: tbtValue
    };
    storeMetricScore(frameId, navigation, tbt);
    return;
  }
  if (Types19.Events.isMarkLoad(event)) {
    const loadTime = Types19.Timing.Micro(event.ts - navigation.ts);
    const metricScore = {
      event,
      metricName: "L" /* L */,
      classification: "unclassified" /* UNCLASSIFIED */,
      navigation,
      timing: loadTime
    };
    storeMetricScore(frameId, navigation, metricScore);
    return;
  }
  if (Types19.Events.isAnyLargestContentfulPaintCandidate(event)) {
    const candidateIndex = event.args.data?.candidateIndex;
    if (!candidateIndex) {
      throw new Error("Largest Contentful Paint unexpectedly had no candidateIndex.");
    }
    const lcpTime = Types19.Timing.Micro(event.ts - navigation.ts);
    const lcp = {
      event,
      metricName: "LCP" /* LCP */,
      classification: scoreClassificationForLargestContentfulPaint(lcpTime),
      navigation,
      timing: lcpTime
    };
    const metricsByNavigation = Platform10.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
    const metrics = Platform10.MapUtilities.getWithDefault(metricsByNavigation, navigation, () => /* @__PURE__ */ new Map());
    const lastLCPCandidate = metrics.get("LCP" /* LCP */);
    if (lastLCPCandidate === void 0) {
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigation, lcp);
      return;
    }
    const lastLCPCandidateEvent = lastLCPCandidate.event;
    if (!Types19.Events.isAnyLargestContentfulPaintCandidate(lastLCPCandidateEvent)) {
      return;
    }
    const lastCandidateIndex = lastLCPCandidateEvent.args.data?.candidateIndex;
    if (!lastCandidateIndex) {
      return;
    }
    if (lastCandidateIndex < candidateIndex) {
      selectedLCPCandidateEvents.delete(lastLCPCandidateEvent);
      selectedLCPCandidateEvents.add(lcp.event);
      storeMetricScore(frameId, navigation, lcp);
    }
    return;
  }
  if (Types19.Events.isLayoutShift(event)) {
    return;
  }
  if (Types19.Events.isSoftNavigationStart(event)) {
    return;
  }
  return Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function storeMetricScore(frameId, navigation, metricScore) {
  const metricsByNavigation = Platform10.MapUtilities.getWithDefault(metricScoresByFrameId, frameId, () => /* @__PURE__ */ new Map());
  const metrics = Platform10.MapUtilities.getWithDefault(metricsByNavigation, navigation, () => /* @__PURE__ */ new Map());
  metrics.delete(metricScore.metricName);
  metrics.set(metricScore.metricName, metricScore);
}
function getFrameIdForPageLoadEvent(event) {
  if (Types19.Events.isAnyFirstContentfulPaint(event) || Types19.Events.isInteractiveTime(event) || Types19.Events.isAnyLargestContentfulPaintCandidate(event) || Types19.Events.isNavigationStart(event) || Types19.Events.isSoftNavigationStart(event) || Types19.Events.isLayoutShift(event) || Types19.Events.isFirstPaint(event)) {
    return event.args.frame;
  }
  if (Types19.Events.isMarkDOMContent(event) || Types19.Events.isMarkLoad(event)) {
    const frameId = event.args.data?.frame;
    if (!frameId) {
      throw new Error("MarkDOMContent unexpectedly had no frame ID.");
    }
    return frameId;
  }
  Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function getNavigationForPageLoadEvent(event) {
  if (Types19.Events.isAnyFirstContentfulPaint(event) || Types19.Events.isAnyLargestContentfulPaintCandidate(event) || Types19.Events.isFirstPaint(event)) {
    const { navigationsByNavigationId: navigationsByNavigationId2, softNavigationsById: softNavigationsById2 } = data4();
    let navigation;
    if (event.name === Types19.Events.Name.MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION && event.args.data?.performanceTimelineNavigationId) {
      navigation = softNavigationsById2.get(event.args.data.performanceTimelineNavigationId);
      if (!navigation) {
        return null;
      }
    } else if (Types19.Events.isSoftFirstContentfulPaint(event) && event.args.context?.performanceTimelineNavigationId) {
      navigation = softNavigationsById2.get(event.args.context.performanceTimelineNavigationId);
      if (!navigation) {
        return null;
      }
    } else {
      const navigationId = event.args.data?.navigationId;
      if (!navigationId) {
        throw new Error(`Trace event unexpectedly had no navigation ID: ${JSON.stringify(event, null, 2)}`);
      }
      navigation = navigationsByNavigationId2.get(navigationId);
    }
    if (!navigation) {
      return null;
    }
    return navigation;
  }
  if (Types19.Events.isSoftNavigationStart(event)) {
    const { softNavigationsById: softNavigationsById2 } = data4();
    return softNavigationsById2.get(event.args.context.performanceTimelineNavigationId) ?? null;
  }
  if (Types19.Events.isMarkDOMContent(event) || Types19.Events.isInteractiveTime(event) || Types19.Events.isLayoutShift(event) || Types19.Events.isMarkLoad(event)) {
    const frameId = getFrameIdForPageLoadEvent(event);
    const { navigationsByFrameId: navigationsByFrameId2 } = data4();
    return Helpers13.Trace.getNavigationForTraceEvent(event, frameId, navigationsByFrameId2);
  }
  if (Types19.Events.isNavigationStart(event)) {
    return null;
  }
  return Platform10.assertNever(event, `Unexpected event type: ${event}`);
}
function scoreClassificationForFirstContentfulPaint(fcpScoreInMicroseconds) {
  const FCP_GOOD_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(1.8));
  const FCP_MEDIUM_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(3));
  let scoreClassification = "bad" /* BAD */;
  if (fcpScoreInMicroseconds <= FCP_MEDIUM_TIMING) {
    scoreClassification = "ok" /* OK */;
  }
  if (fcpScoreInMicroseconds <= FCP_GOOD_TIMING) {
    scoreClassification = "good" /* GOOD */;
  }
  return scoreClassification;
}
function scoreClassificationForTimeToInteractive(ttiTimeInMicroseconds) {
  const TTI_GOOD_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(3.8));
  const TTI_MEDIUM_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(7.3));
  let scoreClassification = "bad" /* BAD */;
  if (ttiTimeInMicroseconds <= TTI_MEDIUM_TIMING) {
    scoreClassification = "ok" /* OK */;
  }
  if (ttiTimeInMicroseconds <= TTI_GOOD_TIMING) {
    scoreClassification = "good" /* GOOD */;
  }
  return scoreClassification;
}
function scoreClassificationForLargestContentfulPaint(lcpTimeInMicroseconds) {
  const LCP_GOOD_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(2.5));
  const LCP_MEDIUM_TIMING = Helpers13.Timing.secondsToMicro(Types19.Timing.Seconds(4));
  let scoreClassification = "bad" /* BAD */;
  if (lcpTimeInMicroseconds <= LCP_MEDIUM_TIMING) {
    scoreClassification = "ok" /* OK */;
  }
  if (lcpTimeInMicroseconds <= LCP_GOOD_TIMING) {
    scoreClassification = "good" /* GOOD */;
  }
  return scoreClassification;
}
function scoreClassificationForDOMContentLoaded(_dclTimeInMicroseconds) {
  return "unclassified" /* UNCLASSIFIED */;
}
function scoreClassificationForTotalBlockingTime(tbtTimeInMicroseconds) {
  const TBT_GOOD_TIMING = Helpers13.Timing.milliToMicro(Types19.Timing.Milli(200));
  const TBT_MEDIUM_TIMING = Helpers13.Timing.milliToMicro(Types19.Timing.Milli(600));
  let scoreClassification = "bad" /* BAD */;
  if (tbtTimeInMicroseconds <= TBT_MEDIUM_TIMING) {
    scoreClassification = "ok" /* OK */;
  }
  if (tbtTimeInMicroseconds <= TBT_GOOD_TIMING) {
    scoreClassification = "good" /* GOOD */;
  }
  return scoreClassification;
}
function gatherFinalLCPEvents() {
  const allFinalLCPEvents = [];
  const dataForAllFrames = [...metricScoresByFrameId.values()];
  const dataForAllNavigations = dataForAllFrames.flatMap((frameData) => [...frameData.values()]);
  for (let i = 0; i < dataForAllNavigations.length; i++) {
    const navigationData = dataForAllNavigations[i];
    const lcpInNavigation = navigationData.get("LCP" /* LCP */);
    if (!lcpInNavigation?.event) {
      continue;
    }
    allFinalLCPEvents.push(lcpInNavigation.event);
  }
  return allFinalLCPEvents;
}
async function finalize18() {
  pageLoadEventsArray.sort((a, b) => a.ts - b.ts);
  for (const pageLoadEvent of pageLoadEventsArray) {
    const navigation = getNavigationForPageLoadEvent(pageLoadEvent);
    if (navigation) {
      storePageLoadMetricAgainstNavigationId(navigation, pageLoadEvent);
    }
  }
  const { navigationsByFrameId: navigationsByFrameId2 } = data4();
  metaCharsetCheckEventsArray.sort((a, b) => a.ts - b.ts);
  for (const metaCharsetCheckEvent of metaCharsetCheckEventsArray) {
    const frameId = metaCharsetCheckEvent.args.data?.frame;
    if (!frameId) {
      continue;
    }
    const navigation = Helpers13.Trace.getNavigationForTraceEvent(metaCharsetCheckEvent, frameId, navigationsByFrameId2);
    if (!navigation) {
      continue;
    }
    const eventsForNavigation = Platform10.MapUtilities.getWithDefault(metaCharsetCheckEventsByNavigation, navigation, () => []);
    eventsForNavigation.push(metaCharsetCheckEvent);
  }
  const allFinalLCPEvents = gatherFinalLCPEvents();
  const mainFrame = data4().mainFrameId;
  const allEventsButLCP = pageLoadEventsArray.filter((event) => !Types19.Events.isAnyLargestContentfulPaintCandidate(event));
  const markerEvents = [...allEventsButLCP, ...allFinalLCPEvents].filter(Types19.Events.isMarkerEvent);
  allMarkerEvents = markerEvents.filter((event) => getFrameIdForPageLoadEvent(event) === mainFrame).sort((a, b) => a.ts - b.ts);
}
function data18() {
  return {
    metricScoresByFrameId,
    allMarkerEvents,
    metaCharsetCheckEventsByNavigation
  };
}
function deps10() {
  return ["Meta"];
}
var ScoreClassification = /* @__PURE__ */ ((ScoreClassification2) => {
  ScoreClassification2["GOOD"] = "good";
  ScoreClassification2["OK"] = "ok";
  ScoreClassification2["BAD"] = "bad";
  ScoreClassification2["UNCLASSIFIED"] = "unclassified";
  return ScoreClassification2;
})(ScoreClassification || {});
var MetricName = /* @__PURE__ */ ((MetricName2) => {
  MetricName2["FCP"] = "FCP";
  MetricName2["FP"] = "FP";
  MetricName2["L"] = "L";
  MetricName2["LCP"] = "LCP";
  MetricName2["DCL"] = "DCL";
  MetricName2["TTI"] = "TTI";
  MetricName2["TBT"] = "TBT";
  MetricName2["CLS"] = "CLS";
  MetricName2["NAV"] = "Nav";
  MetricName2["SOFT_NAV"] = "Nav*";
  MetricName2["SOFT_FCP"] = "FCP*";
  MetricName2["SOFT_LCP"] = "LCP*";
  return MetricName2;
})(MetricName || {});
function metricIsLCP(metric) {
  return metric.metricName === "LCP" /* LCP */;
}

// ../../front_end/models/trace/handlers/LargestImagePaintHandler.ts
var imagePaintsByNodeIdAndProcess = /* @__PURE__ */ new Map();
var lcpRequestByNavigationId = /* @__PURE__ */ new Map();
function reset19() {
  imagePaintsByNodeIdAndProcess = /* @__PURE__ */ new Map();
  lcpRequestByNavigationId = /* @__PURE__ */ new Map();
}
function handleEvent19(event) {
  if (!Types20.Events.isLargestImagePaintCandidate(event) || !event.args.data) {
    return;
  }
  const imagePaintsByNodeId = Platform11.MapUtilities.getWithDefault(imagePaintsByNodeIdAndProcess, event.pid, () => /* @__PURE__ */ new Map());
  imagePaintsByNodeId.set(event.args.data.DOMNodeId, event);
}
async function finalize19() {
  const requests = data5().byTime;
  const { traceBounds: traceBounds2, navigationsByNavigationId: navigationsByNavigationId2 } = data4();
  const metricScoresByFrameId2 = data18().metricScoresByFrameId;
  for (const [navigationId, navigation] of navigationsByNavigationId2) {
    const lcpMetric = metricScoresByFrameId2.get(navigation.args.frame)?.get(navigation)?.get("LCP" /* LCP */);
    const lcpEvent = lcpMetric?.event;
    if (!lcpEvent || !Types20.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
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
function data19() {
  return { lcpRequestByNavigationId };
}
function deps11() {
  return ["Meta", "NetworkRequests", "PageLoadMetrics"];
}

// ../../front_end/models/trace/handlers/LargestTextPaintHandler.ts
var LargestTextPaintHandler_exports = {};
__export(LargestTextPaintHandler_exports, {
  data: () => data20,
  finalize: () => finalize20,
  handleEvent: () => handleEvent20,
  reset: () => reset20
});
import * as Types21 from "../types/types.js";
var textPaintByDOMNodeId = /* @__PURE__ */ new Map();
function reset20() {
  textPaintByDOMNodeId = /* @__PURE__ */ new Map();
}
function handleEvent20(event) {
  if (!Types21.Events.isLargestTextPaintCandidate(event)) {
    return;
  }
  if (!event.args.data) {
    return;
  }
  textPaintByDOMNodeId.set(event.args.data.DOMNodeId, event);
}
async function finalize20() {
}
function data20() {
  return textPaintByDOMNodeId;
}

// ../../front_end/models/trace/handlers/LayoutShiftsHandler.ts
var LayoutShiftsHandler_exports = {};
__export(LayoutShiftsHandler_exports, {
  LayoutShiftsThreshold: () => LayoutShiftsThreshold,
  MAX_CLUSTER_DURATION: () => MAX_CLUSTER_DURATION,
  MAX_SHIFT_TIME_DELTA: () => MAX_SHIFT_TIME_DELTA,
  data: () => data22,
  deps: () => deps13,
  finalize: () => finalize22,
  handleEvent: () => handleEvent22,
  handleUserConfig: () => handleUserConfig6,
  reset: () => reset22,
  scoreClassificationForLayoutShift: () => scoreClassificationForLayoutShift
});
import * as Platform12 from "../../../core/platform/platform.js";
import * as Helpers15 from "../helpers/helpers.js";
import * as Types23 from "../types/types.js";

// ../../front_end/models/trace/handlers/ScreenshotsHandler.ts
var ScreenshotsHandler_exports = {};
__export(ScreenshotsHandler_exports, {
  data: () => data21,
  deps: () => deps12,
  finalize: () => finalize21,
  handleEvent: () => handleEvent21,
  reset: () => reset21,
  screenshotImageDataUri: () => screenshotImageDataUri
});
import * as Helpers14 from "../helpers/helpers.js";
import * as Types22 from "../types/types.js";
var legacyScreenshotEvents = [];
var modernScreenshotEvents = [];
var syntheticScreenshots = [];
function reset21() {
  legacyScreenshotEvents = [];
  syntheticScreenshots = [];
  modernScreenshotEvents = [];
}
function handleEvent21(event) {
  if (Types22.Events.isLegacyScreenshot(event)) {
    legacyScreenshotEvents.push(event);
  } else if (Types22.Events.isScreenshot(event)) {
    modernScreenshotEvents.push(event);
  }
}
async function finalize21() {
  for (const snapshotEvent of legacyScreenshotEvents) {
    const { cat, name, ph, pid, tid } = snapshotEvent;
    const syntheticEvent = Helpers14.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: snapshotEvent,
      cat,
      name,
      ph,
      pid,
      tid,
      // TODO(paulirish, crbug.com/41363012): fix snapshot timestamps.
      ts: snapshotEvent.ts,
      args: {
        dataUri: `data:image/jpg;base64,${snapshotEvent.args.snapshot}`
      }
    });
    syntheticScreenshots.push(syntheticEvent);
  }
}
function screenshotImageDataUri(event) {
  if (Types22.Events.isLegacySyntheticScreenshot(event)) {
    return event.args.dataUri;
  }
  return `data:image/jpg;base64,${event.args.snapshot}`;
}
function data21() {
  return {
    legacySyntheticScreenshots: syntheticScreenshots.length ? syntheticScreenshots : null,
    screenshots: modernScreenshotEvents.length ? modernScreenshotEvents : null
  };
}
function deps12() {
  return ["Meta"];
}

// ../../front_end/models/trace/handlers/LayoutShiftsHandler.ts
var MAX_CLUSTER_DURATION = Helpers15.Timing.milliToMicro(Types23.Timing.Milli(5e3));
var MAX_SHIFT_TIME_DELTA = Helpers15.Timing.milliToMicro(Types23.Timing.Milli(1e3));
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
var scoreRecords = [];
function reset22() {
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
}
var enableSoftNavigation2 = true;
function handleUserConfig6(userConfig) {
  enableSoftNavigation2 = userConfig.enableSoftNavigation;
}
function handleEvent22(event) {
  if (Types23.Events.isLayoutShift(event) && !event.args.data?.had_recent_input) {
    layoutShiftEvents.push(event);
    return;
  }
  if (Types23.Events.isLayoutInvalidationTracking(event)) {
    layoutInvalidationEvents.push(event);
    return;
  }
  if (Types23.Events.isScheduleStyleInvalidationTracking(event)) {
    scheduleStyleInvalidationEvents.push(event);
  }
  if (Types23.Events.isStyleRecalcInvalidationTracking(event)) {
    styleRecalcInvalidationEvents.push(event);
  }
  if (Types23.Events.isPrePaint(event)) {
    prePaintEvents.push(event);
    return;
  }
  if (Types23.Events.isRenderFrameImplCreateChildFrame(event)) {
    renderFrameImplCreateChildFrameEvents.push(event);
  }
  if (Types23.Events.isDomLoading(event)) {
    domLoadingEvents.push(event);
  }
  if (Types23.Events.isLayoutImageUnsized(event)) {
    layoutImageUnsizedEvents.push(event);
  }
  if (Types23.Events.isBeginRemoteFontLoad(event)) {
    remoteFonts.push({
      display: event.args.display,
      url: event.args.url,
      beginRemoteFontLoadEvent: event
    });
  }
  if (Types23.Events.isRemoteFontLoaded(event)) {
    for (const remoteFont of remoteFonts) {
      if (remoteFont.url === event.args.url) {
        remoteFont.name = event.args.name;
      }
    }
  }
  if (Types23.Events.isPaintImage(event)) {
    paintImageEvents2.push(event);
  }
}
function traceWindowFromTime(time) {
  return {
    min: time,
    max: time,
    range: Types23.Timing.Micro(0)
  };
}
function updateTraceWindowMax(traceWindow, newMax) {
  traceWindow.max = newMax;
  traceWindow.range = Types23.Timing.Micro(traceWindow.max - traceWindow.min);
}
function findScreenshots(timestamp) {
  const data30 = data21();
  if (data30.screenshots) {
    const before = Helpers15.Trace.findPreviousEventBeforeTimestamp(data30.screenshots, timestamp);
    const after = before ? data30.screenshots[data30.screenshots.indexOf(before) + 1] : null;
    return { before, after };
  }
  if (data30.legacySyntheticScreenshots) {
    const before = Helpers15.Trace.findPreviousEventBeforeTimestamp(data30.legacySyntheticScreenshots, timestamp);
    const after = before ? data30.legacySyntheticScreenshots[data30.legacySyntheticScreenshots.indexOf(before) + 1] : null;
    return { before, after };
  }
  return { before: null, after: null };
}
function buildScoreRecords() {
  const { traceBounds: traceBounds2 } = data4();
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
async function finalize22() {
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
  const { navigationsByFrameId: navigationsByFrameId2, mainFrameId: mainFrameId2, traceBounds: traceBounds2, softNavigationsById: softNavigationsById2 } = data4();
  const softNavigations = enableSoftNavigation2 ? Array.from(softNavigationsById2.values()) : [];
  const navigations = [...navigationsByFrameId2.get(mainFrameId2) || [], ...softNavigations].sort((a, b) => a.ts - b.ts);
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
        updateTraceWindowMax(currentCluster2.clusterWindow, Types23.Timing.Micro(previousClusterEndTime));
      }
      let navigationId = void 0;
      if (currentShiftNavigation !== null) {
        const nav = navigations[currentShiftNavigation];
        if (Types23.Events.isNavigationStart(nav)) {
          navigationId = nav.args.data?.navigationId;
        }
      } else {
        navigationId = Types23.Events.NO_NAVIGATION;
      }
      clusters.push(Helpers15.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
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
        ph: Types23.Events.Phase.COMPLETE,
        cat: "",
        dur: Types23.Timing.Micro(-1)
        // This `cluster.dur` is updated below.
      }));
      firstShiftTime = clusterStartTime;
    }
    const currentCluster = clusters[clusters.length - 1];
    const timeFromNavigation = currentShiftNavigation !== null ? Types23.Timing.Micro(event.ts - navigations[currentShiftNavigation].ts) : void 0;
    currentCluster.clusterCumulativeScore += event.args.data ? event.args.data.weighted_score_delta : 0;
    if (!event.args.data) {
      continue;
    }
    const shift = Helpers15.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
      rawSourceEvent: event,
      ...event,
      name: Types23.Events.Name.SYNTHETIC_LAYOUT_SHIFT,
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
      updateTraceWindowMax(cluster.clusterWindow, Types23.Timing.Micro(clusterEnd));
    }
    let largestScore = 0;
    let worstShiftEvent = null;
    for (const shift of cluster.events) {
      weightedScore += shift.args.data ? shift.args.data.weighted_score_delta : 0;
      windowID = shift.parsedData.sessionWindowData.id;
      const ts = shift.ts;
      shift.parsedData.sessionWindowData.cumulativeWindowScore = cluster.clusterCumulativeScore;
      if (weightedScore < 0.1 /* NEEDS_IMPROVEMENT */) {
        updateTraceWindowMax(cluster.scoreWindows.good, ts);
      } else if (weightedScore >= 0.1 /* NEEDS_IMPROVEMENT */ && weightedScore < 0.25 /* BAD */) {
        if (!cluster.scoreWindows.needsImprovement) {
          updateTraceWindowMax(cluster.scoreWindows.good, Types23.Timing.Micro(ts - 1));
          cluster.scoreWindows.needsImprovement = traceWindowFromTime(ts);
        }
        updateTraceWindowMax(cluster.scoreWindows.needsImprovement, ts);
      } else if (weightedScore >= 0.25 /* BAD */) {
        if (!cluster.scoreWindows.bad) {
          if (cluster.scoreWindows.needsImprovement) {
            updateTraceWindowMax(cluster.scoreWindows.needsImprovement, Types23.Timing.Micro(ts - 1));
          } else {
            updateTraceWindowMax(cluster.scoreWindows.good, Types23.Timing.Micro(ts - 1));
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
      cluster.rawSourceEvent = worstShiftEvent.rawSourceEvent;
    }
    cluster.ts = cluster.events[0].ts;
    const lastShiftTimings = Helpers15.Timing.eventTimingsMicroSeconds(cluster.events[cluster.events.length - 1]);
    cluster.dur = Types23.Timing.Micro(lastShiftTimings.endTime - cluster.events[0].ts + MAX_SHIFT_TIME_DELTA);
    if (weightedScore > sessionMaxScore) {
      clsWindowID = windowID;
      sessionMaxScore = weightedScore;
    }
  }
}
function data22() {
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
    paintImageEvents: paintImageEvents2
  };
}
function deps13() {
  return ["Screenshots", "Meta"];
}
function scoreClassificationForLayoutShift(score) {
  let state = "good" /* GOOD */;
  if (score >= 0.1 /* NEEDS_IMPROVEMENT */) {
    state = "ok" /* OK */;
  }
  if (score >= 0.25 /* BAD */) {
    state = "bad" /* BAD */;
  }
  return state;
}
var LayoutShiftsThreshold = /* @__PURE__ */ ((LayoutShiftsThreshold2) => {
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["GOOD"] = 0] = "GOOD";
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["NEEDS_IMPROVEMENT"] = 0.1] = "NEEDS_IMPROVEMENT";
  LayoutShiftsThreshold2[LayoutShiftsThreshold2["BAD"] = 0.25] = "BAD";
  return LayoutShiftsThreshold2;
})(LayoutShiftsThreshold || {});

// ../../front_end/models/trace/handlers/MemoryHandler.ts
var MemoryHandler_exports = {};
__export(MemoryHandler_exports, {
  data: () => data23,
  finalize: () => finalize23,
  handleEvent: () => handleEvent23,
  reset: () => reset23
});
import * as Platform13 from "../../../core/platform/platform.js";
import * as Types24 from "../types/types.js";
var updateCountersByProcess = /* @__PURE__ */ new Map();
function reset23() {
  updateCountersByProcess = /* @__PURE__ */ new Map();
}
function handleEvent23(event) {
  if (Types24.Events.isUpdateCounters(event)) {
    const countersForProcess = Platform13.MapUtilities.getWithDefault(updateCountersByProcess, event.pid, () => []);
    countersForProcess.push(event);
    updateCountersByProcess.set(event.pid, countersForProcess);
  }
}
async function finalize23() {
}
function data23() {
  return { updateCountersByProcess };
}

// ../../front_end/models/trace/handlers/PageFramesHandler.ts
var PageFramesHandler_exports = {};
__export(PageFramesHandler_exports, {
  data: () => data24,
  finalize: () => finalize24,
  handleEvent: () => handleEvent24,
  reset: () => reset24
});
import * as Types25 from "../types/types.js";
var frames = /* @__PURE__ */ new Map();
function reset24() {
  frames = /* @__PURE__ */ new Map();
}
function handleEvent24(event) {
  if (Types25.Events.isTracingStartedInBrowser(event)) {
    for (const frame of event.args.data?.frames ?? []) {
      frames.set(frame.frame, frame);
    }
    return;
  }
  if (Types25.Events.isCommitLoad(event)) {
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
async function finalize24() {
}
function data24() {
  return {
    frames
  };
}

// ../../front_end/models/trace/handlers/ScriptsHandler.ts
var ScriptsHandler_exports = {};
__export(ScriptsHandler_exports, {
  data: () => data25,
  deps: () => deps14,
  finalize: () => finalize25,
  getScriptGeneratedSizes: () => getScriptGeneratedSizes,
  handleEvent: () => handleEvent25,
  reset: () => reset25
});
import * as Common from "../../../core/common/common.js";
import * as Platform14 from "../../../core/platform/platform.js";
import * as Types26 from "../types/types.js";
var scriptById = /* @__PURE__ */ new Map();
var frameIdByIsolate = /* @__PURE__ */ new Map();
function deps14() {
  return ["Meta", "NetworkRequests"];
}
function reset25() {
  scriptById = /* @__PURE__ */ new Map();
  frameIdByIsolate = /* @__PURE__ */ new Map();
}
function handleEvent25(event) {
  const getOrMakeScript = (isolate, scriptIdAsNumber) => {
    const scriptId = String(scriptIdAsNumber);
    const key = `${isolate}.${scriptId}`;
    return Platform14.MapUtilities.getWithDefault(
      scriptById,
      key,
      () => ({ isolate, scriptId, frame: "", ts: event.ts })
    );
  };
  if (Types26.Events.isRundownScriptCompiled(event) && event.args.data) {
    const { isolate, scriptId, frame } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.frame = frame;
    script.ts = event.ts;
    return;
  }
  if (Types26.Events.isRundownScript(event)) {
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
  if (Types26.Events.isRundownScriptSource(event)) {
    const { isolate, scriptId, sourceText } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = sourceText;
    return;
  }
  if (Types26.Events.isRundownScriptSourceLarge(event)) {
    const { isolate, scriptId, sourceText } = event.args.data;
    const script = getOrMakeScript(isolate, scriptId);
    script.content = (script.content ?? "") + sourceText;
    return;
  }
  if (Types26.Events.isFunctionCall(event) && event.args.data?.isolate && event.args.data.frame) {
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
async function finalize25(options) {
  const meta = data4();
  const networkRequests = [...data5().byId.values()];
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
function data25() {
  return {
    scripts: [...scriptById.values()]
  };
}

// ../../front_end/models/trace/handlers/SelectorStatsHandler.ts
var SelectorStatsHandler_exports = {};
__export(SelectorStatsHandler_exports, {
  data: () => data26,
  finalize: () => finalize26,
  handleEvent: () => handleEvent26,
  reset: () => reset26
});
import * as Types27 from "../types/types.js";
var lastRecalcStyleEvent = null;
var lastInvalidatedNode = null;
var selectorDataForRecalcStyle = /* @__PURE__ */ new Map();
var invalidatedNodeList = new Array();
function reset26() {
  lastRecalcStyleEvent = null;
  lastInvalidatedNode = null;
  selectorDataForRecalcStyle = /* @__PURE__ */ new Map();
  invalidatedNodeList = [];
}
function handleEvent26(event) {
  if (Types27.Events.isStyleRecalcInvalidationTracking(event)) {
    if (event.args.data.subtree && event.args.data.reason === Types27.Events.StyleRecalcInvalidationReason.RELATED_STYLE_RULE && lastInvalidatedNode && event.args.data.nodeId === lastInvalidatedNode.backendNodeId) {
      lastInvalidatedNode.subtree = true;
      return;
    }
  }
  if (Types27.Events.isSelectorStats(event) && lastRecalcStyleEvent && event.args.selector_stats) {
    selectorDataForRecalcStyle.set(lastRecalcStyleEvent, {
      timings: event.args.selector_stats.selector_timings
    });
    return;
  }
  if (Types27.Events.isStyleInvalidatorInvalidationTracking(event)) {
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
        type: Types27.Events.InvalidationEventType.StyleInvalidatorInvalidationTracking,
        selectorList,
        ts: event.ts,
        tts: event.tts,
        subtree: false,
        lastRecalcStyleEventTs: lastRecalcStyleEvent ? lastRecalcStyleEvent.ts : Types27.Timing.Micro(0)
      };
      invalidatedNodeList.push(lastInvalidatedNode);
    }
  }
  if (Types27.Events.isRecalcStyle(event)) {
    lastRecalcStyleEvent = event;
    return;
  }
}
async function finalize26() {
}
function data26() {
  return {
    dataForRecalcStyleEvent: selectorDataForRecalcStyle,
    invalidatedNodeList
  };
}

// ../../front_end/models/trace/handlers/UserInteractionsHandler.ts
var UserInteractionsHandler_exports = {};
__export(UserInteractionsHandler_exports, {
  LONG_INTERACTION_THRESHOLD: () => LONG_INTERACTION_THRESHOLD,
  categoryOfInteraction: () => categoryOfInteraction,
  data: () => data27,
  deps: () => deps15,
  finalize: () => finalize27,
  handleEvent: () => handleEvent27,
  removeNestedInteractionsAndSetProcessingTime: () => removeNestedInteractionsAndSetProcessingTime,
  reset: () => reset27,
  scoreClassificationForInteractionToNextPaint: () => scoreClassificationForInteractionToNextPaint
});
import * as Platform15 from "../../../core/platform/platform.js";
import * as Helpers16 from "../helpers/helpers.js";
import * as Types28 from "../types/types.js";
var beginCommitCompositorFrameEvents = [];
var parseMetaViewportEvents = [];
var LONG_INTERACTION_THRESHOLD = Helpers16.Timing.milliToMicro(Types28.Timing.Milli(200));
var INP_GOOD_TIMING = LONG_INTERACTION_THRESHOLD;
var INP_MEDIUM_TIMING = Helpers16.Timing.milliToMicro(Types28.Timing.Milli(500));
var longestInteractionEvent = null;
var interactionEvents = [];
var interactionEventsWithNoNesting = [];
var eventTimingStartEventsForInteractions = [];
var eventTimingEndEventsForInteractions = [];
function reset27() {
  beginCommitCompositorFrameEvents = [];
  parseMetaViewportEvents = [];
  interactionEvents = [];
  eventTimingStartEventsForInteractions = [];
  eventTimingEndEventsForInteractions = [];
  interactionEventsWithNoNesting = [];
  longestInteractionEvent = null;
}
function handleEvent27(event) {
  if (Types28.Events.isBeginCommitCompositorFrame(event)) {
    beginCommitCompositorFrameEvents.push(event);
    return;
  }
  if (Types28.Events.isParseMetaViewport(event)) {
    parseMetaViewportEvents.push(event);
    return;
  }
  if (!Types28.Events.isEventTiming(event)) {
    return;
  }
  if (Types28.Events.isEventTimingEnd(event)) {
    eventTimingEndEventsForInteractions.push(event);
  }
  if (!event.args.data || !Types28.Events.isEventTimingStart(event)) {
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
    const endTime = Types28.Timing.Micro(interaction.ts + interaction.dur);
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
  event.inputDelay = Types28.Timing.Micro(event.processingStart - startEvent.ts);
  event.mainThreadHandling = Types28.Timing.Micro(event.processingEnd - event.processingStart);
  event.presentationDelay = Types28.Timing.Micro(endEvent.ts - event.processingEnd);
}
async function finalize27() {
  const { navigationsByFrameId: navigationsByFrameId2 } = data4();
  const beginAndEndEvents = Platform15.ArrayUtilities.mergeOrdered(
    eventTimingStartEventsForInteractions,
    eventTimingEndEventsForInteractions,
    Helpers16.Trace.eventTimeComparator
  );
  const beginEventById = /* @__PURE__ */ new Map();
  for (const event of beginAndEndEvents) {
    if (Types28.Events.isEventTimingStart(event)) {
      const forId = beginEventById.get(event.id) ?? [];
      forId.push(event);
      beginEventById.set(event.id, forId);
    } else if (Types28.Events.isEventTimingEnd(event)) {
      const beginEvents = beginEventById.get(event.id) ?? [];
      const beginEvent = beginEvents.pop();
      if (!beginEvent) {
        continue;
      }
      const { type, interactionId, timeStamp, processingStart, processingEnd } = beginEvent.args.data;
      if (!type || !interactionId || !timeStamp || !processingStart || !processingEnd) {
        continue;
      }
      const processingStartRelativeToTraceTime = Types28.Timing.Micro(
        Helpers16.Timing.milliToMicro(processingStart) - Helpers16.Timing.milliToMicro(timeStamp) + beginEvent.ts
      );
      const processingEndRelativeToTraceTime = Types28.Timing.Micro(
        Helpers16.Timing.milliToMicro(processingEnd) - Helpers16.Timing.milliToMicro(timeStamp) + beginEvent.ts
      );
      const frameId = beginEvent.args.frame ?? beginEvent.args.data.frame ?? "";
      const navigation = Helpers16.Trace.getNavigationForTraceEvent(beginEvent, frameId, navigationsByFrameId2);
      const navigationId = navigation?.args.data?.navigationId;
      const interactionEvent = Helpers16.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent({
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
        inputDelay: Types28.Timing.Micro(-1),
        mainThreadHandling: Types28.Timing.Micro(-1),
        presentationDelay: Types28.Timing.Micro(-1),
        args: {
          data: {
            beginEvent,
            endEvent: event,
            frame: frameId,
            navigationId
          }
        },
        ts: beginEvent.ts,
        dur: Types28.Timing.Micro(event.ts - beginEvent.ts),
        type: beginEvent.args.data.type,
        interactionId: beginEvent.args.data.interactionId
      });
      writeSyntheticTimespans(interactionEvent);
      interactionEvents.push(interactionEvent);
    }
  }
  Helpers16.Trace.sortTraceEventsInPlace(interactionEvents);
  interactionEventsWithNoNesting.push(...removeNestedInteractionsAndSetProcessingTime(interactionEvents));
  for (const interactionEvent of interactionEventsWithNoNesting) {
    if (!longestInteractionEvent || longestInteractionEvent.dur < interactionEvent.dur) {
      longestInteractionEvent = interactionEvent;
    }
  }
}
function data27() {
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
    return "good" /* GOOD */;
  }
  if (timing <= INP_MEDIUM_TIMING) {
    return "ok" /* OK */;
  }
  return "bad" /* BAD */;
}

// ../../front_end/models/trace/handlers/WarningsHandler.ts
var WarningsHandler_exports = {};
__export(WarningsHandler_exports, {
  FORCED_REFLOW_THRESHOLD: () => FORCED_REFLOW_THRESHOLD,
  LONG_MAIN_THREAD_TASK_THRESHOLD: () => LONG_MAIN_THREAD_TASK_THRESHOLD,
  data: () => data29,
  deps: () => deps16,
  finalize: () => finalize29,
  handleEvent: () => handleEvent29,
  reset: () => reset29
});
import * as Platform16 from "../../../core/platform/platform.js";
import * as Helpers17 from "../helpers/helpers.js";
import * as Types30 from "../types/types.js";

// ../../front_end/models/trace/handlers/WorkersHandler.ts
var WorkersHandler_exports = {};
__export(WorkersHandler_exports, {
  data: () => data28,
  finalize: () => finalize28,
  handleEvent: () => handleEvent28,
  reset: () => reset28
});
import * as Types29 from "../types/types.js";
var sessionIdEvents = [];
var workerIdByThread = /* @__PURE__ */ new Map();
var workerURLById = /* @__PURE__ */ new Map();
function reset28() {
  sessionIdEvents = [];
  workerIdByThread = /* @__PURE__ */ new Map();
  workerURLById = /* @__PURE__ */ new Map();
}
function handleEvent28(event) {
  if (Types29.Events.isTracingSessionIdForWorker(event)) {
    sessionIdEvents.push(event);
  }
}
async function finalize28() {
  for (const sessionIdEvent of sessionIdEvents) {
    if (!sessionIdEvent.args.data) {
      continue;
    }
    workerIdByThread.set(sessionIdEvent.args.data.workerThreadId, sessionIdEvent.args.data.workerId);
    workerURLById.set(sessionIdEvent.args.data.workerId, sessionIdEvent.args.data.url);
  }
}
function data28() {
  return {
    workerSessionIdEvents: sessionIdEvents,
    workerIdByThread,
    workerURLById
  };
}

// ../../front_end/models/trace/handlers/WarningsHandler.ts
var warningsPerEvent = /* @__PURE__ */ new Map();
var eventsPerWarning = /* @__PURE__ */ new Map();
var allEventsStack = [];
var jsInvokeStack = [];
var taskReflowEvents = [];
var longTaskEvents = [];
var FORCED_REFLOW_THRESHOLD = Helpers17.Timing.milliToMicro(Types30.Timing.Milli(30));
var LONG_MAIN_THREAD_TASK_THRESHOLD = Helpers17.Timing.milliToMicro(Types30.Timing.Milli(50));
function reset29() {
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
function handleEvent29(event) {
  processForcedReflowWarning(event);
  if (event.name === Types30.Events.Name.RUN_TASK) {
    const { duration } = Helpers17.Timing.eventTimingsMicroSeconds(event);
    if (duration > LONG_MAIN_THREAD_TASK_THRESHOLD) {
      longTaskEvents.push(event);
    }
    return;
  }
  if (Types30.Events.isFireIdleCallback(event)) {
    const { duration } = Helpers17.Timing.eventTimingsMilliSeconds(event);
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
    Types30.Events.isJSInvocationEvent(event)
  );
  if (jsInvokeStack.length) {
    if (event.name === Types30.Events.Name.LAYOUT || event.name === Types30.Events.Name.RECALC_STYLE) {
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
async function finalize29() {
  const longInteractions = data27().interactionsOverThreshold;
  for (const interaction of longInteractions) {
    storeWarning(interaction, "LONG_INTERACTION");
  }
  for (const event of longTaskEvents) {
    if (!(event.tid, data28().workerIdByThread.has(event.tid))) {
      storeWarning(event, "LONG_TASK");
    }
  }
  longTaskEvents.length = 0;
}
function data29() {
  return {
    perEvent: warningsPerEvent,
    perWarning: eventsPerWarning
  };
}

// ../../front_end/models/trace/handlers/types.ts
var types_exports = {};
export {
  helpers_exports as Helpers,
  ModelHandlers_exports as ModelHandlers,
  Threads_exports as Threads,
  types_exports as Types
};
//# sourceMappingURL=handlers.js.map
