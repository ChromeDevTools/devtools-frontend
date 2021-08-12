// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class IsLong extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  private minimumRecordDuration: number;
  constructor() {
    super();
    this.minimumRecordDuration = 0;
  }

  setMinimumRecordDuration(value: number): void {
    this.minimumRecordDuration = value;
  }

  accept(event: SDK.TracingModel.Event): boolean {
    const duration = event.endTime ? event.endTime - event.startTime : 0;
    return duration >= this.minimumRecordDuration;
  }
}

export class Category extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  constructor() {
    super();
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return !TimelineUIUtils.eventStyle(event).category.hidden;
  }
}

export class TimelineRegExp extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  private regExpInternal!: RegExp|null;
  constructor(regExp?: RegExp) {
    super();
    this.setRegExp(regExp || null);
  }

  setRegExp(regExp: RegExp|null): void {
    this.regExpInternal = regExp;
  }

  regExp(): RegExp|null {
    return this.regExpInternal;
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return !this.regExpInternal || TimelineUIUtils.testContentMatching(event, this.regExpInternal);
  }
}
