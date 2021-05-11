// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

import {TimelineUIUtils} from './TimelineUIUtils.js';

export class IsLong extends TimelineModel.TimelineModelFilter.TimelineModelFilter {
  _minimumRecordDuration: number;
  constructor() {
    super();
    this._minimumRecordDuration = 0;
  }

  setMinimumRecordDuration(value: number): void {
    this._minimumRecordDuration = value;
  }

  accept(event: SDK.TracingModel.Event): boolean {
    const duration = event.endTime ? event.endTime - event.startTime : 0;
    return duration >= this._minimumRecordDuration;
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
  _regExp!: RegExp|null;
  constructor(regExp?: RegExp) {
    super();
    this.setRegExp(regExp || null);
  }

  setRegExp(regExp: RegExp|null): void {
    this._regExp = regExp;
  }

  regExp(): RegExp|null {
    return this._regExp;
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return !this._regExp || TimelineUIUtils.testContentMatching(event, this._regExp);
  }
}
