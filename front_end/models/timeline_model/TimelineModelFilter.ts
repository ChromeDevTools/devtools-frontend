// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

import {RecordType, TimelineModelImpl} from './TimelineModel.js';

export abstract class TimelineModelFilter {
  abstract accept(_event: TraceEngine.Legacy.CompatibleTraceEvent): boolean;
}

export class TimelineVisibleEventsFilter extends TimelineModelFilter {
  private readonly visibleTypes: Set<string>;
  constructor(visibleTypes: string[]) {
    super();
    this.visibleTypes = new Set(visibleTypes);
  }

  accept(event: TraceEngine.Legacy.CompatibleTraceEvent): boolean {
    return this.visibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }

  static eventType(event: TraceEngine.Legacy.CompatibleTraceEvent): RecordType {
    if (TraceEngine.Legacy.eventHasCategory(event, TimelineModelImpl.Category.Console)) {
      return RecordType.ConsoleTime;
    }
    if (TraceEngine.Legacy.eventHasCategory(event, TimelineModelImpl.Category.UserTiming)) {
      return RecordType.UserTiming;
    }
    return event.name as RecordType;
  }
}

export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
  private invisibleTypes: Set<string>;
  constructor(invisibleTypes: string[]) {
    super();
    this.invisibleTypes = new Set(invisibleTypes);
  }

  accept(event: TraceEngine.Legacy.CompatibleTraceEvent): boolean {
    return !this.invisibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }
}

export class ExclusiveNameFilter extends TimelineModelFilter {
  private excludeNames: Set<string>;
  constructor(excludeNames: string[]) {
    super();
    this.excludeNames = new Set(excludeNames);
  }

  accept(event: TraceEngine.Legacy.CompatibleTraceEvent): boolean {
    return !this.excludeNames.has(event.name);
  }
}
