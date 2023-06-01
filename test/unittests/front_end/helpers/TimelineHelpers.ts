// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import type * as TimelineModel from '../../../../front_end/models/timeline_model/timeline_model.js';
import * as PerfUI from '../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import type * as TraceEngine from '../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import {loadTraceEventsLegacyEventPayload} from './TraceHelpers.js';

export class FakeStorage extends SDK.TracingModel.BackingStorage {
  override appendString() {
  }

  appendAccessibleString(x: string): () => Promise<string|null> {
    return () => Promise.resolve(x);
  }

  override finishWriting() {
  }

  override reset() {
  }
}

/**
 * Provides a stubbed SDK.TracingModel.Thread instance.
 * IMPORTANT: this is not designed to be a fully stubbed Thread, but one that is
 * stubbed enough to be able to use it to instantiate an SDK.TracingModel.Event.
 * If you pass this fake thread around into places that expect actual threads,
 * you will get errors. Use this only for simple cases where you need a one off
 * event to test something. For anything more, you should use the helpers in
 * TraceHelpers.ts to load and parse a real trace to get real data.
 **/
export class StubbedThread {
  static make(id: number): SDK.TracingModel.Thread {
    const instance = new StubbedThread(id);
    return instance as unknown as SDK.TracingModel.Thread;
  }

  constructor(public id: number) {
  }

  getModel(): SDK.TracingModel.TracingModel {
    return {
      parsedCategoriesForString(input: string): Set<string> {
        return new Set(input.split(','));
      },

    } as unknown as SDK.TracingModel.TracingModel;
  }
}

export const DevToolsTimelineCategory = 'disabled-by-default-devtools.timeline';

export interface FakeEventPayload {
  name: string;
  categories: string[];
  tid?: number;
  ts: number;
  pid?: number;
  dur?: number;
  ph: TraceEngine.Types.TraceEvents.Phase;
  // The type def of args in EventPayload is inaccurate. We will fix this as
  // part of the migration but for now let's just tell TS to let us pass
  // anything in here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
  id?: string;
  scope?: string[];
  // Allow any additional keys.
  [x: string]: unknown;
}
/**
 * Creates an object that represents an EventPayload - one that looks exactly
 * like an event from a real trace could.
 * You must provide some of the options, but the others will revert to sensible
 * defaults. The goal here is not to use this to emulate an entire trace (you
 * should use an actual trace file if you need that), but to allow the
 * construction of single events to make testing utility methods easier.
 **/
export function makeFakeEventPayload(payload: FakeEventPayload): SDK.TracingManager.EventPayload {
  const event: SDK.TracingManager.EventPayload = {
    // Set defaults for these values, all of which can be overriden by passing
    // them into the payload object.
    args: {},
    pid: 1,
    tid: 1,
    id: 'random-test-event-id',
    dur: 0,
    ...payload,
    cat: payload.categories.join(','),
    scope: payload.scope ? payload.scope.join(',') : 'devtools.timeline',
  };

  return event;
}

/**
 * Given an object representing a fake payload - see @FakeEventPayload - this
 * function will create a fake SDK Event with a stubbed thread that tries to
 * mimic the real thing. It is not designed to be used to emulate entire traces,
 * but more to create single events that can be used in unit tests.
 **/
export function makeFakeSDKEventFromPayload(payloadOptions: FakeEventPayload): SDK.TracingModel.PayloadEvent {
  const payload = makeFakeEventPayload(payloadOptions);
  const thread = StubbedThread.make(payload.tid);
  const event = SDK.TracingModel.PayloadEvent.fromPayload(payload, thread);
  return event;
}

export async function traceModelFromTraceFile(file: string): Promise<{
  tracingModel: SDK.TracingModel.TracingModel,
  timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
  performanceModel: Timeline.PerformanceModel.PerformanceModel,
}> {
  const events = await loadTraceEventsLegacyEventPayload(file);
  const tracingModel = new SDK.TracingModel.TracingModel(new FakeStorage());
  const performanceModel = new Timeline.PerformanceModel.PerformanceModel();
  tracingModel.addEvents(events);
  tracingModel.tracingComplete();
  await performanceModel.setTracingModel(tracingModel);
  const timelineModel = performanceModel.timelineModel();
  return {
    tracingModel,
    timelineModel,
    performanceModel,
  };
}

export class FakeFlameChartProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  minimumBoundary(): number {
    return 0;
  }

  totalTime(): number {
    return 100;
  }

  formatValue(value: number): string {
    return value.toString();
  }

  maxStackDepth(): number {
    return 3;
  }

  prepareHighlightedEntryInfo(_entryIndex: number): Element|null {
    return null;
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  entryTitle(entryIndex: number): string|null {
    return `Entry ${entryIndex}`;
  }

  entryFont(_entryIndex: number): string|null {
    return null;
  }

  entryColor(_entryIndex: number): string {
    return 'lightblue';
  }

  decorateEntry(): boolean {
    return false;
  }

  forceDecoration(_entryIndex: number): boolean {
    return false;
  }

  textColor(_entryIndex: number): string {
    return 'black';
  }

  navStartTimes(): Map<string, SDK.TracingModel.Event> {
    return new Map();
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  }
}
