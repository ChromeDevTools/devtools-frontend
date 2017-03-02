// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

TimelineModel.TimelineJSProfileProcessor = class {
  /**
   * @param {!SDK.CPUProfileDataModel} jsProfileModel
   * @param {!SDK.TracingModel.Thread} thread
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  static generateTracingEventsFromCpuProfile(jsProfileModel, thread) {
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;
    var gcNode = jsProfileModel.gcNode;
    var samples = jsProfileModel.samples;
    var timestamps = jsProfileModel.timestamps;
    var jsEvents = [];
    /** @type {!Map<!Object, !Array<!Protocol.Runtime.CallFrame>>} */
    var nodeToStackMap = new Map();
    nodeToStackMap.set(programNode, []);
    for (var i = 0; i < samples.length; ++i) {
      var node = jsProfileModel.nodeByIndex(i);
      if (!node) {
        console.error(`Node with unknown id ${samples[i]} at index ${i}`);
        continue;
      }
      if (node === gcNode || node === idleNode)
        continue;
      var callFrames = nodeToStackMap.get(node);
      if (!callFrames) {
        callFrames = /** @type {!Array<!Protocol.Runtime.CallFrame>} */ (new Array(node.depth + 1));
        nodeToStackMap.set(node, callFrames);
        for (var j = 0; node.parent; node = node.parent)
          callFrames[j++] = /** @type {!Protocol.Runtime.CallFrame} */ (node);
      }
      var jsSampleEvent = new SDK.TracingModel.Event(
          SDK.TracingModel.DevToolsTimelineEventCategory, TimelineModel.TimelineModel.RecordType.JSSample,
          SDK.TracingModel.Phase.Instant, timestamps[i], thread);
      jsSampleEvent.args['data'] = {stackTrace: callFrames};
      jsEvents.push(jsSampleEvent);
    }
    return jsEvents;
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  static generateJSFrameEvents(events) {
    /**
     * @param {!Protocol.Runtime.CallFrame} frame1
     * @param {!Protocol.Runtime.CallFrame} frame2
     * @return {boolean}
     */
    function equalFrames(frame1, frame2) {
      return frame1.scriptId === frame2.scriptId &&
             frame1.functionName === frame2.functionName &&
             frame1.lineNumber === frame2.lineNumber;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     * @return {boolean}
     */
    function isJSInvocationEvent(e) {
      switch (e.name) {
        case TimelineModel.TimelineModel.RecordType.RunMicrotasks:
        case TimelineModel.TimelineModel.RecordType.FunctionCall:
        case TimelineModel.TimelineModel.RecordType.EvaluateScript:
        case TimelineModel.TimelineModel.RecordType.EventDispatch:
          return true;
      }
      return false;
    }

    var jsFrameEvents = [];
    var jsFramesStack = [];
    var lockedJsStackDepth = [];
    var ordinal = 0;
    const showAllEvents = Runtime.experiments.isEnabled('timelineShowAllEvents');
    const showRuntimeCallStats = Runtime.experiments.isEnabled('timelineV8RuntimeCallStats');
    const showNativeFunctions = Common.moduleSetting('showNativeFunctionsInJSProfile').get();

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      e.ordinal = ++ordinal;
      extractStackTrace(e);
      // For the duration of the event we cannot go beyond the stack associated with it.
      lockedJsStackDepth.push(jsFramesStack.length);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     * @param {?SDK.TracingModel.Event} parent
     */
    function onInstantEvent(e, parent) {
      e.ordinal = ++ordinal;
      if (parent && isJSInvocationEvent(parent))
        extractStackTrace(e);
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      truncateJSStack(lockedJsStackDepth.pop(), e.endTime);
    }

    /**
     * @param {number} depth
     * @param {number} time
     */
    function truncateJSStack(depth, time) {
      if (lockedJsStackDepth.length) {
        var lockedDepth = lockedJsStackDepth.peekLast();
        if (depth < lockedDepth) {
          console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
          depth = lockedDepth;
        }
      }
      if (jsFramesStack.length < depth) {
        console.error(`Trying to truncate higher than the current stack size at ${time}`);
        depth = jsFramesStack.length;
      }
      for (var k = 0; k < jsFramesStack.length; ++k)
        jsFramesStack[k].setEndTime(time);
      jsFramesStack.length = depth;
    }

    /**
     * @param {string} name
     * @return {boolean}
     */
    function showNativeName(name) {
      return showRuntimeCallStats && !!TimelineModel.TimelineJSProfileProcessor.nativeGroup(name);
    }

    /**
     * @param {!Array<!Protocol.Runtime.CallFrame>} stack
     */
    function filterStackFrames(stack) {
      if (showAllEvents)
        return;
      var isPreviousFrameNative = false;
      for (var i = 0, j = 0; i < stack.length; ++i) {
        const frame = stack[i];
        const url = frame.url;
        const isNativeFrame = url && url.startsWith('native ');
        if (!showNativeFunctions && isNativeFrame)
          continue;
        if (TimelineModel.TimelineJSProfileProcessor.isNativeRuntimeFrame(frame) && !showNativeName(frame.functionName))
          continue;
        if (isPreviousFrameNative && isNativeFrame)
          continue;
        isPreviousFrameNative = isNativeFrame;
        stack[j++] = frame;
      }
      stack.length = j;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function extractStackTrace(e) {
      const recordTypes = TimelineModel.TimelineModel.RecordType;
      /** @type {!Array<!Protocol.Runtime.CallFrame>} */
      const callFrames = e.name === recordTypes.JSSample ? e.args['data']['stackTrace'].slice().reverse() :
                                                           jsFramesStack.map(frameEvent => frameEvent.args['data']);
      filterStackFrames(callFrames);
      const endTime = e.endTime || e.startTime;
      const minFrames = Math.min(callFrames.length, jsFramesStack.length);
      var i;
      for (i = lockedJsStackDepth.peekLast() || 0; i < minFrames; ++i) {
        const newFrame = callFrames[i];
        const oldFrame = jsFramesStack[i].args['data'];
        if (!equalFrames(newFrame, oldFrame))
          break;
        jsFramesStack[i].setEndTime(Math.max(jsFramesStack[i].endTime, endTime));
      }
      truncateJSStack(i, e.startTime);
      for (; i < callFrames.length; ++i) {
        const frame = callFrames[i];
        const jsFrameEvent = new SDK.TracingModel.Event(
            SDK.TracingModel.DevToolsTimelineEventCategory, recordTypes.JSFrame, SDK.TracingModel.Phase.Complete,
            e.startTime, e.thread);
        jsFrameEvent.ordinal = e.ordinal;
        jsFrameEvent.addArgs({data: frame});
        jsFrameEvent.setEndTime(endTime);
        jsFramesStack.push(jsFrameEvent);
        jsFrameEvents.push(jsFrameEvent);
      }
    }

    const firstTopLevelEvent = events.find(SDK.TracingModel.isTopLevelEvent);
    if (firstTopLevelEvent) {
      TimelineModel.TimelineModel.forEachEvent(
          events, onStartEvent, onEndEvent, onInstantEvent, firstTopLevelEvent.startTime);
    }
    return jsFrameEvents;
  }

  /**
   * @param {!Protocol.Runtime.CallFrame} frame
   * @return {boolean}
   */
  static isNativeRuntimeFrame(frame) {
    return frame.url === 'native V8Runtime';
  }

  /**
   * @param {string} nativeName
   * @return {?TimelineModel.TimelineJSProfileProcessor.NativeGroups}
   */
  static nativeGroup(nativeName) {
    var map = TimelineModel.TimelineJSProfileProcessor.nativeGroup._map;
    if (!map) {
      const nativeGroups = TimelineModel.TimelineJSProfileProcessor.NativeGroups;
      map = new Map([
        ['Compile', nativeGroups.Compile], ['CompileCode', nativeGroups.Compile],
        ['CompileCodeLazy', nativeGroups.Compile], ['CompileDeserialize', nativeGroups.Compile],
        ['CompileEval', nativeGroups.Compile], ['CompileFullCode', nativeGroups.Compile],
        ['CompileIgnition', nativeGroups.Compile], ['CompilerDispatcher', nativeGroups.Compile],
        ['CompileSerialize', nativeGroups.Compile], ['ParseProgram', nativeGroups.Parse],
        ['ParseFunction', nativeGroups.Parse], ['RecompileConcurrent', nativeGroups.Compile],
        ['RecompileSynchronous', nativeGroups.Compile], ['ParseLazy', nativeGroups.Parse]
      ]);
      /** @type {!Map<string, !TimelineModel.TimelineJSProfileProcessor.NativeGroups>} */
      TimelineModel.TimelineJSProfileProcessor.nativeGroup._map = map;
    }
    return map.get(nativeName) || null;
  }

  /**
   * @param {*} profile
   * @return {!Array<!SDK.TracingManager.EventPayload>}
   */
  static buildTraceProfileFromCpuProfile(profile) {
    if (!profile)
      return [];
    var events = [];
    appendEvent('TracingStartedInPage', {'sessionId': '1'}, 0, 0, 'M');
    var idToNode = new Map();
    var nodes = profile['nodes'];
    for (var i = 0; i < nodes.length; ++i)
      idToNode.set(nodes[i].id, nodes[i]);
    var programEvent = null;
    var functionEvent = null;
    var nextTime = profile.startTime;
    var currentTime;
    var samples = profile['samples'];
    var timeDeltas = profile['timeDeltas'];
    for (var i = 0; i < samples.length; ++i) {
      currentTime = nextTime;
      nextTime += timeDeltas[i];
      var node = idToNode.get(samples[i]);
      var name = node.callFrame.functionName;
      if (name === '(idle)') {
        closeEvents();
        continue;
      }
      if (!programEvent)
        programEvent = appendEvent('MessageLoop::RunTask', {}, currentTime, 0, 'X', 'toplevel');
      if (name === '(program)') {
        if (functionEvent) {
          functionEvent.dur = currentTime - functionEvent.ts;
          functionEvent = null;
        }
      } else {
        // A JS function.
        if (!functionEvent)
          functionEvent = appendEvent('FunctionCall', {'sessionId': '1'}, currentTime);
      }
    }
    closeEvents();
    appendEvent('CpuProfile', {'cpuProfile': profile}, profile.endTime, 0, 'I');
    return events;

    function closeEvents() {
      if (programEvent)
        programEvent.dur = currentTime - programEvent.ts;
      if (functionEvent)
        functionEvent.dur = currentTime - functionEvent.ts;
      programEvent = null;
      functionEvent = null;
    }

    /**
     * @param {string} name
     * @param {*} data
     * @param {number} ts
     * @param {number=} dur
     * @param {string=} ph
     * @param {string=} cat
     * @return {!SDK.TracingManager.EventPayload}
     */
    function appendEvent(name, data, ts, dur, ph, cat) {
      var event = /** @type {!SDK.TracingManager.EventPayload} */ ({
        cat: cat || 'disabled-by-default-devtools.timeline',
        name: name,
        ph: ph || 'X',
        pid: 1,
        tid: 1,
        ts: ts,
        args: {data: data}
      });
      if (dur)
        event.dur = dur;
      events.push(event);
      return event;
    }
  }
};

/** @enum {string} */
TimelineModel.TimelineJSProfileProcessor.NativeGroups = {
  'Compile': 'Compile',
  'Parse': 'Parse'
};
