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
  showAllEvents: false,
  debugMode: false,
  maxInvalidationEventsPerEvent: 20,
  enableAnimationsFrameHandler: false,
  enableSoftNavigation: true
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
  DataOrigin: () => DataOrigin,
  EntriesLinkState: () => EntriesLinkState,
  EventKeyType: () => EventKeyType,
  isEntriesLinkAnnotation: () => isEntriesLinkAnnotation,
  isEntryLabelAnnotation: () => isEntryLabelAnnotation,
  isTimeRangeAnnotation: () => isTimeRangeAnnotation,
  traceEventKeyToValues: () => traceEventKeyToValues
});
var DataOrigin;
(function(DataOrigin2) {
  DataOrigin2["CPU_PROFILE"] = "CPUProfile";
  DataOrigin2["TRACE_EVENTS"] = "TraceEvents";
})(DataOrigin || (DataOrigin = {}));
var EntriesLinkState;
(function(EntriesLinkState2) {
  EntriesLinkState2["CREATION_NOT_STARTED"] = "creation_not_started";
  EntriesLinkState2["PENDING_TO_EVENT"] = "pending_to_event";
  EntriesLinkState2["CONNECTED"] = "connected";
})(EntriesLinkState || (EntriesLinkState = {}));
var EventKeyType;
(function(EventKeyType2) {
  EventKeyType2["RAW_EVENT"] = "r";
  EventKeyType2["SYNTHETIC_EVENT"] = "s";
  EventKeyType2["PROFILE_CALL"] = "p";
  EventKeyType2["LEGACY_TIMELINE_FRAME"] = "l";
})(EventKeyType || (EventKeyType = {}));
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
  AuctionWorkletType: () => AuctionWorkletType,
  CallFrameID: () => CallFrameID,
  Categories: () => Categories,
  DefaultCategories: () => DefaultCategories,
  InvalidationEventType: () => InvalidationEventType,
  LayoutInvalidationReason: () => LayoutInvalidationReason,
  MarkerName: () => MarkerName,
  NO_NAVIGATION: () => NO_NAVIGATION,
  Name: () => Name,
  OptionalCategories: () => OptionalCategories,
  Phase: () => Phase,
  ProcessID: () => ProcessID,
  ProfileID: () => ProfileID,
  SampleIndex: () => SampleIndex,
  Scope: () => Scope,
  SelectorTimingsKey: () => SelectorTimingsKey,
  StyleRecalcInvalidationReason: () => StyleRecalcInvalidationReason,
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
  isAnyFirstContentfulPaint: () => isAnyFirstContentfulPaint,
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
  isJSSample: () => isJSSample,
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
  isMetaCharsetCheck: () => isMetaCharsetCheck,
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
  isSoftFirstContentfulPaint: () => isSoftFirstContentfulPaint,
  isSoftLargestContentfulPaintCandidate: () => isSoftLargestContentfulPaintCandidate,
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
var Phase;
(function(Phase2) {
  Phase2["BEGIN"] = "B";
  Phase2["END"] = "E";
  Phase2["COMPLETE"] = "X";
  Phase2["INSTANT"] = "I";
  Phase2["COUNTER"] = "C";
  Phase2["ASYNC_NESTABLE_START"] = "b";
  Phase2["ASYNC_NESTABLE_INSTANT"] = "n";
  Phase2["ASYNC_NESTABLE_END"] = "e";
  Phase2["ASYNC_STEP_INTO"] = "T";
  Phase2["ASYNC_BEGIN"] = "S";
  Phase2["ASYNC_END"] = "F";
  Phase2["ASYNC_STEP_PAST"] = "p";
  Phase2["FLOW_START"] = "s";
  Phase2["FLOW_STEP"] = "t";
  Phase2["FLOW_END"] = "f";
  Phase2["SAMPLE"] = "P";
  Phase2["OBJECT_CREATED"] = "N";
  Phase2["OBJECT_SNAPSHOT"] = "O";
  Phase2["OBJECT_DESTROYED"] = "D";
  Phase2["METADATA"] = "M";
  Phase2["MEMORY_DUMP_GLOBAL"] = "V";
  Phase2["MEMORY_DUMP_PROCESS"] = "v";
  Phase2["MARK"] = "R";
  Phase2["CLOCK_SYNC"] = "c";
})(Phase || (Phase = {}));
function isNestableAsyncPhase(phase) {
  return phase === "b" || phase === "e" || phase === "n";
}
function isPhaseAsync(phase) {
  return isNestableAsyncPhase(phase) || phase === "S" || phase === "T" || phase === "F" || phase === "p";
}
function isFlowPhase(phase) {
  return phase === "s" || phase === "t" || phase === "f";
}
var Scope;
(function(Scope2) {
  Scope2["THREAD"] = "t";
  Scope2["PROCESS"] = "p";
  Scope2["GLOBAL"] = "g";
})(Scope || (Scope = {}));
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
var AuctionWorkletType;
(function(AuctionWorkletType2) {
  AuctionWorkletType2["BIDDER"] = "bidder";
  AuctionWorkletType2["SELLER"] = "seller";
  AuctionWorkletType2["UNKNOWN"] = "unknown";
})(AuctionWorkletType || (AuctionWorkletType = {}));
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
  isAnyFirstContentfulPaint,
  isAnyLargestContentfulPaintCandidate,
  isNavigationStart,
  isSoftNavigationStart
];
var MarkerName = [
  "MarkDOMContent",
  "MarkLoad",
  "firstPaint",
  "firstContentfulPaint",
  "SyntheticSoftFirstContentfulPaint",
  "largestContentfulPaint::Candidate",
  "largestContentfulPaint::CandidateForSoftNavigation",
  "navigationStart",
  "SoftNavigationStart"
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
var LayoutInvalidationReason;
(function(LayoutInvalidationReason2) {
  LayoutInvalidationReason2["SIZE_CHANGED"] = "Size changed";
  LayoutInvalidationReason2["ATTRIBUTE"] = "Attribute";
  LayoutInvalidationReason2["ADDED_TO_LAYOUT"] = "Added to layout";
  LayoutInvalidationReason2["SCROLLBAR_CHANGED"] = "Scrollbar changed";
  LayoutInvalidationReason2["REMOVED_FROM_LAYOUT"] = "Removed from layout";
  LayoutInvalidationReason2["STYLE_CHANGED"] = "Style changed";
  LayoutInvalidationReason2["FONTS_CHANGED"] = "Fonts changed";
  LayoutInvalidationReason2["UNKNOWN"] = "Unknown";
})(LayoutInvalidationReason || (LayoutInvalidationReason = {}));
function isScheduleStyleInvalidationTracking(event) {
  return event.name === "ScheduleStyleInvalidationTracking";
}
var StyleRecalcInvalidationReason;
(function(StyleRecalcInvalidationReason2) {
  StyleRecalcInvalidationReason2["ANIMATION"] = "Animation";
  StyleRecalcInvalidationReason2["RELATED_STYLE_RULE"] = "Related style rule";
})(StyleRecalcInvalidationReason || (StyleRecalcInvalidationReason = {}));
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
function isMetaCharsetCheck(event) {
  return event.name === "MetaCharsetCheck";
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
var State;
(function(State2) {
  State2["STATE_NO_UPDATE_DESIRED"] = "STATE_NO_UPDATE_DESIRED";
  State2["STATE_PRESENTED_ALL"] = "STATE_PRESENTED_ALL";
  State2["STATE_PRESENTED_PARTIAL"] = "STATE_PRESENTED_PARTIAL";
  State2["STATE_DROPPED"] = "STATE_DROPPED";
})(State || (State = {}));
var FrameDropReason;
(function(FrameDropReason2) {
  FrameDropReason2["REASON_UNSPECIFIED"] = "REASON_UNSPECIFIED";
  FrameDropReason2["REASON_DISPLAY_COMPOSITOR"] = "REASON_DISPLAY_COMPOSITOR";
  FrameDropReason2["REASON_MAIN_THREAD"] = "REASON_MAIN_THREAD";
  FrameDropReason2["REASON_CLIENT_COMPOSITOR"] = "REASON_CLIENT_COMPOSITOR";
})(FrameDropReason || (FrameDropReason = {}));
var ScrollState;
(function(ScrollState2) {
  ScrollState2["SCROLL_NONE"] = "SCROLL_NONE";
  ScrollState2["SCROLL_MAIN_THREAD"] = "SCROLL_MAIN_THREAD";
  ScrollState2["SCROLL_COMPOSITOR_THREAD"] = "SCROLL_COMPOSITOR_THREAD";
  ScrollState2["SCROLL_UNKNOWN"] = "SCROLL_UNKNOWN";
})(ScrollState || (ScrollState = {}));
var FrameType;
(function(FrameType2) {
  FrameType2["FORKED"] = "FORKED";
  FrameType2["BACKFILL"] = "BACKFILL";
})(FrameType || (FrameType = {}));
function isPipelineReporter(event) {
  return event.name === "PipelineReporter";
}
function isSyntheticBased(event) {
  return "rawSourceEvent" in event;
}
function isJSSample(event) {
  return event.name === "JSSample";
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
var InvalidationEventType;
(function(InvalidationEventType2) {
  InvalidationEventType2["StyleInvalidatorInvalidationTracking"] = "StyleInvalidatorInvalidationTracking";
  InvalidationEventType2["StyleRecalcInvalidationTracking"] = "StyleRecalcInvalidationTracking";
})(InvalidationEventType || (InvalidationEventType = {}));
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
function isSoftFirstContentfulPaint(event) {
  return event.name === "SyntheticSoftFirstContentfulPaint";
}
function isAnyFirstContentfulPaint(event) {
  return event.name === "firstContentfulPaint" || event.name === "SyntheticSoftFirstContentfulPaint";
}
function isAnyLargestContentfulPaintCandidate(event) {
  return event.name === "largestContentfulPaint::Candidate" || event.name === "largestContentfulPaint::CandidateForSoftNavigation";
}
function isSoftLargestContentfulPaintCandidate(event) {
  return event.name === "largestContentfulPaint::CandidateForSoftNavigation";
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
var Name;
(function(Name2) {
  Name2["THREAD_NAME"] = "thread_name";
  Name2["PROGRAM"] = "Program";
  Name2["RUN_TASK"] = "RunTask";
  Name2["ASYNC_TASK"] = "AsyncTask";
  Name2["RUN_MICROTASKS"] = "RunMicrotasks";
  Name2["XHR_LOAD"] = "XHRLoad";
  Name2["XHR_READY_STATE_CHANGED"] = "XHRReadyStateChange";
  Name2["PARSE_HTML"] = "ParseHTML";
  Name2["PARSE_CSS"] = "ParseAuthorStyleSheet";
  Name2["COMPILE_CODE"] = "V8.CompileCode";
  Name2["COMPILE_MODULE"] = "V8.CompileModule";
  Name2["COMPILE"] = "v8.compile";
  Name2["COMPILE_SCRIPT"] = "V8.CompileScript";
  Name2["OPTIMIZE"] = "V8.OptimizeCode";
  Name2["WASM_STREAM_FROM_RESPONSE_CALLBACK"] = "v8.wasm.streamFromResponseCallback";
  Name2["WASM_COMPILED_MODULE"] = "v8.wasm.compiledModule";
  Name2["WASM_CACHED_MODULE"] = "v8.wasm.cachedModule";
  Name2["WASM_MODULE_CACHE_HIT"] = "v8.wasm.moduleCacheHit";
  Name2["WASM_MODULE_CACHE_INVALID"] = "v8.wasm.moduleCacheInvalid";
  Name2["PROFILE_CALL"] = "ProfileCall";
  Name2["EVALUATE_SCRIPT"] = "EvaluateScript";
  Name2["FUNCTION_CALL"] = "FunctionCall";
  Name2["EVENT_DISPATCH"] = "EventDispatch";
  Name2["EVALUATE_MODULE"] = "v8.evaluateModule";
  Name2["REQUEST_MAIN_THREAD_FRAME"] = "RequestMainThreadFrame";
  Name2["REQUEST_ANIMATION_FRAME"] = "RequestAnimationFrame";
  Name2["CANCEL_ANIMATION_FRAME"] = "CancelAnimationFrame";
  Name2["FIRE_ANIMATION_FRAME"] = "FireAnimationFrame";
  Name2["REQUEST_IDLE_CALLBACK"] = "RequestIdleCallback";
  Name2["CANCEL_IDLE_CALLBACK"] = "CancelIdleCallback";
  Name2["FIRE_IDLE_CALLBACK"] = "FireIdleCallback";
  Name2["TIMER_INSTALL"] = "TimerInstall";
  Name2["TIMER_REMOVE"] = "TimerRemove";
  Name2["TIMER_FIRE"] = "TimerFire";
  Name2["WEB_SOCKET_CREATE"] = "WebSocketCreate";
  Name2["WEB_SOCKET_SEND_HANDSHAKE"] = "WebSocketSendHandshakeRequest";
  Name2["WEB_SOCKET_RECEIVE_HANDSHAKE"] = "WebSocketReceiveHandshakeResponse";
  Name2["WEB_SOCKET_DESTROY"] = "WebSocketDestroy";
  Name2["WEB_SOCKET_SEND"] = "WebSocketSend";
  Name2["WEB_SOCKET_RECEIVE"] = "WebSocketReceive";
  Name2["CRYPTO_DO_ENCRYPT"] = "DoEncrypt";
  Name2["CRYPTO_DO_ENCRYPT_REPLY"] = "DoEncryptReply";
  Name2["CRYPTO_DO_DECRYPT"] = "DoDecrypt";
  Name2["CRYPTO_DO_DECRYPT_REPLY"] = "DoDecryptReply";
  Name2["CRYPTO_DO_DIGEST"] = "DoDigest";
  Name2["CRYPTO_DO_DIGEST_REPLY"] = "DoDigestReply";
  Name2["CRYPTO_DO_SIGN"] = "DoSign";
  Name2["CRYPTO_DO_SIGN_REPLY"] = "DoSignReply";
  Name2["CRYPTO_DO_VERIFY"] = "DoVerify";
  Name2["CRYPTO_DO_VERIFY_REPLY"] = "DoVerifyReply";
  Name2["V8_EXECUTE"] = "V8.Execute";
  Name2["V8_CONSOLE_RUN_TASK"] = "V8Console::runTask";
  Name2["SCHEDULE_POST_TASK_CALLBACK"] = "SchedulePostTaskCallback";
  Name2["RUN_POST_TASK_CALLBACK"] = "RunPostTaskCallback";
  Name2["ABORT_POST_TASK_CALLBACK"] = "AbortPostTaskCallback";
  Name2["DEBUGGER_ASYNC_TASK_RUN"] = "v8::Debugger::AsyncTaskRun";
  Name2["DEBUGGER_ASYNC_TASK_SCHEDULED"] = "v8::Debugger::AsyncTaskScheduled";
  Name2["GC"] = "GCEvent";
  Name2["DOMGC"] = "BlinkGC.AtomicPhase";
  Name2["MAJOR_GC"] = "MajorGC";
  Name2["MINOR_GC"] = "MinorGC";
  Name2["GC_COLLECT_GARBARGE"] = "BlinkGC.AtomicPhase";
  Name2["CPPGC_SWEEP"] = "CppGC.IncrementalSweep";
  Name2["SCHEDULE_STYLE_RECALCULATION"] = "ScheduleStyleRecalculation";
  Name2["LAYOUT"] = "Layout";
  Name2["RECALC_STYLE"] = "UpdateLayoutTree";
  Name2["INVALIDATE_LAYOUT"] = "InvalidateLayout";
  Name2["LAYOUT_INVALIDATION_TRACKING"] = "LayoutInvalidationTracking";
  Name2["COMPUTE_INTERSECTION"] = "ComputeIntersections";
  Name2["HIT_TEST"] = "HitTest";
  Name2["PRE_PAINT"] = "PrePaint";
  Name2["LAYERIZE"] = "Layerize";
  Name2["LAYOUT_SHIFT"] = "LayoutShift";
  Name2["SYNTHETIC_LAYOUT_SHIFT"] = "SyntheticLayoutShift";
  Name2["SYNTHETIC_LAYOUT_SHIFT_CLUSTER"] = "SyntheticLayoutShiftCluster";
  Name2["UPDATE_LAYER_TREE"] = "UpdateLayerTree";
  Name2["SCHEDULE_STYLE_INVALIDATION_TRACKING"] = "ScheduleStyleInvalidationTracking";
  Name2["STYLE_RECALC_INVALIDATION_TRACKING"] = "StyleRecalcInvalidationTracking";
  Name2["STYLE_INVALIDATOR_INVALIDATION_TRACKING"] = "StyleInvalidatorInvalidationTracking";
  Name2["SELECTOR_STATS"] = "SelectorStats";
  Name2["BEGIN_COMMIT_COMPOSITOR_FRAME"] = "BeginCommitCompositorFrame";
  Name2["PARSE_META_VIEWPORT"] = "ParseMetaViewport";
  Name2["META_CHARSET_CHECK"] = "MetaCharsetCheck";
  Name2["SCROLL_LAYER"] = "ScrollLayer";
  Name2["UPDATE_LAYER"] = "UpdateLayer";
  Name2["PAINT_SETUP"] = "PaintSetup";
  Name2["PAINT"] = "Paint";
  Name2["PAINT_IMAGE"] = "PaintImage";
  Name2["COMMIT"] = "Commit";
  Name2["COMPOSITE_LAYERS"] = "CompositeLayers";
  Name2["RASTER_TASK"] = "RasterTask";
  Name2["IMAGE_DECODE_TASK"] = "ImageDecodeTask";
  Name2["IMAGE_UPLOAD_TASK"] = "ImageUploadTask";
  Name2["DECODE_IMAGE"] = "Decode Image";
  Name2["DRAW_LAZY_PIXEL_REF"] = "Draw LazyPixelRef";
  Name2["DECODE_LAZY_PIXEL_REF"] = "Decode LazyPixelRef";
  Name2["GPU_TASK"] = "GPUTask";
  Name2["RASTERIZE"] = "Rasterize";
  Name2["EVENT_TIMING"] = "EventTiming";
  Name2["OPTIMIZE_CODE"] = "V8.OptimizeCode";
  Name2["CACHE_SCRIPT"] = "v8.produceCache";
  Name2["CACHE_MODULE"] = "v8.produceModuleCache";
  Name2["V8_SAMPLE"] = "V8Sample";
  Name2["JIT_CODE_ADDED"] = "JitCodeAdded";
  Name2["JIT_CODE_MOVED"] = "JitCodeMoved";
  Name2["STREAMING_COMPILE_SCRIPT"] = "v8.parseOnBackground";
  Name2["STREAMING_COMPILE_SCRIPT_WAITING"] = "v8.parseOnBackgroundWaiting";
  Name2["STREAMING_COMPILE_SCRIPT_PARSING"] = "v8.parseOnBackgroundParsing";
  Name2["BACKGROUND_DESERIALIZE"] = "v8.deserializeOnBackground";
  Name2["FINALIZE_DESERIALIZATION"] = "V8.FinalizeDeserialization";
  Name2["COMMIT_LOAD"] = "CommitLoad";
  Name2["MARK_LOAD"] = "MarkLoad";
  Name2["MARK_DOM_CONTENT"] = "MarkDOMContent";
  Name2["MARK_FIRST_PAINT"] = "firstPaint";
  Name2["MARK_FCP"] = "firstContentfulPaint";
  Name2["MARK_SOFT_FCP"] = "SyntheticSoftFirstContentfulPaint";
  Name2["MARK_LCP_CANDIDATE"] = "largestContentfulPaint::Candidate";
  Name2["MARK_LCP_CANDIDATE_FOR_SOFT_NAVIGATION"] = "largestContentfulPaint::CandidateForSoftNavigation";
  Name2["MARK_LCP_INVALIDATE"] = "largestContentfulPaint::Invalidate";
  Name2["NAVIGATION_START"] = "navigationStart";
  Name2["SOFT_NAVIGATION_START"] = "SoftNavigationStart";
  Name2["CONSOLE_TIME"] = "ConsoleTime";
  Name2["USER_TIMING"] = "UserTiming";
  Name2["INTERACTIVE_TIME"] = "InteractiveTime";
  Name2["TIME_STAMP"] = "TimeStamp";
  Name2["BEGIN_FRAME"] = "BeginFrame";
  Name2["NEEDS_BEGIN_FRAME_CHANGED"] = "NeedsBeginFrameChanged";
  Name2["BEGIN_MAIN_THREAD_FRAME"] = "BeginMainThreadFrame";
  Name2["ACTIVATE_LAYER_TREE"] = "ActivateLayerTree";
  Name2["DRAW_FRAME"] = "DrawFrame";
  Name2["DROPPED_FRAME"] = "DroppedFrame";
  Name2["FRAME_STARTED_LOADING"] = "FrameStartedLoading";
  Name2["PIPELINE_REPORTER"] = "PipelineReporter";
  Name2["SCREENSHOT"] = "Screenshot";
  Name2["RESOURCE_WILL_SEND_REQUEST"] = "ResourceWillSendRequest";
  Name2["RESOURCE_SEND_REQUEST"] = "ResourceSendRequest";
  Name2["RESOURCE_RECEIVE_RESPONSE"] = "ResourceReceiveResponse";
  Name2["RESOURCE_RECEIVE_DATA"] = "ResourceReceivedData";
  Name2["RESOURCE_FINISH"] = "ResourceFinish";
  Name2["RESOURCE_MARK_AS_CACHED"] = "ResourceMarkAsCached";
  Name2["WEB_SOCKET_SEND_HANDSHAKE_REQUEST"] = "WebSocketSendHandshakeRequest";
  Name2["WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST"] = "WebSocketReceiveHandshakeResponse";
  Name2["CPU_PROFILE"] = "CpuProfile";
  Name2["PROFILE"] = "Profile";
  Name2["START_PROFILING"] = "CpuProfiler::StartProfiling";
  Name2["PROFILE_CHUNK"] = "ProfileChunk";
  Name2["UPDATE_COUNTERS"] = "UpdateCounters";
  Name2["JS_SAMPLE"] = "JSSample";
  Name2["ANIMATION"] = "Animation";
  Name2["PARSE_AUTHOR_STYLE_SHEET"] = "ParseAuthorStyleSheet";
  Name2["EMBEDDER_CALLBACK"] = "EmbedderCallback";
  Name2["SET_LAYER_TREE_ID"] = "SetLayerTreeId";
  Name2["TRACING_STARTED_IN_PAGE"] = "TracingStartedInPage";
  Name2["TRACING_STARTED_IN_BROWSER"] = "TracingStartedInBrowser";
  Name2["TRACING_SESSION_ID_FOR_WORKER"] = "TracingSessionIdForWorker";
  Name2["LAZY_PIXEL_REF"] = "LazyPixelRef";
  Name2["LAYER_TREE_HOST_IMPL_SNAPSHOT"] = "cc::LayerTreeHostImpl";
  Name2["PICTURE_SNAPSHOT"] = "cc::Picture";
  Name2["DISPLAY_ITEM_LIST_SNAPSHOT"] = "cc::DisplayItemList";
  Name2["INPUT_LATENCY_MOUSE_MOVE"] = "InputLatency::MouseMove";
  Name2["INPUT_LATENCY_MOUSE_WHEEL"] = "InputLatency::MouseWheel";
  Name2["IMPL_SIDE_FLING"] = "InputHandlerProxy::HandleGestureFling::started";
  Name2["SCHEDULE_POST_MESSAGE"] = "SchedulePostMessage";
  Name2["HANDLE_POST_MESSAGE"] = "HandlePostMessage";
  Name2["RENDER_FRAME_IMPL_CREATE_CHILD_FRAME"] = "RenderFrameImpl::createChildFrame";
  Name2["LAYOUT_IMAGE_UNSIZED"] = "LayoutImageUnsized";
  Name2["DOM_LOADING"] = "domLoading";
  Name2["BEGIN_REMOTE_FONT_LOAD"] = "BeginRemoteFontLoad";
  Name2["REMOTE_FONT_LOADED"] = "RemoteFontLoaded";
  Name2["ANIMATION_FRAME"] = "AnimationFrame";
  Name2["ANIMATION_FRAME_PRESENTATION"] = "AnimationFrame::Presentation";
  Name2["SYNTHETIC_NETWORK_REQUEST"] = "SyntheticNetworkRequest";
  Name2["USER_TIMING_MEASURE"] = "UserTiming::Measure";
  Name2["LINK_PRECONNECT"] = "LinkPreconnect";
  Name2["PRELOAD_RENDER_BLOCKING_STATUS_CHANGE"] = "PreloadRenderBlockingStatusChange";
})(Name || (Name = {}));
var Categories = {
  Console: "blink.console",
  UserTiming: "blink.user_timing",
  Loading: "loading"
};
var DefaultCategories = [
  "blink.console",
  "blink.user_timing",
  "loading",
  "devtools.timeline",
  "disabled-by-default-devtools.target-rundown",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.timeline.stack",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.v8-source-rundown-sources",
  "disabled-by-default-devtools.v8-source-rundown",
  "disabled-by-default-layout_shift.debug",
  "disabled-by-default-v8.inspector",
  "disabled-by-default-v8.cpu_profiler.hires",
  "disabled-by-default-lighthouse",
  "v8.execute",
  "v8",
  "cppgc",
  "navigation,rail"
];
var OptionalCategories = {
  JsSampling: ["disabled-by-default-v8.cpu_profiler"],
  InvalidationTracking: ["disabled-by-default-devtools.timeline.invalidationTracking"],
  AdvancedPaint: [
    "disabled-by-default-devtools.timeline.layers",
    "disabled-by-default-devtools.timeline.picture",
    "disabled-by-default-blink.graphics_context_annotations"
  ],
  Screenshot: ["disabled-by-default-devtools.screenshot"],
  CssSelectorStats: [
    "disabled-by-default-blink.debug",
    "disabled-by-default-devtools.timeline.invalidationTracking"
  ]
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
