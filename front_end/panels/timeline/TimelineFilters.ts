// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class IsLong extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  #minimumRecordDurationMilli = TraceEngine.Types.Timing.MilliSeconds(0);
  constructor() {
    super();
  }

  setMinimumRecordDuration(value: TraceEngine.Types.Timing.MilliSeconds): void {
    this.#minimumRecordDurationMilli = value;
  }

  accept(event: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    const {duration} = TraceEngine.Helpers.Timing.eventTimingsMilliSeconds(event);
    return duration >= this.#minimumRecordDurationMilli;
  }
}

export class Category extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  constructor() {
    super();
  }

  accept(event: TraceEngine.Types.TraceEvents.TraceEventData): boolean {
    return !TimelineUIUtils.eventStyle(event).category.hidden;
  }
}

export class TimelineRegExp extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  private regExpInternal!: RegExp|null;
  constructor(regExp?: RegExp) {
    super();
    this.setRegExp(regExp || null);
  }

  setRegExp(regExp: RegExp|null): void {
    this.regExpInternal = regExp;
  }

  regExp(): RegExp|null {
    return this.regExpInternal;
  }

  accept(
      event: TraceEngine.Types.TraceEvents.TraceEventData,
      traceParsedData?: TraceEngine.Handlers.Types.TraceParseData): boolean {
    return !this.regExpInternal || TimelineUIUtils.testContentMatching(event, this.regExpInternal, traceParsedData);
  }
}
