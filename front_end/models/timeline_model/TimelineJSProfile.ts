// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

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
  static generateTracingEventsFromCpuProfile(
      jsProfileModel: SDK.CPUProfileDataModel.CPUProfileDataModel,
      thread: SDK.TracingModel.Thread): SDK.TracingModel.Event[] {
    const samples = jsProfileModel.samples || [];
    const timestamps = jsProfileModel.timestamps;
    const jsEvents = [];
    const nodeToStackMap = new Map<SDK.ProfileTreeModel.ProfileNode|null, Protocol.Runtime.CallFrame[]>();

    let prevNode: SDK.ProfileTreeModel.ProfileNode = jsProfileModel.root;
    for (let i = 0; i < samples.length; ++i) {
      let node: SDK.ProfileTreeModel.ProfileNode|null = jsProfileModel.nodeByIndex(i);
      if (!node) {
        console.error(`Node with unknown id ${samples[i]} at index ${i}`);
        continue;
      }
      let callFrames = nodeToStackMap.get(node);
      if (!callFrames) {
        if (node === jsProfileModel.gcNode) {
          // GC samples have no stack, so we just put GC node on top of the last recorded sample.
          // The depth is always 0, so set the callFrames size to 2 to save the GC and last recorded sample.
          callFrames = (new Array(2) as Protocol.Runtime.CallFrame[]);
          callFrames[0] = (node as Protocol.Runtime.CallFrame);
          callFrames[1] = (prevNode as Protocol.Runtime.CallFrame);
          nodeToStackMap.set(node, callFrames);
        } else {
          callFrames = (new Array(node.depth + 1) as Protocol.Runtime.CallFrame[]);
          nodeToStackMap.set(node, callFrames);
          for (let j = 0; node.parent; node = node.parent) {
            callFrames[j++] = (node as Protocol.Runtime.CallFrame);
          }
        }
      }
      const jsSampleEvent = new SDK.TracingModel.Event(
          SDK.TracingModel.DevToolsTimelineEventCategory, RecordType.JSSample, SDK.TracingModel.Phase.Instant,
          timestamps[i], thread);
      jsSampleEvent.args['data'] = {stackTrace: callFrames};
      jsEvents.push(jsSampleEvent);

      prevNode = node;
    }
    return jsEvents;
  }

  static generateJSFrameEvents(events: SDK.TracingModel.Event[], config: {
    showAllEvents: boolean,
    showRuntimeCallStats: boolean,
    showNativeFunctions: boolean,
  }): SDK.TracingModel.Event[] {
    function equalFrames(frame1: Protocol.Runtime.CallFrame, frame2: Protocol.Runtime.CallFrame): boolean {
      return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName &&
          frame1.lineNumber === frame2.lineNumber;
    }

    function isJSInvocationEvent(e: SDK.TracingModel.Event): boolean {
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

    const jsFrameEvents: SDK.TracingModel.Event[] = [];
    const jsFramesStack: SDK.TracingModel.Event[] = [];
    const lockedJsStackDepth: number[] = [];
    let ordinal = 0;
    let fakeJSInvocation = false;
    const {showAllEvents, showRuntimeCallStats, showNativeFunctions} = config;

    function onStartEvent(e: SDK.TracingModel.Event): void {
      if (fakeJSInvocation) {
        truncateJSStack((lockedJsStackDepth.pop() as number), e.startTime);
        fakeJSInvocation = false;
      }
      e.ordinal = ++ordinal;
      extractStackTrace(e);
      // For the duration of the event we cannot go beyond the stack associated with it.
      lockedJsStackDepth.push(jsFramesStack.length);
    }

    function onInstantEvent(e: SDK.TracingModel.Event, parent: SDK.TracingModel.Event|null): void {
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

    function onEndEvent(e: SDK.TracingModel.Event): void {
      truncateJSStack((lockedJsStackDepth.pop() as number), (e.endTime as number));
    }

    function truncateJSStack(depth: number, time: number): void {
      if (lockedJsStackDepth.length) {
        const lockedDepth = (lockedJsStackDepth[lockedJsStackDepth.length - 1] as number);
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

    function extractStackTrace(e: SDK.TracingModel.Event): void {
      const callFrames: Protocol.Runtime.CallFrame[] = e.name === RecordType.JSSample ?
          e.args['data']['stackTrace'].slice().reverse() :
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
        jsFramesStack[i].setEndTime(Math.max((jsFramesStack[i].endTime as number), endTime));
      }
      truncateJSStack(i, e.startTime);
      for (; i < callFrames.length; ++i) {
        const frame = callFrames[i];
        const jsFrameEvent = new SDK.TracingModel.Event(
            SDK.TracingModel.DevToolsTimelineEventCategory, RecordType.JSFrame, SDK.TracingModel.Phase.Complete,
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

  static buildTraceProfileFromCpuProfile(profile: any, tid: number, injectPageEvent: boolean, name?: string|null):
      SDK.TracingManager.EventPayload[] {
    const events: SDK.TracingManager.EventPayload[] = [];
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
    // Append a root to show the start time of the profile (which is earlier than first sample), so the Performance
    // panel won't truncate this time period.
    appendEvent('(root)', {}, profile.startTime, profile.endTime - profile.startTime, 'X', 'toplevel');

    appendEvent('CpuProfile', {data: {'cpuProfile': profile}}, profile.endTime, 0, 'I');
    return events;

    function appendEvent(
        name: string, args: any, ts: number, dur?: number, ph?: string, cat?: string): SDK.TracingManager.EventPayload {
      const event =
          ({cat: cat || 'disabled-by-default-devtools.timeline', name, ph: ph || 'X', pid: 1, tid, ts, args} as
           SDK.TracingManager.EventPayload);
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
