// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TraceEngine from '../trace/trace.js';

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

  static createFakeTraceFromCpuProfile(profile: Protocol.Profiler.Profile, tid: TraceEngine.Types.TraceEvents.ThreadID):
      TraceEngine.Types.TraceEvents.TraceEventData[] {
    const events: TraceEngine.Types.TraceEvents.TraceEventData[] = [];

    const threadName = i18nString(UIStrings.threadS, {PH1: tid});
    appendEvent('TracingStartedInPage', {data: {'sessionId': '1'}}, 0, 0, TraceEngine.Types.TraceEvents.Phase.METADATA);
    appendEvent(
        TraceEngine.Types.TraceEvents.KnownEventName.ThreadName, {name: threadName}, 0, 0,
        TraceEngine.Types.TraceEvents.Phase.METADATA, '__metadata');
    if (!profile) {
      return events;
    }

    // Append a root to show the start time of the profile (which is earlier than first sample), so the Performance
    // panel won't truncate this time period.
    // 'JSRoot' doesn't exist in the new engine and is not the name of an actual trace event, but changing it might break other trace processing tools that rely on this, so we stick with this name.
    // TODO(crbug.com/341234884): consider removing this or clarify why it's required.
    appendEvent(
        'JSRoot', {}, profile.startTime, profile.endTime - profile.startTime,
        TraceEngine.Types.TraceEvents.Phase.COMPLETE, 'toplevel');

    // TODO: create a `Profile` event instead, as `cpuProfile` is legacy
    appendEvent(
        'CpuProfile', {data: {'cpuProfile': profile}}, profile.endTime, 0,
        TraceEngine.Types.TraceEvents.Phase.COMPLETE);
    return events;

    function appendEvent(
        name: string, args: any, ts: number, dur?: number, ph?: TraceEngine.Types.TraceEvents.Phase,
        cat?: string): TraceEngine.Types.TraceEvents.TraceEventData {
      const event: TraceEngine.Types.TraceEvents.TraceEventData = {
        cat: cat || 'disabled-by-default-devtools.timeline',
        name,
        ph: ph || TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        pid: TraceEngine.Types.TraceEvents.ProcessID(1),
        tid,
        ts: TraceEngine.Types.Timing.MicroSeconds(ts),
        args,
      };

      if (dur) {
        event.dur = TraceEngine.Types.Timing.MicroSeconds(dur);
      }
      events.push(event);
      return event;
    }
  }
}

export namespace TimelineJSProfileProcessor {
  export const enum NativeGroups {
    Compile = 'Compile',
    Parse = 'Parse',
  }
}
