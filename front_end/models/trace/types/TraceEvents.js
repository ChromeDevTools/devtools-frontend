// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function isNestableAsyncPhase(phase) {
    return phase === "b" /* Phase.ASYNC_NESTABLE_START */ || phase === "e" /* Phase.ASYNC_NESTABLE_END */ ||
        phase === "n" /* Phase.ASYNC_NESTABLE_INSTANT */;
}
export function isPhaseAsync(phase) {
    return isNestableAsyncPhase(phase) || phase === "S" /* Phase.ASYNC_BEGIN */ || phase === "T" /* Phase.ASYNC_STEP_INTO */ ||
        phase === "F" /* Phase.ASYNC_END */ || phase === "p" /* Phase.ASYNC_STEP_PAST */;
}
export function isFlowPhase(phase) {
    return phase === "s" /* Phase.FLOW_START */ || phase === "t" /* Phase.FLOW_STEP */ || phase === "f" /* Phase.FLOW_END */;
}
export function objectIsCallFrame(object) {
    return ('functionName' in object && typeof object.functionName === 'string') &&
        ('scriptId' in object && (typeof object.scriptId === 'string' || typeof object.scriptId === 'number')) &&
        ('columnNumber' in object && typeof object.columnNumber === 'number') &&
        ('lineNumber' in object && typeof object.lineNumber === 'number') &&
        ('url' in object && typeof object.url === 'string');
}
export function isRunTask(event) {
    return event.name === "RunTask" /* Name.RUN_TASK */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isAuctionWorkletRunningInProcess(event) {
    return event.name === 'AuctionWorkletRunningInProcess';
}
export function isAuctionWorkletDoneWithProcess(event) {
    return event.name === 'AuctionWorkletDoneWithProcess';
}
export function isLegacyScreenshot(event) {
    return event.name === "Screenshot" /* Name.SCREENSHOT */ && 'id' in event;
}
export function isLegacySyntheticScreenshot(event) {
    return event.name === "Screenshot" /* Name.SCREENSHOT */ && 'dataUri' in (event.args ?? {});
}
export function isScreenshot(event) {
    return event.name === "Screenshot" /* Name.SCREENSHOT */ && 'source_id' in (event.args ?? {});
}
const markerTypeGuards = [
    isMarkDOMContent,
    isMarkLoad,
    isFirstPaint,
    isFirstContentfulPaint,
    isLargestContentfulPaintCandidate,
    isNavigationStart,
];
export const MarkerName = ['MarkDOMContent', 'MarkLoad', 'firstPaint', 'firstContentfulPaint', 'largestContentfulPaint::Candidate'];
export function isMarkerEvent(event) {
    if (event.ph === "I" /* Phase.INSTANT */ || event.ph === "R" /* Phase.MARK */) {
        return markerTypeGuards.some(fn => fn(event));
    }
    return false;
}
const pageLoadEventTypeGuards = [
    ...markerTypeGuards,
    isInteractiveTime,
];
export function eventIsPageLoadEvent(event) {
    if (event.ph === "I" /* Phase.INSTANT */ || event.ph === "R" /* Phase.MARK */) {
        return pageLoadEventTypeGuards.some(fn => fn(event));
    }
    return false;
}
export function isTracingSessionIdForWorker(event) {
    return event.name === 'TracingSessionIdForWorker';
}
export const NO_NAVIGATION = 'NO_NAVIGATION';
export function isScheduleStyleInvalidationTracking(event) {
    return event.name === "ScheduleStyleInvalidationTracking" /* Name.SCHEDULE_STYLE_INVALIDATION_TRACKING */;
}
export function isStyleRecalcInvalidationTracking(event) {
    return event.name === "StyleRecalcInvalidationTracking" /* Name.STYLE_RECALC_INVALIDATION_TRACKING */;
}
export function isStyleInvalidatorInvalidationTracking(event) {
    return event.name === "StyleInvalidatorInvalidationTracking" /* Name.STYLE_INVALIDATOR_INVALIDATION_TRACKING */;
}
export function isBeginCommitCompositorFrame(event) {
    return event.name === "BeginCommitCompositorFrame" /* Name.BEGIN_COMMIT_COMPOSITOR_FRAME */;
}
export function isParseMetaViewport(event) {
    return event.name === "ParseMetaViewport" /* Name.PARSE_META_VIEWPORT */;
}
export function isLinkPreconnect(event) {
    return event.name === "LinkPreconnect" /* Name.LINK_PRECONNECT */;
}
export function isScheduleStyleRecalculation(event) {
    return event.name === "ScheduleStyleRecalculation" /* Name.SCHEDULE_STYLE_RECALCULATION */;
}
export function isRenderFrameImplCreateChildFrame(event) {
    return event.name === "RenderFrameImpl::createChildFrame" /* Name.RENDER_FRAME_IMPL_CREATE_CHILD_FRAME */;
}
export function isLayoutImageUnsized(event) {
    return event.name === "LayoutImageUnsized" /* Name.LAYOUT_IMAGE_UNSIZED */;
}
export function isPairableAsyncBegin(e) {
    return e.ph === "b" /* Phase.ASYNC_NESTABLE_START */;
}
export function isPairableAsyncEnd(e) {
    return e.ph === "e" /* Phase.ASYNC_NESTABLE_END */;
}
export function isPairableAsyncInstant(e) {
    return e.ph === "n" /* Phase.ASYNC_NESTABLE_INSTANT */;
}
export function isAnimationFrameAsyncStart(data) {
    return data.name === "AnimationFrame" /* Name.ANIMATION_FRAME */ && data.ph === "b" /* Phase.ASYNC_NESTABLE_START */;
}
export function isAnimationFrameAsyncEnd(data) {
    return data.name === "AnimationFrame" /* Name.ANIMATION_FRAME */ && data.ph === "e" /* Phase.ASYNC_NESTABLE_END */;
}
export function isAnimationFramePresentation(data) {
    return data.name === "AnimationFrame::Presentation" /* Name.ANIMATION_FRAME_PRESENTATION */;
}
export function isPipelineReporter(event) {
    return event.name === "PipelineReporter" /* Name.PIPELINE_REPORTER */;
}
export function isSyntheticBased(event) {
    return 'rawSourceEvent' in event;
}
export function isSyntheticInteraction(event) {
    return Boolean('interactionId' in event && event.args?.data && 'beginEvent' in event.args.data && 'endEvent' in event.args.data);
}
export function isDrawFrame(event) {
    // The extra check for INSTANT here is because in the past DrawFrame events had an ASYNC_NESTABLE_START and ASYNC_NESTABLE_END pair. We don't want to support those old events, so we have to check we are dealing with an instant event.
    return event.name === "DrawFrame" /* Name.DRAW_FRAME */ && event.ph === "I" /* Phase.INSTANT */;
}
export function isBeginFrame(event) {
    // Old traces did not have frameSeqId; but we do not want to support these.
    return Boolean(event.name === "BeginFrame" /* Name.BEGIN_FRAME */ && event.args && 'frameSeqId' in event.args);
}
export function isDroppedFrame(event) {
    // Old traces did not have frameSeqId; but we do not want to support these.
    return Boolean(event.name === "DroppedFrame" /* Name.DROPPED_FRAME */ && event.args && 'frameSeqId' in event.args);
}
export function isRequestMainThreadFrame(event) {
    return event.name === "RequestMainThreadFrame" /* Name.REQUEST_MAIN_THREAD_FRAME */;
}
export function isBeginMainThreadFrame(event) {
    return event.name === "BeginMainThreadFrame" /* Name.BEGIN_MAIN_THREAD_FRAME */;
}
export function isNeedsBeginFrameChanged(event) {
    return event.name === "NeedsBeginFrameChanged" /* Name.NEEDS_BEGIN_FRAME_CHANGED */;
}
export function isCommit(event) {
    // Old traces did not have frameSeqId; but we do not want to support these.
    return Boolean(event.name === "Commit" /* Name.COMMIT */ && event.args && 'frameSeqId' in event.args);
}
export function isRasterTask(event) {
    return event.name === "RasterTask" /* Name.RASTER_TASK */;
}
export function isCompositeLayers(event) {
    return event.name === "CompositeLayers" /* Name.COMPOSITE_LAYERS */;
}
export function isActivateLayerTree(event) {
    return event.name === "ActivateLayerTree" /* Name.ACTIVATE_LAYER_TREE */;
}
export function isInvalidationTracking(event) {
    return isScheduleStyleInvalidationTracking(event) || isStyleRecalcInvalidationTracking(event) ||
        isStyleInvalidatorInvalidationTracking(event) || isLayoutInvalidationTracking(event);
}
export function isDrawLazyPixelRef(event) {
    return event.name === "Draw LazyPixelRef" /* Name.DRAW_LAZY_PIXEL_REF */;
}
export function isDecodeLazyPixelRef(event) {
    return event.name === "Decode LazyPixelRef" /* Name.DECODE_LAZY_PIXEL_REF */;
}
export function isDecodeImage(event) {
    return event.name === "Decode Image" /* Name.DECODE_IMAGE */;
}
export var SelectorTimingsKey;
(function (SelectorTimingsKey) {
    SelectorTimingsKey["Elapsed"] = "elapsed (us)";
    SelectorTimingsKey["RejectPercentage"] = "reject_percentage";
    SelectorTimingsKey["FastRejectCount"] = "fast_reject_count";
    SelectorTimingsKey["MatchAttempts"] = "match_attempts";
    SelectorTimingsKey["MatchCount"] = "match_count";
    SelectorTimingsKey["Selector"] = "selector";
    SelectorTimingsKey["StyleSheetId"] = "style_sheet_id";
    SelectorTimingsKey["InvalidationCount"] = "invalidation_count";
})(SelectorTimingsKey || (SelectorTimingsKey = {}));
export function isSelectorStats(event) {
    return event.name === "SelectorStats" /* Name.SELECTOR_STATS */;
}
/** The real trace event is called 'UpdateLayoutTree' but we've aliased it for convenience. */
export function isRecalcStyle(event) {
    return event.name === "UpdateLayoutTree" /* Name.RECALC_STYLE */;
}
export function isLayout(event) {
    return event.name === "Layout" /* Name.LAYOUT */ && Boolean(event.args && 'beginData' in event.args);
}
export function isInvalidateLayout(event) {
    return event.name === "InvalidateLayout" /* Name.INVALIDATE_LAYOUT */;
}
export function isDebuggerAsyncTaskScheduled(event) {
    return event.name === "v8::Debugger::AsyncTaskScheduled" /* Name.DEBUGGER_ASYNC_TASK_SCHEDULED */;
}
export function isDebuggerAsyncTaskRun(event) {
    return event.name === "v8::Debugger::AsyncTaskRun" /* Name.DEBUGGER_ASYNC_TASK_RUN */;
}
export function ProfileID(value) {
    return value;
}
export function CallFrameID(value) {
    return value;
}
export function SampleIndex(value) {
    return value;
}
export function ProcessID(value) {
    return value;
}
export function ThreadID(value) {
    return value;
}
export function WorkerId(value) {
    return value;
}
export function isComplete(event) {
    return event.ph === "X" /* Phase.COMPLETE */;
}
export function isBegin(event) {
    return event.ph === "B" /* Phase.BEGIN */;
}
export function isEnd(event) {
    return event.ph === "E" /* Phase.END */;
}
export function isDispatch(event) {
    return event.name === 'EventDispatch' && event.ph === "X" /* Phase.COMPLETE */;
}
export function isInstant(event) {
    return event.ph === "I" /* Phase.INSTANT */;
}
export function isRendererEvent(event) {
    return isInstant(event) || isComplete(event);
}
export function isFireIdleCallback(event) {
    return event.name === 'FireIdleCallback' && event.ph === "X" /* Phase.COMPLETE */;
}
export function isSchedulePostMessage(event) {
    return event.name === "SchedulePostMessage" /* Name.SCHEDULE_POST_MESSAGE */;
}
export function isHandlePostMessage(event) {
    return event.name === "HandlePostMessage" /* Name.HANDLE_POST_MESSAGE */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isUpdateCounters(event) {
    return event.name === 'UpdateCounters';
}
export function isDOMStats(event) {
    return event.name === 'DOMStats';
}
export function isThreadName(event) {
    return event.name === "thread_name" /* Name.THREAD_NAME */;
}
export function isProcessName(event) {
    return event.name === 'process_name';
}
export function isTracingStartedInBrowser(event) {
    return event.name === "TracingStartedInBrowser" /* Name.TRACING_STARTED_IN_BROWSER */;
}
export function isFrameCommittedInBrowser(event) {
    return event.name === 'FrameCommittedInBrowser';
}
export function isCommitLoad(event) {
    return event.name === 'CommitLoad';
}
export function isAnimation(event) {
    // We've found some rare traces with an Animation trace event from a different category: https://crbug.com/1472375#comment7
    return event.name === 'Animation' && event.cat.includes('devtools.timeline');
}
export function isSyntheticAnimation(event) {
    if (event.name !== 'Animation' || !event.cat.includes('devtools.timeline')) {
        return false;
    }
    const data = event.args?.data;
    if (!data) {
        return false;
    }
    return 'beginEvent' in data && 'endEvent' in data;
}
export function isLayoutShift(event) {
    return event.name === "LayoutShift" /* Name.LAYOUT_SHIFT */;
}
export function isLayoutInvalidationTracking(event) {
    return event.name === "LayoutInvalidationTracking" /* Name.LAYOUT_INVALIDATION_TRACKING */;
}
export function isFirstContentfulPaint(event) {
    return event.name === 'firstContentfulPaint';
}
export function isLargestContentfulPaintCandidate(event) {
    return event.name === "largestContentfulPaint::Candidate" /* Name.MARK_LCP_CANDIDATE */;
}
export function isLargestImagePaintCandidate(event) {
    return event.name === 'LargestImagePaint::Candidate';
}
export function isLargestTextPaintCandidate(event) {
    return event.name === 'LargestTextPaint::Candidate';
}
export function isMarkLoad(event) {
    return event.name === 'MarkLoad';
}
export function isFirstPaint(event) {
    return event.name === 'firstPaint';
}
export function isMarkDOMContent(event) {
    return event.name === 'MarkDOMContent';
}
export function isInteractiveTime(event) {
    return event.name === 'InteractiveTime';
}
export function isEventTiming(event) {
    return event.name === "EventTiming" /* Name.EVENT_TIMING */;
}
export function isEventTimingEnd(event) {
    return isEventTiming(event) && event.ph === "e" /* Phase.ASYNC_NESTABLE_END */;
}
export function isEventTimingStart(event) {
    return isEventTiming(event) && event.ph === "b" /* Phase.ASYNC_NESTABLE_START */;
}
export function isGPUTask(event) {
    return event.name === 'GPUTask';
}
export function isProfile(event) {
    return event.name === "Profile" /* Name.PROFILE */;
}
export function isSyntheticCpuProfile(event) {
    return event.name === "CpuProfile" /* Name.CPU_PROFILE */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isProfileChunk(event) {
    return event.name === "ProfileChunk" /* Name.PROFILE_CHUNK */;
}
export function isResourceChangePriority(event) {
    return event.name === 'ResourceChangePriority';
}
export function isResourceSendRequest(event) {
    return event.name === 'ResourceSendRequest';
}
export function isResourceReceiveResponse(event) {
    return event.name === 'ResourceReceiveResponse';
}
export function isResourceMarkAsCached(event) {
    return event.name === 'ResourceMarkAsCached';
}
export function isResourceFinish(event) {
    return event.name === 'ResourceFinish';
}
export function isResourceWillSendRequest(event) {
    return event.name === 'ResourceWillSendRequest';
}
export function isResourceReceivedData(event) {
    return event.name === 'ResourceReceivedData';
}
/** Any event where we receive data (and get an encodedDataLength) **/
export function isReceivedDataEvent(event) {
    return event.name === 'ResourceReceivedData' || event.name === 'ResourceFinish' ||
        event.name === 'ResourceReceiveResponse';
}
export function isSyntheticNetworkRequest(event) {
    return event.name === "SyntheticNetworkRequest" /* Name.SYNTHETIC_NETWORK_REQUEST */;
}
export function isSyntheticWebSocketConnection(event) {
    return event.name === 'SyntheticWebSocketConnection';
}
export function isNetworkTrackEntry(event) {
    return isSyntheticNetworkRequest(event) || isSyntheticWebSocketConnection(event) || isWebSocketTraceEvent(event);
}
export function isPrePaint(event) {
    return event.name === 'PrePaint';
}
/** A VALID navigation start (as it has a populated documentLoaderURL) */
export function isNavigationStart(event) {
    return event.name === 'navigationStart' && event.args?.data?.documentLoaderURL !== '';
}
export function isDidCommitSameDocumentNavigation(event) {
    return event.name === 'RenderFrameHostImpl::DidCommitSameDocumentNavigation' && event.ph === "X" /* Phase.COMPLETE */;
}
export function isMainFrameViewport(event) {
    return event.name === 'PaintTimingVisualizer::Viewport';
}
export function isSyntheticUserTiming(event) {
    if (event.cat !== 'blink.user_timing') {
        return false;
    }
    const data = event.args?.data;
    if (!data) {
        return false;
    }
    return 'beginEvent' in data && 'endEvent' in data;
}
export function isSyntheticConsoleTiming(event) {
    if (event.cat !== 'blink.console') {
        return false;
    }
    const data = event.args?.data;
    if (!data) {
        return false;
    }
    return 'beginEvent' in data && 'endEvent' in data;
}
export function isUserTiming(event) {
    return event.cat === 'blink.user_timing';
}
export function isDomLoading(event) {
    return event.name === "domLoading" /* Name.DOM_LOADING */;
}
export function isBeginRemoteFontLoad(event) {
    return event.name === "BeginRemoteFontLoad" /* Name.BEGIN_REMOTE_FONT_LOAD */;
}
export function isRemoteFontLoaded(event) {
    return event.name === "RemoteFontLoaded" /* Name.REMOTE_FONT_LOADED */;
}
export function isPerformanceMeasure(event) {
    return isUserTiming(event) && isPhaseAsync(event.ph);
}
export function isPerformanceMeasureBegin(event) {
    return isPerformanceMeasure(event) && event.ph === "b" /* Phase.ASYNC_NESTABLE_START */;
}
export function isPerformanceMark(event) {
    return isUserTiming(event) && (event.ph === "R" /* Phase.MARK */ || event.ph === "I" /* Phase.INSTANT */);
}
export function isConsoleTime(event) {
    return event.cat === 'blink.console' && isPhaseAsync(event.ph);
}
export function isConsoleTimeStamp(event) {
    return event.ph === "I" /* Phase.INSTANT */ && event.name === "TimeStamp" /* Name.TIME_STAMP */;
}
export function isUserTimingMeasure(event) {
    return event.name === "UserTiming::Measure" /* Name.USER_TIMING_MEASURE */;
}
export function isParseHTML(event) {
    return event.name === 'ParseHTML';
}
export function isSyntheticLayoutShift(event) {
    return event.name === "SyntheticLayoutShift" /* Name.SYNTHETIC_LAYOUT_SHIFT */;
}
export function isSyntheticLayoutShiftCluster(event) {
    return event.name === "SyntheticLayoutShiftCluster" /* Name.SYNTHETIC_LAYOUT_SHIFT_CLUSTER */;
}
export function isProfileCall(event) {
    return 'callFrame' in event;
}
export function isPaint(event) {
    return event.name === "Paint" /* Name.PAINT */;
}
export function isPaintImage(event) {
    return event.name === "PaintImage" /* Name.PAINT_IMAGE */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isScrollLayer(event) {
    return event.name === "ScrollLayer" /* Name.SCROLL_LAYER */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isSetLayerId(event) {
    return event.name === "SetLayerTreeId" /* Name.SET_LAYER_TREE_ID */;
}
export function isUpdateLayer(event) {
    return event.name === "UpdateLayer" /* Name.UPDATE_LAYER */;
}
export function isDisplayListItemListSnapshot(event) {
    return event.name === "cc::DisplayItemList" /* Name.DISPLAY_ITEM_LIST_SNAPSHOT */;
}
export function isLayerTreeHostImplSnapshot(event) {
    return event.name === "cc::LayerTreeHostImpl" /* Name.LAYER_TREE_HOST_IMPL_SNAPSHOT */;
}
export function isFireAnimationFrame(event) {
    return event.name === "FireAnimationFrame" /* Name.FIRE_ANIMATION_FRAME */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isTimerInstall(event) {
    return event.name === "TimerInstall" /* Name.TIMER_INSTALL */;
}
export function isTimerFire(event) {
    return event.name === "TimerFire" /* Name.TIMER_FIRE */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isRequestIdleCallback(event) {
    return event.name === "RequestIdleCallback" /* Name.REQUEST_IDLE_CALLBACK */;
}
export function isWebSocketCreate(event) {
    return event.name === "WebSocketCreate" /* Name.WEB_SOCKET_CREATE */;
}
export function isWebSocketInfo(event) {
    return event.name === "WebSocketSendHandshakeRequest" /* Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST */ ||
        event.name === "WebSocketReceiveHandshakeResponse" /* Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST */ || event.name === "WebSocketDestroy" /* Name.WEB_SOCKET_DESTROY */;
}
export function isWebSocketTransfer(event) {
    return event.name === "WebSocketSend" /* Name.WEB_SOCKET_SEND */ || event.name === "WebSocketReceive" /* Name.WEB_SOCKET_RECEIVE */;
}
export function isWebSocketSendHandshakeRequest(event) {
    return event.name === "WebSocketSendHandshakeRequest" /* Name.WEB_SOCKET_SEND_HANDSHAKE_REQUEST */;
}
export function isWebSocketReceiveHandshakeResponse(event) {
    return event.name === "WebSocketReceiveHandshakeResponse" /* Name.WEB_SOCKET_RECEIVE_HANDSHAKE_REQUEST */;
}
export function isWebSocketDestroy(event) {
    return event.name === "WebSocketDestroy" /* Name.WEB_SOCKET_DESTROY */;
}
export function isWebSocketTraceEvent(event) {
    return isWebSocketCreate(event) || isWebSocketInfo(event) || isWebSocketTransfer(event);
}
export function isWebSocketEvent(event) {
    return isWebSocketTraceEvent(event) || isSyntheticWebSocketConnection(event);
}
export function isV8Compile(event) {
    return event.name === "v8.compile" /* Name.COMPILE */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isFunctionCall(event) {
    return event.name === "FunctionCall" /* Name.FUNCTION_CALL */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isSchedulePostTaskCallback(event) {
    return event.name === "SchedulePostTaskCallback" /* Name.SCHEDULE_POST_TASK_CALLBACK */;
}
export function isRunPostTaskCallback(event) {
    return event.name === "RunPostTaskCallback" /* Name.RUN_POST_TASK_CALLBACK */ && event.ph === "X" /* Phase.COMPLETE */;
}
export function isAbortPostTaskCallback(event) {
    return event.name === "AbortPostTaskCallback" /* Name.ABORT_POST_TASK_CALLBACK */ && event.ph === "X" /* Phase.COMPLETE */;
}
/**
 * Generally, before JS is executed, a trace event is dispatched that
 * parents the JS calls. These we call "invocation" events. This
 * function determines if an event is one of such. Note: these are also
 * commonly referred to as "JS entry points".
 */
export function isJSInvocationEvent(event) {
    switch (event.name) {
        case "RunMicrotasks" /* Name.RUN_MICROTASKS */:
        case "FunctionCall" /* Name.FUNCTION_CALL */:
        // TODO(paulirish): Define types for these Evaluate* events
        case "EvaluateScript" /* Name.EVALUATE_SCRIPT */:
        case "v8.evaluateModule" /* Name.EVALUATE_MODULE */:
        case "EventDispatch" /* Name.EVENT_DISPATCH */:
        case "V8.Execute" /* Name.V8_EXECUTE */:
        case "V8Console::runTask" /* Name.V8_CONSOLE_RUN_TASK */:
            return true;
    }
    // Also consider any new v8 trace events. (eg 'V8.RunMicrotasks' and 'v8.run')
    if (event.name.startsWith('v8') || event.name.startsWith('V8')) {
        return true;
    }
    if (isConsoleRunTask(event)) {
        return true;
    }
    return false;
}
export function isConsoleRunTask(event) {
    return event.name === "V8Console::runTask" /* Name.V8_CONSOLE_RUN_TASK */;
}
export function isFlowPhaseEvent(event) {
    return event.ph === "s" /* Phase.FLOW_START */ || event.ph === "t" /* Phase.FLOW_STEP */ || event.ph === "f" /* Phase.FLOW_END */;
}
export function isParseAuthorStyleSheetEvent(event) {
    return event.name === "ParseAuthorStyleSheet" /* Name.PARSE_AUTHOR_STYLE_SHEET */ && event.ph === "X" /* Phase.COMPLETE */;
}
/**
 * NOT AN EXHAUSTIVE LIST: just some categories we use and refer
 * to in multiple places.
 **/
export const Categories = {
    Console: 'blink.console',
    UserTiming: 'blink.user_timing',
    Loading: 'loading',
};
export function isLegacyTimelineFrame(data) {
    return 'idle' in data && typeof data.idle === 'boolean';
}
export function isRundownScriptCompiled(event) {
    return event.cat === 'disabled-by-default-devtools.target-rundown';
}
export function isRundownScript(event) {
    return event.cat === 'disabled-by-default-devtools.v8-source-rundown' && event.name === 'ScriptCatchup';
}
export function isRundownScriptSource(event) {
    return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' && event.name === 'ScriptCatchup';
}
export function isRundownScriptSourceLarge(event) {
    return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' && event.name === 'LargeScriptCatchup';
}
export function isAnyScriptSourceEvent(event) {
    return event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources';
}
export function isPreloadRenderBlockingStatusChangeEvent(event) {
    return event.name === "PreloadRenderBlockingStatusChange" /* Name.PRELOAD_RENDER_BLOCKING_STATUS_CHANGE */;
}
//# sourceMappingURL=TraceEvents.js.map