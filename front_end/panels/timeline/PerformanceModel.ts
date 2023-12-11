// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import type * as TraceEngine from '../../models/trace/trace.js';

export class PerformanceModel {
  private mainTargetInternal: SDK.Target.Target|null;
  private tracingModelInternal: TraceEngine.Legacy.TracingModel|null;
  private filtersInternal: TimelineModel.TimelineModelFilter.TimelineModelFilter[];
  private readonly timelineModelInternal: TimelineModel.TimelineModel.TimelineModelImpl;
  private recordStartTimeInternal?: number;

  constructor() {
    this.mainTargetInternal = null;
    this.tracingModelInternal = null;
    this.filtersInternal = [];

    this.timelineModelInternal = new TimelineModel.TimelineModel.TimelineModelImpl();

    this.recordStartTimeInternal = undefined;
  }

  setMainTarget(target: SDK.Target.Target): void {
    this.mainTargetInternal = target;
  }

  mainTarget(): SDK.Target.Target|null {
    return this.mainTargetInternal;
  }

  setRecordStartTime(time: number): void {
    this.recordStartTimeInternal = time;
  }

  recordStartTime(): number|undefined {
    return this.recordStartTimeInternal;
  }

  setFilters(filters: TimelineModel.TimelineModelFilter.TimelineModelFilter[]): void {
    this.filtersInternal = filters;
  }

  filters(): TimelineModel.TimelineModelFilter.TimelineModelFilter[] {
    return this.filtersInternal;
  }

  isVisible(event: TraceEngine.Legacy.Event): boolean {
    return this.filtersInternal.every(f => f.accept(event));
  }

  async setTracingModel(model: TraceEngine.Legacy.TracingModel, isFreshRecording = false): Promise<void> {
    this.tracingModelInternal = model;
    this.timelineModelInternal.setEvents(model, isFreshRecording);
  }

  tracingModel(): TraceEngine.Legacy.TracingModel {
    if (!this.tracingModelInternal) {
      throw 'call setTracingModel before accessing PerformanceModel';
    }
    return this.tracingModelInternal;
  }

  timelineModel(): TimelineModel.TimelineModel.TimelineModelImpl {
    return this.timelineModelInternal;
  }
}
