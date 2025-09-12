// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class IsLong extends Trace.Extras.TraceFilter.TraceFilter {
  #minimumRecordDurationMilli = Trace.Types.Timing.Milli(0);

  setMinimumRecordDuration(value: Trace.Types.Timing.Milli): void {
    this.#minimumRecordDurationMilli = value;
  }

  accept(event: Trace.Types.Events.Event): boolean {
    const {duration} = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
    return duration >= this.#minimumRecordDurationMilli;
  }
}

export class Category extends Trace.Extras.TraceFilter.TraceFilter {
  accept(event: Trace.Types.Events.Event): boolean {
    return !TimelineUIUtils.eventStyle(event).category.hidden;
  }
}

export class TimelineRegExp extends Trace.Extras.TraceFilter.TraceFilter {
  #regExp!: RegExp|null;
  constructor(regExp?: RegExp) {
    super();
    this.setRegExp(regExp || null);
  }

  setRegExp(regExp: RegExp|null): void {
    this.#regExp = regExp;
  }

  regExp(): RegExp|null {
    return this.#regExp;
  }

  accept(event: Trace.Types.Events.Event, handlerData?: Trace.Handlers.Types.HandlerData): boolean {
    return !this.#regExp || TimelineUIUtils.testContentMatching(event, this.#regExp, handlerData);
  }
}
