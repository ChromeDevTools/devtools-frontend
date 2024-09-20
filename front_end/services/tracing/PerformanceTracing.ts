// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';

export class PerformanceTracing implements Trace.TracingManager.TracingManagerClient {
  readonly #traceEvents: Object[] = [];
  #tracingManager: Trace.TracingManager.TracingManager|null = null;
  #delegate: Delegate;

  constructor(target: SDK.Target.Target, delegate: Delegate) {
    this.#tracingManager = target.model(Trace.TracingManager.TracingManager);
    this.#delegate = delegate;
  }

  async start(): Promise<void> {
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

    const started = await this.#tracingManager.start(this, categories, '');

    if (!started) {
      throw new Error('Unable to start tracing.');
    }
  }

  async stop(): Promise<void> {
    return this.#tracingManager?.stop();
  }

  // Start of implementation of SDK.TracingManager.TracingManagerClient
  getTraceEvents(): Object[] {
    return this.#traceEvents;
  }

  traceEventsCollected(events: Object[]): void {
    this.#traceEvents.push(...events);
  }

  tracingBufferUsage(usage: number): void {
    this.#delegate.tracingBufferUsage(usage);
  }

  eventsRetrievalProgress(progress: number): void {
    this.#delegate.eventsRetrievalProgress(progress);
  }

  tracingComplete(): void {
    this.#delegate.tracingComplete(this.#traceEvents);
  }
  // End of implementation of SDK.TracingManager.TracingManagerClient
}

interface Delegate {
  tracingBufferUsage(usage: number): void;
  eventsRetrievalProgress(progress: number): void;
  tracingComplete(events: Object[]): void;
}

// Used by an implementation of Common.Revealer to transfer data from the recorder to the performance panel.
export class RawTraceEvents {
  constructor(private events: Object[]) {
  }

  getEvents(): Object[] {
    return this.events;
  }
}
