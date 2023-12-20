// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import type * as TraceEngine from '../../models/trace/trace.js';

export class PerformanceModel {
  private readonly timelineModelInternal: TimelineModel.TimelineModel.TimelineModelImpl;

  constructor() {
    this.timelineModelInternal = new TimelineModel.TimelineModel.TimelineModelImpl();
  }

  async setTracingModel(model: TraceEngine.Legacy.TracingModel, isFreshRecording = false): Promise<void> {
    this.timelineModelInternal.setEvents(model, isFreshRecording);
  }

  timelineModel(): TimelineModel.TimelineModel.TimelineModelImpl {
    return this.timelineModelInternal;
  }
}
