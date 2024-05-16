// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

export abstract class TimelineModelFilter {
  abstract accept(
      _event: TraceEngine.Types.TraceEvents.TraceEventData,
      traceParsedData?: TraceEngine.Handlers.Types.TraceParseData): boolean;
}

export class TimelineVisibleEventsFilter extends TimelineModelFilter {
  private readonly visibleTypes: Set<string>;
  constructor(visibleTypes: string[]) {
    super();
    this.visibleTypes = new Set(visibleTypes);
  }

  accept(event: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    if (TraceEngine.Types.Extensions.isSyntheticExtensionEntry(event) ||
        TraceEngine.Types.TraceEvents.isSyntheticTraceEntry(event)) {
      return true;
    }
    return this.visibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }

  static eventType(event: TraceEngine.Types.TraceEvents.TraceEventData): TraceEngine.Types.TraceEvents.KnownEventName {
    // Any blink.console category events are treated as ConsoleTime events
    if (TraceEngine.Helpers.Trace.eventHasCategory(event, 'blink.console')) {
      return TraceEngine.Types.TraceEvents.KnownEventName.ConsoleTime;
    }
    // Any blink.user_timing egory events are treated as UserTiming events
    if (TraceEngine.Helpers.Trace.eventHasCategory(event, 'blink.user_timing')) {
      return TraceEngine.Types.TraceEvents.KnownEventName.UserTiming;
    }
    return event.name as TraceEngine.Types.TraceEvents.KnownEventName;
  }
}

export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
  #invisibleTypes: Set<TraceEngine.Types.TraceEvents.KnownEventName>;

  constructor(invisibleTypes: TraceEngine.Types.TraceEvents.KnownEventName[]) {
    super();
    this.#invisibleTypes = new Set(invisibleTypes);
  }

  accept(event: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    return !this.#invisibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }
}

export class ExclusiveNameFilter extends TimelineModelFilter {
  #excludeNames: Set<TraceEngine.Types.TraceEvents.KnownEventName>;
  constructor(excludeNames: TraceEngine.Types.TraceEvents.KnownEventName[]) {
    super();
    this.#excludeNames = new Set(excludeNames);
  }

  accept(event: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    return !this.#excludeNames.has(event.name as TraceEngine.Types.TraceEvents.KnownEventName);
  }
}
