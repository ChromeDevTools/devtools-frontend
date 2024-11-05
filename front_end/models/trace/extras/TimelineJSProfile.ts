// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';

// TODO(paulirish): Delete this file.
//   - Move isNativeRuntimeFrame and nativeGroup to TraceEvents.d.ts (or TraceTree)
//   - Move createFakeTraceFromCpuProfile to TimelineLoader
export class TimelineJSProfileProcessor {
  static isNativeRuntimeFrame(frame: Protocol.Runtime.CallFrame): boolean {
    return frame.url === 'native V8Runtime';
  }

  static nativeGroup(nativeName: string): string|null {
    if (nativeName.startsWith('Parse')) {
      return TimelineJSProfileProcessor.NativeGroups.PARSE;
    }
    if (nativeName.startsWith('Compile') || nativeName.startsWith('Recompile')) {
      return TimelineJSProfileProcessor.NativeGroups.COMPILE;
    }
    return null;
  }

  static createFakeTraceFromCpuProfile(profile: Protocol.Profiler.Profile, tid: Types.Events.ThreadID):
      Types.Events.Event[] {
    const events: Types.Events.Event[] = [];

    const threadName = `Thread ${tid}`;
    appendEvent('TracingStartedInPage', {data: {sessionId: '1'}}, 0, 0, Types.Events.Phase.METADATA);
    appendEvent(Types.Events.Name.THREAD_NAME, {name: threadName}, 0, 0, Types.Events.Phase.METADATA, '__metadata');
    if (!profile) {
      return events;
    }

    // Append a root to show the start time of the profile (which is earlier than first sample), so the Performance
    // panel won't truncate this time period.
    // 'JSRoot' doesn't exist in the new engine and is not the name of an actual trace event, but changing it might break other trace processing tools that rely on this, so we stick with this name.
    // TODO(crbug.com/341234884): consider removing this or clarify why it's required.
    appendEvent(
        'JSRoot', {}, profile.startTime, profile.endTime - profile.startTime, Types.Events.Phase.COMPLETE, 'toplevel');

    // TODO: create a `Profile` event instead, as `cpuProfile` is legacy
    appendEvent('CpuProfile', {data: {cpuProfile: profile}}, profile.endTime, 0, Types.Events.Phase.COMPLETE);
    return events;

    function appendEvent(
        name: string, args: any, ts: number, dur?: number, ph?: Types.Events.Phase, cat?: string): Types.Events.Event {
      const event: Types.Events.Event = {
        cat: cat || 'disabled-by-default-devtools.timeline',
        name,
        ph: ph || Types.Events.Phase.COMPLETE,
        pid: Types.Events.ProcessID(1),
        tid,
        ts: Types.Timing.MicroSeconds(ts),
        args,
      };

      if (dur) {
        event.dur = Types.Timing.MicroSeconds(dur);
      }
      events.push(event);
      return event;
    }
  }
}

export namespace TimelineJSProfileProcessor {
  export const enum NativeGroups {
    COMPILE = 'Compile',
    PARSE = 'Parse',
  }
}
