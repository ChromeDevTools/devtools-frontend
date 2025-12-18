var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/types/Configuration.js
var Configuration_exports = {};
__export(Configuration_exports, {
  configToCacheKey: () => configToCacheKey,
  defaults: () => defaults
});
var defaults = () => ({
  includeRuntimeCallStats: false,
  showAllEvents: false,
  debugMode: false,
  maxInvalidationEventsPerEvent: 20,
  enableAnimationsFrameHandler: false
});
function configToCacheKey(config) {
  return JSON.stringify(config);
}

// gen/front_end/models/trace/types/Extensions.js
var Extensions_exports = {};
__export(Extensions_exports, {
  extensionPalette: () => extensionPalette,
  isConsoleTimestampPayloadTrackEntry: () => isConsoleTimestampPayloadTrackEntry,
  isExtensionEntryObj: () => isExtensionEntryObj,
  isExtensionPayloadMarker: () => isExtensionPayloadMarker,
  isSyntheticExtensionEntry: () => isSyntheticExtensionEntry,
  isValidExtensionPayload: () => isValidExtensionPayload
});
var extensionPalette = [
  "primary",
  "primary-light",
  "primary-dark",
  "secondary",
  "secondary-light",
  "secondary-dark",
  "tertiary",
  "tertiary-light",
  "tertiary-dark",
  "error",
  "warning"
];
function isExtensionPayloadMarker(payload) {
  return payload.dataType === "marker";
}
function isExtensionEntryObj(payload) {
  const hasTrack = "track" in payload && Boolean(payload.track);
  const validEntryType = payload.dataType === "track-entry" || payload.dataType === void 0;
  return validEntryType && hasTrack;
}
function isConsoleTimestampPayloadTrackEntry(payload) {
  return payload.url !== void 0 && payload.description !== void 0;
}
function isValidExtensionPayload(payload) {
  return isExtensionPayloadMarker(payload) || isExtensionEntryObj(payload) || isConsoleTimestampPayloadTrackEntry(payload);
}
function isSyntheticExtensionEntry(entry) {
  return entry.cat === "devtools.extension";
}

// gen/front_end/models/trace/types/File.js
var File_exports = {};
__export(File_exports, {
  isEntriesLinkAnnotation: () => isEntriesLinkAnnotation,
  isEntryLabelAnnotation: () => isEntryLabelAnnotation,
  isTimeRangeAnnotation: () => isTimeRangeAnnotation,
  traceEventKeyToValues: () => traceEventKeyToValues
});
function isTimeRangeAnnotation(annotation) {
  return annotation.type === "TIME_RANGE";
}
function isEntryLabelAnnotation(annotation) {
  return annotation.type === "ENTRY_LABEL";
}
function isEntriesLinkAnnotation(annotation) {
  return annotation.type === "ENTRIES_LINK";
}
function traceEventKeyToValues(key) {
  const parts = key.split("-");
  const type = parts[0];
  switch (type) {
    case "p":
      if (parts.length !== 5 || !parts.every((part, i) => i === 0 || typeof part === "number" || !isNaN(parseInt(part, 10)))) {
        throw new Error(`Invalid ProfileCallKey: ${key}`);
      }
      return {
        type: parts[0],
        processID: parseInt(parts[1], 10),
        threadID: parseInt(parts[2], 10),
        sampleIndex: parseInt(parts[3], 10),
        protocol: parseInt(parts[4], 10)
      };
    case "r":
      if (parts.length !== 2 || !(typeof parts[1] === "number" || !isNaN(parseInt(parts[1], 10)))) {
        throw new Error(`Invalid RawEvent Key: ${key}`);
      }
      return {
        type: parts[0],
        rawIndex: parseInt(parts[1], 10)
      };
    case "s":
      if (parts.length !== 2 || !(typeof parts[1] === "number" || !isNaN(parseInt(parts[1], 10)))) {
        throw new Error(`Invalid SyntheticEvent Key: ${key}`);
      }
      return {
        type: parts[0],
        rawIndex: parseInt(parts[1], 10)
      };
    case "l": {
      if (parts.length !== 2 || Number.isNaN(parseInt(parts[1], 10))) {
        throw new Error(`Invalid LegacyTimelineFrame Key: ${key}`);
      }
      return {
        type,
        rawIndex: parseInt(parts[1], 10)
      };
    }
    default:
      throw new Error(`Unknown trace event key: ${key}`);
  }
}

