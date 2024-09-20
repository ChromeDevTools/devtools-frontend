// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../trace/trace.js';

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
      return TimelineJSProfileProcessor.NativeGroups.PARSE;
    }
    if (nativeName.startsWith('Compile') || nativeName.startsWith('Recompile')) {
      return TimelineJSProfileProcessor.NativeGroups.COMPILE;
    }
    return null;
  }

  static createFakeTraceFromCpuProfile(profile: Protocol.Profiler.Profile, tid: Trace.Types.Events.ThreadID):
      Trace.Types.Events.Event[] {
    const events: Trace.Types.Events.Event[] = [];

    const threadName = i18nString(UIStrings.threadS, {PH1: tid});
    appendEvent('TracingStartedInPage', {data: {sessionId: '1'}}, 0, 0, Trace.Types.Events.Phase.METADATA);
    appendEvent(
        Trace.Types.Events.Name.THREAD_NAME, {name: threadName}, 0, 0, Trace.Types.Events.Phase.METADATA, '__metadata');
    if (!profile) {
      return events;
    }

    // Append a root to show the start time of the profile (which is earlier than first sample), so the Performance
    // panel won't truncate this time period.
    // 'JSRoot' doesn't exist in the new engine and is not the name of an actual trace event, but changing it might break other trace processing tools that rely on this, so we stick with this name.
    // TODO(crbug.com/341234884): consider removing this or clarify why it's required.
    appendEvent(
        'JSRoot', {}, profile.startTime, profile.endTime - profile.startTime, Trace.Types.Events.Phase.COMPLETE,
        'toplevel');

    // TODO: create a `Profile` event instead, as `cpuProfile` is legacy
    appendEvent('CpuProfile', {data: {cpuProfile: profile}}, profile.endTime, 0, Trace.Types.Events.Phase.COMPLETE);
    return events;

    function appendEvent(
        name: string, args: any, ts: number, dur?: number, ph?: Trace.Types.Events.Phase,
        cat?: string): Trace.Types.Events.Event {
      const event: Trace.Types.Events.Event = {
        cat: cat || 'disabled-by-default-devtools.timeline',
        name,
        ph: ph || Trace.Types.Events.Phase.COMPLETE,
        pid: Trace.Types.Events.ProcessID(1),
        tid,
        ts: Trace.Types.Timing.MicroSeconds(ts),
        args,
      };

      if (dur) {
        event.dur = Trace.Types.Timing.MicroSeconds(dur);
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
