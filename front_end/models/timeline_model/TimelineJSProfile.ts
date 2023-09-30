// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as CPUProfile from '../cpu_profile/cpu_profile.js';
import * as TraceEngine from '../trace/trace.js';

import {RecordType, TimelineModelImpl} from './TimelineModel.js';

const UIStrings = {
  /**
   *@description Text for the name of a thread of the page
   *@example {1} PH1
   */
  threadS: 'Thread {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('models/timeline_model/TimelineJSProfile.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineJSProfileProcessor {
  /**
   * Creates a synthetic instant trace event for each sample in a
   * profile.
   * Each sample contains its stack trace under its args.data property.
   * The stack trace is extracted from a CPUProfileModel instance
   * which contains the call hierarchy.
   */
  static generateConstructedEventsFromCpuProfileDataModel(
      jsProfileModel: CPUProfile.CPUProfileDataModel.CPUProfileDataModel,
      thread: TraceEngine.Legacy.Thread): TraceEngine.Legacy.Event[] {
    const samples = jsProfileModel.samples || [];
    const timestamps = jsProfileModel.timestamps;
    const jsEvents = [];
    const nodeToStackMap = new Map<CPUProfile.ProfileTreeModel.ProfileNode|null, Protocol.Runtime.CallFrame[]>();

    let prevNode: CPUProfile.ProfileTreeModel.ProfileNode = jsProfileModel.root;
    let prevCallFrames: Protocol.Runtime.CallFrame[] = [];
    // Adds call stacks to fake trace events using the tree in CPUProfileDataModel
    for (let i = 0; i < samples.length; ++i) {
      const node: CPUProfile.ProfileTreeModel.ProfileNode|null = jsProfileModel.nodeByIndex(i);
      if (!node) {
        console.error(`Node with unknown id ${samples[i]} at index ${i}`);
        continue;
      }
      let callFrames;
      if (node === jsProfileModel.gcNode) {
        if (prevNode === jsProfileModel.gcNode) {
          // If the last recorded sample is also GC sample, we just use the same call frames.
          callFrames = prevCallFrames;
        } else {
          // GC samples have no stack, so we just put GC node on top of the last recorded sample.
          callFrames = [(node as Protocol.Runtime.CallFrame), ...prevCallFrames];
        }
      } else {
        // For non Garbage Collection nodes, we just use its own call frames.
        callFrames = nodeToStackMap.get(node);
        if (!callFrames) {
          callFrames = new Array(node.depth + 1) as Protocol.Runtime.CallFrame[];
          nodeToStackMap.set(node, callFrames);
          let currentNode = node;
          for (let j = 0; currentNode.parent; currentNode = currentNode.parent) {
            callFrames[j++] = (currentNode as Protocol.Runtime.CallFrame);
          }
        }
      }

      const name = node === jsProfileModel.idleNode                             ? RecordType.JSIdleSample :
          node === jsProfileModel.programNode || node === jsProfileModel.gcNode ? RecordType.JSSystemSample :
                                                                                  RecordType.JSSample;

      const jsSampleEvent = new TraceEngine.Legacy.ConstructedEvent(
          TraceEngine.Legacy.DevToolsTimelineEventCategory, name, TraceEngine.Types.TraceEvents.Phase.INSTANT,
          timestamps[i], thread);
      jsSampleEvent.args['data'] = {stackTrace: callFrames};
      jsEvents.push(jsSampleEvent);

      prevNode = node;
      prevCallFrames = callFrames;
    }
    return jsEvents;
  }

  static isJSSampleEvent(e: TraceEngine.Legacy.Event): boolean {
    return e.name === RecordType.JSSample || e.name === RecordType.JSSystemSample || e.name === RecordType.JSIdleSample;
  }

  /**
   * Creates the full call hierarchy, with durations, composed of trace
   * events and JavaScript function calls.
   *
   * Because JavaScript profiles come in the shape of samples with no
   * duration, JS function call durations are deduced using the timings
   * of subsequent equal samples and surrounding trace events.
   *
   * @param events merged ordered array of trace events and synthetic
   * "instant" events representing samples.
   * @param config flags to customize the shown events.
   * @returns the input event array with the new synthetic events
   * representing call frames.
   */
  static generateJSFrameEvents(events: TraceEngine.Legacy.Event[], config: {
    showAllEvents: boolean,
    showRuntimeCallStats: boolean,
    isDataOriginCpuProfile: boolean,
  }): TraceEngine.Legacy.Event[] {
    function equalFrames(frame1: Protocol.Runtime.CallFrame, frame2: Protocol.Runtime.CallFrame): boolean {
      return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName &&
          frame1.lineNumber === frame2.lineNumber;
    }

    function isJSInvocationEvent(e: TraceEngine.Legacy.Event): boolean {
      switch (e.name) {
        case RecordType.RunMicrotasks:
        case RecordType.FunctionCall:
        case RecordType.EvaluateScript:
        case RecordType.EvaluateModule:
        case RecordType.EventDispatch:
        case RecordType.V8Execute:
          return true;
      }
      // Also consider any new v8 trace events. (eg 'V8.RunMicrotasks' and 'v8.run')
      if (e.name.startsWith('v8') || e.name.startsWith('V8')) {
        return true;
      }
      return false;
    }

    const isDataOriginCpuProfile = config.isDataOriginCpuProfile;
    const jsFrameEvents: TraceEngine.Legacy.Event[] = [];
    const jsFramesStack: TraceEngine.Legacy.Event[] = [];
    let lockedJsStackDepth: number[] = [];
    let ordinal = 0;
    /**
     * `isJSInvocationEvent()` relies on an allowlist of invocation events that will parent JSFrames.
     * However in some situations (workers), we don't have those trace events.
     * "fake" JSInvocations are created when we have active JSSamples but seemingly no explicit invocation.
     */
    let fakeJSInvocation = false;
    const {showAllEvents, showRuntimeCallStats} = config;

    /**
     * JSSamples are instant events, so any start events are not the samples.
     * We expect they'll either be trace events happening within JS (eg forced layout),
     * or, in the fakeJSInvocation case, the JS finished and we're seeing the subsequent event.
     */
    function onStartEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      if (TraceEngine.Legacy.eventIsFromNewEngine(e)) {
        // TODO(crbug.com/1431175) support CPU profiles in new engine.
        return;
      }

      // Top level events cannot be nested into JS frames so we reset
      // the stack when we find one.
      if (e.name === TraceEngine.Types.TraceEvents.KnownEventName.RunMicrotasks ||
          e.name === TraceEngine.Types.TraceEvents.KnownEventName.RunTask) {
        lockedJsStackDepth = [];
        truncateJSStack(0, e.startTime);
        fakeJSInvocation = false;
      }

      if (fakeJSInvocation) {
        truncateJSStack(lockedJsStackDepth.pop() || 0, e.startTime);
        fakeJSInvocation = false;
      }
      e.ordinal = ++ordinal;
      extractStackTrace(e);
      // Keep track of the call frames in the stack before the event
      // happened. For the duration of this event, these frames cannot
      // change (none can be terminated before this event finishes).
      //
      // Also, every frame that is opened after this event, is consider
      // to be a descendat of the event. So once the event finishes, the
      // frames that were opened after it, need to be closed (see
      // onEndEvent).
      //
      // TODO(crbug.com/1417439):
      // The assumption that the stack on top of the event cannot change
      // is incorrect. For example, the JS call that parents the trace
      // event might have been sampled after the event was dispatched.
      // In this case the JS call would be discarded if this event isn't
      // an invocation event, otherwise the call will be considered a
      // child of the event. In both cases, the result would be
      // incorrect.

      lockedJsStackDepth.push(jsFramesStack.length);
    }

    function onInstantEvent(
        e: TraceEngine.Legacy.CompatibleTraceEvent, parent: TraceEngine.Legacy.CompatibleTraceEvent|null): void {
      if (TraceEngine.Legacy.eventIsFromNewEngine(e) || TraceEngine.Legacy.eventIsFromNewEngine(parent)) {
        // TODO(crbug.com/1431175) support CPU profiles in new engine.
        return;
      }
      e.ordinal = ++ordinal;
      if ((parent && isJSInvocationEvent(parent)) || fakeJSInvocation) {
        extractStackTrace(e);
      } else if (
          TimelineJSProfileProcessor.isJSSampleEvent(e) && e.args?.data?.stackTrace?.length &&
          jsFramesStack.length === 0) {
        // Force JS Samples to show up even if we are not inside a JS invocation event, because we
        // can be missing the start of JS invocation events if we start tracing half-way through.
        // Pretend we have a top-level JS invocation event.
        fakeJSInvocation = true;
        const stackDepthBefore = jsFramesStack.length;
        extractStackTrace(e);
        lockedJsStackDepth.push(stackDepthBefore);
      }
    }

    function onEndEvent(e: TraceEngine.Legacy.CompatibleTraceEvent): void {
      if (TraceEngine.Legacy.eventIsFromNewEngine(e)) {
        // TODO(crbug.com/1431175) support CPU profiles in new engine.
        return;
      }
      // Because the event has ended, any frames that happened after
      // this event are terminated. Frames that are ancestors to this
      // event are extended to cover its ending.
      truncateJSStack(lockedJsStackDepth.pop() || 0, e.endTime || e.startTime);
    }

    /**
     * When a call stack that differs from the one we are tracking has
     * been detected in the samples, the latter is "truncated" by
     * setting the ending time of its call frames and removing the top
     * call frames that aren't shared with the new call stack. This way,
     * we can update the tracked stack with the new call frames on top.
     * @param depth the amount of call frames from bottom to top that
     * should be kept in the tracking stack trace. AKA amount of shared
     * call frames between two stacks.
     * @param time the new end of the call frames in the stack.
     */
    function truncateJSStack(depth: number, time: number): void {
      if (lockedJsStackDepth.length) {
        const lockedDepth = lockedJsStackDepth.at(-1);
        if (lockedDepth && depth < lockedDepth) {
          console.error(`Child stack is shallower (${depth}) than the parent stack (${lockedDepth}) at ${time}`);
          depth = lockedDepth;
        }
      }
      if (jsFramesStack.length < depth) {
        console.error(`Trying to truncate higher than the current stack size at ${time}`);
        depth = jsFramesStack.length;
      }
      for (let k = 0; k < jsFramesStack.length; ++k) {
        jsFramesStack[k].setEndTime(Math.max((jsFramesStack[k].endTime as number), time));
      }
      jsFramesStack.length = depth;
    }

    function showNativeName(name: string): boolean {
      return showRuntimeCallStats && Boolean(TimelineJSProfileProcessor.nativeGroup(name));
    }

    function filterStackFrames(stack: Protocol.Runtime.CallFrame[]): void {
      if (showAllEvents) {
        return;
      }
      let previousNativeFrameName: (string|null)|null = null;
      let j = 0;
      for (let i = 0; i < stack.length; ++i) {
        const frame = stack[i];
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
     * Update tracked stack using this event's call stack.
     */
    function extractStackTrace(e: TraceEngine.Legacy.Event): void {
      const callFrames: Protocol.Runtime.CallFrame[] = TimelineJSProfileProcessor.isJSSampleEvent(e) ?
          e.args['data']['stackTrace'].slice().reverse() :
          jsFramesStack.map(frameEvent => frameEvent.args['data']);
      filterStackFrames(callFrames);
      const endTime = e.endTime || e.startTime;
      const minFrames = Math.min(callFrames.length, jsFramesStack.length);
      let i;
      // Merge a sample's stack frames with the stack frames we have
      // so far if we detect they are equivalent.
      // Graphically
      // This:
      // Current stack trace       Sample
      // [-------A------]          [A]
      // [-------B------]          [B]
      // [-------C------]          [C]
      //                ^ t = x1    ^ t = x2

      // Becomes this:
      // New stack trace after merge
      // [--------A-------]
      // [--------B-------]
      // [--------C-------]
      //                  ^ t = x2
      for (i = lockedJsStackDepth.at(-1) || 0; i < minFrames; ++i) {
        const newFrame = callFrames[i];
        const oldFrame = jsFramesStack[i].args['data'];
        if (!equalFrames(newFrame, oldFrame)) {
          break;
        }
        // Scoot the right edge of this callFrame to the right
        jsFramesStack[i].setEndTime(Math.max((jsFramesStack[i].endTime as number), endTime));
      }

      // If there are call frames in the sample that differ with the stack
      // we have, update the stack, but keeping the common frames in place
      // Graphically
      // This:
      // Current stack trace       Sample
      // [-------A------]          [A]
      // [-------B------]          [B]
      // [-------C------]          [C]
      // [-------D------]          [E]
      //                ^ t = x1    ^ t = x2
      // Becomes this:
      // New stack trace after merge
      // [--------A-------]
      // [--------B-------]
      // [--------C-------]
      //                [E]
      //                  ^ t = x2
      truncateJSStack(i, e.startTime);
      for (; i < callFrames.length; ++i) {
        const frame = callFrames[i];
        let jsFrameType = RecordType.JSFrame;
        switch (e.name) {
          case RecordType.JSIdleSample:
            if (!isDataOriginCpuProfile) {  // Dont make synthetic JSIldeFrame events if its a browser trace
              continue;
            }
            jsFrameType = RecordType.JSIdleFrame;
            break;
          case RecordType.JSSystemSample:
            if (!isDataOriginCpuProfile) {  // Dont make synthetic JsSystemFrame events if its a browser trace
              continue;
            }
            jsFrameType = RecordType.JSSystemFrame;
            break;
        }
        const jsFrameEvent = new TraceEngine.Legacy.ConstructedEvent(
            TraceEngine.Legacy.DevToolsTimelineEventCategory, jsFrameType, TraceEngine.Types.TraceEvents.Phase.COMPLETE,
            e.startTime, e.thread);
        jsFrameEvent.ordinal = e.ordinal;
        jsFrameEvent.addArgs({data: frame});
        jsFrameEvent.setEndTime(endTime);
        jsFramesStack.push(jsFrameEvent);
        jsFrameEvents.push(jsFrameEvent);
      }
    }

    const firstTopLevelEvent = events.find(TraceEngine.Legacy.TracingModel.isTopLevelEvent);
    const startTime = firstTopLevelEvent ? firstTopLevelEvent.startTime : 0;
    TimelineModelImpl.forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent, startTime);
    return jsFrameEvents;
  }

  static isNativeRuntimeFrame(frame: Protocol.Runtime.CallFrame): boolean {
    return frame.url === 'native V8Runtime';
  }

  static nativeGroup(nativeName: string): string|null {
    if (nativeName.startsWith('Parse')) {
      return TimelineJSProfileProcessor.NativeGroups.Parse;
    }
    if (nativeName.startsWith('Compile') || nativeName.startsWith('Recompile')) {
      return TimelineJSProfileProcessor.NativeGroups.Compile;
    }
    return null;
  }

  static createFakeTraceFromCpuProfile(profile: any, tid: number, injectPageEvent: boolean, name?: string|null):
      TraceEngine.TracingManager.EventPayload[] {
    const events: TraceEngine.TracingManager.EventPayload[] = [];

    if (injectPageEvent) {
      appendEvent('TracingStartedInPage', {data: {'sessionId': '1'}}, 0, 0, 'M');
    }
    if (!name) {
      name = i18nString(UIStrings.threadS, {PH1: tid});
    }
    appendEvent(TraceEngine.Legacy.MetadataEvent.ThreadName, {name}, 0, 0, 'M', '__metadata');
    if (!profile) {
      return events;
    }

    // Append a root to show the start time of the profile (which is earlier than first sample), so the Performance
    // panel won't truncate this time period.
    appendEvent(RecordType.JSRoot, {}, profile.startTime, profile.endTime - profile.startTime, 'X', 'toplevel');
    // TODO: create a `Profile` event instead, as `cpuProfile` is legacy
    appendEvent('CpuProfile', {data: {'cpuProfile': profile}}, profile.endTime, 0, 'I');
    return events;

    function appendEvent(name: string, args: any, ts: number, dur?: number, ph?: string, cat?: string):
        TraceEngine.TracingManager.EventPayload {
      const event =
          ({cat: cat || 'disabled-by-default-devtools.timeline', name, ph: ph || 'X', pid: 1, tid, ts, args} as
           TraceEngine.TracingManager.EventPayload);
      if (dur) {
        event.dur = dur;
      }
      events.push(event);
      return event;
    }
  }
}

export namespace TimelineJSProfileProcessor {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line rulesdir/const_enum
  export enum NativeGroups {
    Compile = 'Compile',
    Parse = 'Parse',
  }
}