// gen/front_end/models/trace/types/Overlays.js
var Overlays_exports = {};

// gen/front_end/models/trace/types/Timing.js
var Timing_exports = {};
__export(Timing_exports, {
  Micro: () => Micro,
  Milli: () => Milli,
  Seconds: () => Seconds
});
function Micro(value) {
  return value;
}
function Milli(value) {
  return value;
}
function Seconds(value) {
  return value;
}

// gen/front_end/models/trace/types/TraceEvents.js
var TraceEvents_exports = {};
__export(TraceEvents_exports, {
  CallFrameID: () => CallFrameID,
  Categories: () => Categories,
  MarkerName: () => MarkerName,
  NO_NAVIGATION: () => NO_NAVIGATION,
  ProcessID: () => ProcessID,
  ProfileID: () => ProfileID,
  SampleIndex: () => SampleIndex,
  SelectorTimingsKey: () => SelectorTimingsKey,
  ThreadID: () => ThreadID,
  VALID_PROFILE_SOURCES: () => VALID_PROFILE_SOURCES,
  WorkerId: () => WorkerId,
  eventIsPageLoadEvent: () => eventIsPageLoadEvent,
  isAbortPostTaskCallback: () => isAbortPostTaskCallback,
  isActivateLayerTree: () => isActivateLayerTree,
  isAnimation: () => isAnimation,
  isAnimationFrameAsyncEnd: () => isAnimationFrameAsyncEnd,
  isAnimationFrameAsyncStart: () => isAnimationFrameAsyncStart,
  isAnimationFramePresentation: () => isAnimationFramePresentation,
  isAnyLargestContentfulPaintCandidate: () => isAnyLargestContentfulPaintCandidate,
  isAnyScriptSourceEvent: () => isAnyScriptSourceEvent,
  isAuctionWorkletDoneWithProcess: () => isAuctionWorkletDoneWithProcess,
  isAuctionWorkletRunningInProcess: () => isAuctionWorkletRunningInProcess,
  isBegin: () => isBegin,
  isBeginCommitCompositorFrame: () => isBeginCommitCompositorFrame,
  isBeginFrame: () => isBeginFrame,
  isBeginMainThreadFrame: () => isBeginMainThreadFrame,
  isBeginRemoteFontLoad: () => isBeginRemoteFontLoad,
  isCommit: () => isCommit,
  isCommitLoad: () => isCommitLoad,
  isComplete: () => isComplete,
  isCompositeLayers: () => isCompositeLayers,
  isConsoleRunTask: () => isConsoleRunTask,
  isConsoleTime: () => isConsoleTime,
  isConsoleTimeStamp: () => isConsoleTimeStamp,
  isDOMStats: () => isDOMStats,
  isDebuggerAsyncTaskRun: () => isDebuggerAsyncTaskRun,
  isDebuggerAsyncTaskScheduled: () => isDebuggerAsyncTaskScheduled,
  isDecodeImage: () => isDecodeImage,
  isDecodeLazyPixelRef: () => isDecodeLazyPixelRef,
  isDidCommitSameDocumentNavigation: () => isDidCommitSameDocumentNavigation,
  isDispatch: () => isDispatch,
  isDisplayListItemListSnapshot: () => isDisplayListItemListSnapshot,
  isDomLoading: () => isDomLoading,
  isDrawFrame: () => isDrawFrame,
  isDrawLazyPixelRef: () => isDrawLazyPixelRef,
  isDroppedFrame: () => isDroppedFrame,
  isEnd: () => isEnd,
  isEventTiming: () => isEventTiming,
  isEventTimingEnd: () => isEventTimingEnd,
  isEventTimingStart: () => isEventTimingStart,
  isFireAnimationFrame: () => isFireAnimationFrame,
  isFireIdleCallback: () => isFireIdleCallback,
  isFirstContentfulPaint: () => isFirstContentfulPaint,
  isFirstPaint: () => isFirstPaint,
  isFlowPhase: () => isFlowPhase,
  isFlowPhaseEvent: () => isFlowPhaseEvent,
  isFrameCommittedInBrowser: () => isFrameCommittedInBrowser,
  isFunctionCall: () => isFunctionCall,
  isGPUTask: () => isGPUTask,
  isHandlePostMessage: () => isHandlePostMessage,
  isInstant: () => isInstant,
  isInteractiveTime: () => isInteractiveTime,
  isInvalidateLayout: () => isInvalidateLayout,
  isInvalidationTracking: () => isInvalidationTracking,
  isJSInvocationEvent: () => isJSInvocationEvent,
  isLargestImagePaintCandidate: () => isLargestImagePaintCandidate,
  isLargestTextPaintCandidate: () => isLargestTextPaintCandidate,
  isLayerTreeHostImplSnapshot: () => isLayerTreeHostImplSnapshot,
  isLayout: () => isLayout,
  isLayoutImageUnsized: () => isLayoutImageUnsized,
  isLayoutInvalidationTracking: () => isLayoutInvalidationTracking,
  isLayoutShift: () => isLayoutShift,
  isLegacyScreenshot: () => isLegacyScreenshot,
  isLegacySyntheticScreenshot: () => isLegacySyntheticScreenshot,
  isLegacyTimelineFrame: () => isLegacyTimelineFrame,
  isLinkPreconnect: () => isLinkPreconnect,
  isMainFrameViewport: () => isMainFrameViewport,
  isMarkDOMContent: () => isMarkDOMContent,
  isMarkLoad: () => isMarkLoad,
  isMarkerEvent: () => isMarkerEvent,
  isNavigationStart: () => isNavigationStart,
  isNeedsBeginFrameChanged: () => isNeedsBeginFrameChanged,
  isNestableAsyncPhase: () => isNestableAsyncPhase,
  isNetworkTrackEntry: () => isNetworkTrackEntry,
  isPaint: () => isPaint,
  isPaintImage: () => isPaintImage,
  isPairableAsyncBegin: () => isPairableAsyncBegin,
  isPairableAsyncEnd: () => isPairableAsyncEnd,
  isPairableAsyncInstant: () => isPairableAsyncInstant,
  isParseAuthorStyleSheetEvent: () => isParseAuthorStyleSheetEvent,
  isParseHTML: () => isParseHTML,
  isParseMetaViewport: () => isParseMetaViewport,
  isPerformanceMark: () => isPerformanceMark,
  isPerformanceMeasure: () => isPerformanceMeasure,
  isPerformanceMeasureBegin: () => isPerformanceMeasureBegin,
  isPhaseAsync: () => isPhaseAsync,
  isPipelineReporter: () => isPipelineReporter,
  isPrePaint: () => isPrePaint,
  isPreloadRenderBlockingStatusChangeEvent: () => isPreloadRenderBlockingStatusChangeEvent,
  isProcessName: () => isProcessName,
  isProfile: () => isProfile,
  isProfileCall: () => isProfileCall,
  isProfileChunk: () => isProfileChunk,
  isRasterTask: () => isRasterTask,
  isRecalcStyle: () => isRecalcStyle,
  isReceivedDataEvent: () => isReceivedDataEvent,
  isRemoteFontLoaded: () => isRemoteFontLoaded,
  isRenderFrameImplCreateChildFrame: () => isRenderFrameImplCreateChildFrame,
  isRendererEvent: () => isRendererEvent,
  isRequestIdleCallback: () => isRequestIdleCallback,
  isRequestMainThreadFrame: () => isRequestMainThreadFrame,
  isResourceChangePriority: () => isResourceChangePriority,
  isResourceFinish: () => isResourceFinish,
  isResourceMarkAsCached: () => isResourceMarkAsCached,
  isResourceReceiveResponse: () => isResourceReceiveResponse,
  isResourceReceivedData: () => isResourceReceivedData,
  isResourceSendRequest: () => isResourceSendRequest,
  isResourceWillSendRequest: () => isResourceWillSendRequest,
  isRunPostTaskCallback: () => isRunPostTaskCallback,
  isRunTask: () => isRunTask,
  isRundownScript: () => isRundownScript,
  isRundownScriptCompiled: () => isRundownScriptCompiled,
  isRundownScriptSource: () => isRundownScriptSource,
  isRundownScriptSourceLarge: () => isRundownScriptSourceLarge,
  isSchedulePostMessage: () => isSchedulePostMessage,
  isSchedulePostTaskCallback: () => isSchedulePostTaskCallback,
  isScheduleStyleInvalidationTracking: () => isScheduleStyleInvalidationTracking,
  isScheduleStyleRecalculation: () => isScheduleStyleRecalculation,
  isScreenshot: () => isScreenshot,
  isScrollLayer: () => isScrollLayer,
  isSelectorStats: () => isSelectorStats,
  isSetLayerId: () => isSetLayerId,
  isSoftNavigationStart: () => isSoftNavigationStart,
  isStyleInvalidatorInvalidationTracking: () => isStyleInvalidatorInvalidationTracking,
  isStyleRecalcInvalidationTracking: () => isStyleRecalcInvalidationTracking,
  isSyntheticAnimation: () => isSyntheticAnimation,
  isSyntheticBased: () => isSyntheticBased,
  isSyntheticConsoleTiming: () => isSyntheticConsoleTiming,
  isSyntheticCpuProfile: () => isSyntheticCpuProfile,
  isSyntheticInteraction: () => isSyntheticInteraction,
  isSyntheticLayoutShift: () => isSyntheticLayoutShift,
  isSyntheticLayoutShiftCluster: () => isSyntheticLayoutShiftCluster,
  isSyntheticNetworkRequest: () => isSyntheticNetworkRequest,
  isSyntheticUserTiming: () => isSyntheticUserTiming,
  isSyntheticWebSocketConnection: () => isSyntheticWebSocketConnection,
  isThreadName: () => isThreadName,
  isTimerFire: () => isTimerFire,
  isTimerInstall: () => isTimerInstall,
  isTracingSessionIdForWorker: () => isTracingSessionIdForWorker,
  isTracingStartedInBrowser: () => isTracingStartedInBrowser,
  isUpdateCounters: () => isUpdateCounters,
  isUpdateLayer: () => isUpdateLayer,
  isUserTiming: () => isUserTiming,
  isUserTimingMeasure: () => isUserTimingMeasure,
  isV8Compile: () => isV8Compile,
  isWebSocketCreate: () => isWebSocketCreate,
  isWebSocketDestroy: () => isWebSocketDestroy,
  isWebSocketEvent: () => isWebSocketEvent,
  isWebSocketInfo: () => isWebSocketInfo,
  isWebSocketReceiveHandshakeResponse: () => isWebSocketReceiveHandshakeResponse,
  isWebSocketSendHandshakeRequest: () => isWebSocketSendHandshakeRequest,
  isWebSocketTraceEvent: () => isWebSocketTraceEvent,
  isWebSocketTransfer: () => isWebSocketTransfer,
  objectIsCallFrame: () => objectIsCallFrame,
  objectIsEvent: () => objectIsEvent
});
function isNestableAsyncPhase(phase) {
  return phase === "b" || phase === "e" || phase === "n";
}
function isPhaseAsync(phase) {
  return isNestableAsyncPhase(phase) || phase === "S" || phase === "T" || phase === "F" || phase === "p";
}
function isFlowPhase(phase) {
  return phase === "s" || phase === "t" || phase === "f";
}
function objectIsEvent(obj) {
  return "cat" in obj && "name" in obj && "ts" in obj;
}
function objectIsCallFrame(object) {
  return "functionName" in object && typeof object.functionName === "string" && ("scriptId" in object && (typeof object.scriptId === "string" || typeof object.scriptId === "number")) && ("columnNumber" in object && typeof object.columnNumber === "number") && ("lineNumber" in object && typeof object.lineNumber === "number") && ("url" in object && typeof object.url === "string");
}
var VALID_PROFILE_SOURCES = ["Inspector", "SelfProfiling", "Internal"];
function isRunTask(event) {
  return event.name === "RunTask" && event.ph === "X";
}
function isAuctionWorkletRunningInProcess(event) {
  return event.name === "AuctionWorkletRunningInProcess";
}
function isAuctionWorkletDoneWithProcess(event) {
  return event.name === "AuctionWorkletDoneWithProcess";
}
function isLegacyScreenshot(event) {
  return event.name === "Screenshot" && "id" in event;
}
function isLegacySyntheticScreenshot(event) {
  return event.name === "Screenshot" && "dataUri" in (event.args ?? {});
}
function isScreenshot(event) {
  return event.name === "Screenshot" && "source_id" in (event.args ?? {});
}
function isSoftNavigationStart(event) {
  return event.name === "SoftNavigationStart";
}
var markerTypeGuards = [
  isMarkDOMContent,
  isMarkLoad,
  isFirstPaint,
  isFirstContentfulPaint,
  isAnyLargestContentfulPaintCandidate,
  isNavigationStart,
  isSoftNavigationStart
];
var MarkerName = [
  "MarkDOMContent",
  "MarkLoad",
  "firstPaint",
  "firstContentfulPaint",
  "largestContentfulPaint::Candidate",
  "largestContentfulPaint::CandidateForSoftNavigation"
];
function isMarkerEvent(event) {
  if (event.ph === "I" || "n") {
    return markerTypeGuards.some((fn) => fn(event));
  }
  return false;
}
var pageLoadEventTypeGuards = [
  ...markerTypeGuards,
  isInteractiveTime
];
function eventIsPageLoadEvent(event) {
  if (event.ph === "I" || "n") {
    return pageLoadEventTypeGuards.some((fn) => fn(event));
  }
  return false;
}
function isTracingSessionIdForWorker(event) {
  return event.name === "TracingSessionIdForWorker";
}
var NO_NAVIGATION = "NO_NAVIGATION";
function isScheduleStyleInvalidationTracking(event) {
  return event.name === "ScheduleStyleInvalidationTracking";
}
function isStyleRecalcInvalidationTracking(event) {
  return event.name === "StyleRecalcInvalidationTracking";
}
function isStyleInvalidatorInvalidationTracking(event) {
  return event.name === "StyleInvalidatorInvalidationTracking";
}
function isBeginCommitCompositorFrame(event) {
  return event.name === "BeginCommitCompositorFrame";
}
function isParseMetaViewport(event) {
  return event.name === "ParseMetaViewport";
}
function isLinkPreconnect(event) {
  return event.name === "LinkPreconnect";
}
function isScheduleStyleRecalculation(event) {
  return event.name === "ScheduleStyleRecalculation";
}
function isRenderFrameImplCreateChildFrame(event) {
  return event.name === "RenderFrameImpl::createChildFrame";
}
function isLayoutImageUnsized(event) {
  return event.name === "LayoutImageUnsized";
}
function isPairableAsyncBegin(e) {
  return e.ph === "b";
}
function isPairableAsyncEnd(e) {
  return e.ph === "e";
}
function isPairableAsyncInstant(e) {
  return e.ph === "n";
}
function isAnimationFrameAsyncStart(data) {
  return data.name === "AnimationFrame" && data.ph === "b";
}
function isAnimationFrameAsyncEnd(data) {
  return data.name === "AnimationFrame" && data.ph === "e";
}
function isAnimationFramePresentation(data) {
  return data.name === "AnimationFrame::Presentation";
}
function isPipelineReporter(event) {
  return event.name === "PipelineReporter";
}
function isSyntheticBased(event) {
  return "rawSourceEvent" in event;
}
function isSyntheticInteraction(event) {
  return Boolean("interactionId" in event && event.args?.data && "beginEvent" in event.args.data && "endEvent" in event.args.data);
}
function isDrawFrame(event) {
  return event.name === "DrawFrame" && event.ph === "I";
}
function isBeginFrame(event) {
  return Boolean(event.name === "BeginFrame" && event.args && "frameSeqId" in event.args);
}
function isDroppedFrame(event) {
  return Boolean(event.name === "DroppedFrame" && event.args && "frameSeqId" in event.args);
}
function isRequestMainThreadFrame(event) {
  return event.name === "RequestMainThreadFrame";
}
function isBeginMainThreadFrame(event) {
  return event.name === "BeginMainThreadFrame";
}
function isNeedsBeginFrameChanged(event) {
  return event.name === "NeedsBeginFrameChanged";
}
function isCommit(event) {
  return Boolean(event.name === "Commit" && event.args && "frameSeqId" in event.args);
}
function isRasterTask(event) {
  return event.name === "RasterTask";
}
function isCompositeLayers(event) {
  return event.name === "CompositeLayers";
}
function isActivateLayerTree(event) {
  return event.name === "ActivateLayerTree";
}
function isInvalidationTracking(event) {
  return isScheduleStyleInvalidationTracking(event) || isStyleRecalcInvalidationTracking(event) || isStyleInvalidatorInvalidationTracking(event) || isLayoutInvalidationTracking(event);
}
function isDrawLazyPixelRef(event) {
  return event.name === "Draw LazyPixelRef";
}
function isDecodeLazyPixelRef(event) {
  return event.name === "Decode LazyPixelRef";
}
function isDecodeImage(event) {
  return event.name === "Decode Image";
}
var SelectorTimingsKey;
(function(SelectorTimingsKey2) {
  SelectorTimingsKey2["Elapsed"] = "elapsed (us)";
  SelectorTimingsKey2["RejectPercentage"] = "reject_percentage";
  SelectorTimingsKey2["FastRejectCount"] = "fast_reject_count";
  SelectorTimingsKey2["MatchAttempts"] = "match_attempts";
  SelectorTimingsKey2["MatchCount"] = "match_count";
  SelectorTimingsKey2["Selector"] = "selector";
  SelectorTimingsKey2["StyleSheetId"] = "style_sheet_id";
  SelectorTimingsKey2["InvalidationCount"] = "invalidation_count";
})(SelectorTimingsKey || (SelectorTimingsKey = {}));
function isSelectorStats(event) {
  return event.name === "SelectorStats";
}
function isRecalcStyle(event) {
  return event.name === "UpdateLayoutTree";
}
function isLayout(event) {
  return event.name === "Layout" && Boolean(event.args && "beginData" in event.args);
}
function isInvalidateLayout(event) {
  return event.name === "InvalidateLayout";
}
function isDebuggerAsyncTaskScheduled(event) {
  return event.name === "v8::Debugger::AsyncTaskScheduled";
}
function isDebuggerAsyncTaskRun(event) {
  return event.name === "v8::Debugger::AsyncTaskRun";
}
function ProfileID(value) {
  return value;
}
function CallFrameID(value) {
  return value;
}
function SampleIndex(value) {
  return value;
}
function ProcessID(value) {
  return value;
}
function ThreadID(value) {
  return value;
}
function WorkerId(value) {
  return value;
}
function isComplete(event) {
  return event.ph === "X";
}
function isBegin(event) {
  return event.ph === "B";
}
function isEnd(event) {
  return event.ph === "E";
}
function isDispatch(event) {
  return event.name === "EventDispatch" && event.ph === "X";
}
function isInstant(event) {
  return event.ph === "I";
}
function isRendererEvent(event) {
  return isInstant(event) || isComplete(event);
}
function isFireIdleCallback(event) {
  return event.name === "FireIdleCallback" && event.ph === "X";
}
function isSchedulePostMessage(event) {
  return event.name === "SchedulePostMessage";
}
function isHandlePostMessage(event) {
  return event.name === "HandlePostMessage" && event.ph === "X";
}
function isUpdateCounters(event) {
  return event.name === "UpdateCounters";
}
function isDOMStats(event) {
  return event.name === "DOMStats";
}
function isThreadName(event) {
  return event.name === "thread_name";
}
function isProcessName(event) {
  return event.name === "process_name";
}
function isTracingStartedInBrowser(event) {
  return event.name === "TracingStartedInBrowser";
}
function isFrameCommittedInBrowser(event) {
  return event.name === "FrameCommittedInBrowser";
}
function isCommitLoad(event) {
  return event.name === "CommitLoad";
}
function isAnimation(event) {
  return event.name === "Animation" && event.cat.includes("devtools.timeline");
}
function isSyntheticAnimation(event) {
  if (event.name !== "Animation" || !event.cat.includes("devtools.timeline")) {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return "beginEvent" in data && "endEvent" in data;
}
function isLayoutShift(event) {
  return event.name === "LayoutShift";
}
function isLayoutInvalidationTracking(event) {
  return event.name === "LayoutInvalidationTracking";
}
function isFirstContentfulPaint(event) {
  return event.name === "firstContentfulPaint";
}
function isAnyLargestContentfulPaintCandidate(event) {
  return event.name === "largestContentfulPaint::Candidate" || event.name === "largestContentfulPaint::CandidateForSoftNavigation";
}
function isLargestImagePaintCandidate(event) {
  return event.name === "LargestImagePaint::Candidate";
}
function isLargestTextPaintCandidate(event) {
  return event.name === "LargestTextPaint::Candidate";
}
function isMarkLoad(event) {
  return event.name === "MarkLoad";
}
function isFirstPaint(event) {
  return event.name === "firstPaint";
}
function isMarkDOMContent(event) {
  return event.name === "MarkDOMContent";
}
function isInteractiveTime(event) {
  return event.name === "InteractiveTime";
}
function isEventTiming(event) {
  return event.name === "EventTiming";
}
function isEventTimingEnd(event) {
  return isEventTiming(event) && event.ph === "e";
}
function isEventTimingStart(event) {
  return isEventTiming(event) && event.ph === "b";
}
function isGPUTask(event) {
  return event.name === "GPUTask";
}
function isProfile(event) {
  return event.name === "Profile";
}
function isSyntheticCpuProfile(event) {
  return event.name === "CpuProfile" && event.ph === "X";
}
function isProfileChunk(event) {
  return event.name === "ProfileChunk";
}
function isResourceChangePriority(event) {
  return event.name === "ResourceChangePriority";
}
function isResourceSendRequest(event) {
  return event.name === "ResourceSendRequest";
}
function isResourceReceiveResponse(event) {
  return event.name === "ResourceReceiveResponse";
}
function isResourceMarkAsCached(event) {
  return event.name === "ResourceMarkAsCached";
}
function isResourceFinish(event) {
  return event.name === "ResourceFinish";
}
function isResourceWillSendRequest(event) {
  return event.name === "ResourceWillSendRequest";
}
function isResourceReceivedData(event) {
  return event.name === "ResourceReceivedData";
}
function isReceivedDataEvent(event) {
  return event.name === "ResourceReceivedData" || event.name === "ResourceFinish" || event.name === "ResourceReceiveResponse";
}
function isSyntheticNetworkRequest(event) {
  return event.name === "SyntheticNetworkRequest";
}
function isSyntheticWebSocketConnection(event) {
  return event.name === "SyntheticWebSocketConnection";
}
function isNetworkTrackEntry(event) {
  return isSyntheticNetworkRequest(event) || isSyntheticWebSocketConnection(event) || isWebSocketTraceEvent(event);
}
function isPrePaint(event) {
  return event.name === "PrePaint";
}
function isNavigationStart(event) {
  return event.name === "navigationStart" && event.args?.data?.documentLoaderURL !== "";
}
function isDidCommitSameDocumentNavigation(event) {
  return event.name === "RenderFrameHostImpl::DidCommitSameDocumentNavigation" && event.ph === "X";
}
function isMainFrameViewport(event) {
  return event.name === "PaintTimingVisualizer::Viewport";
}
function isSyntheticUserTiming(event) {
  if (event.cat !== "blink.user_timing") {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return "beginEvent" in data && "endEvent" in data;
}
function isSyntheticConsoleTiming(event) {
  if (event.cat !== "blink.console") {
    return false;
  }
  const data = event.args?.data;
  if (!data) {
    return false;
  }
  return "beginEvent" in data && "endEvent" in data;
}
function isUserTiming(event) {
  return event.cat === "blink.user_timing";
}
function isDomLoading(event) {
  return event.name === "domLoading";
}
function isBeginRemoteFontLoad(event) {
  return event.name === "BeginRemoteFontLoad";
}
function isRemoteFontLoaded(event) {
  return event.name === "RemoteFontLoaded";
}
function isPerformanceMeasure(event) {
  return isUserTiming(event) && isPhaseAsync(event.ph);
}
function isPerformanceMeasureBegin(event) {
  return isPerformanceMeasure(event) && event.ph === "b";
}
function isPerformanceMark(event) {
  return isUserTiming(event) && (event.ph === "R" || event.ph === "I");
}
function isConsoleTime(event) {
  return event.cat === "blink.console" && isPhaseAsync(event.ph);
}
function isConsoleTimeStamp(event) {
  return event.ph === "I" && event.name === "TimeStamp";
}
function isUserTimingMeasure(event) {
  return event.name === "UserTiming::Measure";
}
function isParseHTML(event) {
  return event.name === "ParseHTML";
}
function isSyntheticLayoutShift(event) {
  return event.name === "SyntheticLayoutShift";
}
function isSyntheticLayoutShiftCluster(event) {
  return event.name === "SyntheticLayoutShiftCluster";
}
function isProfileCall(event) {
  return "callFrame" in event;
}
function isPaint(event) {
  return event.name === "Paint";
}
function isPaintImage(event) {
  return event.name === "PaintImage" && event.ph === "X";
}
function isScrollLayer(event) {
  return event.name === "ScrollLayer" && event.ph === "X";
}
function isSetLayerId(event) {
  return event.name === "SetLayerTreeId";
}
function isUpdateLayer(event) {
  return event.name === "UpdateLayer";
}
function isDisplayListItemListSnapshot(event) {
  return event.name === "cc::DisplayItemList";
}
function isLayerTreeHostImplSnapshot(event) {
  return event.name === "cc::LayerTreeHostImpl";
}
function isFireAnimationFrame(event) {
  return event.name === "FireAnimationFrame" && event.ph === "X";
}
function isTimerInstall(event) {
  return event.name === "TimerInstall";
}
function isTimerFire(event) {
  return event.name === "TimerFire" && event.ph === "X";
}
function isRequestIdleCallback(event) {
  return event.name === "RequestIdleCallback";
}
function isWebSocketCreate(event) {
  return event.name === "WebSocketCreate";
}
function isWebSocketInfo(event) {
  return event.name === "WebSocketSendHandshakeRequest" || event.name === "WebSocketReceiveHandshakeResponse" || event.name === "WebSocketDestroy";
}
function isWebSocketTransfer(event) {
  return event.name === "WebSocketSend" || event.name === "WebSocketReceive";
}
function isWebSocketSendHandshakeRequest(event) {
  return event.name === "WebSocketSendHandshakeRequest";
}
function isWebSocketReceiveHandshakeResponse(event) {
  return event.name === "WebSocketReceiveHandshakeResponse";
}
function isWebSocketDestroy(event) {
  return event.name === "WebSocketDestroy";
}
function isWebSocketTraceEvent(event) {
  return isWebSocketCreate(event) || isWebSocketInfo(event) || isWebSocketTransfer(event);
}
function isWebSocketEvent(event) {
  return isWebSocketTraceEvent(event) || isSyntheticWebSocketConnection(event);
}
function isV8Compile(event) {
  return event.name === "v8.compile" && event.ph === "X";
}
function isFunctionCall(event) {
  return event.name === "FunctionCall" && event.ph === "X";
}
function isSchedulePostTaskCallback(event) {
  return event.name === "SchedulePostTaskCallback";
}
function isRunPostTaskCallback(event) {
  return event.name === "RunPostTaskCallback" && event.ph === "X";
}
function isAbortPostTaskCallback(event) {
  return event.name === "AbortPostTaskCallback" && event.ph === "X";
}
function isJSInvocationEvent(event) {
  switch (event.name) {
    case "RunMicrotasks":
    case "FunctionCall":
    // TODO(paulirish): Define types for these Evaluate* events
    case "EvaluateScript":
    case "v8.evaluateModule":
    case "EventDispatch":
    case "V8.Execute":
    case "V8Console::runTask":
      return true;
  }
  if (event.name.startsWith("v8") || event.name.startsWith("V8")) {
    return true;
  }
  if (isConsoleRunTask(event)) {
    return true;
  }
  return false;
}
function isConsoleRunTask(event) {
  return event.name === "V8Console::runTask";
}
function isFlowPhaseEvent(event) {
  return event.ph === "s" || event.ph === "t" || event.ph === "f";
}
function isParseAuthorStyleSheetEvent(event) {
  return event.name === "ParseAuthorStyleSheet" && event.ph === "X";
}
var Categories = {
  Console: "blink.console",
  UserTiming: "blink.user_timing",
  Loading: "loading"
};
function isLegacyTimelineFrame(data) {
  return "idle" in data && typeof data.idle === "boolean";
}
function isRundownScriptCompiled(event) {
  return event.cat === "disabled-by-default-devtools.target-rundown";
}
function isRundownScript(event) {
  return event.cat === "disabled-by-default-devtools.v8-source-rundown" && event.name === "ScriptCatchup";
}
function isRundownScriptSource(event) {
  return event.cat === "disabled-by-default-devtools.v8-source-rundown-sources" && event.name === "ScriptCatchup";
}
function isRundownScriptSourceLarge(event) {
  return event.cat === "disabled-by-default-devtools.v8-source-rundown-sources" && event.name === "LargeScriptCatchup";
}
function isAnyScriptSourceEvent(event) {
  return event.cat === "disabled-by-default-devtools.v8-source-rundown-sources";
}
function isPreloadRenderBlockingStatusChangeEvent(event) {
  return event.name === "PreloadRenderBlockingStatusChange";
}
export {
  Configuration_exports as Configuration,
  TraceEvents_exports as Events,
  Extensions_exports as Extensions,
  File_exports as File,
  Overlays_exports as Overlays,
  Timing_exports as Timing
};
//# sourceMappingURL=types.js.map
