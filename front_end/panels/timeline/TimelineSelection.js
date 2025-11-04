// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
export function selectionFromEvent(event) {
    return {
        event,
    };
}
export function selectionFromRangeMicroSeconds(min, max) {
    return {
        bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max),
    };
}
export function selectionFromRangeMilliSeconds(min, max) {
    return {
        bounds: Trace.Helpers.Timing.traceWindowFromMilliSeconds(min, max),
    };
}
export function selectionIsEvent(selection) {
    return Boolean(selection && 'event' in selection);
}
export function selectionIsRange(selection) {
    return Boolean(selection && 'bounds' in selection);
}
export function rangeForSelection(selection) {
    if (selectionIsRange(selection)) {
        return selection.bounds;
    }
    if (selectionIsEvent(selection)) {
        const timings = Trace.Helpers.Timing.eventTimingsMicroSeconds(selection.event);
        return Trace.Helpers.Timing.traceWindowFromMicroSeconds(timings.startTime, timings.endTime);
    }
    Platform.assertNever(selection, 'Unknown selection type');
}
export function selectionsEqual(s1, s2) {
    if (selectionIsEvent(s1) && selectionIsEvent(s2)) {
        return s1.event === s2.event;
    }
    if (selectionIsRange(s1) && selectionIsRange(s2)) {
        return Trace.Helpers.Timing.windowsEqual(s1.bounds, s2.bounds);
    }
    return false;
}
//# sourceMappingURL=TimelineSelection.js.map