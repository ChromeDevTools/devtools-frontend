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
 * @unrestricted
 */
Timeline.TimelineUIUtils = class {
  /**
   * @return {!Object.<string, !Timeline.TimelineRecordStyle>}
   */
  static _initEventStyles() {
    if (Timeline.TimelineUIUtils._eventStylesMap)
      return Timeline.TimelineUIUtils._eventStylesMap;

    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var categories = Timeline.TimelineUIUtils.categories();

    var eventStyles = {};
    eventStyles[recordTypes.Task] = new Timeline.TimelineRecordStyle(Common.UIString('Task'), categories['other']);
    eventStyles[recordTypes.Program] = new Timeline.TimelineRecordStyle(Common.UIString('Other'), categories['other']);
    eventStyles[recordTypes.Animation] =
        new Timeline.TimelineRecordStyle(Common.UIString('Animation'), categories['rendering']);
    eventStyles[recordTypes.EventDispatch] =
        new Timeline.TimelineRecordStyle(Common.UIString('Event'), categories['scripting']);
    eventStyles[recordTypes.RequestMainThreadFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Request Main Thread Frame'), categories['rendering'], true);
    eventStyles[recordTypes.BeginFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Frame Start'), categories['rendering'], true);
    eventStyles[recordTypes.BeginMainThreadFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Frame Start (main thread)'), categories['rendering'], true);
    eventStyles[recordTypes.DrawFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Draw Frame'), categories['rendering'], true);
    eventStyles[recordTypes.HitTest] =
        new Timeline.TimelineRecordStyle(Common.UIString('Hit Test'), categories['rendering']);
    eventStyles[recordTypes.ScheduleStyleRecalculation] = new Timeline.TimelineRecordStyle(
        Common.UIString('Schedule Style Recalculation'), categories['rendering'], true);
    eventStyles[recordTypes.RecalculateStyles] =
        new Timeline.TimelineRecordStyle(Common.UIString('Recalculate Style'), categories['rendering']);
    eventStyles[recordTypes.UpdateLayoutTree] =
        new Timeline.TimelineRecordStyle(Common.UIString('Recalculate Style'), categories['rendering']);
    eventStyles[recordTypes.InvalidateLayout] =
        new Timeline.TimelineRecordStyle(Common.UIString('Invalidate Layout'), categories['rendering'], true);
    eventStyles[recordTypes.Layout] =
        new Timeline.TimelineRecordStyle(Common.UIString('Layout'), categories['rendering']);
    eventStyles[recordTypes.PaintSetup] =
        new Timeline.TimelineRecordStyle(Common.UIString('Paint Setup'), categories['painting']);
    eventStyles[recordTypes.PaintImage] =
        new Timeline.TimelineRecordStyle(Common.UIString('Paint Image'), categories['painting'], true);
    eventStyles[recordTypes.UpdateLayer] =
        new Timeline.TimelineRecordStyle(Common.UIString('Update Layer'), categories['painting'], true);
    eventStyles[recordTypes.UpdateLayerTree] =
        new Timeline.TimelineRecordStyle(Common.UIString('Update Layer Tree'), categories['rendering']);
    eventStyles[recordTypes.Paint] = new Timeline.TimelineRecordStyle(Common.UIString('Paint'), categories['painting']);
    eventStyles[recordTypes.RasterTask] =
        new Timeline.TimelineRecordStyle(Common.UIString('Rasterize Paint'), categories['painting']);
    eventStyles[recordTypes.ScrollLayer] =
        new Timeline.TimelineRecordStyle(Common.UIString('Scroll'), categories['rendering']);
    eventStyles[recordTypes.CompositeLayers] =
        new Timeline.TimelineRecordStyle(Common.UIString('Composite Layers'), categories['painting']);
    eventStyles[recordTypes.ParseHTML] =
        new Timeline.TimelineRecordStyle(Common.UIString('Parse HTML'), categories['loading']);
    eventStyles[recordTypes.ParseAuthorStyleSheet] =
        new Timeline.TimelineRecordStyle(Common.UIString('Parse Stylesheet'), categories['loading']);
    eventStyles[recordTypes.TimerInstall] =
        new Timeline.TimelineRecordStyle(Common.UIString('Install Timer'), categories['scripting']);
    eventStyles[recordTypes.TimerRemove] =
        new Timeline.TimelineRecordStyle(Common.UIString('Remove Timer'), categories['scripting']);
    eventStyles[recordTypes.TimerFire] =
        new Timeline.TimelineRecordStyle(Common.UIString('Timer Fired'), categories['scripting']);
    eventStyles[recordTypes.XHRReadyStateChange] =
        new Timeline.TimelineRecordStyle(Common.UIString('XHR Ready State Change'), categories['scripting']);
    eventStyles[recordTypes.XHRLoad] =
        new Timeline.TimelineRecordStyle(Common.UIString('XHR Load'), categories['scripting']);
    eventStyles[recordTypes.CompileScript] =
        new Timeline.TimelineRecordStyle(Common.UIString('Compile Script'), categories['scripting']);
    eventStyles[recordTypes.EvaluateScript] =
        new Timeline.TimelineRecordStyle(Common.UIString('Evaluate Script'), categories['scripting']);
    eventStyles[recordTypes.ParseScriptOnBackground] =
        new Timeline.TimelineRecordStyle(Common.UIString('Parse Script'), categories['scripting']);
    eventStyles[recordTypes.MarkLoad] =
        new Timeline.TimelineRecordStyle(Common.UIString('Load event'), categories['scripting'], true);
    eventStyles[recordTypes.MarkDOMContent] =
        new Timeline.TimelineRecordStyle(Common.UIString('DOMContentLoaded event'), categories['scripting'], true);
    eventStyles[recordTypes.MarkFirstPaint] =
        new Timeline.TimelineRecordStyle(Common.UIString('First paint'), categories['painting'], true);
    eventStyles[recordTypes.TimeStamp] =
        new Timeline.TimelineRecordStyle(Common.UIString('Timestamp'), categories['scripting']);
    eventStyles[recordTypes.ConsoleTime] =
        new Timeline.TimelineRecordStyle(Common.UIString('Console Time'), categories['scripting']);
    eventStyles[recordTypes.UserTiming] =
        new Timeline.TimelineRecordStyle(Common.UIString('User Timing'), categories['scripting']);
    eventStyles[recordTypes.ResourceSendRequest] =
        new Timeline.TimelineRecordStyle(Common.UIString('Send Request'), categories['loading']);
    eventStyles[recordTypes.ResourceReceiveResponse] =
        new Timeline.TimelineRecordStyle(Common.UIString('Receive Response'), categories['loading']);
    eventStyles[recordTypes.ResourceFinish] =
        new Timeline.TimelineRecordStyle(Common.UIString('Finish Loading'), categories['loading']);
    eventStyles[recordTypes.ResourceReceivedData] =
        new Timeline.TimelineRecordStyle(Common.UIString('Receive Data'), categories['loading']);
    eventStyles[recordTypes.RunMicrotasks] =
        new Timeline.TimelineRecordStyle(Common.UIString('Run Microtasks'), categories['scripting']);
    eventStyles[recordTypes.FunctionCall] =
        new Timeline.TimelineRecordStyle(Common.UIString('Function Call'), categories['scripting']);
    eventStyles[recordTypes.GCEvent] =
        new Timeline.TimelineRecordStyle(Common.UIString('GC Event'), categories['scripting']);
    eventStyles[recordTypes.MajorGC] =
        new Timeline.TimelineRecordStyle(Common.UIString('Major GC'), categories['scripting']);
    eventStyles[recordTypes.MinorGC] =
        new Timeline.TimelineRecordStyle(Common.UIString('Minor GC'), categories['scripting']);
    eventStyles[recordTypes.JSFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('JS Frame'), categories['scripting']);
    eventStyles[recordTypes.RequestAnimationFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Request Animation Frame'), categories['scripting']);
    eventStyles[recordTypes.CancelAnimationFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Cancel Animation Frame'), categories['scripting']);
    eventStyles[recordTypes.FireAnimationFrame] =
        new Timeline.TimelineRecordStyle(Common.UIString('Animation Frame Fired'), categories['scripting']);
    eventStyles[recordTypes.RequestIdleCallback] =
        new Timeline.TimelineRecordStyle(Common.UIString('Request Idle Callback'), categories['scripting']);
    eventStyles[recordTypes.CancelIdleCallback] =
        new Timeline.TimelineRecordStyle(Common.UIString('Cancel Idle Callback'), categories['scripting']);
    eventStyles[recordTypes.FireIdleCallback] =
        new Timeline.TimelineRecordStyle(Common.UIString('Fire Idle Callback'), categories['scripting']);
    eventStyles[recordTypes.WebSocketCreate] =
        new Timeline.TimelineRecordStyle(Common.UIString('Create WebSocket'), categories['scripting']);
    eventStyles[recordTypes.WebSocketSendHandshakeRequest] =
        new Timeline.TimelineRecordStyle(Common.UIString('Send WebSocket Handshake'), categories['scripting']);
    eventStyles[recordTypes.WebSocketReceiveHandshakeResponse] =
        new Timeline.TimelineRecordStyle(Common.UIString('Receive WebSocket Handshake'), categories['scripting']);
    eventStyles[recordTypes.WebSocketDestroy] =
        new Timeline.TimelineRecordStyle(Common.UIString('Destroy WebSocket'), categories['scripting']);
    eventStyles[recordTypes.EmbedderCallback] =
        new Timeline.TimelineRecordStyle(Common.UIString('Embedder Callback'), categories['scripting']);
    eventStyles[recordTypes.DecodeImage] =
        new Timeline.TimelineRecordStyle(Common.UIString('Image Decode'), categories['painting']);
    eventStyles[recordTypes.ResizeImage] =
        new Timeline.TimelineRecordStyle(Common.UIString('Image Resize'), categories['painting']);
    eventStyles[recordTypes.GPUTask] = new Timeline.TimelineRecordStyle(Common.UIString('GPU'), categories['gpu']);
    eventStyles[recordTypes.LatencyInfo] =
        new Timeline.TimelineRecordStyle(Common.UIString('Input Latency'), categories['scripting']);

    eventStyles[recordTypes.GCIdleLazySweep] =
        new Timeline.TimelineRecordStyle(Common.UIString('DOM GC'), categories['scripting']);
    eventStyles[recordTypes.GCCompleteSweep] =
        new Timeline.TimelineRecordStyle(Common.UIString('DOM GC'), categories['scripting']);
    eventStyles[recordTypes.GCCollectGarbage] =
        new Timeline.TimelineRecordStyle(Common.UIString('DOM GC'), categories['scripting']);

    Timeline.TimelineUIUtils._eventStylesMap = eventStyles;
    return eventStyles;
  }

  /**
   * @param {!TimelineModel.TimelineIRModel.InputEvents} inputEventType
   * @return {?string}
   */
  static inputEventDisplayName(inputEventType) {
    if (!Timeline.TimelineUIUtils._inputEventToDisplayName) {
      var inputEvent = TimelineModel.TimelineIRModel.InputEvents;

      /** @type {!Map<!TimelineModel.TimelineIRModel.InputEvents, string>} */
      Timeline.TimelineUIUtils._inputEventToDisplayName = new Map([
        [inputEvent.Char, Common.UIString('Key Character')],
        [inputEvent.KeyDown, Common.UIString('Key Down')],
        [inputEvent.KeyDownRaw, Common.UIString('Key Down')],
        [inputEvent.KeyUp, Common.UIString('Key Up')],
        [inputEvent.Click, Common.UIString('Click')],
        [inputEvent.ContextMenu, Common.UIString('Context Menu')],
        [inputEvent.MouseDown, Common.UIString('Mouse Down')],
        [inputEvent.MouseMove, Common.UIString('Mouse Move')],
        [inputEvent.MouseUp, Common.UIString('Mouse Up')],
        [inputEvent.MouseWheel, Common.UIString('Mouse Wheel')],
        [inputEvent.ScrollBegin, Common.UIString('Scroll Begin')],
        [inputEvent.ScrollEnd, Common.UIString('Scroll End')],
        [inputEvent.ScrollUpdate, Common.UIString('Scroll Update')],
        [inputEvent.FlingStart, Common.UIString('Fling Start')],
        [inputEvent.FlingCancel, Common.UIString('Fling Halt')],
        [inputEvent.Tap, Common.UIString('Tap')],
        [inputEvent.TapCancel, Common.UIString('Tap Halt')],
        [inputEvent.ShowPress, Common.UIString('Tap Begin')],
        [inputEvent.TapDown, Common.UIString('Tap Down')],
        [inputEvent.TouchCancel, Common.UIString('Touch Cancel')],
        [inputEvent.TouchEnd, Common.UIString('Touch End')],
        [inputEvent.TouchMove, Common.UIString('Touch Move')],
        [inputEvent.TouchStart, Common.UIString('Touch Start')],
        [inputEvent.PinchBegin, Common.UIString('Pinch Begin')],
        [inputEvent.PinchEnd, Common.UIString('Pinch End')],
        [inputEvent.PinchUpdate, Common.UIString('Pinch Update')]
      ]);
    }
    return Timeline.TimelineUIUtils._inputEventToDisplayName.get(inputEventType) || null;
  }

  /**
   * @param {!Protocol.Runtime.CallFrame} frame
   * @return {string}
   */
  static frameDisplayName(frame) {
    if (!TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame))
      return UI.beautifyFunctionName(frame.functionName);
    const nativeGroup = TimelineModel.TimelineJSProfileProcessor.nativeGroup(frame.functionName);
    const groups = TimelineModel.TimelineJSProfileProcessor.NativeGroups;
    switch (nativeGroup) {
      case groups.Compile:
        return Common.UIString('Compile');
      case groups.Parse:
        return Common.UIString('Parse');
    }
    return frame.functionName;
  }

  /**
   * @param {!SDK.TracingModel.Event} traceEvent
   * @param {!RegExp} regExp
   * @return {boolean}
   */
  static testContentMatching(traceEvent, regExp) {
    var title = Timeline.TimelineUIUtils.eventStyle(traceEvent).title;
    var tokens = [title];
    var url = TimelineModel.TimelineData.forEvent(traceEvent).url;
    if (url)
      tokens.push(url);
    appendObjectProperties(traceEvent.args, 2);
    return regExp.test(tokens.join('|'));

    /**
     * @param {!Object} object
     * @param {number} depth
     */
    function appendObjectProperties(object, depth) {
      if (!depth)
        return;
      for (var key in object) {
        var value = object[key];
        var type = typeof value;
        if (type === 'string')
          tokens.push(value);
        else if (type === 'number')
          tokens.push(String(value));
        else if (type === 'object')
          appendObjectProperties(value, depth - 1);
      }
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {!{title: string, category: !Timeline.TimelineCategory}}
   */
  static eventStyle(event) {
    var eventStyles = Timeline.TimelineUIUtils._initEventStyles();
    if (event.hasCategory(TimelineModel.TimelineModel.Category.Console) ||
        event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming))
      return {title: event.name, category: Timeline.TimelineUIUtils.categories()['scripting']};

    if (event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)) {
      /** @const */
      var prefix = 'InputLatency::';
      var inputEventType = event.name.startsWith(prefix) ? event.name.substr(prefix.length) : event.name;
      var displayName = Timeline.TimelineUIUtils.inputEventDisplayName(
          /** @type {!TimelineModel.TimelineIRModel.InputEvents} */ (inputEventType));
      return {title: displayName || inputEventType, category: Timeline.TimelineUIUtils.categories()['scripting']};
    }
    var result = eventStyles[event.name];
    if (!result) {
      result = new Timeline.TimelineRecordStyle(event.name, Timeline.TimelineUIUtils.categories()['other'], true);
      eventStyles[event.name] = result;
    }
    return result;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  static eventColor(event) {
    if (event.name === TimelineModel.TimelineModel.RecordType.JSFrame) {
      var frame = event.args['data'];
      if (Timeline.TimelineUIUtils.isUserFrame(frame))
        return Timeline.TimelineUIUtils.colorForURL(frame.url);
    }
    return Timeline.TimelineUIUtils.eventStyle(event).category.color;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  static eventTitle(event) {
    const recordType = TimelineModel.TimelineModel.RecordType;
    const eventData = event.args['data'];
    if (event.name === recordType.JSFrame)
      return Timeline.TimelineUIUtils.frameDisplayName(eventData);
    const title = Timeline.TimelineUIUtils.eventStyle(event).title;
    if (event.hasCategory(TimelineModel.TimelineModel.Category.Console))
      return title;
    if (event.name === recordType.TimeStamp)
      return Common.UIString('%s: %s', title, eventData['message']);
    if (event.name === recordType.Animation && eventData && eventData['name'])
      return Common.UIString('%s: %s', title, eventData['name']);
    return title;
  }

  /**
   * !Map<!TimelineModel.TimelineIRModel.Phases, !{color: string, label: string}>
   */
  static _interactionPhaseStyles() {
    var map = Timeline.TimelineUIUtils._interactionPhaseStylesMap;
    if (!map) {
      map = new Map([
        [TimelineModel.TimelineIRModel.Phases.Idle, {color: 'white', label: 'Idle'}],
        [
          TimelineModel.TimelineIRModel.Phases.Response,
          {color: 'hsl(43, 83%, 64%)', label: Common.UIString('Response')}
        ],
        [TimelineModel.TimelineIRModel.Phases.Scroll, {color: 'hsl(256, 67%, 70%)', label: Common.UIString('Scroll')}],
        [TimelineModel.TimelineIRModel.Phases.Fling, {color: 'hsl(256, 67%, 70%)', label: Common.UIString('Fling')}],
        [TimelineModel.TimelineIRModel.Phases.Drag, {color: 'hsl(256, 67%, 70%)', label: Common.UIString('Drag')}],
        [
          TimelineModel.TimelineIRModel.Phases.Animation,
          {color: 'hsl(256, 67%, 70%)', label: Common.UIString('Animation')}
        ],
        [
          TimelineModel.TimelineIRModel.Phases.Uncategorized,
          {color: 'hsl(0, 0%, 87%)', label: Common.UIString('Uncategorized')}
        ]
      ]);
      Timeline.TimelineUIUtils._interactionPhaseStylesMap = map;
    }
    return map;
  }

  /**
   * @param {!TimelineModel.TimelineIRModel.Phases} phase
   * @return {string}
   */
  static interactionPhaseColor(phase) {
    return Timeline.TimelineUIUtils._interactionPhaseStyles().get(phase).color;
  }

  /**
   * @param {!TimelineModel.TimelineIRModel.Phases} phase
   * @return {string}
   */
  static interactionPhaseLabel(phase) {
    return Timeline.TimelineUIUtils._interactionPhaseStyles().get(phase).label;
  }

  /**
   * @param {!Protocol.Runtime.CallFrame} frame
   * @return {boolean}
   */
  static isUserFrame(frame) {
    return frame.scriptId !== '0' && !(frame.url && frame.url.startsWith('native '));
  }

  /**
   * @param {!TimelineModel.TimelineModel.NetworkRequest} request
   * @return {!Timeline.TimelineUIUtils.NetworkCategory}
   */
  static networkRequestCategory(request) {
    var categories = Timeline.TimelineUIUtils.NetworkCategory;
    switch (request.mimeType) {
      case 'text/html':
        return categories.HTML;
      case 'application/javascript':
      case 'application/x-javascript':
      case 'text/javascript':
        return categories.Script;
      case 'text/css':
        return categories.Style;
      case 'audio/ogg':
      case 'image/gif':
      case 'image/jpeg':
      case 'image/png':
      case 'image/svg+xml':
      case 'image/webp':
      case 'image/x-icon':
      case 'font/opentype':
      case 'font/woff2':
      case 'application/font-woff':
        return categories.Media;
      default:
        return categories.Other;
    }
  }

  /**
   * @param {!Timeline.TimelineUIUtils.NetworkCategory} category
   * @return {string}
   */
  static networkCategoryColor(category) {
    var categories = Timeline.TimelineUIUtils.NetworkCategory;
    switch (category) {
      case categories.HTML:
        return 'hsl(214, 67%, 66%)';
      case categories.Script:
        return 'hsl(43, 83%, 64%)';
      case categories.Style:
        return 'hsl(256, 67%, 70%)';
      case categories.Media:
        return 'hsl(109, 33%, 55%)';
      default:
        return 'hsl(0, 0%, 70%)';
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {?SDK.Target} target
   * @return {?string}
   */
  static buildDetailsTextForTraceEvent(event, target) {
    var recordType = TimelineModel.TimelineModel.RecordType;
    var detailsText;
    var eventData = event.args['data'];
    switch (event.name) {
      case recordType.GCEvent:
      case recordType.MajorGC:
      case recordType.MinorGC:
        var delta = event.args['usedHeapSizeBefore'] - event.args['usedHeapSizeAfter'];
        detailsText = Common.UIString('%s collected', Number.bytesToString(delta));
        break;
      case recordType.FunctionCall:
        // Omit internally generated script names.
        if (eventData)
          detailsText = linkifyLocationAsText(eventData['scriptId'], eventData['lineNumber'], 0);
        break;
      case recordType.JSFrame:
        detailsText = Timeline.TimelineUIUtils.frameDisplayName(eventData);
        break;
      case recordType.EventDispatch:
        detailsText = eventData ? eventData['type'] : null;
        break;
      case recordType.Paint:
        var width = Timeline.TimelineUIUtils.quadWidth(eventData.clip);
        var height = Timeline.TimelineUIUtils.quadHeight(eventData.clip);
        if (width && height)
          detailsText = Common.UIString('%d\u2009\u00d7\u2009%d', width, height);
        break;
      case recordType.ParseHTML:
        var endLine = event.args['endData'] && event.args['endData']['endLine'];
        var url = Bindings.displayNameForURL(event.args['beginData']['url']);
        detailsText = Common.UIString(
            '%s [%s\u2026%s]', url, event.args['beginData']['startLine'] + 1, endLine >= 0 ? endLine + 1 : '');
        break;

      case recordType.CompileScript:
      case recordType.EvaluateScript:
        var url = eventData && eventData['url'];
        if (url)
          detailsText = Bindings.displayNameForURL(url) + ':' + (eventData['lineNumber'] + 1);
        break;
      case recordType.ParseScriptOnBackground:
      case recordType.XHRReadyStateChange:
      case recordType.XHRLoad:
        var url = eventData['url'];
        if (url)
          detailsText = Bindings.displayNameForURL(url);
        break;
      case recordType.TimeStamp:
        detailsText = eventData['message'];
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
        var url = TimelineModel.TimelineData.forEvent(event).url;
        if (url)
          detailsText = Bindings.displayNameForURL(url);
        break;

      case recordType.EmbedderCallback:
        detailsText = eventData['callbackName'];
        break;

      case recordType.Animation:
        detailsText = eventData && eventData['name'];
        break;

      case recordType.GCIdleLazySweep:
        detailsText = Common.UIString('idle sweep');
        break;

      case recordType.GCCompleteSweep:
        detailsText = Common.UIString('complete sweep');
        break;

      case recordType.GCCollectGarbage:
        detailsText = Common.UIString('collect');
        break;

      default:
        if (event.hasCategory(TimelineModel.TimelineModel.Category.Console))
          detailsText = null;
        else
          detailsText = linkifyTopCallFrameAsText();
        break;
    }

    return detailsText;

    /**
     * @param {string} scriptId
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?string}
     */
    function linkifyLocationAsText(scriptId, lineNumber, columnNumber) {
      var debuggerModel = SDK.DebuggerModel.fromTarget(target);
      if (!target || target.isDisposed() || !scriptId || !debuggerModel)
        return null;
      var rawLocation = debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber);
      if (!rawLocation)
        return null;
      var uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
      return uiLocation.linkText();
    }

    /**
     * @return {?string}
     */
    function linkifyTopCallFrameAsText() {
      var frame = TimelineModel.TimelineData.forEvent(event).topFrame();
      if (!frame)
        return null;
      var text = linkifyLocationAsText(frame.scriptId, frame.lineNumber, frame.columnNumber);
      if (!text) {
        text = frame.url;
        if (typeof frame.lineNumber === 'number')
          text += ':' + (frame.lineNumber + 1);
      }
      return text;
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {?SDK.Target} target
   * @param {!Components.Linkifier} linkifier
   * @return {?Node}
   */
  static buildDetailsNodeForTraceEvent(event, target, linkifier) {
    var recordType = TimelineModel.TimelineModel.RecordType;
    var details = null;
    var detailsText;
    var eventData = event.args['data'];
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
        detailsText = Timeline.TimelineUIUtils.buildDetailsTextForTraceEvent(event, target);
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
        var url = TimelineModel.TimelineData.forEvent(event).url;
        if (url)
          details = Components.Linkifier.linkifyURL(url);
        break;
      case recordType.FunctionCall:
      case recordType.JSFrame:
        details = createElement('span');
        details.createTextChild(Timeline.TimelineUIUtils.frameDisplayName(eventData));
        const location = linkifyLocation(
            eventData['scriptId'], eventData['url'], eventData['lineNumber'], eventData['columnNumber']);
        if (location) {
          details.createTextChild(' @ ');
          details.appendChild(location);
        }
        break;
      case recordType.CompileScript:
      case recordType.EvaluateScript:
        var url = eventData['url'];
        if (url)
          details = linkifyLocation('', url, eventData['lineNumber'], 0);
        break;
      case recordType.ParseScriptOnBackground:
        var url = eventData['url'];
        if (url)
          details = linkifyLocation('', url, 0, 0);
        break;
      default:
        if (event.hasCategory(TimelineModel.TimelineModel.Category.Console))
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
     * @return {?Element}
     */
    function linkifyLocation(scriptId, url, lineNumber, columnNumber) {
      return linkifier.linkifyScriptLocation(target, scriptId, url, lineNumber, columnNumber, 'timeline-details');
    }

    /**
     * @return {?Element}
     */
    function linkifyTopCallFrame() {
      var frame = TimelineModel.TimelineData.forEvent(event).topFrame();
      return frame ? linkifier.maybeLinkifyConsoleCallFrame(target, frame, 'timeline-details') : null;
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!TimelineModel.TimelineModel} model
   * @param {!Components.Linkifier} linkifier
   * @param {boolean} detailed
   * @return {!Promise<!DocumentFragment>}
   */
  static async buildTraceEventDetails(event, model, linkifier, detailed) {
    var maybeTarget = model.targetByEvent(event);
    if (!maybeTarget) {
      return Timeline.TimelineUIUtils._buildTraceEventDetailsSynchronously(
          event, model, linkifier, detailed, null);
    }

    var target = /** @type {!SDK.Target} */ (maybeTarget);
    if (!event[Timeline.TimelineUIUtils._previewElementSymbol]) {
      var url = TimelineModel.TimelineData.forEvent(event).url;
      event[Timeline.TimelineUIUtils._previewElementSymbol] = await new Promise(fulfill => {
        if (url)
          Components.DOMPresentationUtils.buildImagePreviewContents(target, url, false, fulfill);
        else if (TimelineModel.TimelineData.forEvent(event).picture)
          Timeline.TimelineUIUtils.buildPicturePreviewContent(event, target, fulfill);
        else
          fulfill();
      }) || null;
    }

    var nodeIdsToResolve = new Set();
    var timelineData = TimelineModel.TimelineData.forEvent(event);
    if (timelineData.backendNodeId)
      nodeIdsToResolve.add(timelineData.backendNodeId);
    var invalidationTrackingEvents = TimelineModel.InvalidationTracker.invalidationEventsFor(event);
    if (invalidationTrackingEvents)
      Timeline.TimelineUIUtils._collectInvalidationNodeIds(nodeIdsToResolve, invalidationTrackingEvents);
    var relatedNodes = null;
    if (nodeIdsToResolve.size) {
      var domModel = SDK.DOMModel.fromTarget(target);
      if (domModel) {
        relatedNodes = await new Promise(fulfill =>
            domModel.pushNodesByBackendIdsToFrontend(nodeIdsToResolve, fulfill));
      }
    }

    return Timeline.TimelineUIUtils._buildTraceEventDetailsSynchronously(
          event, model, linkifier, detailed, relatedNodes);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!TimelineModel.TimelineModel} model
   * @param {!Components.Linkifier} linkifier
   * @param {boolean} detailed
   * @param {?Map<number, ?SDK.DOMNode>} relatedNodesMap
   * @return {!DocumentFragment}
   */
  static _buildTraceEventDetailsSynchronously(event, model, linkifier, detailed, relatedNodesMap) {
    var recordTypes = TimelineModel.TimelineModel.RecordType;
    // This message may vary per event.name;
    var relatedNodeLabel;

    var contentHelper = new Timeline.TimelineDetailsContentHelper(model.targetByEvent(event), linkifier);
    contentHelper.addSection(
        Timeline.TimelineUIUtils.eventTitle(event), Timeline.TimelineUIUtils.eventStyle(event).category.color);

    var eventData = event.args['data'];
    var timelineData = TimelineModel.TimelineData.forEvent(event);
    var initiator = timelineData.initiator();

    if (timelineData.warning)
      contentHelper.appendWarningRow(event);
    if (event.name === recordTypes.JSFrame && eventData['deoptReason'])
      contentHelper.appendWarningRow(event, TimelineModel.TimelineModel.WarningType.V8Deopt);

    if (detailed) {
      contentHelper.appendTextRow(Common.UIString('Self Time'), Number.millisToString(event.selfTime, true));
      contentHelper.appendTextRow(Common.UIString('Total Time'), Number.millisToString(event.duration || 0, true));
    }

    switch (event.name) {
      case recordTypes.GCEvent:
      case recordTypes.MajorGC:
      case recordTypes.MinorGC:
        var delta = event.args['usedHeapSizeBefore'] - event.args['usedHeapSizeAfter'];
        contentHelper.appendTextRow(Common.UIString('Collected'), Number.bytesToString(delta));
        break;
      case recordTypes.JSFrame:
      case recordTypes.FunctionCall:
        var detailsNode =
            Timeline.TimelineUIUtils.buildDetailsNodeForTraceEvent(event, model.targetByEvent(event), linkifier);
        if (detailsNode)
          contentHelper.appendElementRow(Common.UIString('Function'), detailsNode);
        break;
      case recordTypes.TimerFire:
      case recordTypes.TimerInstall:
      case recordTypes.TimerRemove:
        contentHelper.appendTextRow(Common.UIString('Timer ID'), eventData['timerId']);
        if (event.name === recordTypes.TimerInstall) {
          contentHelper.appendTextRow(Common.UIString('Timeout'), Number.millisToString(eventData['timeout']));
          contentHelper.appendTextRow(Common.UIString('Repeats'), !eventData['singleShot']);
        }
        break;
      case recordTypes.FireAnimationFrame:
        contentHelper.appendTextRow(Common.UIString('Callback ID'), eventData['id']);
        break;
      case recordTypes.ResourceSendRequest:
      case recordTypes.ResourceReceiveResponse:
      case recordTypes.ResourceReceivedData:
      case recordTypes.ResourceFinish:
        var url = timelineData.url;
        if (url)
          contentHelper.appendElementRow(Common.UIString('Resource'), Components.Linkifier.linkifyURL(url));
        if (eventData['requestMethod'])
          contentHelper.appendTextRow(Common.UIString('Request Method'), eventData['requestMethod']);
        if (typeof eventData['statusCode'] === 'number')
          contentHelper.appendTextRow(Common.UIString('Status Code'), eventData['statusCode']);
        if (eventData['mimeType'])
          contentHelper.appendTextRow(Common.UIString('MIME Type'), eventData['mimeType']);
        if ('priority' in eventData) {
          var priority = NetworkConditions.uiLabelForPriority(eventData['priority']);
          contentHelper.appendTextRow(Common.UIString('Priority'), priority);
        }
        if (eventData['encodedDataLength']) {
          contentHelper.appendTextRow(
              Common.UIString('Encoded Data'), Common.UIString('%d Bytes', eventData['encodedDataLength']));
        }
        if (eventData['decodedBodyLength']) {
          contentHelper.appendTextRow(
              Common.UIString('Decoded Body'), Common.UIString('%d Bytes', eventData['decodedBodyLength']));
        }
        break;
      case recordTypes.CompileScript:
      case recordTypes.EvaluateScript:
        var url = eventData && eventData['url'];
        if (url) {
          contentHelper.appendLocationRow(
              Common.UIString('Script'), url, eventData['lineNumber'], eventData['columnNumber']);
        }
        break;
      case recordTypes.Paint:
        var clip = eventData['clip'];
        contentHelper.appendTextRow(Common.UIString('Location'), Common.UIString('(%d, %d)', clip[0], clip[1]));
        var clipWidth = Timeline.TimelineUIUtils.quadWidth(clip);
        var clipHeight = Timeline.TimelineUIUtils.quadHeight(clip);
        contentHelper.appendTextRow(Common.UIString('Dimensions'), Common.UIString('%d × %d', clipWidth, clipHeight));
      // Fall-through intended.

      case recordTypes.PaintSetup:
      case recordTypes.Rasterize:
      case recordTypes.ScrollLayer:
        relatedNodeLabel = Common.UIString('Layer Root');
        break;
      case recordTypes.PaintImage:
      case recordTypes.DecodeLazyPixelRef:
      case recordTypes.DecodeImage:
      case recordTypes.ResizeImage:
      case recordTypes.DrawLazyPixelRef:
        relatedNodeLabel = Common.UIString('Owner Element');
        if (timelineData.url) {
          contentHelper.appendElementRow(
              Common.UIString('Image URL'), Components.Linkifier.linkifyURL(timelineData.url));
        }
        break;
      case recordTypes.ParseAuthorStyleSheet:
        var url = eventData['styleSheetUrl'];
        if (url)
          contentHelper.appendElementRow(Common.UIString('Stylesheet URL'), Components.Linkifier.linkifyURL(url));
        break;
      case recordTypes.UpdateLayoutTree:  // We don't want to see default details.
      case recordTypes.RecalculateStyles:
        contentHelper.appendTextRow(Common.UIString('Elements Affected'), event.args['elementCount']);
        break;
      case recordTypes.Layout:
        var beginData = event.args['beginData'];
        contentHelper.appendTextRow(
            Common.UIString('Nodes That Need Layout'),
            Common.UIString('%s of %s', beginData['dirtyObjects'], beginData['totalObjects']));
        relatedNodeLabel = Common.UIString('Layout root');
        break;
      case recordTypes.ConsoleTime:
        contentHelper.appendTextRow(Common.UIString('Message'), event.name);
        break;
      case recordTypes.WebSocketCreate:
      case recordTypes.WebSocketSendHandshakeRequest:
      case recordTypes.WebSocketReceiveHandshakeResponse:
      case recordTypes.WebSocketDestroy:
        var initiatorData = initiator ? initiator.args['data'] : eventData;
        if (typeof initiatorData['webSocketURL'] !== 'undefined')
          contentHelper.appendTextRow(Common.UIString('URL'), initiatorData['webSocketURL']);
        if (typeof initiatorData['webSocketProtocol'] !== 'undefined')
          contentHelper.appendTextRow(Common.UIString('WebSocket Protocol'), initiatorData['webSocketProtocol']);
        if (typeof eventData['message'] !== 'undefined')
          contentHelper.appendTextRow(Common.UIString('Message'), eventData['message']);
        break;
      case recordTypes.EmbedderCallback:
        contentHelper.appendTextRow(Common.UIString('Callback Function'), eventData['callbackName']);
        break;
      case recordTypes.Animation:
        if (event.phase === SDK.TracingModel.Phase.NestableAsyncInstant)
          contentHelper.appendTextRow(Common.UIString('State'), eventData['state']);
        break;
      case recordTypes.ParseHTML:
        var beginData = event.args['beginData'];
        var url = beginData['url'];
        var startLine = beginData['startLine'] - 1;
        var endLine = event.args['endData'] ? event.args['endData']['endLine'] - 1 : undefined;
        if (url)
          contentHelper.appendLocationRange(Common.UIString('Range'), url, startLine, endLine);
        break;

      case recordTypes.FireIdleCallback:
        contentHelper.appendTextRow(
            Common.UIString('Allotted Time'), Number.millisToString(eventData['allottedMilliseconds']));
        contentHelper.appendTextRow(Common.UIString('Invoked by Timeout'), eventData['timedOut']);
      // Fall-through intended.

      case recordTypes.RequestIdleCallback:
      case recordTypes.CancelIdleCallback:
        contentHelper.appendTextRow(Common.UIString('Callback ID'), eventData['id']);
        break;
      case recordTypes.EventDispatch:
        contentHelper.appendTextRow(Common.UIString('Type'), eventData['type']);
        break;

      default:
        var detailsNode =
            Timeline.TimelineUIUtils.buildDetailsNodeForTraceEvent(event, model.targetByEvent(event), linkifier);
        if (detailsNode)
          contentHelper.appendElementRow(Common.UIString('Details'), detailsNode);
        break;
    }

    if (timelineData.timeWaitingForMainThread) {
      contentHelper.appendTextRow(
          Common.UIString('Time Waiting for Main Thread'),
          Number.millisToString(timelineData.timeWaitingForMainThread, true));
    }

    var relatedNode = relatedNodesMap && relatedNodesMap.get(timelineData.backendNodeId);
    if (relatedNode) {
      contentHelper.appendElementRow(
          relatedNodeLabel || Common.UIString('Related Node'),
          Components.DOMPresentationUtils.linkifyNodeReference(relatedNode));
    }

    if (event[Timeline.TimelineUIUtils._previewElementSymbol]) {
      contentHelper.addSection(Common.UIString('Preview'));
      contentHelper.appendElementRow('', event[Timeline.TimelineUIUtils._previewElementSymbol]);
    }

    if (timelineData.stackTraceForSelfOrInitiator() || TimelineModel.InvalidationTracker.invalidationEventsFor(event))
      Timeline.TimelineUIUtils._generateCauses(event, model.targetByEvent(event), relatedNodesMap, contentHelper);

    var stats = {};
    var showPieChart = detailed && Timeline.TimelineUIUtils._aggregatedStatsForTraceEvent(stats, model, event);
    if (showPieChart) {
      contentHelper.addSection(Common.UIString('Aggregated Time'));
      var pieChart = Timeline.TimelineUIUtils.generatePieChart(
          stats, Timeline.TimelineUIUtils.eventStyle(event).category, event.selfTime);
      contentHelper.appendElementRow('', pieChart);
    }

    return contentHelper.fragment;
  }

  /**
   * @param {!TimelineModel.TimelineModel} model
   * @param {number} startTime
   * @param {number} endTime
   * @return {!DocumentFragment}
   */
  static buildRangeStats(model, startTime, endTime) {
    var aggregatedStats = Timeline.TimelineUIUtils.statsForTimeRange(model, startTime, endTime);
    var startOffset = startTime - model.minimumRecordTime();
    var endOffset = endTime - model.minimumRecordTime();

    var contentHelper = new Timeline.TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(
        Common.UIString('Range:  %s \u2013 %s', Number.millisToString(startOffset), Number.millisToString(endOffset)));
    var pieChart = Timeline.TimelineUIUtils.generatePieChart(aggregatedStats);
    contentHelper.appendElementRow('', pieChart);
    return contentHelper.fragment;
  }

  /**
   * @param {!TimelineModel.TimelineModel} model
   * @param {number} startTime
   * @param {number} endTime
   * @return {!Object<string, number>}
   */
  static statsForTimeRange(model, startTime, endTime) {
    Timeline.TimelineUIUtils._buildRangeStatsCacheIfNeeded(model);
    var tasks = model.mainThreadTasks();
    if (!tasks.length)
      return {};
    var statsBeforeIndex = Math.min(tasks.lowerBound(startTime, (time, task) => time - task.endTime), tasks.length - 1);
    var statsAfterIndex = Math.min(tasks.lowerBound(endTime, (time, task) => time - task.endTime), tasks.length - 1);
    var events = model.mainThreadEvents();

    var statsAfter = subtractStats(
        tasks[statsAfterIndex][Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol],
        Timeline.TimelineUIUtils._slowStatsForTimeRange(events, endTime, tasks[statsAfterIndex].endTime));
    var statsBefore = subtractStats(
        tasks[statsBeforeIndex][Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol],
        Timeline.TimelineUIUtils._slowStatsForTimeRange(events, startTime, tasks[statsBeforeIndex].endTime));
    var aggregatedStats = subtractStats(statsAfter, statsBefore);

    /**
      * @param {!Object<string, number>} a
      * @param {!Object<string, number>} b
      * @return {!Object<string, number>}
      */
    function subtractStats(a, b) {
      var result = Object.assign({}, a);
      for (var key in b)
        result[key] -= b[key];
      return result;
    }

    var aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
    aggregatedStats['idle'] = Math.max(0, endTime - startTime - aggregatedTotal);
    return aggregatedStats;
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {number} startTime
   * @param {number} endTime
   */
  static _slowStatsForTimeRange(events, startTime, endTime) {
    /** @type {!Object<string, number>} */
    var stats = {};
    var ownTimes = [];

    TimelineModel.TimelineModel.forEachEvent(
        events, onStartEvent, onEndEvent, undefined, startTime, endTime, Timeline.TimelineUIUtils._filterForStats());

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      var duration = Math.min(e.endTime, endTime) - Math.max(e.startTime, startTime);
      if (ownTimes.length)
        ownTimes[ownTimes.length - 1] -= duration;
      ownTimes.push(duration);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      var category = Timeline.TimelineUIUtils.eventStyle(e).category.name;
      stats[category] = (stats[category] || 0) + ownTimes.pop();
    }
    return stats;
  }

  /**
   * @return {function(!SDK.TracingModel.Event):boolean}
   */
  static _filterForStats() {
    var visibleEventsFilter = Timeline.TimelineUIUtils.visibleEventsFilter();
    return event => visibleEventsFilter.accept(event) || SDK.TracingModel.isTopLevelEvent(event);
  }
  /**
   * @param {!TimelineModel.TimelineModel} model
   */
  static _buildRangeStatsCacheIfNeeded(model) {
    var tasks = model.mainThreadTasks();
    if (tasks.length && tasks[0][Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol])
      return;
    var aggregatedStats = {};
    var ownTimes = [];
    TimelineModel.TimelineModel.forEachEvent(
        model.mainThreadEvents(), onStartEvent, onEndEvent, undefined, undefined, undefined,
        Timeline.TimelineUIUtils._filterForStats());

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      if (ownTimes.length)
        ownTimes[ownTimes.length - 1] -= e.duration;
      ownTimes.push(e.duration);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      var category = Timeline.TimelineUIUtils.eventStyle(e).category.name;
      aggregatedStats[category] = (aggregatedStats[category] || 0) + ownTimes.pop();
      if (!ownTimes.length)
        e[Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol] = Object.assign({}, aggregatedStats);
    }
  }

  /**
   * @param {!TimelineModel.TimelineModel.NetworkRequest} request
   * @param {!TimelineModel.TimelineModel} model
   * @param {!Components.Linkifier} linkifier
   * @return {!Promise<!DocumentFragment>}
   */
  static buildNetworkRequestDetails(request, model, linkifier) {
    const target = model.targetByEvent(request.children[0]);
    const contentHelper = new Timeline.TimelineDetailsContentHelper(target, linkifier);
    const category = Timeline.TimelineUIUtils.networkRequestCategory(request);
    const color = Timeline.TimelineUIUtils.networkCategoryColor(category);
    contentHelper.addSection(Common.UIString('Network request'), color);

    const duration = request.endTime - (request.startTime || -Infinity);
    if (request.url)
      contentHelper.appendElementRow(Common.UIString('URL'), Components.Linkifier.linkifyURL(request.url));
    if (isFinite(duration))
      contentHelper.appendTextRow(Common.UIString('Duration'), Number.millisToString(duration, true));
    if (request.requestMethod)
      contentHelper.appendTextRow(Common.UIString('Request Method'), request.requestMethod);
    if (typeof request.priority === 'string') {
      const priority =
          NetworkConditions.uiLabelForPriority(/** @type {!Protocol.Network.ResourcePriority} */ (request.priority));
      contentHelper.appendTextRow(Common.UIString('Priority'), priority);
    }
    if (request.mimeType)
      contentHelper.appendTextRow(Common.UIString('Mime Type'), request.mimeType);
    var lengthText = '';
    if (request.fromCache)
      lengthText += Common.UIString(' (from cache)');
    if (request.fromServiceWorker)
      lengthText += Common.UIString(' (from service worker)');
    if (request.encodedDataLength || !lengthText)
      lengthText = `${Number.bytesToString(request.encodedDataLength)}${lengthText}`;
    contentHelper.appendTextRow(Common.UIString('Encoded Data'), lengthText);
    if (request.decodedBodyLength)
      contentHelper.appendTextRow(Common.UIString('Decoded Body'), Number.bytesToString(request.decodedBodyLength));
    const title = Common.UIString('Initiator');
    const sendRequest = request.children[0];
    const topFrame = TimelineModel.TimelineData.forEvent(sendRequest).topFrame();
    if (topFrame) {
      const link = linkifier.maybeLinkifyConsoleCallFrame(target, topFrame);
      if (link)
        contentHelper.appendElementRow(title, link);
    } else {
      const initiator = TimelineModel.TimelineData.forEvent(sendRequest).initiator();
      if (initiator) {
        const initiatorURL = TimelineModel.TimelineData.forEvent(initiator).url;
        if (initiatorURL) {
          const link = linkifier.maybeLinkifyScriptLocation(target, null, initiatorURL, 0);
          if (link)
            contentHelper.appendElementRow(title, link);
        }
      }
    }

    /**
     * @param {function(?Element)} fulfill
     */
    function action(fulfill) {
      Components.DOMPresentationUtils.buildImagePreviewContents(
          /** @type {!SDK.Target} */ (target), request.url, false, saveImage);
      /**
       * @param {!Element=} element
       */
      function saveImage(element) {
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
    function appendPreview(element) {
      if (element)
        contentHelper.appendElementRow(Common.UIString('Preview'), request.previewElement);
      return contentHelper.fragment;
    }
    return previewPromise.then(appendPreview);
  }

  /**
   * @param {!Array<!Protocol.Runtime.CallFrame>} callFrames
   * @return {!Protocol.Runtime.StackTrace}
   */
  static _stackTraceFromCallFrames(callFrames) {
    return /** @type {!Protocol.Runtime.StackTrace} */ ({callFrames: callFrames});
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {?SDK.Target} target
   * @param {?Map<number, ?SDK.DOMNode>} relatedNodesMap
   * @param {!Timeline.TimelineDetailsContentHelper} contentHelper
   */
  static _generateCauses(event, target, relatedNodesMap, contentHelper) {
    var recordTypes = TimelineModel.TimelineModel.RecordType;

    var callSiteStackLabel;
    var stackLabel;

    switch (event.name) {
      case recordTypes.TimerFire:
        callSiteStackLabel = Common.UIString('Timer Installed');
        break;
      case recordTypes.FireAnimationFrame:
        callSiteStackLabel = Common.UIString('Animation Frame Requested');
        break;
      case recordTypes.FireIdleCallback:
        callSiteStackLabel = Common.UIString('Idle Callback Requested');
        break;
      case recordTypes.UpdateLayoutTree:
      case recordTypes.RecalculateStyles:
        stackLabel = Common.UIString('Recalculation Forced');
        break;
      case recordTypes.Layout:
        callSiteStackLabel = Common.UIString('First Layout Invalidation');
        stackLabel = Common.UIString('Layout Forced');
        break;
    }

    var timelineData = TimelineModel.TimelineData.forEvent(event);
    // Direct cause.
    if (timelineData.stackTrace && timelineData.stackTrace.length) {
      contentHelper.addSection(Common.UIString('Call Stacks'));
      contentHelper.appendStackTrace(
          stackLabel || Common.UIString('Stack Trace'),
          Timeline.TimelineUIUtils._stackTraceFromCallFrames(timelineData.stackTrace));
    }

    var initiator = TimelineModel.TimelineData.forEvent(event).initiator();
    // Indirect causes.
    if (TimelineModel.InvalidationTracker.invalidationEventsFor(event) &&
        target) {  // Full invalidation tracking (experimental).
      contentHelper.addSection(Common.UIString('Invalidations'));
      Timeline.TimelineUIUtils._generateInvalidations(event, target, relatedNodesMap, contentHelper);
    } else if (initiator) {  // Partial invalidation tracking.
      var delay = event.startTime - initiator.startTime;
      contentHelper.appendTextRow(Common.UIString('Pending for'), Number.preciseMillisToString(delay, 1));

      var link = createElementWithClass('span', 'devtools-link');
      link.textContent = Common.UIString('reveal');
      link.addEventListener('click', () => {
        Timeline.TimelinePanel.instance().select(
            Timeline.TimelineSelection.fromTraceEvent(/** @type {!SDK.TracingModel.Event} */ (initiator)));
      });
      contentHelper.appendElementRow(Common.UIString('Initiator'), link);

      var initiatorStackTrace = TimelineModel.TimelineData.forEvent(initiator).stackTrace;
      if (initiatorStackTrace) {
        contentHelper.appendStackTrace(
            callSiteStackLabel || Common.UIString('First Invalidated'),
            Timeline.TimelineUIUtils._stackTraceFromCallFrames(initiatorStackTrace));
      }
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!SDK.Target} target
   * @param {?Map<number, ?SDK.DOMNode>} relatedNodesMap
   * @param {!Timeline.TimelineDetailsContentHelper} contentHelper
   */
  static _generateInvalidations(event, target, relatedNodesMap, contentHelper) {
    var invalidationTrackingEvents = TimelineModel.InvalidationTracker.invalidationEventsFor(event);
    var invalidations = {};
    invalidationTrackingEvents.forEach(function(invalidation) {
      if (!invalidations[invalidation.type])
        invalidations[invalidation.type] = [invalidation];
      else
        invalidations[invalidation.type].push(invalidation);
    });

    Object.keys(invalidations).forEach(function(type) {
      Timeline.TimelineUIUtils._generateInvalidationsForType(
          type, target, invalidations[type], relatedNodesMap, contentHelper);
    });
  }

  /**
   * @param {string} type
   * @param {!SDK.Target} target
   * @param {!Array.<!TimelineModel.InvalidationTrackingEvent>} invalidations
   * @param {?Map<number, ?SDK.DOMNode>} relatedNodesMap
   * @param {!Timeline.TimelineDetailsContentHelper} contentHelper
   */
  static _generateInvalidationsForType(type, target, invalidations, relatedNodesMap, contentHelper) {
    var title;
    switch (type) {
      case TimelineModel.TimelineModel.RecordType.StyleRecalcInvalidationTracking:
        title = Common.UIString('Style Invalidations');
        break;
      case TimelineModel.TimelineModel.RecordType.LayoutInvalidationTracking:
        title = Common.UIString('Layout Invalidations');
        break;
      default:
        title = Common.UIString('Other Invalidations');
        break;
    }

    var invalidationsTreeOutline = new UI.TreeOutlineInShadow();
    invalidationsTreeOutline.registerRequiredCSS('timeline/invalidationsTree.css');
    invalidationsTreeOutline.element.classList.add('invalidations-tree');

    var invalidationGroups = groupInvalidationsByCause(invalidations);
    invalidationGroups.forEach(function(group) {
      var groupElement =
          new Timeline.TimelineUIUtils.InvalidationsGroupElement(target, relatedNodesMap, contentHelper, group);
      invalidationsTreeOutline.appendChild(groupElement);
    });
    contentHelper.appendElementRow(title, invalidationsTreeOutline.element, false, true);

    /**
     * @param {!Array<!TimelineModel.InvalidationTrackingEvent>} invalidations
     * @return {!Array<!Array<!TimelineModel.InvalidationTrackingEvent>>}
     */
    function groupInvalidationsByCause(invalidations) {
      /** @type {!Map<string, !Array<!TimelineModel.InvalidationTrackingEvent>>} */
      var causeToInvalidationMap = new Map();
      for (var index = 0; index < invalidations.length; index++) {
        var invalidation = invalidations[index];
        var causeKey = '';
        if (invalidation.cause.reason)
          causeKey += invalidation.cause.reason + '.';
        if (invalidation.cause.stackTrace) {
          invalidation.cause.stackTrace.forEach(function(stackFrame) {
            causeKey += stackFrame['functionName'] + '.';
            causeKey += stackFrame['scriptId'] + '.';
            causeKey += stackFrame['url'] + '.';
            causeKey += stackFrame['lineNumber'] + '.';
            causeKey += stackFrame['columnNumber'] + '.';
          });
        }

        if (causeToInvalidationMap.has(causeKey))
          causeToInvalidationMap.get(causeKey).push(invalidation);
        else
          causeToInvalidationMap.set(causeKey, [invalidation]);
      }
      return causeToInvalidationMap.valuesArray();
    }
  }

  /**
   * @param {!Set<number>} nodeIds
   * @param {!Array<!TimelineModel.InvalidationTrackingEvent>} invalidations
   */
  static _collectInvalidationNodeIds(nodeIds, invalidations) {
    nodeIds.addAll(invalidations.map(invalidation => invalidation.nodeId).filter(id => id));
  }

  /**
   * @param {!Object} total
   * @param {!TimelineModel.TimelineModel} model
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  static _aggregatedStatsForTraceEvent(total, model, event) {
    var events = model.inspectedTargetEvents();
    /**
     * @param {number} startTime
     * @param {!SDK.TracingModel.Event} e
     * @return {number}
     */
    function eventComparator(startTime, e) {
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
        var categoryName = Timeline.TimelineUIUtils.eventStyle(nextEvent).category.name;
        total[categoryName] = (total[categoryName] || 0) + nextEvent.selfTime;
      }
    }
    if (SDK.TracingModel.isAsyncPhase(event.phase)) {
      if (event.endTime) {
        var aggregatedTotal = 0;
        for (var categoryName in total)
          aggregatedTotal += total[categoryName];
        total['idle'] = Math.max(0, event.endTime - event.startTime - aggregatedTotal);
      }
      return false;
    }
    return hasChildren;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {!SDK.Target} target
   * @param {function(!Element=)} callback
   */
  static buildPicturePreviewContent(event, target, callback) {
    new TimelineModel.LayerPaintEvent(event, target).snapshotPromise().then(onSnapshotLoaded);
    /**
     * @param {?SDK.SnapshotWithRect} snapshotWithRect
     */
    function onSnapshotLoaded(snapshotWithRect) {
      if (!snapshotWithRect) {
        callback();
        return;
      }
      snapshotWithRect.snapshot.replay(null, null, 1).then(imageURL => onGotImage(imageURL));
      snapshotWithRect.snapshot.release();
    }

    /**
     * @param {?string} imageURL
     */
    function onGotImage(imageURL) {
      if (!imageURL) {
        callback();
        return;
      }
      var container = createElement('div');
      UI.appendStyle(container, 'components/imagePreview.css');
      container.classList.add('image-preview-container', 'vbox', 'link');
      var img = container.createChild('img');
      img.src = imageURL;
      var paintProfilerButton = container.createChild('a');
      paintProfilerButton.textContent = Common.UIString('Paint Profiler');
      container.addEventListener('click', showPaintProfiler, false);
      callback(container);
    }

    function showPaintProfiler() {
      Timeline.TimelinePanel.instance().select(
          Timeline.TimelineSelection.fromTraceEvent(event), Timeline.TimelineDetailsView.Tab.PaintProfiler);
    }
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {number} zeroTime
   * @return {!Element}
   */
  static createEventDivider(event, zeroTime) {
    var eventDivider = createElementWithClass('div', 'resources-event-divider');
    var startTime = Number.millisToString(event.startTime - zeroTime);
    eventDivider.title = Common.UIString('%s at %s', Timeline.TimelineUIUtils.eventTitle(event), startTime);

    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var name = event.name;
    if (name === recordTypes.MarkDOMContent)
      eventDivider.classList.add('resources-blue-divider');
    else if (name === recordTypes.MarkLoad)
      eventDivider.classList.add('resources-red-divider');
    else if (name === recordTypes.MarkFirstPaint)
      eventDivider.classList.add('resources-green-divider');

    return eventDivider;
  }

  /**
   * @return {!Array.<string>}
   */
  static _visibleTypes() {
    var eventStyles = Timeline.TimelineUIUtils._initEventStyles();
    var result = [];
    for (var name in eventStyles) {
      if (!eventStyles[name].hidden)
        result.push(name);
    }
    return result;
  }

  /**
   * @return {!TimelineModel.TimelineModelFilter}
   */
  static visibleEventsFilter() {
    return new TimelineModel.TimelineVisibleEventsFilter(Timeline.TimelineUIUtils._visibleTypes());
  }

  /**
   * @return {!Object.<string, !Timeline.TimelineCategory>}
   */
  static categories() {
    if (Timeline.TimelineUIUtils._categories)
      return Timeline.TimelineUIUtils._categories;
    Timeline.TimelineUIUtils._categories = {
      loading: new Timeline.TimelineCategory(
          'loading', Common.UIString('Loading'), true, 'hsl(214, 67%, 74%)', 'hsl(214, 67%, 66%)'),
      scripting: new Timeline.TimelineCategory(
          'scripting', Common.UIString('Scripting'), true, 'hsl(43, 83%, 72%)', 'hsl(43, 83%, 64%) '),
      rendering: new Timeline.TimelineCategory(
          'rendering', Common.UIString('Rendering'), true, 'hsl(256, 67%, 76%)', 'hsl(256, 67%, 70%)'),
      painting: new Timeline.TimelineCategory(
          'painting', Common.UIString('Painting'), true, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
      gpu: new Timeline.TimelineCategory(
          'gpu', Common.UIString('GPU'), false, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
      other:
          new Timeline.TimelineCategory('other', Common.UIString('Other'), false, 'hsl(0, 0%, 87%)', 'hsl(0, 0%, 79%)'),
      idle: new Timeline.TimelineCategory('idle', Common.UIString('Idle'), false, 'hsl(0, 0%, 98%)', 'hsl(0, 0%, 98%)')
    };
    return Timeline.TimelineUIUtils._categories;
  }

  /**
   * @param {!TimelineModel.TimelineModel.AsyncEventGroup} group
   * @return {string}
   */
  static titleForAsyncEventGroup(group) {
    if (!Timeline.TimelineUIUtils._titleForAsyncEventGroupMap) {
      var groups = TimelineModel.TimelineModel.AsyncEventGroup;
      Timeline.TimelineUIUtils._titleForAsyncEventGroupMap = new Map([
        [groups.animation, Common.UIString('Animation')], [groups.console, Common.UIString('Console')],
        [groups.userTiming, Common.UIString('User Timing')], [groups.input, Common.UIString('Input')]
      ]);
    }
    return Timeline.TimelineUIUtils._titleForAsyncEventGroupMap.get(group) || '';
  }

  /**
   * @param {!Object} aggregatedStats
   * @param {!Timeline.TimelineCategory=} selfCategory
   * @param {number=} selfTime
   * @return {!Element}
   */
  static generatePieChart(aggregatedStats, selfCategory, selfTime) {
    var total = 0;
    for (var categoryName in aggregatedStats)
      total += aggregatedStats[categoryName];

    var element = createElementWithClass('div', 'timeline-details-view-pie-chart-wrapper hbox');
    var pieChart = new PerfUI.PieChart(110, value => Number.preciseMillisToString(value), true);
    pieChart.element.classList.add('timeline-details-view-pie-chart');
    pieChart.setTotal(total);
    var pieChartContainer = element.createChild('div', 'vbox');
    pieChartContainer.appendChild(pieChart.element);
    var footerElement = element.createChild('div', 'timeline-aggregated-info-legend');

    /**
     * @param {string} name
     * @param {string} title
     * @param {number} value
     * @param {string} color
     */
    function appendLegendRow(name, title, value, color) {
      if (!value)
        return;
      pieChart.addSlice(value, color);
      var rowElement = footerElement.createChild('div');
      rowElement.createChild('span', 'timeline-aggregated-legend-value').textContent =
          Number.preciseMillisToString(value, 1);
      rowElement.createChild('span', 'timeline-aggregated-legend-swatch').style.backgroundColor = color;
      rowElement.createChild('span', 'timeline-aggregated-legend-title').textContent = title;
    }

    // In case of self time, first add self, then children of the same category.
    if (selfCategory) {
      if (selfTime) {
        appendLegendRow(
            selfCategory.name, Common.UIString('%s (self)', selfCategory.title), selfTime, selfCategory.color);
      }
      // Children of the same category.
      var categoryTime = aggregatedStats[selfCategory.name];
      var value = categoryTime - selfTime;
      if (value > 0) {
        appendLegendRow(
            selfCategory.name, Common.UIString('%s (children)', selfCategory.title), value, selfCategory.childColor);
      }
    }

    // Add other categories.
    for (var categoryName in Timeline.TimelineUIUtils.categories()) {
      var category = Timeline.TimelineUIUtils.categories()[categoryName];
      if (category === selfCategory)
        continue;
      appendLegendRow(category.name, category.title, aggregatedStats[category.name], category.childColor);
    }
    return element;
  }

  /**
   * @param {!TimelineModel.TimelineFrame} frame
   * @param {?SDK.FilmStripModel.Frame} filmStripFrame
   * @return {!Element}
   */
  static generateDetailsContentForFrame(frame, filmStripFrame) {
    var contentHelper = new Timeline.TimelineDetailsContentHelper(null, null);
    contentHelper.addSection(Common.UIString('Frame'));

    var duration = Timeline.TimelineUIUtils.frameDuration(frame);
    contentHelper.appendElementRow(Common.UIString('Duration'), duration, frame.hasWarnings());
    if (filmStripFrame) {
      var filmStripPreview = createElementWithClass('img', 'timeline-filmstrip-preview');
      filmStripFrame.imageDataPromise().then(onGotImageData.bind(null, filmStripPreview));
      contentHelper.appendElementRow('', filmStripPreview);
      filmStripPreview.addEventListener('click', frameClicked.bind(null, filmStripFrame), false);
    }
    var durationInMillis = frame.endTime - frame.startTime;
    contentHelper.appendTextRow(Common.UIString('FPS'), Math.floor(1000 / durationInMillis));
    contentHelper.appendTextRow(Common.UIString('CPU time'), Number.millisToString(frame.cpuTime, true));

    if (frame.layerTree) {
      contentHelper.appendElementRow(
          Common.UIString('Layer tree'),
          Components.Linkifier.linkifyRevealable(frame.layerTree, Common.UIString('show')));
    }

    /**
     * @param {!Element} image
     * @param {?string} data
     */
    function onGotImageData(image, data) {
      if (data)
        image.src = 'data:image/jpg;base64,' + data;
    }

    /**
     * @param {!SDK.FilmStripModel.Frame} filmStripFrame
     */
    function frameClicked(filmStripFrame) {
      new PerfUI.FilmStripView.Dialog(filmStripFrame, 0);
    }

    return contentHelper.fragment;
  }

  /**
   * @param {!TimelineModel.TimelineFrame} frame
   * @return {!Element}
   */
  static frameDuration(frame) {
    var durationText = Common.UIString(
        '%s (at %s)', Number.millisToString(frame.endTime - frame.startTime, true),
        Number.millisToString(frame.startTimeOffset, true));
    var element = createElement('span');
    element.createTextChild(durationText);
    if (!frame.hasWarnings())
      return element;
    element.createTextChild(Common.UIString('. Long frame times are an indication of '));
    element.appendChild(UI.createExternalLink(
        'https://developers.google.com/web/fundamentals/performance/rendering/', Common.UIString('jank')));
    element.createTextChild('.');
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
  static createFillStyle(context, width, height, color0, color1, color2) {
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
  static quadWidth(quad) {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[2], 2) + Math.pow(quad[1] - quad[3], 2)));
  }

  /**
   * @param {!Array.<number>} quad
   * @return {number}
   */
  static quadHeight(quad) {
    return Math.round(Math.sqrt(Math.pow(quad[0] - quad[6], 2) + Math.pow(quad[1] - quad[7], 2)));
  }

  /**
   * @return {!Array.<!Timeline.TimelineUIUtils.EventDispatchTypeDescriptor>}
   */
  static eventDispatchDesciptors() {
    if (Timeline.TimelineUIUtils._eventDispatchDesciptors)
      return Timeline.TimelineUIUtils._eventDispatchDesciptors;
    var lightOrange = 'hsl(40,100%,80%)';
    var orange = 'hsl(40,100%,50%)';
    var green = 'hsl(90,100%,40%)';
    var purple = 'hsl(256,100%,75%)';
    Timeline.TimelineUIUtils._eventDispatchDesciptors = [
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(
          1, lightOrange, ['mousemove', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(
          1, lightOrange, ['pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointermove']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(2, green, ['wheel']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(3, orange, ['click', 'mousedown', 'mouseup']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(
          3, orange, ['touchstart', 'touchend', 'touchmove', 'touchcancel']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(
          3, orange, ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']),
      new Timeline.TimelineUIUtils.EventDispatchTypeDescriptor(3, purple, ['keydown', 'keyup', 'keypress'])
    ];
    return Timeline.TimelineUIUtils._eventDispatchDesciptors;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {!Timeline.TimelineMarkerStyle}
   */
  static markerStyleForEvent(event) {
    const red = 'rgb(255, 0, 0)';
    const blue = 'rgb(0, 0, 255)';
    const orange = 'rgb(255, 178, 23)';
    const green = 'rgb(0, 130, 0)';
    const purple = '#a2f';
    const tallMarkerDashStyle = [10, 5];
    const title = Timeline.TimelineUIUtils.eventTitle(event);

    if (event.hasCategory(TimelineModel.TimelineModel.Category.Console) ||
        event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming)) {
      return {
        title: title,
        dashStyle: tallMarkerDashStyle,
        lineWidth: 0.5,
        color: event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming) ? purple : orange,
        tall: false,
        lowPriority: false,
      };
    }
    var recordTypes = TimelineModel.TimelineModel.RecordType;
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
   * @return {!Timeline.TimelineMarkerStyle}
   */
  static markerStyleForFrame() {
    return {
      title: Common.UIString('Frame'),
      color: 'rgba(100, 100, 100, 0.4)',
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
  static colorForURL(url) {
    if (!Timeline.TimelineUIUtils.colorForURL._colorGenerator) {
      Timeline.TimelineUIUtils.colorForURL._colorGenerator =
          new PerfUI.FlameChart.ColorGenerator({min: 30, max: 330}, {min: 50, max: 80, count: 3}, 85);
    }
    return Timeline.TimelineUIUtils.colorForURL._colorGenerator.colorForID(url);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {string=} warningType
   * @return {?Element}
   */
  static eventWarning(event, warningType) {
    var timelineData = TimelineModel.TimelineData.forEvent(event);
    var warning = warningType || timelineData.warning;
    if (!warning)
      return null;
    var warnings = TimelineModel.TimelineModel.WarningType;
    var span = createElement('span');
    var eventData = event.args['data'];

    switch (warning) {
      case warnings.ForcedStyle:
      case warnings.ForcedLayout:
        span.appendChild(UI.createDocumentationLink(
            '../../fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts',
            Common.UIString('Forced reflow')));
        span.createTextChild(Common.UIString(' is a likely performance bottleneck.'));
        break;
      case warnings.IdleDeadlineExceeded:
        span.textContent = Common.UIString(
            'Idle callback execution extended beyond deadline by ' +
            Number.millisToString(event.duration - eventData['allottedMilliseconds'], true));
        break;
      case warnings.LongHandler:
        span.textContent = Common.UIString('Handler took %s', Number.millisToString(event.duration, true));
        break;
      case warnings.LongRecurringHandler:
        span.textContent = Common.UIString('Recurring handler took %s', Number.millisToString(event.duration, true));
        break;
      case warnings.V8Deopt:
        span.appendChild(UI.createExternalLink(
            'https://github.com/GoogleChrome/devtools-docs/issues/53', Common.UIString('Not optimized')));
        span.createTextChild(Common.UIString(': %s', eventData['deoptReason']));
        break;
      default:
        console.assert(false, 'Unhandled TimelineModel.WarningType');
    }
    return span;
  }

  /**
   * @param {!TimelineModel.TimelineModel.PageFrame} frame
   * @param {number=} trimAt
   */
  static displayNameForFrame(frame, trimAt) {
    var url = frame.url;
    if (!trimAt)
      trimAt = 30;
    return url.startsWith('about:') ? `"${frame.name.trimMiddle(trimAt)}"` : frame.url.trimEnd(trimAt);
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineRecordStyle = class {
  /**
   * @param {string} title
   * @param {!Timeline.TimelineCategory} category
   * @param {boolean=} hidden
   */
  constructor(title, category, hidden) {
    this.title = title;
    this.category = category;
    this.hidden = !!hidden;
  }
};


/**
 * @enum {symbol}
 */
Timeline.TimelineUIUtils.NetworkCategory = {
  HTML: Symbol('HTML'),
  Script: Symbol('Script'),
  Style: Symbol('Style'),
  Media: Symbol('Media'),
  Other: Symbol('Other')
};


Timeline.TimelineUIUtils._aggregatedStatsKey = Symbol('aggregatedStats');


/**
 * @unrestricted
 */
Timeline.TimelineUIUtils.InvalidationsGroupElement = class extends UI.TreeElement {
  /**
   * @param {!SDK.Target} target
   * @param {?Map<number, ?SDK.DOMNode>} relatedNodesMap
   * @param {!Timeline.TimelineDetailsContentHelper} contentHelper
   * @param {!Array.<!TimelineModel.InvalidationTrackingEvent>} invalidations
   */
  constructor(target, relatedNodesMap, contentHelper, invalidations) {
    super('', true);

    this.listItemElement.classList.add('header');
    this.selectable = false;
    this.toggleOnClick = true;

    this._relatedNodesMap = relatedNodesMap;
    this._contentHelper = contentHelper;
    this._invalidations = invalidations;
    this.title = this._createTitle(target);
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Element}
   */
  _createTitle(target) {
    var first = this._invalidations[0];
    var reason = first.cause.reason;
    var topFrame = first.cause.stackTrace && first.cause.stackTrace[0];

    var title = createElement('span');
    if (reason)
      title.createTextChild(Common.UIString('%s for ', reason));
    else
      title.createTextChild(Common.UIString('Unknown cause for '));

    this._appendTruncatedNodeList(title, this._invalidations);

    if (topFrame && this._contentHelper.linkifier()) {
      title.createTextChild(Common.UIString('. '));
      var stack = title.createChild('span', 'monospace');
      stack.createChild('span').textContent = Timeline.TimelineUIUtils.frameDisplayName(topFrame);
      var link = this._contentHelper.linkifier().maybeLinkifyConsoleCallFrame(target, topFrame);
      if (link) {
        stack.createChild('span').textContent = ' @ ';
        stack.createChild('span').appendChild(link);
      }
    }

    return title;
  }

  /**
   * @override
   */
  onpopulate() {
    var content = createElementWithClass('div', 'content');

    var first = this._invalidations[0];
    if (first.cause.stackTrace) {
      var stack = content.createChild('div');
      stack.createTextChild(Common.UIString('Stack trace:'));
      this._contentHelper.createChildStackTraceElement(
          stack, Timeline.TimelineUIUtils._stackTraceFromCallFrames(first.cause.stackTrace));
    }

    content.createTextChild(this._invalidations.length > 1 ? Common.UIString('Nodes:') : Common.UIString('Node:'));
    var nodeList = content.createChild('div', 'node-list');
    var firstNode = true;
    for (var i = 0; i < this._invalidations.length; i++) {
      var invalidation = this._invalidations[i];
      var invalidationNode = this._createInvalidationNode(invalidation, true);
      if (invalidationNode) {
        if (!firstNode)
          nodeList.createTextChild(Common.UIString(', '));
        firstNode = false;

        nodeList.appendChild(invalidationNode);

        var extraData = invalidation.extraData ? ', ' + invalidation.extraData : '';
        if (invalidation.changedId) {
          nodeList.createTextChild(Common.UIString('(changed id to "%s"%s)', invalidation.changedId, extraData));
        } else if (invalidation.changedClass) {
          nodeList.createTextChild(Common.UIString('(changed class to "%s"%s)', invalidation.changedClass, extraData));
        } else if (invalidation.changedAttribute) {
          nodeList.createTextChild(
              Common.UIString('(changed attribute to "%s"%s)', invalidation.changedAttribute, extraData));
        } else if (invalidation.changedPseudo) {
          nodeList.createTextChild(
              Common.UIString('(changed pesudo to "%s"%s)', invalidation.changedPseudo, extraData));
        } else if (invalidation.selectorPart) {
          nodeList.createTextChild(Common.UIString('(changed "%s"%s)', invalidation.selectorPart, extraData));
        }
      }
    }

    var contentTreeElement = new UI.TreeElement(content, false);
    contentTreeElement.selectable = false;
    this.appendChild(contentTreeElement);
  }

  /**
   * @param {!Element} parentElement
   * @param {!Array.<!TimelineModel.InvalidationTrackingEvent>} invalidations
   */
  _appendTruncatedNodeList(parentElement, invalidations) {
    var invalidationNodes = [];
    var invalidationNodeIdMap = {};
    for (var i = 0; i < invalidations.length; i++) {
      var invalidation = invalidations[i];
      var invalidationNode = this._createInvalidationNode(invalidation, false);
      invalidationNode.addEventListener('click', e => e.consume(), false);
      if (invalidationNode && !invalidationNodeIdMap[invalidation.nodeId]) {
        invalidationNodes.push(invalidationNode);
        invalidationNodeIdMap[invalidation.nodeId] = true;
      }
    }

    if (invalidationNodes.length === 1) {
      parentElement.appendChild(invalidationNodes[0]);
    } else if (invalidationNodes.length === 2) {
      parentElement.appendChild(invalidationNodes[0]);
      parentElement.createTextChild(Common.UIString(' and '));
      parentElement.appendChild(invalidationNodes[1]);
    } else if (invalidationNodes.length >= 3) {
      parentElement.appendChild(invalidationNodes[0]);
      parentElement.createTextChild(Common.UIString(', '));
      parentElement.appendChild(invalidationNodes[1]);
      parentElement.createTextChild(Common.UIString(', and %s others', invalidationNodes.length - 2));
    }
  }

  /**
   * @param {!TimelineModel.InvalidationTrackingEvent} invalidation
   * @param {boolean} showUnknownNodes
   */
  _createInvalidationNode(invalidation, showUnknownNodes) {
    var node = (invalidation.nodeId && this._relatedNodesMap) ? this._relatedNodesMap.get(invalidation.nodeId) : null;
    if (node)
      return Components.DOMPresentationUtils.linkifyNodeReference(node);
    if (invalidation.nodeName) {
      var nodeSpan = createElement('span');
      nodeSpan.textContent = Common.UIString('[ %s ]', invalidation.nodeName);
      return nodeSpan;
    }
    if (showUnknownNodes) {
      var nodeSpan = createElement('span');
      return nodeSpan.createTextChild(Common.UIString('[ unknown node ]'));
    }
  }
};

Timeline.TimelineUIUtils._previewElementSymbol = Symbol('previewElement');

/**
 * @unrestricted
 */
Timeline.TimelineUIUtils.EventDispatchTypeDescriptor = class {
  /**
   * @param {number} priority
   * @param {string} color
   * @param {!Array.<string>} eventTypes
   */
  constructor(priority, color, eventTypes) {
    this.priority = priority;
    this.color = color;
    this.eventTypes = eventTypes;
  }
};


/**
 * @unrestricted
 */
Timeline.TimelineCategory = class extends Common.Object {
  /**
   * @param {string} name
   * @param {string} title
   * @param {boolean} visible
   * @param {string} childColor
   * @param {string} color
   */
  constructor(name, title, visible, childColor, color) {
    super();
    this.name = name;
    this.title = title;
    this.visible = visible;
    this.childColor = childColor;
    this.color = color;
    this.hidden = false;
  }

  /**
   * @return {boolean}
   */
  get hidden() {
    return this._hidden;
  }

  /**
   * @param {boolean} hidden
   */
  set hidden(hidden) {
    this._hidden = hidden;
    this.dispatchEventToListeners(Timeline.TimelineCategory.Events.VisibilityChanged, this);
  }
};

/** @enum {symbol} */
Timeline.TimelineCategory.Events = {
  VisibilityChanged: Symbol('VisibilityChanged')
};

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
Timeline.TimelineMarkerStyle;


/**
 * @unrestricted
 */
Timeline.TimelinePopupContentHelper = class {
  /**
   * @param {string} title
   */
  constructor(title) {
    this._contentTable = createElement('table');
    var titleCell = this._createCell(Common.UIString('%s - Details', title), 'timeline-details-title');
    titleCell.colSpan = 2;
    var titleRow = createElement('tr');
    titleRow.appendChild(titleCell);
    this._contentTable.appendChild(titleRow);
  }

  /**
   * @return {!Element}
   */
  contentTable() {
    return this._contentTable;
  }

  /**
   * @param {string|number} content
   * @param {string=} styleName
   */
  _createCell(content, styleName) {
    var text = createElement('label');
    text.createTextChild(String(content));
    var cell = createElement('td');
    cell.className = 'timeline-details';
    if (styleName)
      cell.className += ' ' + styleName;
    cell.textContent = content;
    return cell;
  }

  /**
   * @param {string} title
   * @param {string|number} content
   */
  appendTextRow(title, content) {
    var row = createElement('tr');
    row.appendChild(this._createCell(title, 'timeline-details-row-title'));
    row.appendChild(this._createCell(content, 'timeline-details-row-data'));
    this._contentTable.appendChild(row);
  }

  /**
   * @param {string} title
   * @param {!Node|string} content
   */
  appendElementRow(title, content) {
    var row = createElement('tr');
    var titleCell = this._createCell(title, 'timeline-details-row-title');
    row.appendChild(titleCell);
    var cell = createElement('td');
    cell.className = 'details';
    if (content instanceof Node)
      cell.appendChild(content);
    else
      cell.createTextChild(content || '');
    row.appendChild(cell);
    this._contentTable.appendChild(row);
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineDetailsContentHelper = class {
  /**
   * @param {?SDK.Target} target
   * @param {?Components.Linkifier} linkifier
   */
  constructor(target, linkifier) {
    this.fragment = createDocumentFragment();

    this._linkifier = linkifier;
    this._target = target;

    this.element = createElementWithClass('div', 'timeline-details-view-block');
    this._tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
    this.fragment.appendChild(this.element);
  }

  /**
   * @param {string} title
   * @param {string=} swatchColor
   */
  addSection(title, swatchColor) {
    if (!this._tableElement.hasChildNodes()) {
      this.element.removeChildren();
    } else {
      this.element = createElementWithClass('div', 'timeline-details-view-block');
      this.fragment.appendChild(this.element);
    }

    if (title) {
      var titleElement = this.element.createChild('div', 'timeline-details-chip-title');
      if (swatchColor)
        titleElement.createChild('div').style.backgroundColor = swatchColor;
      titleElement.createTextChild(title);
    }

    this._tableElement = this.element.createChild('div', 'vbox timeline-details-chip-body');
    this.fragment.appendChild(this.element);
  }

  /**
   * @return {?Components.Linkifier}
   */
  linkifier() {
    return this._linkifier;
  }

  /**
   * @param {string} title
   * @param {string|number|boolean} value
   */
  appendTextRow(title, value) {
    var rowElement = this._tableElement.createChild('div', 'timeline-details-view-row');
    rowElement.createChild('div', 'timeline-details-view-row-title').textContent = title;
    rowElement.createChild('div', 'timeline-details-view-row-value').textContent = value;
  }

  /**
   * @param {string} title
   * @param {!Node|string} content
   * @param {boolean=} isWarning
   * @param {boolean=} isStacked
   */
  appendElementRow(title, content, isWarning, isStacked) {
    var rowElement = this._tableElement.createChild('div', 'timeline-details-view-row');
    if (isWarning)
      rowElement.classList.add('timeline-details-warning');
    if (isStacked)
      rowElement.classList.add('timeline-details-stack-values');
    var titleElement = rowElement.createChild('div', 'timeline-details-view-row-title');
    titleElement.textContent = title;
    var valueElement = rowElement.createChild('div', 'timeline-details-view-row-value');
    if (content instanceof Node)
      valueElement.appendChild(content);
    else
      valueElement.createTextChild(content || '');
  }

  /**
   * @param {string} title
   * @param {string} url
   * @param {number} startLine
   * @param {number=} startColumn
   */
  appendLocationRow(title, url, startLine, startColumn) {
    if (!this._linkifier || !this._target)
      return;
    var link = this._linkifier.maybeLinkifyScriptLocation(this._target, null, url, startLine, startColumn);
    if (!link)
      return;
    this.appendElementRow(title, link);
  }

  /**
   * @param {string} title
   * @param {string} url
   * @param {number} startLine
   * @param {number=} endLine
   */
  appendLocationRange(title, url, startLine, endLine) {
    if (!this._linkifier || !this._target)
      return;
    var locationContent = createElement('span');
    var link = this._linkifier.maybeLinkifyScriptLocation(this._target, null, url, startLine);
    if (!link)
      return;
    locationContent.appendChild(link);
    locationContent.createTextChild(String.sprintf(' [%s\u2026%s]', startLine + 1, endLine + 1 || ''));
    this.appendElementRow(title, locationContent);
  }

  /**
   * @param {string} title
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   */
  appendStackTrace(title, stackTrace) {
    if (!this._linkifier || !this._target)
      return;

    var rowElement = this._tableElement.createChild('div', 'timeline-details-view-row');
    rowElement.createChild('div', 'timeline-details-view-row-title').textContent = title;
    this.createChildStackTraceElement(rowElement, stackTrace);
  }

  /**
   * @param {!Element} parentElement
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   */
  createChildStackTraceElement(parentElement, stackTrace) {
    if (!this._linkifier || !this._target)
      return;
    parentElement.classList.add('timeline-details-stack-values');
    var stackTraceElement =
        parentElement.createChild('div', 'timeline-details-view-row-value timeline-details-view-row-stack-trace');
    var callFrameElem =
        Components.DOMPresentationUtils.buildStackTracePreviewContents(this._target, this._linkifier, stackTrace);
    stackTraceElement.appendChild(callFrameElem);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {string=} warningType
   */
  appendWarningRow(event, warningType) {
    var warning = Timeline.TimelineUIUtils.eventWarning(event, warningType);
    if (warning)
      this.appendElementRow(Common.UIString('Warning'), warning, true);
  }
};

Timeline.TimelineUIUtils._categoryBreakdownCacheSymbol = Symbol('categoryBreakdownCache');
