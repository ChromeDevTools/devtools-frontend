// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

import {RecordType, TimelineModelImpl} from './TimelineModel.js';

export const UIStrings = {
  /**
  *@description Text for the name of a thread of the page
  *@example {1} PH1
  */
  threadS: 'Thread {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('timeline_model/TimelineJSProfile.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineJSProfileProcessor {
  /**
   * @param {!SDK.CPUProfileDataModel.CPUProfileDataModel} jsProfileModel
   * @param {!SDK.TracingModel.Thread} thread
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  static generateTracingEventsFromCpuProfile(jsProfileModel, thread) {
    const idleNode = jsProfileModel.idleNode;
    const programNode = jsProfileModel.programNode || null;
    const gcNode = jsProfileModel.gcNode;
    const samples = jsProfileModel.samples || [];
    const timestamps = jsProfileModel.timestamps;
    const jsEvents = [];
    /** @type {!Map<?Object, !Array<!Protocol.Runtime.CallFrame>>} */
    const nodeToStackMap = new Map();
    nodeToStackMap.set(programNode, []);
    for (let i = 0; i < samples.length; ++i) {
      /** @type {?SDK.ProfileTreeModel.ProfileNode} */
      let node = jsProfileModel.nodeByIndex(i);
      if (!node) {
        console.error(`Node with unknown id ${samples[i]} at index ${i}`);
        continue;
      }
      if (node === gcNode || node === idleNode) {
        continue;
      }
      let callFrames = nodeToStackMap.get(node);
      if (!callFrames) {
        callFrames = /** @type {!Array<!Protocol.Runtime.CallFrame>} */ (new Array(node.depth + 1));
        nodeToStackMap.set(node, callFrames);
        for (let j = 0; node.parent; node = node.parent) {
          callFrames[j++] = /** @type {!Protocol.Runtime.CallFrame} */ (node);
        }
      }
      const jsSampleEvent = new SDK.TracingModel.Event(
          SDK.TracingModel.DevToolsTimelineEventCategory, RecordType.JSSample, SDK.TracingModel.Phase.Instant,
          timestamps[i], thread);
      jsSampleEvent.args['data'] = {stackTrace: callFrames};
      jsEvents.push(jsSampleEvent);
    }
    return jsEvents;
  }

  /**
   * @param {!Array<!SDK.TracingModel.Event>} events
   * @param {{showAllEvents: boolean,
   *          showRuntimeCallStats: boolean,
   *          showNativeFunctions: boolean}} config
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  static generateJSFrameEvents(events, config) {
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
        case RecordType.RunMicrotasks:
        case RecordType.FunctionCall:
        case RecordType.EvaluateScript:
        case RecordType.EvaluateModule:
        case RecordType.EventDispatch:
        case RecordType.V8Execute:
          return true;
      }
      return false;
    }

    /** @type {!Array<!SDK.TracingModel.Event>} */
    const jsFrameEvents = [];
    /** @type {!Array<!SDK.TracingModel.Event>} */
    const jsFramesStack = [];
    /** @type {!Array<number>} */
    const lockedJsStackDepth = [];
    let ordinal = 0;
    let fakeJSInvocation = false;
    const {showAllEvents, showRuntimeCallStats, showNativeFunctions} = config;

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onStartEvent(e) {
      if (fakeJSInvocation) {
        truncateJSStack(/** @type {number} */ (lockedJsStackDepth.pop()), e.startTime);
        fakeJSInvocation = false;
      }
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
      if ((parent && isJSInvocationEvent(parent)) || fakeJSInvocation) {
        extractStackTrace(e);
      } else if (e.name === RecordType.JSSample && jsFramesStack.length === 0) {
        // Force JS Samples to show up even if we are not inside a JS invocation event, because we
        // can be missing the start of JS invocation events if we start tracing half-way through.
        // Pretend we have a top-level JS invocation event.
        fakeJSInvocation = true;
        const stackDepthBefore = jsFramesStack.length;
        extractStackTrace(e);
        lockedJsStackDepth.push(stackDepthBefore);
      }
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function onEndEvent(e) {
      truncateJSStack(/** @type {number} */ (lockedJsStackDepth.pop()), /** @type {number} */ (e.endTime));
    }

    /**
     * @param {number} depth
     * @param {number} time
     */
    function truncateJSStack(depth, time) {
      if (lockedJsStackDepth.length) {
        const lockedDepth = /** @type {number}*/ (lockedJsStackDepth[lockedJsStackDepth.length - 1]);
        if (depth < lockedDepth) {
          console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
          depth = lockedDepth;
        }
      }
      if (jsFramesStack.length < depth) {
        console.error(`Trying to truncate higher than the current stack size at ${time}`);
        depth = jsFramesStack.length;
      }
      for (let k = 0; k < jsFramesStack.length; ++k) {
        jsFramesStack[k].setEndTime(time);
      }
      jsFramesStack.length = depth;
    }

    /**
     * @param {string} name
     * @return {boolean}
     */
    function showNativeName(name) {
      return showRuntimeCallStats && Boolean(TimelineJSProfileProcessor.nativeGroup(name));
    }

    /**
     * @param {!Array<!Protocol.Runtime.CallFrame>} stack
     */
    function filterStackFrames(stack) {
      if (showAllEvents) {
        return;
      }
      let previousNativeFrameName = null;
      let j = 0;
      for (let i = 0; i < stack.length; ++i) {
        const frame = stack[i];
        const url = frame.url;
        const isNativeFrame = url && url.startsWith('native ');
        if (!showNativeFunctions && isNativeFrame) {
          continue;
        }
        const isNativeRuntimeFrame = TimelineJSProfileProcessor.isNativeRuntimeFrame(frame);
        if (isNativeRuntimeFrame && !showNativeName(frame.functionName)) {
          continue;
        }
        const nativeFrameName =
            isNativeRuntimeFrame ? TimelineJSProfileProcessor.nativeGroup(frame.functionName) : null;
        if (previousNativeFrameName && previousNativeFrameName === nativeFrameName) {
          continue;
        }
        previousNativeFrameName = nativeFrameName;
        stack[j++] = frame;
      }
      stack.length = j;
    }

    /**
     * @param {!SDK.TracingModel.Event} e
     */
    function extractStackTrace(e) {
      const recordTypes = RecordType;
      /** @type {!Array<!Protocol.Runtime.CallFrame>} */
      const callFrames = e.name === recordTypes.JSSample ? e.args['data']['stackTrace'].slice().reverse() :
                                                           jsFramesStack.map(frameEvent => frameEvent.args['data']);
      filterStackFrames(callFrames);
      const endTime = e.endTime || e.startTime;
      const minFrames = Math.min(callFrames.length, jsFramesStack.length);
      let i;
      for (i = lockedJsStackDepth[lockedJsStackDepth.length - 1] || 0; i < minFrames; ++i) {
        const newFrame = callFrames[i];
        const oldFrame = jsFramesStack[i].args['data'];
        if (!equalFrames(newFrame, oldFrame)) {
          break;
        }
        jsFramesStack[i].setEndTime(Math.max(/** @type {number} */ (jsFramesStack[i].endTime), endTime));
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

    const firstTopLevelEvent = events.find(SDK.TracingModel.TracingModel.isTopLevelEvent);
    const startTime = firstTopLevelEvent ? firstTopLevelEvent.startTime : 0;
    TimelineModelImpl.forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent, startTime);
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
   * @return {?TimelineJSProfileProcessor.NativeGroups}
   */
  static nativeGroup(nativeName) {
    if (nativeName.startsWith('Parse')) {
      return TimelineJSProfileProcessor.NativeGroups.Parse;
    }
    if (nativeName.startsWith('Compile') || nativeName.startsWith('Recompile')) {
      return TimelineJSProfileProcessor.NativeGroups.Compile;
    }
    return null;
  }

  /**
   * @param {*} profile
   * @param {number} tid
   * @param {boolean} injectPageEvent
   * @param {?string=} name
   * @return {!Array<!SDK.TracingManager.EventPayload>}
   */
  static buildTraceProfileFromCpuProfile(profile, tid, injectPageEvent, name) {
    /** @type {!Array<!SDK.TracingManager.EventPayload>}} */
    const events = [];
    if (injectPageEvent) {
      appendEvent('TracingStartedInPage', {data: {'sessionId': '1'}}, 0, 0, 'M');
    }
    if (!name) {
      name = i18nString(UIStrings.threadS, {PH1: tid});
    }
    appendEvent(SDK.TracingModel.MetadataEvent.ThreadName, {name}, 0, 0, 'M', '__metadata');
    if (!profile) {
      return events;
    }
    const idToNode = new Map();
    const nodes = profile['nodes'];
    for (let i = 0; i < nodes.length; ++i) {
      idToNode.set(nodes[i].id, nodes[i]);
    }
    /** @type {?SDK.TracingManager.EventPayload} */
    let programEvent = null;
    /** @type {?SDK.TracingManager.EventPayload} */
    let functionEvent = null;
    /** @type {number} */
    let nextTime = profile.startTime;
    let currentTime = 0;
    const samples = profile['samples'];
    const timeDeltas = profile['timeDeltas'];
    for (let i = 0; i < samples.length; ++i) {
      currentTime = nextTime;
      nextTime += timeDeltas[i];
      const node = idToNode.get(samples[i]);
      const name = node.callFrame.functionName;
      if (name === '(idle)') {
        closeEvents();
        continue;
      }
      if (!programEvent) {
        programEvent = appendEvent('MessageLoop::RunTask', {}, currentTime, 0, 'X', 'toplevel');
      }
      if (name === '(program)') {
        if (functionEvent) {
          functionEvent.dur = currentTime - functionEvent.ts;
          functionEvent = null;
        }
      } else {
        // A JS function.
        if (!functionEvent) {
          functionEvent = appendEvent('FunctionCall', {data: {'sessionId': '1'}}, currentTime);
        }
      }
    }
    closeEvents();
    appendEvent('CpuProfile', {data: {'cpuProfile': profile}}, profile.endTime, 0, 'I');
    return events;

    function closeEvents() {
      if (programEvent) {
        programEvent.dur = currentTime - programEvent.ts;
      }
      if (functionEvent) {
        functionEvent.dur = currentTime - functionEvent.ts;
      }
      programEvent = null;
      functionEvent = null;
    }

    /**
     * @param {string} name
     * @param {*} args
     * @param {number} ts
     * @param {number=} dur
     * @param {string=} ph
     * @param {string=} cat
     * @return {!SDK.TracingManager.EventPayload}
     */
    function appendEvent(name, args, ts, dur, ph, cat) {
      const event = /** @type {!SDK.TracingManager.EventPayload} */ (
          {cat: cat || 'disabled-by-default-devtools.timeline', name, ph: ph || 'X', pid: 1, tid, ts, args});
      if (dur) {
        event.dur = dur;
      }
      events.push(event);
      return event;
    }
  }
}

/** @enum {string} */
TimelineJSProfileProcessor.NativeGroups = {
  'Compile': 'Compile',
  'Parse': 'Parse'
};
