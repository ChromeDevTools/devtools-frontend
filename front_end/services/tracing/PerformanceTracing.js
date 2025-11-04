// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { TracingManager } from './TracingManager.js';
export class PerformanceTracing {
    #traceEvents = [];
    #tracingManager = null;
    #delegate;
    constructor(target, delegate) {
        this.#tracingManager = target.model(TracingManager);
        this.#delegate = delegate;
    }
    async start() {
        this.#traceEvents.length = 0;
        if (!this.#tracingManager) {
            throw new Error('No tracing manager');
        }
        // This panel may be opened with trace data recorded in other tools.
        // Keep in sync with the categories arrays in:
        // https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/panels/timeline/TimelineController.ts
        // https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/gather/gatherers/trace.js
        const categories = [
            '-*',
            'blink.console',
            'blink.user_timing',
            'devtools.timeline',
            'disabled-by-default-devtools.screenshot',
            'disabled-by-default-devtools.timeline',
            'disabled-by-default-devtools.timeline.invalidationTracking',
            'disabled-by-default-devtools.timeline.frame',
            'disabled-by-default-devtools.timeline.stack',
            'disabled-by-default-v8.cpu_profiler',
            'disabled-by-default-v8.cpu_profiler.hires',
            'latencyInfo',
            'loading',
            'disabled-by-default-lighthouse',
            'v8.execute',
            'v8',
        ].join(',');
        const started = await this.#tracingManager.start(this, categories);
        if (!started) {
            throw new Error('Unable to start tracing.');
        }
    }
    async stop() {
        return this.#tracingManager?.stop();
    }
    // Start of implementation of SDK.TracingManager.TracingManagerClient
    traceEventsCollected(events) {
        this.#traceEvents.push(...events);
    }
    tracingBufferUsage(usage) {
        this.#delegate.tracingBufferUsage(usage);
    }
    eventsRetrievalProgress(progress) {
        this.#delegate.eventsRetrievalProgress(progress);
    }
    tracingComplete() {
        this.#delegate.tracingComplete(this.#traceEvents);
    }
}
/** Used by an implementation of Common.Revealer to transfer data from the recorder to the performance panel. **/
export class RawTraceEvents {
    events;
    constructor(events) {
        this.events = events;
    }
    getEvents() {
        return this.events;
    }
}
//# sourceMappingURL=PerformanceTracing.js.map