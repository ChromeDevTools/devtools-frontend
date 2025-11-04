// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class TraceLoadEvent extends Event {
    duration;
    static eventName = 'traceload';
    constructor(duration) {
        super(TraceLoadEvent.eventName, { bubbles: true, composed: true });
        this.duration = duration;
    }
}
//# sourceMappingURL=BenchmarkEvents.js.map