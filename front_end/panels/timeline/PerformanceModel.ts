// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import type * as TraceEngine from '../../models/trace/trace.js';

export class PerformanceModel {
  private tracingModelInternal: TraceEngine.Legacy.TracingModel|null;
  private readonly timelineModelInternal: TimelineModel.TimelineModel.TimelineModelImpl;

  constructor() {
    this.tracingModelInternal = null;
    this.timelineModelInternal = new TimelineModel.TimelineModel.TimelineModelImpl();
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
