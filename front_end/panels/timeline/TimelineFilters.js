// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../models/trace/trace.js';
import { TimelineUIUtils } from './TimelineUIUtils.js';
export class IsLong extends Trace.Extras.TraceFilter.TraceFilter {
    #minimumRecordDurationMilli = Trace.Types.Timing.Milli(0);
    setMinimumRecordDuration(value) {
        this.#minimumRecordDurationMilli = value;
    }
    accept(event) {
        const { duration } = Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        return duration >= this.#minimumRecordDurationMilli;
    }
}
export class Category extends Trace.Extras.TraceFilter.TraceFilter {
    accept(event) {
        return !TimelineUIUtils.eventStyle(event).category.hidden;
    }
}
export class TimelineRegExp extends Trace.Extras.TraceFilter.TraceFilter {
    #regExp;
    constructor(regExp) {
        super();
        this.setRegExp(regExp || null);
    }
    setRegExp(regExp) {
        this.#regExp = regExp;
    }
    regExp() {
        return this.#regExp;
    }
    accept(event, handlerData) {
        return !this.#regExp || TimelineUIUtils.testContentMatching(event, this.#regExp, handlerData);
    }
}
//# sourceMappingURL=TimelineFilters.js.map