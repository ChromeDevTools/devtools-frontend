/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 */
WebInspector.TimelineUIUtils = function() { }

/**
 * @constructor
 * @param {string} title
 * @param {!WebInspector.TimelineCategory} category
 * @param {boolean=} hidden
 */
WebInspector.TimelineRecordStyle = function(title, category, hidden)
{
    this.title = title;
    this.category = category;
    this.hidden = !!hidden;
}

/**
 * @return {!Object.<string, !WebInspector.TimelineRecordStyle>}
 */
WebInspector.TimelineUIUtils._initEventStyles = function()
{
    if (WebInspector.TimelineUIUtils._eventStylesMap)
        return WebInspector.TimelineUIUtils._eventStylesMap;

    var recordTypes = WebInspector.TimelineModel.RecordType;
    var categories = WebInspector.TimelineUIUtils.categories();

    var eventStyles = {};
    eventStyles[recordTypes.Task] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Task"), categories["other"]);
    eventStyles[recordTypes.Program] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Other"), categories["other"]);
    eventStyles[recordTypes.Animation] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Animation"), categories["rendering"]);
    eventStyles[recordTypes.EventDispatch] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Event"), categories["scripting"]);
    eventStyles[recordTypes.RequestMainThreadFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Request Main Thread Frame"), categories["rendering"], true);
    eventStyles[recordTypes.BeginFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Frame Start"), categories["rendering"], true);
    eventStyles[recordTypes.BeginMainThreadFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Frame Start (main thread)"), categories["rendering"], true);
    eventStyles[recordTypes.DrawFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Draw Frame"), categories["rendering"], true);
    eventStyles[recordTypes.HitTest] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Hit Test"), categories["rendering"]);
    eventStyles[recordTypes.ScheduleStyleRecalculation] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Schedule Style Recalculation"), categories["rendering"], true);
    eventStyles[recordTypes.RecalculateStyles] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Recalculate Style"), categories["rendering"]);
    eventStyles[recordTypes.UpdateLayoutTree] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Recalculate Style"), categories["rendering"]);
    eventStyles[recordTypes.InvalidateLayout] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Invalidate Layout"), categories["rendering"], true);
    eventStyles[recordTypes.Layout] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Layout"), categories["rendering"]);
    eventStyles[recordTypes.PaintSetup] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint Setup"), categories["painting"]);
    eventStyles[recordTypes.PaintImage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint Image"), categories["painting"], true);
    eventStyles[recordTypes.UpdateLayer] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Update Layer"), categories["painting"], true);
    eventStyles[recordTypes.UpdateLayerTree] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Update Layer Tree"), categories["rendering"]);
    eventStyles[recordTypes.Paint] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Paint"), categories["painting"]);
    eventStyles[recordTypes.RasterTask] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Rasterize Paint"), categories["painting"]);
    eventStyles[recordTypes.ScrollLayer] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Scroll"), categories["rendering"]);
    eventStyles[recordTypes.CompositeLayers] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Composite Layers"), categories["painting"]);
    eventStyles[recordTypes.ParseHTML] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Parse HTML"), categories["loading"]);
    eventStyles[recordTypes.ParseAuthorStyleSheet] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Parse Stylesheet"), categories["loading"]);
    eventStyles[recordTypes.TimerInstall] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Install Timer"), categories["scripting"]);
    eventStyles[recordTypes.TimerRemove] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Remove Timer"), categories["scripting"]);
    eventStyles[recordTypes.TimerFire] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Timer Fired"), categories["scripting"]);
    eventStyles[recordTypes.XHRReadyStateChange] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("XHR Ready State Change"), categories["scripting"]);
    eventStyles[recordTypes.XHRLoad] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("XHR Load"), categories["scripting"]);
    eventStyles[recordTypes.CompileScript] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Compile Script"), categories["scripting"]);
    eventStyles[recordTypes.EvaluateScript] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Evaluate Script"), categories["scripting"]);
    eventStyles[recordTypes.ParseScriptOnBackground] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Parse Script"), categories["scripting"]);
    eventStyles[recordTypes.MarkLoad] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Load event"), categories["scripting"], true);
    eventStyles[recordTypes.MarkDOMContent] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("DOMContentLoaded event"), categories["scripting"], true);
    eventStyles[recordTypes.MarkFirstPaint] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("First paint"), categories["painting"], true);
    eventStyles[recordTypes.TimeStamp] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Timestamp"), categories["scripting"]);
    eventStyles[recordTypes.ConsoleTime] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Console Time"), categories["scripting"]);
    eventStyles[recordTypes.UserTiming] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("User Timing"), categories["scripting"]);
    eventStyles[recordTypes.ResourceSendRequest] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Send Request"), categories["loading"]);
    eventStyles[recordTypes.ResourceReceiveResponse] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive Response"), categories["loading"]);
    eventStyles[recordTypes.ResourceFinish] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Finish Loading"), categories["loading"]);
    eventStyles[recordTypes.ResourceReceivedData] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive Data"), categories["loading"]);
    eventStyles[recordTypes.FunctionCall] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Function Call"), categories["scripting"]);
    eventStyles[recordTypes.GCEvent] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("GC Event"), categories["scripting"]);
    eventStyles[recordTypes.MajorGC] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Major GC"), categories["scripting"]);
    eventStyles[recordTypes.MinorGC] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Minor GC"), categories["scripting"]);
    eventStyles[recordTypes.JSFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("JS Frame"), categories["scripting"]);
    eventStyles[recordTypes.RequestAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Request Animation Frame"), categories["scripting"]);
    eventStyles[recordTypes.CancelAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Cancel Animation Frame"), categories["scripting"]);
    eventStyles[recordTypes.FireAnimationFrame] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Animation Frame Fired"), categories["scripting"]);
    eventStyles[recordTypes.RequestIdleCallback] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Request Idle Callback"), categories["scripting"]);
    eventStyles[recordTypes.CancelIdleCallback] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Cancel Idle Callback"), categories["scripting"]);
    eventStyles[recordTypes.FireIdleCallback] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Fire Idle Callback"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketCreate] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Create WebSocket"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketSendHandshakeRequest] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Send WebSocket Handshake"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketReceiveHandshakeResponse] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Receive WebSocket Handshake"), categories["scripting"]);
    eventStyles[recordTypes.WebSocketDestroy] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Destroy WebSocket"), categories["scripting"]);
    eventStyles[recordTypes.EmbedderCallback] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Embedder Callback"), categories["scripting"]);
    eventStyles[recordTypes.DecodeImage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Image Decode"), categories["painting"]);
    eventStyles[recordTypes.ResizeImage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Image Resize"), categories["painting"]);
    eventStyles[recordTypes.GPUTask] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("GPU"), categories["gpu"]);
    eventStyles[recordTypes.LatencyInfo] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("Input Latency"), categories["scripting"]);

    eventStyles[recordTypes.GCIdleLazySweep] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("DOM GC"), categories["scripting"]);
    eventStyles[recordTypes.GCCompleteSweep] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("DOM GC"), categories["scripting"]);
    eventStyles[recordTypes.GCCollectGarbage] = new WebInspector.TimelineRecordStyle(WebInspector.UIString("DOM GC"), categories["scripting"]);

    WebInspector.TimelineUIUtils._eventStylesMap = eventStyles;
    return eventStyles;
}
/**
 * @param {!WebInspector.TracingModel.Event} traceEvent
 * @param {!RegExp} regExp
 * @return {boolean}
 */
WebInspector.TimelineUIUtils.testContentMatching = function(traceEvent, regExp)
{
    var title = WebInspector.TimelineUIUtils.eventStyle(traceEvent).title;
    var tokens = [title];
    if (traceEvent.url)
        tokens.push(traceEvent.url);
    for (var argName in traceEvent.args) {
        var argValue = traceEvent.args[argName];
        for (var key in argValue)
            tokens.push(argValue[key]);
    }
    return regExp.test(tokens.join("|"));
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {!WebInspector.TimelineCategory}
 */
WebInspector.TimelineUIUtils.categoryForRecord = function(record)
{
    return WebInspector.TimelineUIUtils.eventStyle(record.traceEvent()).category;
}


/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!{title: string, category: !WebInspector.TimelineCategory}}
 */
WebInspector.TimelineUIUtils.eventStyle = function(event)
{
    var eventStyles = WebInspector.TimelineUIUtils._initEventStyles();
    if (event.hasCategory(WebInspector.TimelineModel.Category.Console) || event.hasCategory(WebInspector.TimelineModel.Category.UserTiming))
        return { title: event.name, category: WebInspector.TimelineUIUtils.categories()["scripting"] };

    if (event.hasCategory(WebInspector.TimelineModel.Category.LatencyInfo)) {
        /** @const */
        var prefix = "InputLatency::";
        var name = event.name.startsWith(prefix) ? event.name.substr(prefix.length) : event.name;
        return { title: name, category: WebInspector.TimelineUIUtils.categories()["scripting"] };
    }
    var result = eventStyles[event.name];
    if (!result) {
        result = new WebInspector.TimelineRecordStyle(event.name,  WebInspector.TimelineUIUtils.categories()["other"], true);
        eventStyles[event.name] = result;
    }
    return result;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineUIUtils.eventColor = function(event)
{
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
        var frame = event.args["data"];
        if (WebInspector.TimelineUIUtils.isUserFrame(frame))
            return WebInspector.TimelineUIUtils.colorForURL(frame.url);
    }
    return WebInspector.TimelineUIUtils.eventStyle(event).category.color;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineUIUtils.eventTitle = function(event)
{
    var title = WebInspector.TimelineUIUtils.eventStyle(event).title;
    if (event.hasCategory(WebInspector.TimelineModel.Category.Console))
        return title;
    if (event.name === WebInspector.TimelineModel.RecordType.TimeStamp)
        return WebInspector.UIString("%s: %s", title, event.args["data"]["message"]);
    if (event.name === WebInspector.TimelineModel.RecordType.Animation && event.args["data"] && event.args["data"]["name"])
        return WebInspector.UIString("%s: %s", title, event.args["data"]["name"]);
    return title;
}


/**
 * !Map<!WebInspector.TimelineIRModel.Phases, !{color: string, label: string}>
 */
WebInspector.TimelineUIUtils._interactionPhaseStyles = function()
{
    var map = WebInspector.TimelineUIUtils._interactionPhaseStylesMap;
    if (!map) {
         map = new Map([
            [WebInspector.TimelineIRModel.Phases.Idle, {color: "white", label: "Idle"}],
            [WebInspector.TimelineIRModel.Phases.Response, {color: "hsl(43, 83%, 64%)", label: WebInspector.UIString("Response")}],
            [WebInspector.TimelineIRModel.Phases.Scroll, {color: "hsl(256, 67%, 70%)", label: WebInspector.UIString("Scroll")}],
            [WebInspector.TimelineIRModel.Phases.Fling, {color: "hsl(256, 67%, 70%)", label: WebInspector.UIString("Fling")}],
            [WebInspector.TimelineIRModel.Phases.Drag, {color: "hsl(256, 67%, 70%)", label: WebInspector.UIString("Drag")}],
            [WebInspector.TimelineIRModel.Phases.Animation, {color: "hsl(256, 67%, 70%)", label: WebInspector.UIString("Animation")}],
            [WebInspector.TimelineIRModel.Phases.Uncategorized, {color: "hsl(0, 0%, 87%)", label: WebInspector.UIString("Uncategorized")}]
        ]);
        WebInspector.TimelineUIUtils._interactionPhaseStylesMap = map;
    }
    return map;
}

/**
 * @param {!WebInspector.TimelineIRModel.Phases} phase
 * @return {string}
 */
WebInspector.TimelineUIUtils.interactionPhaseColor = function(phase)
{
    return WebInspector.TimelineUIUtils._interactionPhaseStyles().get(phase).color;
}

/**
 * @param {!WebInspector.TimelineIRModel.Phases} phase
 * @return {string}
 */
WebInspector.TimelineUIUtils.interactionPhaseLabel = function(phase)
{
    return WebInspector.TimelineUIUtils._interactionPhaseStyles().get(phase).label;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {boolean}
 */
WebInspector.TimelineUIUtils.isMarkerEvent = function(event)
{
    var recordTypes = WebInspector.TimelineModel.RecordType;
    switch (event.name) {
    case recordTypes.TimeStamp:
    case recordTypes.MarkFirstPaint:
        return true;
    case recordTypes.MarkDOMContent:
    case recordTypes.MarkLoad:
        return event.args["data"]["isMainFrame"];
    default:
        return false;
    }
}

/**
 * @param {!RuntimeAgent.CallFrame} frame
 * @return {boolean}
 */
WebInspector.TimelineUIUtils.isUserFrame = function(frame)
{
    return frame.scriptId !== "0" && !frame.url.startsWith("native ");
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?RuntimeAgent.CallFrame}
 */
WebInspector.TimelineUIUtils.topStackFrame = function(event)
{
    var stackTrace = event.stackTrace || event.initiator && event.initiator.stackTrace;
    return stackTrace && stackTrace.length ? stackTrace[0] : null;
}

/**
 * @enum {symbol}
 */
WebInspector.TimelineUIUtils.NetworkCategory = {
    HTML: Symbol("HTML"),
    Script: Symbol("Script"),
    Style: Symbol("Style"),
    Media: Symbol("Media"),
    Other: Symbol("Other")
}

/**
 * @param {!WebInspector.TimelineModel.NetworkRequest} request
 * @return {!WebInspector.TimelineUIUtils.NetworkCategory}
 */
WebInspector.TimelineUIUtils.networkRequestCategory = function(request)
{
    var categories = WebInspector.TimelineUIUtils.NetworkCategory;
    switch (request.mimeType) {
    case "text/html":
        return categories.HTML;
    case "application/javascript":
    case "application/x-javascript":
    case "text/javascript":
        return categories.Script;
    case "text/css":
        return categories.Style;
    case "audio/ogg":
    case "image/gif":
    case "image/jpeg":
    case "image/png":
    case "image/svg+xml":
    case "image/webp":
    case "image/x-icon":
    case "font/opentype":
    case "font/woff2":
    case "application/font-woff":
        return categories.Media;
    default:
        return categories.Other;
    }
}

/**
 * @param {!WebInspector.TimelineUIUtils.NetworkCategory} category
 * @return {string}
 */
WebInspector.TimelineUIUtils.networkCategoryColor = function(category)
{
    var categories = WebInspector.TimelineUIUtils.NetworkCategory;
    switch (category) {
    case categories.HTML: return "hsl(214, 67%, 66%)";
    case categories.Script: return "hsl(43, 83%, 64%)";
    case categories.Style: return "hsl(256, 67%, 70%)";
    case categories.Media: return "hsl(109, 33%, 55%)";
    default: return "hsl(0, 0%, 70%)";
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {?WebInspector.Target} target
 * @return {?string}
 */
WebInspector.TimelineUIUtils.buildDetailsTextForTraceEvent = function(event, target)
{
    var recordType = WebInspector.TimelineModel.RecordType;
    var detailsText;
    var eventData = event.args["data"];
    switch (event.name) {
    case recordType.GCEvent:
    case recordType.MajorGC:
    case recordType.MinorGC:
        var delta = event.args["usedHeapSizeBefore"] - event.args["usedHeapSizeAfter"];
        detailsText = WebInspector.UIString("%s collected", Number.bytesToString(delta));
        break;
    case recordType.FunctionCall:
        // Omit internally generated script names.
        if (eventData && eventData["scriptName"])
            detailsText = linkifyLocationAsText(eventData["scriptId"], eventData["scriptLine"], 0);
        break;
    case recordType.JSFrame:
        detailsText = WebInspector.beautifyFunctionName(eventData["functionName"]);
        break;
    case recordType.EventDispatch:
        detailsText = eventData ? eventData["type"] : null;
        break;
    case recordType.Paint:
        var width = WebInspector.TimelineUIUtils.quadWidth(eventData.clip);
        var height = WebInspector.TimelineUIUtils.quadHeight(eventData.clip);
        if (width && height)
            detailsText = WebInspector.UIString("%d\u2009\u00d7\u2009%d", width, height);
        break;
    case recordType.ParseHTML:
        var endLine = event.args["endData"] && event.args["endData"]["endLine"];
        var url = WebInspector.displayNameForURL(event.args["beginData"]["url"]);
        detailsText = WebInspector.UIString("%s [%s\u2026%s]", url, event.args["beginData"]["startLine"] + 1, endLine >= 0 ? endLine + 1 : "");
        break;

    case recordType.CompileScript:
    case recordType.EvaluateScript:
        var url = eventData["url"];
        if (url)
            detailsText = WebInspector.displayNameForURL(url) + ":" + eventData["lineNumber"];
        break;
    case recordType.ParseScriptOnBackground:
    case recordType.XHRReadyStateChange:
    case recordType.XHRLoad:
        var url = eventData["url"];
        if (url)
            detailsText = WebInspector.displayNameForURL(url);
        break;

    case recordType.WebSocketCreate:
    case recordType.WebSocketSendHandshakeRequest:
    case recordType.WebSocketReceiveHandshakeResponse:
    case recordType.WebSocketDestroy:
    case recordType.ResourceSendRequest:
    case recordType.ResourceReceivedData:
    case recordType.ResourceReceiveResponse:
    case recordType.ResourceFinish:
    case recordType.PaintImage:
    case recordType.DecodeImage:
    case recordType.ResizeImage:
    case recordType.DecodeLazyPixelRef:
        if (event.url)
            detailsText = WebInspector.displayNameForURL(event.url);
        break;

    case recordType.EmbedderCallback:
        detailsText = eventData["callbackName"];
        break;

    case recordType.Animation:
        detailsText = eventData && eventData["name"];
        break;

    case recordType.GCIdleLazySweep:
        detailsText = WebInspector.UIString("idle sweep");
        break;

    case recordType.GCCompleteSweep:
        detailsText = WebInspector.UIString("complete sweep");
        break;

    case recordType.GCCollectGarbage:
        detailsText = WebInspector.UIString("collect");
        break;

    default:
        if (event.hasCategory(WebInspector.TimelineModel.Category.Console))
            detailsText = null;
        else
            detailsText = linkifyTopCallFrameAsText();
        break;
    }

    return detailsText;

    /**
     * @param {string} scriptId
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @return {?string}
     */
    function linkifyLocationAsText(scriptId, lineNumber, columnNumber)
    {
        // FIXME(62725): stack trace line/column numbers are one-based.
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        var rawLocation = target && !target.isDetached() && scriptId && debuggerModel ? debuggerModel.createRawLocationByScriptId(scriptId, lineNumber - 1, (columnNumber || 1) - 1) : null;
        if (!rawLocation)
            return null;
        var uiLocation = WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
        return uiLocation.linkText();
    }

    /**
     * @return {?string}
     */
    function linkifyTopCallFrameAsText()
    {
        var frame = WebInspector.TimelineUIUtils.topStackFrame(event);
        var text = frame ? linkifyLocationAsText(frame.scriptId, frame.lineNumber, frame.columnNumber) : null;
        if (frame && !text) {
            text = frame.url;
            if (typeof frame.lineNumber === "number")
                text += ":" + (frame.lineNumber + 1);
        }
        return text;
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {?WebInspector.Target} target
 * @param {!WebInspector.Linkifier} linkifier
 * @return {?Node}
 */
WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent = function(event, target, linkifier)
{
    var recordType = WebInspector.TimelineModel.RecordType;
    var details;
    var detailsText;
    var eventData = event.args["data"];
    switch (event.name) {
    case recordType.GCEvent:
    case recordType.MajorGC:
    case recordType.MinorGC:
    case recordType.EventDispatch:
    case recordType.Paint:
    case recordType.Animation:
    case recordType.EmbedderCallback:
    case recordType.ParseHTML:
    case recordType.WebSocketCreate:
    case recordType.WebSocketSendHandshakeRequest:
    case recordType.WebSocketReceiveHandshakeResponse:
    case recordType.WebSocketDestroy:
    case recordType.GCIdleLazySweep:
    case recordType.GCCompleteSweep:
    case recordType.GCCollectGarbage:
        detailsText = WebInspector.TimelineUIUtils.buildDetailsTextForTraceEvent(event, target);
        break;
    case recordType.PaintImage:
    case recordType.DecodeImage:
    case recordType.ResizeImage:
    case recordType.DecodeLazyPixelRef:
    case recordType.XHRReadyStateChange:
    case recordType.XHRLoad:
    case recordType.ResourceSendRequest:
    case recordType.ResourceReceivedData:
    case recordType.ResourceReceiveResponse:
    case recordType.ResourceFinish:
        if (event.url)
            details = WebInspector.linkifyResourceAsNode(event.url);
        break;
    case recordType.FunctionCall:
        details = linkifyLocation(eventData["scriptId"], eventData["scriptName"], eventData["scriptLine"], 0);
        break;
    case recordType.JSFrame:
        details = createElement("span");
        details.createTextChild(WebInspector.beautifyFunctionName(eventData["functionName"]));
        var location = linkifyLocation(eventData["scriptId"], eventData["url"], eventData["lineNumber"], eventData["columnNumber"]);
        if (location) {
           details.createTextChild(" @ ");
           details.appendChild(location);
        }
        break;
    case recordType.CompileScript:
    case recordType.EvaluateScript:
        var url = eventData["url"];
        if (url)
            details = linkifyLocation("", url, eventData["lineNumber"], 0);
        break;
    case recordType.ParseScriptOnBackground:
        var url = eventData["url"];
        if (url)
            details = linkifyLocation("", url, 0, 0);
        break;
    default:
        if (event.hasCategory(WebInspector.TimelineModel.Category.Console))
            detailsText = null;
        else
            details = linkifyTopCallFrame();
        break;
    }

    if (!details && detailsText)
        details = createTextNode(detailsText);
    return details;

    /**
     * @param {string} scriptId
     * @param {string} url
     * @param {number} lineNumber
     * @param {number=} columnNumber
     */
    function linkifyLocation(scriptId, url, lineNumber, columnNumber)
    {
        if (!url)
            return null;
        // FIXME(62725): stack trace line/column numbers are one-based.
        if (columnNumber)
            --columnNumber;
        return linkifier.linkifyScriptLocation(target, scriptId, url, lineNumber - 1, columnNumber, "timeline-details");
    }

    /**
     * @return {?Element}
     */
    function linkifyTopCallFrame()
    {
        var frame = WebInspector.TimelineUIUtils.topStackFrame(event);
        return frame ? linkifier.linkifyConsoleCallFrame(target, frame, "timeline-details") : null;
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {boolean} detailed
 * @param {function(!DocumentFragment)} callback
 */
WebInspector.TimelineUIUtils.buildTraceEventDetails = function(event, model, linkifier, detailed, callback)
{
    var target = model.target();
    if (!target) {
        callbackWrapper();
        return;
    }
    var relatedNodes = null;
    var barrier = new CallbackBarrier();
    if (!event.previewElement) {
        if (event.url)
            WebInspector.DOMPresentationUtils.buildImagePreviewContents(target, event.url, false, barrier.createCallback(saveImage));
        else if (event.picture)
            WebInspector.TimelineUIUtils.buildPicturePreviewContent(event, target, barrier.createCallback(saveImage));
    }
    var nodeIdsToResolve = new Set();
    if (event.backendNodeId)
        nodeIdsToResolve.add(event.backendNodeId);
    if (event.invalidationTrackingEvents)
        WebInspector.TimelineUIUtils._collectInvalidationNodeIds(nodeIdsToResolve, event.invalidationTrackingEvents);
    if (nodeIdsToResolve.size) {
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (domModel)
            domModel.pushNodesByBackendIdsToFrontend(nodeIdsToResolve, barrier.createCallback(setRelatedNodeMap));
    }
    barrier.callWhenDone(callbackWrapper);

    /**
     * @param {!Element=} element
     */
    function saveImage(element)
    {
        event.previewElement = element || null;
    }

    /**
     * @param {?Map<number, ?WebInspector.DOMNode>} nodeMap
     */
    function setRelatedNodeMap(nodeMap)
    {
        relatedNodes = nodeMap;
    }

    function callbackWrapper()
    {
        callback(WebInspector.TimelineUIUtils._buildTraceEventDetailsSynchronously(event, model, linkifier, detailed, relatedNodes));
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @param {boolean} detailed
 * @param {?Map<number, ?WebInspector.DOMNode>} relatedNodesMap
 * @return {!DocumentFragment}
 */
WebInspector.TimelineUIUtils._buildTraceEventDetailsSynchronously = function(event, model, linkifier, detailed, relatedNodesMap)
{
    var stats = {};
    var recordTypes = WebInspector.TimelineModel.RecordType;

    // This message may vary per event.name;
    var relatedNodeLabel;

    var contentHelper = new WebInspector.TimelineDetailsContentHelper(model.target(), linkifier);
    contentHelper.addSection(WebInspector.TimelineUIUtils.eventTitle(event), WebInspector.TimelineUIUtils.eventStyle(event).category);

    var eventData = event.args["data"];
    var initiator = event.initiator;

    if (event.warning)
        contentHelper.appendWarningRow(event);
    if (event.name === recordTypes.JSFrame) {
        var deoptReason = eventData["deoptReason"];
        if (deoptReason && deoptReason != "no reason")
            contentHelper.appendWarningRow(event, WebInspector.TimelineModel.WarningType.V8Deopt);
    }

    if (detailed) {
        contentHelper.appendTextRow(WebInspector.UIString("Self Time"), Number.millisToString(event.selfTime, true));
        contentHelper.appendTextRow(WebInspector.UIString("Total Time"), Number.millisToString(event.duration || 0, true));
    }

    switch (event.name) {
    case recordTypes.GCEvent:
    case recordTypes.MajorGC:
    case recordTypes.MinorGC:
        var delta = event.args["usedHeapSizeBefore"] - event.args["usedHeapSizeAfter"];
        contentHelper.appendTextRow(WebInspector.UIString("Collected"), Number.bytesToString(delta));
        break;
    case recordTypes.JSFrame:
        var detailsNode = WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent(event, model.target(), linkifier);
        if (detailsNode)
            contentHelper.appendElementRow(WebInspector.UIString("Function"), detailsNode);
        break;
    case recordTypes.TimerFire:
    case recordTypes.TimerInstall:
    case recordTypes.TimerRemove:
        contentHelper.appendTextRow(WebInspector.UIString("Timer ID"), eventData["timerId"]);
        if (event.name === recordTypes.TimerInstall) {
            contentHelper.appendTextRow(WebInspector.UIString("Timeout"), Number.millisToString(eventData["timeout"]));
            contentHelper.appendTextRow(WebInspector.UIString("Repeats"), !eventData["singleShot"]);
        }
        break;
    case recordTypes.FireAnimationFrame:
        contentHelper.appendTextRow(WebInspector.UIString("Callback ID"), eventData["id"]);
        break;
    case recordTypes.FunctionCall:
        if (typeof eventData["functionName"] === "string")
            contentHelper.appendTextRow(WebInspector.UIString("Function"), WebInspector.beautifyFunctionName(eventData["functionName"]));
        if (eventData["scriptName"])
            contentHelper.appendLocationRow(WebInspector.UIString("Location"), eventData["scriptName"], eventData["scriptLine"]);
        break;
    case recordTypes.ResourceSendRequest:
    case recordTypes.ResourceReceiveResponse:
    case recordTypes.ResourceReceivedData:
    case recordTypes.ResourceFinish:
        var url = (event.name === recordTypes.ResourceSendRequest) ? eventData["url"] : initiator && initiator.args["data"]["url"];
        if (url)
            contentHelper.appendElementRow(WebInspector.UIString("Resource"), WebInspector.linkifyResourceAsNode(url));
        if (eventData["requestMethod"])
            contentHelper.appendTextRow(WebInspector.UIString("Request Method"), eventData["requestMethod"]);
        if (typeof eventData["statusCode"] === "number")
            contentHelper.appendTextRow(WebInspector.UIString("Status Code"), eventData["statusCode"]);
        if (eventData["mimeType"])
            contentHelper.appendTextRow(WebInspector.UIString("MIME Type"), eventData["mimeType"]);
        if ("priority" in eventData) {
            var priority = WebInspector.uiLabelForPriority(eventData["priority"]);
            contentHelper.appendTextRow(WebInspector.UIString("Priority"), priority);
        }
        if (eventData["encodedDataLength"])
            contentHelper.appendTextRow(WebInspector.UIString("Encoded Data Length"), WebInspector.UIString("%d Bytes", eventData["encodedDataLength"]));
        break;
    case recordTypes.CompileScript:
    case recordTypes.EvaluateScript:
        var url = eventData["url"];
        if (url)
            contentHelper.appendLocationRow(WebInspector.UIString("Script"), url, eventData["lineNumber"], eventData["columnNumber"]);
        break;
    case recordTypes.Paint:
        var clip = eventData["clip"];
        contentHelper.appendTextRow(WebInspector.UIString("Location"), WebInspector.UIString("(%d, %d)", clip[0], clip[1]));
        var clipWidth = WebInspector.TimelineUIUtils.quadWidth(clip);
        var clipHeight = WebInspector.TimelineUIUtils.quadHeight(clip);
        contentHelper.appendTextRow(WebInspector.UIString("Dimensions"), WebInspector.UIString("%d × %d", clipWidth, clipHeight));
        // Fall-through intended.

    case recordTypes.PaintSetup:
    case recordTypes.Rasterize:
    case recordTypes.ScrollLayer:
        relatedNodeLabel = WebInspector.UIString("Layer Root");
        break;
    case recordTypes.PaintImage:
    case recordTypes.DecodeLazyPixelRef:
    case recordTypes.DecodeImage:
    case recordTypes.ResizeImage:
    case recordTypes.DrawLazyPixelRef:
        relatedNodeLabel = WebInspector.UIString("Owner Element");
        if (event.url)
            contentHelper.appendElementRow(WebInspector.UIString("Image URL"), WebInspector.linkifyResourceAsNode(event.url));
        break;
    case recordTypes.ParseAuthorStyleSheet:
        var url = eventData["styleSheetUrl"];
        if (url)
            contentHelper.appendElementRow(WebInspector.UIString("Stylesheet URL"), WebInspector.linkifyResourceAsNode(url));
        break;
    case recordTypes.UpdateLayoutTree: // We don't want to see default details.
    case recordTypes.RecalculateStyles:
        contentHelper.appendTextRow(WebInspector.UIString("Elements Affected"), event.args["elementCount"]);
        break;
    case recordTypes.Layout:
        var beginData = event.args["beginData"];
        contentHelper.appendTextRow(WebInspector.UIString("Nodes That Need Layout"), beginData["dirtyObjects"]);
        relatedNodeLabel = WebInspector.UIString("Layout root");
        break;
    case recordTypes.ConsoleTime:
        contentHelper.appendTextRow(WebInspector.UIString("Message"), event.name);
        break;
    case recordTypes.WebSocketCreate:
    case recordTypes.WebSocketSendHandshakeRequest:
    case recordTypes.WebSocketReceiveHandshakeResponse:
    case recordTypes.WebSocketDestroy:
        var initiatorData = initiator ? initiator.args["data"] : eventData;
        if (typeof initiatorData["webSocketURL"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("URL"), initiatorData["webSocketURL"]);
        if (typeof initiatorData["webSocketProtocol"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("WebSocket Protocol"), initiatorData["webSocketProtocol"]);
        if (typeof eventData["message"] !== "undefined")
            contentHelper.appendTextRow(WebInspector.UIString("Message"), eventData["message"]);
        break;
    case recordTypes.EmbedderCallback:
        contentHelper.appendTextRow(WebInspector.UIString("Callback Function"), eventData["callbackName"]);
        break;
    case recordTypes.Animation:
        if (event.phase === WebInspector.TracingModel.Phase.NestableAsyncInstant)
            contentHelper.appendTextRow(WebInspector.UIString("State"), eventData["state"]);
        break;
    case recordTypes.ParseHTML:
        var beginData = event.args["beginData"];
        var url = beginData["url"];
        var startLine = beginData["startLine"] + 1;
        var endLine = event.args["endData"] ? event.args["endData"]["endLine"] + 1 : 0;
        if (url)
            contentHelper.appendLocationRange(WebInspector.UIString("Range"), url, startLine, endLine);
        break;

    case recordTypes.FireIdleCallback:
        contentHelper.appendTextRow(WebInspector.UIString("Allotted Time"), Number.millisToString(eventData["allottedMilliseconds"]));
        contentHelper.appendTextRow(WebInspector.UIString("Invoked by Timeout"), eventData["timedOut"]);
        // Fall-through intended.

    case recordTypes.RequestIdleCallback:
    case recordTypes.CancelIdleCallback:
        contentHelper.appendTextRow(WebInspector.UIString("Callback ID"), eventData["id"]);
        break;
    case recordTypes.EventDispatch:
        contentHelper.appendTextRow(WebInspector.UIString("Type"), eventData["type"]);
        break;

    default:
        var detailsNode = WebInspector.TimelineUIUtils.buildDetailsNodeForTraceEvent(event, model.target(), linkifier);
        if (detailsNode)
            contentHelper.appendElementRow(WebInspector.UIString("Details"), detailsNode);
        break;
    }

    if (event.timeWaitingForMainThread)
        contentHelper.appendTextRow(WebInspector.UIString("Time Waiting for Main Thread"), Number.millisToString(event.timeWaitingForMainThread, true));

    var relatedNode = relatedNodesMap && relatedNodesMap.get(event.backendNodeId);
    if (relatedNode)
        contentHelper.appendElementRow(relatedNodeLabel || WebInspector.UIString("Related Node"), WebInspector.DOMPresentationUtils.linkifyNodeReference(relatedNode));

    if (event.previewElement) {
        contentHelper.addSection(WebInspector.UIString("Preview"));
        contentHelper.appendElementRow("", event.previewElement);
    }

    if (event.stackTrace || (event.initiator && event.initiator.stackTrace) || event.invalidationTrackingEvents)
        WebInspector.TimelineUIUtils._generateCauses(event, model.target(), relatedNodesMap, contentHelper);

    var showPieChart = detailed && WebInspector.TimelineUIUtils._aggregatedStatsForTraceEvent(stats, model, event);
    if (showPieChart) {
        contentHelper.addSection(WebInspector.UIString("Aggregated Time"));
        var pieChart = WebInspector.TimelineUIUtils.generatePieChart(stats, WebInspector.TimelineUIUtils.eventStyle(event).category, event.selfTime);
        contentHelper.appendElementRow("", pieChart);
    }

    return contentHelper.fragment;
}

WebInspector.TimelineUIUtils._aggregatedStatsKey = Symbol("aggregatedStats");

/**
 * @param {!WebInspector.TimelineModel} model
 * @param {number} startTime
 * @param {number} endTime
 * @return {!DocumentFragment}
 */
WebInspector.TimelineUIUtils.buildRangeStats = function(model, startTime, endTime)
{
    var aggregatedStats = {};

    /**
     * @param {number} value
     * @param {!WebInspector.TimelineModel.Record} task
     * @return {number}
     */
    function compareEndTime(value, task)
    {
        return value < task.endTime() ? -1 : 1;
    }
    var mainThreadTasks = model.mainThreadTasks();
    var taskIndex = mainThreadTasks.lowerBound(startTime, compareEndTime);
    for (; taskIndex < mainThreadTasks.length; ++taskIndex) {
        var task = mainThreadTasks[taskIndex];
        if (task.startTime() > endTime)
            break;
        if (task.startTime() > startTime && task.endTime() < endTime) {
            // cache stats for top-level entries that fit the range entirely.
            var taskStats = task[WebInspector.TimelineUIUtils._aggregatedStatsKey];
            if (!taskStats) {
                taskStats = {};
                WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord(task, startTime, endTime, taskStats);
                task[WebInspector.TimelineUIUtils._aggregatedStatsKey] = taskStats;
            }
            for (var key in taskStats)
                aggregatedStats[key] = (aggregatedStats[key] || 0) + taskStats[key];
            continue;
        }
        WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord(task, startTime, endTime, aggregatedStats);
    }

    var aggregatedTotal = 0;
    for (var categoryName in aggregatedStats)
        aggregatedTotal += aggregatedStats[categoryName];
    aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);

    var startOffset = startTime - model.minimumRecordTime();
    var endOffset = endTime - model.minimumRecordTime();

    var contentHelper = new WebInspector.TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(WebInspector.UIString("Range:  %s \u2013 %s", Number.millisToString(startOffset), Number.millisToString(endOffset)));
    var pieChart = WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats);
    contentHelper.appendElementRow("", pieChart);
    return contentHelper.fragment;
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {number} startTime
 * @param {number} endTime
 * @param {!Object} aggregatedStats
 */
WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord = function(record, startTime, endTime, aggregatedStats)
{
    var records = [];

    if (!record.endTime() || record.endTime() < startTime || record.startTime() > endTime)
        return;

    var childrenTime = 0;
    var children = record.children() || [];
    for (var i = 0; i < children.length; ++i) {
        var child = children[i];
        if (!child.endTime() || child.endTime() < startTime || child.startTime() > endTime)
            continue;
        childrenTime += Math.min(endTime, child.endTime()) - Math.max(startTime, child.startTime());
        WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord(child, startTime, endTime, aggregatedStats);
    }
    var categoryName = WebInspector.TimelineUIUtils.categoryForRecord(record).name;
    var ownTime = Math.min(endTime, record.endTime()) - Math.max(startTime, record.startTime()) - childrenTime;
    aggregatedStats[categoryName] = (aggregatedStats[categoryName] || 0) + ownTime;
}

/**
 * @param {!WebInspector.TimelineModel.NetworkRequest} request
 * @return {!Array<!{title: string, value: (string|!Element)}>}
 */
WebInspector.TimelineUIUtils.buildNetworkRequestInfo = function(request)
{
    var duration = request.endTime - (request.startTime || -Infinity);
    var items = [];
    if (request.url)
        items.push({ title: WebInspector.UIString("URL"), value: WebInspector.linkifyURLAsNode(request.url) });
    if (isFinite(duration))
        items.push({ title: WebInspector.UIString("Duration"), value: Number.millisToString(duration, true) });
    if (request.requestMethod)
        items.push({ title: WebInspector.UIString("Request Method"), value: request.requestMethod });
    if (typeof request.priority === "string") {
        var priority = WebInspector.uiLabelForPriority(/** @type {!NetworkAgent.ResourcePriority} */ (request.priority));
        items.push({ title: WebInspector.UIString("Priority"), value: priority });
    }
    if (request.mimeType)
        items.push({ title: WebInspector.UIString("Mime Type"), value: request.mimeType });
    return items;
}

/**
 * @param {!WebInspector.TimelineModel.NetworkRequest} request
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Linkifier} linkifier
 * @return {!Promise<!DocumentFragment>}
 */
WebInspector.TimelineUIUtils.buildNetworkRequestDetails = function(request, model, linkifier)
{
    var target = model.target();
    var contentHelper = new WebInspector.TimelineDetailsContentHelper(target, linkifier);

    var info = WebInspector.TimelineUIUtils.buildNetworkRequestInfo(request);
    for (var item of info) {
        if (typeof item.value === "string")
            contentHelper.appendTextRow(item.title, item.value);
        else
            contentHelper.appendElementRow(item.title, item.value);
    }

    /**
     * @param {function(?Element)} fulfill
     */
    function action(fulfill)
    {
        WebInspector.DOMPresentationUtils.buildImagePreviewContents(/** @type {!WebInspector.Target} */(target), request.url, false, saveImage);
        /**
         * @param {!Element=} element
         */
        function saveImage(element)
        {
            request.previewElement = element || null;
            fulfill(request.previewElement);
        }
    }
    var previewPromise;
    if (request.previewElement)
        previewPromise = Promise.resolve(request.previewElement);
    else
        previewPromise = request.url && target ? new Promise(action) : Promise.resolve(null);
    /**
     * @param {?Element} element
     * @return {!DocumentFragment}
     */
    function appendPreview(element)
    {
        if (element)
            contentHelper.appendElementRow(WebInspector.UIString("Preview"), request.previewElement);
        return contentHelper.fragment;
    }
    return previewPromise.then(appendPreview);
}

/**
 * @param {!Array<!RuntimeAgent.CallFrame>} callFrames
 * @return {!RuntimeAgent.StackTrace}
 */
WebInspector.TimelineUIUtils._stackTraceFromCallFrames = function(callFrames)
{
    return /** @type {!RuntimeAgent.StackTrace} */ ({ callFrames: callFrames });
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {?WebInspector.Target} target
 * @param {?Map<number, ?WebInspector.DOMNode>} relatedNodesMap
 * @param {!WebInspector.TimelineDetailsContentHelper} contentHelper
 */
WebInspector.TimelineUIUtils._generateCauses = function(event, target, relatedNodesMap, contentHelper)
{
    var recordTypes = WebInspector.TimelineModel.RecordType;

    var callSiteStackLabel;
    var stackLabel;
    var initiator = event.initiator;

    switch (event.name) {
    case recordTypes.TimerFire:
        callSiteStackLabel = WebInspector.UIString("Timer Installed");
        break;
    case recordTypes.FireAnimationFrame:
        callSiteStackLabel = WebInspector.UIString("Animation Frame Requested");
        break;
    case recordTypes.FireIdleCallback:
        callSiteStackLabel = WebInspector.UIString("Idle Callback Requested");
        break;
    case recordTypes.UpdateLayoutTree:
    case recordTypes.RecalculateStyles:
        stackLabel = WebInspector.UIString("Recalculation Forced");
        break;
    case recordTypes.Layout:
        callSiteStackLabel = WebInspector.UIString("First Layout Invalidation");
        stackLabel = WebInspector.UIString("Layout Forced");
        break;
    }

    // Direct cause.
    if (event.stackTrace && event.stackTrace.length) {
        contentHelper.addSection(WebInspector.UIString("Call Stacks"));
        contentHelper.appendStackTrace(stackLabel || WebInspector.UIString("Stack Trace"), WebInspector.TimelineUIUtils._stackTraceFromCallFrames(event.stackTrace));
    }

    // Indirect causes.
    if (event.invalidationTrackingEvents && target) { // Full invalidation tracking (experimental).
        contentHelper.addSection(WebInspector.UIString("Invalidations"));
        WebInspector.TimelineUIUtils._generateInvalidations(event, target, relatedNodesMap, contentHelper);
    } else if (initiator && initiator.stackTrace) { // Partial invalidation tracking.
        contentHelper.appendStackTrace(callSiteStackLabel || WebInspector.UIString("First Invalidated"), WebInspector.TimelineUIUtils._stackTraceFromCallFrames(initiator.stackTrace));
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.Target} target
 * @param {?Map<number, ?WebInspector.DOMNode>} relatedNodesMap
 * @param {!WebInspector.TimelineDetailsContentHelper} contentHelper
 */
WebInspector.TimelineUIUtils._generateInvalidations = function(event, target, relatedNodesMap, contentHelper)
{
    if (!event.invalidationTrackingEvents)
        return;

    var invalidations = {};
    event.invalidationTrackingEvents.forEach(function(invalidation) {
        if (!invalidations[invalidation.type])
            invalidations[invalidation.type] = [invalidation];
        else
            invalidations[invalidation.type].push(invalidation);
    });

    Object.keys(invalidations).forEach(function(type) {
        WebInspector.TimelineUIUtils._generateInvalidationsForType(
            type, target, invalidations[type], relatedNodesMap, contentHelper);
    });
}

/**
 * @param {string} type
 * @param {!WebInspector.Target} target
 * @param {!Array.<!WebInspector.InvalidationTrackingEvent>} invalidations
 * @param {?Map<number, ?WebInspector.DOMNode>} relatedNodesMap
 * @param {!WebInspector.TimelineDetailsContentHelper} contentHelper
 */
WebInspector.TimelineUIUtils._generateInvalidationsForType = function(type, target, invalidations, relatedNodesMap, contentHelper)
{
    var title;
    switch (type) {
    case WebInspector.TimelineModel.RecordType.StyleRecalcInvalidationTracking:
        title = WebInspector.UIString("Style Invalidations");
        break;
    case WebInspector.TimelineModel.RecordType.LayoutInvalidationTracking:
        title = WebInspector.UIString("Layout Invalidations");
        break;
    default:
        title = WebInspector.UIString("Other Invalidations");
        break;
    }

    var invalidationsTreeOutline = new TreeOutlineInShadow();
    invalidationsTreeOutline.registerRequiredCSS("timeline/invalidationsTree.css");
    invalidationsTreeOutline.element.classList.add("invalidations-tree");

    var invalidationGroups = groupInvalidationsByCause(invalidations);
    invalidationGroups.forEach(function(group) {
        var groupElement = new WebInspector.TimelineUIUtils.InvalidationsGroupElement(target, relatedNodesMap, contentHelper, group);
        invalidationsTreeOutline.appendChild(groupElement);
    });
    contentHelper.appendElementRow(title, invalidationsTreeOutline.element, false, true);

    /**
     * @param {!Array.<!WebInspector.InvalidationTrackingEvent>} invalidations
     */
    function groupInvalidationsByCause(invalidations)
    {
        var causeToInvalidationMap = {};
        for (var index = 0; index < invalidations.length; index++) {
            var invalidation = invalidations[index];
            var causeKey = "";
            if (invalidation.cause.reason)
                causeKey += invalidation.cause.reason + ".";
            if (invalidation.cause.stackTrace) {
                invalidation.cause.stackTrace.forEach(function(stackFrame) {
                    causeKey += stackFrame["functionName"] + ".";
                    causeKey += stackFrame["scriptId"] + ".";
                    causeKey += stackFrame["url"] + ".";
                    causeKey += stackFrame["lineNumber"] + ".";
                    causeKey += stackFrame["columnNumber"] + ".";
                });
            }

            if (causeToInvalidationMap[causeKey])
                causeToInvalidationMap[causeKey].push(invalidation);
            else
                causeToInvalidationMap[causeKey] = [ invalidation ];
        }
        return Object.values(causeToInvalidationMap);
    }
}

/**
 * @param {!Set<number>} nodeIds
 * @param {!WebInspector.InvalidationTrackingEvent} invalidations
 */
WebInspector.TimelineUIUtils._collectInvalidationNodeIds = function(nodeIds, invalidations)
{
    for (var i = 0; i < invalidations.length; ++i) {
        if (invalidations[i].nodeId)
            nodeIds.add(invalidations[i].nodeId);
    }
}

/**
  * @constructor
  * @param {!WebInspector.Target} target
  * @param {?Map<number, ?WebInspector.DOMNode>} relatedNodesMap
  * @param {!WebInspector.TimelineDetailsContentHelper} contentHelper
  * @param {!Array.<!WebInspector.InvalidationTrackingEvent>} invalidations
  * @extends {TreeElement}
  */
WebInspector.TimelineUIUtils.InvalidationsGroupElement = function(target, relatedNodesMap, contentHelper, invalidations)
{
    TreeElement.call(this, "", true);

    this.listItemElement.classList.add("header");
    this.selectable = false;
    this.toggleOnClick = true;

    this._relatedNodesMap = relatedNodesMap;
    this._contentHelper = contentHelper;
    this._invalidations = invalidations;
    this.title = this._createTitle(target);
}

WebInspector.TimelineUIUtils.InvalidationsGroupElement.prototype = {

    /**
     * @param {!WebInspector.Target} target
     * @return {!Element}
     */
    _createTitle: function(target)
    {
        var first = this._invalidations[0];
        var reason = first.cause.reason;
        var topFrame = first.cause.stackTrace && first.cause.stackTrace[0];

        var title = createElement("span");
        if (reason)
            title.createTextChild(WebInspector.UIString("%s for ", reason));
        else
            title.createTextChild(WebInspector.UIString("Unknown cause for "));

        this._appendTruncatedNodeList(title, this._invalidations);

        if (topFrame && this._contentHelper.linkifier()) {
            title.createTextChild(WebInspector.UIString(". "));
            var stack = title.createChild("span", "monospace");
            stack.createChild("span").textContent = WebInspector.beautifyFunctionName(topFrame.functionName);
            stack.createChild("span").textContent = " @ ";
            stack.createChild("span").appendChild(this._contentHelper.linkifier().linkifyConsoleCallFrame(target, topFrame));
        }

        return title;
    },

    /**
     * @override
     */
    onpopulate: function()
    {
        var content = createElementWithClass("div", "content");

        var first = this._invalidations[0];
        if (first.cause.stackTrace) {
            var stack = content.createChild("div");
            stack.createTextChild(WebInspector.UIString("Stack trace:"));
            this._contentHelper.createChildStackTraceElement(stack, WebInspector.TimelineUIUtils._stackTraceFromCallFrames(first.cause.stackTrace));
        }

        content.createTextChild(this._invalidations.length > 1 ? WebInspector.UIString("Nodes:") : WebInspector.UIString("Node:"));
        var nodeList = content.createChild("div", "node-list");
        var firstNode = true;
        for (var i = 0; i < this._invalidations.length; i++) {
            var invalidation = this._invalidations[i];
            var invalidationNode = this._createInvalidationNode(invalidation, true);
            if (invalidationNode) {
                if (!firstNode)
                    nodeList.createTextChild(WebInspector.UIString(", "));
                firstNode = false;

                nodeList.appendChild(invalidationNode);

                var extraData = invalidation.extraData ? ", " + invalidation.extraData : "";
                if (invalidation.changedId)
                    nodeList.createTextChild(WebInspector.UIString("(changed id to \"%s\"%s)", invalidation.changedId, extraData));
                else if (invalidation.changedClass)
                    nodeList.createTextChild(WebInspector.UIString("(changed class to \"%s\"%s)", invalidation.changedClass, extraData));
                else if (invalidation.changedAttribute)
                    nodeList.createTextChild(WebInspector.UIString("(changed attribute to \"%s\"%s)", invalidation.changedAttribute, extraData));
                else if (invalidation.changedPseudo)
                    nodeList.createTextChild(WebInspector.UIString("(changed pesudo to \"%s\"%s)", invalidation.changedPseudo, extraData));
                else if (invalidation.selectorPart)
                    nodeList.createTextChild(WebInspector.UIString("(changed \"%s\"%s)", invalidation.selectorPart, extraData));
            }
        }

        var contentTreeElement = new TreeElement(content, false);
        contentTreeElement.selectable = false;
        this.appendChild(contentTreeElement);
    },

    /**
     * @param {!Element} parentElement
     * @param {!Array.<!WebInspector.InvalidationTrackingEvent>} invalidations
     */
    _appendTruncatedNodeList: function(parentElement, invalidations)
    {
        var invalidationNodes = [];
        var invalidationNodeIdMap = {};
        for (var i = 0; i < invalidations.length; i++) {
            var invalidation = invalidations[i];
            var invalidationNode = this._createInvalidationNode(invalidation, false);
            invalidationNode.addEventListener("click", consumeEvent, false);
            if (invalidationNode && !invalidationNodeIdMap[invalidation.nodeId]) {
                invalidationNodes.push(invalidationNode);
                invalidationNodeIdMap[invalidation.nodeId] = true;
            }
        }

        if (invalidationNodes.length === 1) {
            parentElement.appendChild(invalidationNodes[0]);
        } else if (invalidationNodes.length === 2) {
            parentElement.appendChild(invalidationNodes[0]);
            parentElement.createTextChild(WebInspector.UIString(" and "));
            parentElement.appendChild(invalidationNodes[1]);
        } else if (invalidationNodes.length >= 3) {
            parentElement.appendChild(invalidationNodes[0]);
            parentElement.createTextChild(WebInspector.UIString(", "));
            parentElement.appendChild(invalidationNodes[1]);
            parentElement.createTextChild(WebInspector.UIString(", and %s others", invalidationNodes.length - 2));
        }
    },

    /**
     * @param {!WebInspector.InvalidationTrackingEvent} invalidation
     * @param {boolean} showUnknownNodes
     */
    _createInvalidationNode: function(invalidation, showUnknownNodes)
    {
        var node = (invalidation.nodeId && this._relatedNodesMap) ? this._relatedNodesMap.get(invalidation.nodeId) : null;
        if (node)
            return WebInspector.DOMPresentationUtils.linkifyNodeReference(node);
        if (invalidation.nodeName) {
            var nodeSpan = createElement("span");
            nodeSpan.textContent = WebInspector.UIString("[ %s ]", invalidation.nodeName);
            return nodeSpan;
        }
        if (showUnknownNodes) {
            var nodeSpan = createElement("span");
            return nodeSpan.createTextChild(WebInspector.UIString("[ unknown node ]"));
        }
    },

    __proto__: TreeElement.prototype
}

/**
 * @param {!Object} total
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TracingModel.Event} event
 * @return {boolean}
 */
WebInspector.TimelineUIUtils._aggregatedStatsForTraceEvent = function(total, model, event)
{
    var events = model.inspectedTargetEvents();
    /**
     * @param {number} startTime
     * @param {!WebInspector.TracingModel.Event} e
     * @return {number}
     */
    function eventComparator(startTime, e)
    {
        return startTime - e.startTime;
    }
    var index = events.binaryIndexOf(event.startTime, eventComparator);
    // Not a main thread event?
    if (index < 0)
        return false;
    var hasChildren = false;
    var endTime = event.endTime;
    if (endTime) {
        for (var i = index; i < events.length; i++) {
            var nextEvent = events[i];
            if (nextEvent.startTime >= endTime)
                break;
            if (!nextEvent.selfTime)
                continue;
            if (nextEvent.thread !== event.thread)
                continue;
            if (i > index)
                hasChildren = true;
            var categoryName = WebInspector.TimelineUIUtils.eventStyle(nextEvent).category.name;
            total[categoryName] = (total[categoryName] || 0) + nextEvent.selfTime;
        }
    }
    if (WebInspector.TracingModel.isAsyncPhase(event.phase)) {
        if (event.endTime) {
            var aggregatedTotal = 0;
            for (var categoryName in total)
                aggregatedTotal += total[categoryName];
            total["idle"] = Math.max(0, event.endTime - event.startTime - aggregatedTotal);
        }
        return false;
    }
    return hasChildren;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {!WebInspector.Target} target
 * @param {function(!Element=)} callback
 */
WebInspector.TimelineUIUtils.buildPicturePreviewContent = function(event, target, callback)
{
    new WebInspector.LayerPaintEvent(event, target).loadSnapshot(onSnapshotLoaded);
    /**
     * @param {?Array.<number>} rect
     * @param {?WebInspector.PaintProfilerSnapshot} snapshot
     */
    function onSnapshotLoaded(rect, snapshot)
    {
        if (!snapshot) {
            callback();
            return;
        }
        snapshot.requestImage(null, null, 1, onGotImage);
        snapshot.dispose();
    }

    /**
     * @param {string=} imageURL
     */
    function onGotImage(imageURL)
    {
        if (!imageURL) {
            callback();
            return;
        }
        var container = createElement("div");
        container.classList.add("image-preview-container", "vbox", "link");
        var img = container.createChild("img");
        img.src = imageURL;
        var paintProfilerButton = container.createChild("a");
        paintProfilerButton.textContent = WebInspector.UIString("Paint Profiler");
        container.addEventListener("click", showPaintProfiler, false);
        callback(container);
    }

    function showPaintProfiler()
    {
        WebInspector.TimelinePanel.instance().select(WebInspector.TimelineSelection.fromTraceEvent(event), WebInspector.TimelinePanel.DetailsTab.PaintProfiler);
    }
}

/**
 * @param {!WebInspector.TimelineModel.RecordType} recordType
 * @param {?string} title
 * @param {number} position
 * @return {!Element}
 */
WebInspector.TimelineUIUtils.createEventDivider = function(recordType, title, position)
{
    var eventDivider = createElement("div");
    eventDivider.className = "resources-event-divider";
    var recordTypes = WebInspector.TimelineModel.RecordType;

    if (recordType === recordTypes.MarkDOMContent)
        eventDivider.className += " resources-blue-divider";
    else if (recordType === recordTypes.MarkLoad)
        eventDivider.className += " resources-red-divider";
    else if (recordType === recordTypes.MarkFirstPaint)
        eventDivider.className += " resources-green-divider";
    else if (recordType === recordTypes.TimeStamp || recordType === recordTypes.ConsoleTime || recordType === recordTypes.UserTiming)
        eventDivider.className += " resources-orange-divider";
    else if (recordType === recordTypes.BeginFrame)
        eventDivider.className += " timeline-frame-divider";

    if (title)
        eventDivider.title = title;
    eventDivider.style.left = position + "px";
    return eventDivider;
}

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @param {number} zeroTime
 * @param {number} position
 * @return {!Element}
 */
WebInspector.TimelineUIUtils.createDividerForRecord = function(record, zeroTime, position)
{
    var startTime = Number.millisToString(record.startTime() - zeroTime);
    var title = WebInspector.UIString("%s at %s", WebInspector.TimelineUIUtils.eventTitle(record.traceEvent()), startTime);
    return WebInspector.TimelineUIUtils.createEventDivider(record.type(), title, position);
}

/**
 * @return {!Array.<string>}
 */
WebInspector.TimelineUIUtils._visibleTypes = function()
{
    var eventStyles = WebInspector.TimelineUIUtils._initEventStyles();
    var result = [];
    for (var name in eventStyles) {
        if (!eventStyles[name].hidden)
            result.push(name);
    }
    return result;
}

/**
 * @return {!WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineUIUtils.visibleEventsFilter = function()
{
    return new WebInspector.TimelineVisibleEventsFilter(WebInspector.TimelineUIUtils._visibleTypes());
}

/**
 * @return {!Object.<string, !WebInspector.TimelineCategory>}
 */
WebInspector.TimelineUIUtils.categories = function()
{
    if (WebInspector.TimelineUIUtils._categories)
        return WebInspector.TimelineUIUtils._categories;
    WebInspector.TimelineUIUtils._categories = {
        loading: new WebInspector.TimelineCategory("loading", WebInspector.UIString("Loading"), true, "hsl(214, 67%, 74%)", "hsl(214, 67%, 66%)"),
        scripting: new WebInspector.TimelineCategory("scripting", WebInspector.UIString("Scripting"), true, "hsl(43, 83%, 72%)", "hsl(43, 83%, 64%) "),
        rendering: new WebInspector.TimelineCategory("rendering", WebInspector.UIString("Rendering"), true, "hsl(256, 67%, 76%)", "hsl(256, 67%, 70%)"),
        painting: new WebInspector.TimelineCategory("painting", WebInspector.UIString("Painting"), true, "hsl(109, 33%, 64%)", "hsl(109, 33%, 55%)"),
        gpu: new WebInspector.TimelineCategory("gpu", WebInspector.UIString("GPU"), false, "hsl(109, 33%, 64%)", "hsl(109, 33%, 55%)"),
        other: new WebInspector.TimelineCategory("other", WebInspector.UIString("Other"), false, "hsl(0, 0%, 87%)", "hsl(0, 0%, 79%)"),
        idle: new WebInspector.TimelineCategory("idle", WebInspector.UIString("Idle"), false, "hsl(0, 100%, 100%)", "hsl(0, 100%, 100%)")
    };
    return WebInspector.TimelineUIUtils._categories;
};

/**
 * @constructor
 * @param {string} title
 */
WebInspector.AsyncEventGroup = function(title)
{
    this.title = title;
}

/**
 * @return {!Object<string, !WebInspector.AsyncEventGroup>}
 */
WebInspector.TimelineUIUtils.asyncEventGroups = function()
{
    if (WebInspector.TimelineUIUtils._asyncEventGroups)
        return WebInspector.TimelineUIUtils._asyncEventGroups;
    WebInspector.TimelineUIUtils._asyncEventGroups = {
        animation: new WebInspector.AsyncEventGroup(WebInspector.UIString("Animation")),
        console: new WebInspector.AsyncEventGroup(WebInspector.UIString("Console")),
        userTiming: new WebInspector.AsyncEventGroup(WebInspector.UIString("User Timing")),
        input: new WebInspector.AsyncEventGroup(WebInspector.UIString("Input Events"))
    };
    return WebInspector.TimelineUIUtils._asyncEventGroups;
}

/**
 * @param {!Object} aggregatedStats
 * @param {!WebInspector.TimelineCategory=} selfCategory
 * @param {number=} selfTime
 * @return {!Element}
 */
WebInspector.TimelineUIUtils.generatePieChart = function(aggregatedStats, selfCategory, selfTime)
{
    var total = 0;
    for (var categoryName in aggregatedStats)
        total += aggregatedStats[categoryName];

    var element = createElementWithClass("div", "timeline-details-view-pie-chart-wrapper hbox");
    var pieChart = new WebInspector.PieChart(100);
    pieChart.element.classList.add("timeline-details-view-pie-chart");
    pieChart.setTotal(total);
    var pieChartContainer = element.createChild("div", "vbox");
    pieChartContainer.appendChild(pieChart.element);
    pieChartContainer.createChild("div", "timeline-details-view-pie-chart-total").textContent = WebInspector.UIString("Total: %s", Number.millisToString(total, true));
    var footerElement = element.createChild("div", "timeline-aggregated-info-legend");

    /**
     * @param {string} name
     * @param {string} title
     * @param {number} value
     * @param {string} color
     */
    function appendLegendRow(name, title, value, color)
    {
         if (!value)
             return;
         pieChart.addSlice(value, color);
         var rowElement = footerElement.createChild("div");
         rowElement.createChild("span", "timeline-aggregated-legend-value").textContent = Number.preciseMillisToString(value, 1);
         rowElement.createChild("span", "timeline-aggregated-legend-swatch").style.backgroundColor = color;
         rowElement.createChild("span", "timeline-aggregated-legend-title").textContent = title;
    }

    // In case of self time, first add self, then children of the same category.
    if (selfCategory) {
        if (selfTime)
            appendLegendRow(selfCategory.name, WebInspector.UIString("%s (self)", selfCategory.title), selfTime, selfCategory.color);
        // Children of the same category.
        var categoryTime = aggregatedStats[selfCategory.name];
        var value = categoryTime - selfTime;
        if (value > 0)
            appendLegendRow(selfCategory.name, WebInspector.UIString("%s (children)", selfCategory.title), value, selfCategory.childColor);
    }

    // Add other categories.
    for (var categoryName in WebInspector.TimelineUIUtils.categories()) {
        var category = WebInspector.TimelineUIUtils.categories()[categoryName];
        if (category === selfCategory)
            continue;
        appendLegendRow(category.name, category.title, aggregatedStats[category.name], category.childColor);
    }
    return element;
}

/**
 * @param {!WebInspector.TimelineFrameModelBase} frameModel
 * @param {!WebInspector.TimelineFrame} frame
 * @param {?WebInspector.FilmStripModel.Frame} filmStripFrame
 * @return {!Element}
 */
WebInspector.TimelineUIUtils.generateDetailsContentForFrame = function(frameModel, frame, filmStripFrame)
{
    var pieChart = WebInspector.TimelineUIUtils.generatePieChart(frame.timeByCategory);
    var contentHelper = new WebInspector.TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(WebInspector.UIString("Frame"));

    var duration = WebInspector.TimelineUIUtils.frameDuration(frame);
    contentHelper.appendElementRow(WebInspector.UIString("Duration"), duration, frame.hasWarnings());
    if (filmStripFrame) {
        var filmStripPreview = createElementWithClass("img", "timeline-filmstrip-preview");
        filmStripFrame.imageDataPromise().then(onGotImageData.bind(null, filmStripPreview));
        contentHelper.appendElementRow("", filmStripPreview);
        filmStripPreview.addEventListener("click", frameClicked.bind(null, filmStripFrame), false);
    }
    var durationInMillis = frame.endTime - frame.startTime;
    contentHelper.appendTextRow(WebInspector.UIString("FPS"), Math.floor(1000 / durationInMillis));
    contentHelper.appendTextRow(WebInspector.UIString("CPU time"), Number.millisToString(frame.cpuTime, true));

    if (Runtime.experiments.isEnabled("layersPanel") && frame.layerTree) {
        contentHelper.appendElementRow(WebInspector.UIString("Layer tree"),
                                       WebInspector.Linkifier.linkifyUsingRevealer(frame.layerTree, WebInspector.UIString("show")));
    }

    /**
     * @param {!Element} image
     * @param {?string} data
     */
    function onGotImageData(image, data)
    {
        if (data)
            image.src = "data:image/jpg;base64," + data;
    }

    /**
     * @param {!WebInspector.FilmStripModel.Frame} filmStripFrame
     */
    function frameClicked(filmStripFrame)
    {
        new WebInspector.FilmStripView.Dialog(filmStripFrame, 0);
    }

    return contentHelper.fragment;
}

/**
 * @param {!WebInspector.TimelineFrame} frame
 * @return {!Element}
 */
WebInspector.TimelineUIUtils.frameDuration = function(frame)
{
    var durationText = WebInspector.UIString("%s (at %s)", Number.millisToString(frame.endTime - frame.startTime, true),
        Number.millisToString(frame.startTimeOffset, true));
    var element = createElement("span");
    element.createTextChild(durationText);
    if (!frame.hasWarnings())
        return element;
    element.createTextChild(WebInspector.UIString(". Long frame times are an indication of "));
    element.appendChild(WebInspector.linkifyURLAsNode("https://developers.google.com/web/fundamentals/performance/rendering/",
                                                      WebInspector.UIString("jank"), undefined, true));
    element.createTextChild(".");
    return element;
}

/**
 * @param {!CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 * @param {string} color0
 * @param {string} color1
 * @param {string} color2
 * @return {!CanvasGradient}
 */
WebInspector.TimelineUIUtils.createFillStyle = function(context, width, height, color0, color1, color2)
{
    var gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, color0);
    gradient.addColorStop(0.25, color1);
    gradient.addColorStop(0.75, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

/**
 * @param {!Array.<number>} quad
 * @return {number}
 */
WebInspector.TimelineUIUtils.quadWidth = function(quad)
{
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
}

/**
 * @param {!Array.<number>} quad
 * @return {number}
 */
WebInspector.TimelineUIUtils.quadHeight = function(quad)
{
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
}

/**
 * @constructor
 * @param {number} priority
 * @param {string} color
 * @param {!Array.<string>} eventTypes
 */
WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor = function(priority, color, eventTypes)
{
    this.priority = priority;
    this.color = color;
    this.eventTypes = eventTypes;
}

/**
 * @return {!Array.<!WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor>}
 */
WebInspector.TimelineUIUtils.eventDispatchDesciptors = function()
{
    if (WebInspector.TimelineUIUtils._eventDispatchDesciptors)
        return WebInspector.TimelineUIUtils._eventDispatchDesciptors;
    var lightOrange = "hsl(40,100%,80%)";
    var orange = "hsl(40,100%,50%)";
    var green = "hsl(90,100%,40%)";
    var purple = "hsl(256,100%,75%)";
    WebInspector.TimelineUIUtils._eventDispatchDesciptors = [
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(1, lightOrange, ["mousemove", "mouseenter", "mouseleave", "mouseout", "mouseover"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(1, lightOrange, ["pointerover", "pointerout", "pointerenter", "pointerleave", "pointermove"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(2, green, ["wheel"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(3, orange, ["click", "mousedown", "mouseup"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(3, orange, ["touchstart", "touchend", "touchmove", "touchcancel"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(3, orange, ["pointerdown", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture"]),
        new WebInspector.TimelineUIUtils.EventDispatchTypeDescriptor(3, purple, ["keydown", "keyup", "keypress"])
    ];
    return WebInspector.TimelineUIUtils._eventDispatchDesciptors;
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {string} name
 * @param {string} title
 * @param {boolean} visible
 * @param {string} childColor
 * @param {string} color
 */
WebInspector.TimelineCategory = function(name, title, visible, childColor, color)
{
    this.name = name;
    this.title = title;
    this.visible = visible;
    this.childColor = childColor;
    this.color = color;
    this.hidden = false;
}

WebInspector.TimelineCategory.Events = {
    VisibilityChanged: "VisibilityChanged"
};

WebInspector.TimelineCategory.prototype = {
    /**
     * @return {boolean}
     */
    get hidden()
    {
        return this._hidden;
    },

    set hidden(hidden)
    {
        this._hidden = hidden;
        this.dispatchEventToListeners(WebInspector.TimelineCategory.Events.VisibilityChanged, this);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @typedef {!{
 *     title: string,
 *     color: string,
 *     lineWidth: number,
 *     dashStyle: !Array.<number>,
 *     tall: boolean,
 *     lowPriority: boolean
 * }}
 */
WebInspector.TimelineMarkerStyle;

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!WebInspector.TimelineMarkerStyle}
 */
WebInspector.TimelineUIUtils.markerStyleForEvent = function(event)
{
    var red = "rgb(255, 0, 0)";
    var blue = "rgb(0, 0, 255)";
    var orange = "rgb(255, 178, 23)";
    var green = "rgb(0, 130, 0)";
    var tallMarkerDashStyle = [10, 5];

    var title = WebInspector.TimelineUIUtils.eventTitle(event)

    if (event.hasCategory(WebInspector.TimelineModel.Category.Console) || event.hasCategory(WebInspector.TimelineModel.Category.UserTiming)) {
        return {
            title: title,
            dashStyle: tallMarkerDashStyle,
            lineWidth: 0.5,
            color: orange,
            tall: false,
            lowPriority: false,
        };
    }
    var recordTypes = WebInspector.TimelineModel.RecordType;
    var tall = false;
    var color = green;
    switch (event.name) {
    case recordTypes.MarkDOMContent:
        color = blue;
        tall = true;
        break;
    case recordTypes.MarkLoad:
        color = red;
        tall = true;
        break;
    case recordTypes.MarkFirstPaint:
        color = green;
        tall = true;
        break;
    case recordTypes.TimeStamp:
        color = orange;
        break;
    }
    return {
        title: title,
        dashStyle: tallMarkerDashStyle,
        lineWidth: 0.5,
        color: color,
        tall: tall,
        lowPriority: false,
    };
}

/**
 * @return {!WebInspector.TimelineMarkerStyle}
 */
WebInspector.TimelineUIUtils.markerStyleForFrame = function()
{
    return {
        title: WebInspector.UIString("Frame"),
        color: "rgba(100, 100, 100, 0.4)",
        lineWidth: 3,
        dashStyle: [3],
        tall: true,
        lowPriority: true
    };
}

/**
 * @param {string} url
 * @return {string}
 */
WebInspector.TimelineUIUtils.colorForURL = function(url)
{
    if (!WebInspector.TimelineUIUtils.colorForURL._colorGenerator) {
        WebInspector.TimelineUIUtils.colorForURL._colorGenerator = new WebInspector.FlameChart.ColorGenerator(
            { min: 30, max: 330 },
            { min: 50, max: 80, count: 3 },
            85);
    }
    return WebInspector.TimelineUIUtils.colorForURL._colorGenerator.colorForID(url);
}

/**
 * @constructor
 * @param {string} title
 */
WebInspector.TimelinePopupContentHelper = function(title)
{
    this._contentTable = createElement("table");
    var titleCell = this._createCell(WebInspector.UIString("%s - Details", title), "timeline-details-title");
    titleCell.colSpan = 2;
    var titleRow = createElement("tr");
    titleRow.appendChild(titleCell);
    this._contentTable.appendChild(titleRow);
}

WebInspector.TimelinePopupContentHelper.prototype = {
    /**
     * @return {!Element}
     */
    contentTable: function()
    {
        return this._contentTable;
    },

    /**
     * @param {string|number} content
     * @param {string=} styleName
     */
    _createCell: function(content, styleName)
    {
        var text = createElement("label");
        text.createTextChild(String(content));
        var cell = createElement("td");
        cell.className = "timeline-details";
        if (styleName)
            cell.className += " " + styleName;
        cell.textContent = content;
        return cell;
    },

    /**
     * @param {string} title
     * @param {string|number} content
     */
    appendTextRow: function(title, content)
    {
        var row = createElement("tr");
        row.appendChild(this._createCell(title, "timeline-details-row-title"));
        row.appendChild(this._createCell(content, "timeline-details-row-data"));
        this._contentTable.appendChild(row);
    },

    /**
     * @param {string} title
     * @param {!Node|string} content
     */
    appendElementRow: function(title, content)
    {
        var row = createElement("tr");
        var titleCell = this._createCell(title, "timeline-details-row-title");
        row.appendChild(titleCell);
        var cell = createElement("td");
        cell.className = "details";
        if (content instanceof Node)
            cell.appendChild(content);
        else
            cell.createTextChild(content || "");
        row.appendChild(cell);
        this._contentTable.appendChild(row);
    }
}

/**
 * @constructor
 * @param {?WebInspector.Target} target
 * @param {?WebInspector.Linkifier} linkifier
 */
WebInspector.TimelineDetailsContentHelper = function(target, linkifier)
{
    this.fragment = createDocumentFragment();

    this._linkifier = linkifier;
    this._target = target;

    this.element = createElementWithClass("div", "timeline-details-view-block");
    this._tableElement = this.element.createChild("div", "vbox timeline-details-chip-body");
    this.fragment.appendChild(this.element);
}

WebInspector.TimelineDetailsContentHelper.prototype = {
    /**
     * @param {string} title
     * @param {!WebInspector.TimelineCategory=} category
     */
    addSection: function(title, category)
    {
        if (!this._tableElement.hasChildNodes()) {
            this.element.removeChildren();
        } else {
            this.element = createElementWithClass("div", "timeline-details-view-block");
            this.fragment.appendChild(this.element);
        }

        if (title) {
            var titleElement = this.element.createChild("div", "timeline-details-chip-title");
            if (category)
                titleElement.createChild("div").style.backgroundColor = category.color;
            titleElement.createTextChild(title);
        }

        this._tableElement = this.element.createChild("div", "vbox timeline-details-chip-body");
        this.fragment.appendChild(this.element);
    },

    /**
     * @return {?WebInspector.Linkifier}
     */
    linkifier: function()
    {
        return this._linkifier;
    },

    /**
     * @param {string} title
     * @param {string|number|boolean} value
     */
    appendTextRow: function(title, value)
    {
        var rowElement = this._tableElement.createChild("div", "timeline-details-view-row");
        rowElement.createChild("div", "timeline-details-view-row-title").textContent = title;
        rowElement.createChild("div", "timeline-details-view-row-value").textContent = value;
    },

    /**
     * @param {string} title
     * @param {!Node|string} content
     * @param {boolean=} isWarning
     * @param {boolean=} isStacked
     */
    appendElementRow: function(title, content, isWarning, isStacked)
    {
        var rowElement = this._tableElement.createChild("div", "timeline-details-view-row");
        if (isWarning)
            rowElement.classList.add("timeline-details-warning");
        if (isStacked)
            rowElement.classList.add("timeline-details-stack-values");
        var titleElement = rowElement.createChild("div", "timeline-details-view-row-title");
        titleElement.textContent = title;
        var valueElement = rowElement.createChild("div", "timeline-details-view-row-value");
        if (content instanceof Node)
            valueElement.appendChild(content);
        else
            valueElement.createTextChild(content || "");
    },

    /**
     * @param {string} title
     * @param {string} url
     * @param {number} startLine
     * @param {number=} startColumn
     */
    appendLocationRow: function(title, url, startLine, startColumn)
    {
        if (!this._linkifier || !this._target)
            return;
        if (startColumn)
            --startColumn;
        this.appendElementRow(title, this._linkifier.linkifyScriptLocation(this._target, null, url, startLine - 1, startColumn));
    },

    /**
     * @param {string} title
     * @param {string} url
     * @param {number} startLine
     * @param {number=} endLine
     */
    appendLocationRange: function(title, url, startLine, endLine)
    {
        if (!this._linkifier || !this._target)
            return;
        var locationContent = createElement("span");
        locationContent.appendChild(this._linkifier.linkifyScriptLocation(this._target, null, url, startLine - 1));
        locationContent.createTextChild(String.sprintf(" [%s\u2026%s]", startLine, endLine || ""));
        this.appendElementRow(title, locationContent);
    },

    /**
     * @param {string} title
     * @param {!RuntimeAgent.StackTrace} stackTrace
     */
    appendStackTrace: function(title, stackTrace)
    {
        if (!this._linkifier || !this._target)
            return;

        var rowElement = this._tableElement.createChild("div", "timeline-details-view-row");
        rowElement.createChild("div", "timeline-details-view-row-title").textContent = title;
        this.createChildStackTraceElement(rowElement, stackTrace);
    },

    /**
     * @param {!Element} parentElement
     * @param {!RuntimeAgent.StackTrace} stackTrace
     */
    createChildStackTraceElement: function(parentElement, stackTrace)
    {
        if (!this._linkifier || !this._target)
            return;
        parentElement.classList.add("timeline-details-stack-values");
        var stackTraceElement = parentElement.createChild("div", "timeline-details-view-row-value timeline-details-view-row-stack-trace");
        var callFrameElem = WebInspector.DOMPresentationUtils.buildStackTracePreviewContents(this._target, this._linkifier, stackTrace);
        stackTraceElement.appendChild(callFrameElem);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {string=} warningType
     */
    appendWarningRow: function(event, warningType)
    {
        var warning = WebInspector.TimelineUIUtils.eventWarning(event, warningType);
        if (warning)
            this.appendElementRow(WebInspector.UIString("Warning"), warning, true);
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @param {string=} warningType
 * @return {?Element}
 */
WebInspector.TimelineUIUtils.eventWarning = function(event, warningType)
{
    var warning = warningType || event.warning;
    if (!warning)
        return null;
    var warnings = WebInspector.TimelineModel.WarningType;
    var span = createElement("span");
    var eventData = event.args["data"];

    switch (warning) {
    case warnings.ForcedStyle:
    case warnings.ForcedLayout:
        span.appendChild(WebInspector.linkifyDocumentationURLAsNode("../../fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts",
            WebInspector.UIString("Forced reflow")));
        span.createTextChild(WebInspector.UIString(" is a likely performance bottleneck."));
        break;
    case warnings.IdleDeadlineExceeded:
        span.textContent = WebInspector.UIString("Idle callback execution extended beyond deadline by " +
            Number.millisToString(event.duration - eventData["allottedMilliseconds"], true));
        break;
    case warnings.V8Deopt:
        span.appendChild(WebInspector.linkifyURLAsNode("https://github.com/GoogleChrome/devtools-docs/issues/53",
            WebInspector.UIString("Not optimized"), undefined, true));
        span.createTextChild(WebInspector.UIString(": %s", eventData["deoptReason"]));
        break;
    default:
        console.assert(false, "Unhandled TimelineModel.WarningType");
    }
    return span;
}

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel.Location} rawLocation
 * @param {number} time
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.TimelineUIUtils.LineLevelProfilePresentation = function(rawLocation, time, locationPool)
{
    this._time = time;
    WebInspector.debuggerWorkspaceBinding.createLiveLocation(rawLocation, this.updateLocation.bind(this), locationPool);
}

WebInspector.TimelineUIUtils.LineLevelProfilePresentation.prototype = {
    /**
     * @param {!WebInspector.LiveLocation} liveLocation
     */
    updateLocation: function(liveLocation)
    {
        if (this._uiLocation)
            this._uiLocation.uiSourceCode.removeLineDecoration(this._uiLocation.lineNumber, WebInspector.TimelineUIUtils.PerformanceLineDecorator.type);
        this._uiLocation = liveLocation.uiLocation();
        if (this._uiLocation)
            this._uiLocation.uiSourceCode.addLineDecoration(this._uiLocation.lineNumber, WebInspector.TimelineUIUtils.PerformanceLineDecorator.type, this._time);
    }
}

/**
 * @constructor
 * @implements {WebInspector.UISourceCodeFrame.LineDecorator}
 */
WebInspector.TimelineUIUtils.PerformanceLineDecorator = function()
{
}

WebInspector.TimelineUIUtils.PerformanceLineDecorator.type = "performance";

WebInspector.TimelineUIUtils.PerformanceLineDecorator.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     */
    decorate: function(uiSourceCode, textEditor)
    {
        var type = WebInspector.TimelineUIUtils.PerformanceLineDecorator.type;
        var decorations = uiSourceCode.lineDecorations(type);
        textEditor.resetGutterDecorations(type);
        if (!decorations)
            return;
        for (var decoration of decorations.values()) {
            var time = /** @type {number} */ (decoration.data());
            var text = WebInspector.UIString("%.1f\xa0ms", time);
            var intensity = Number.constrain(Math.log10(1 + 2 * time) / 5, 0.02, 1);
            var element = createElementWithClass("div", "text-editor-line-marker-performance");
            element.textContent = text;
            element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
            textEditor.setGutterDecoration(decoration.line(), decoration.type(), element);
        }
    }
}
