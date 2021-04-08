// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../../core/sdk/sdk.js';

import {RecordType, TimelineModelImpl} from './TimelineModel.js';

export class TimelineModelFilter {
  accept(_event: SDK.TracingModel.Event): boolean {
    return true;
  }
}

export class TimelineVisibleEventsFilter extends TimelineModelFilter {
  _visibleTypes: Set<string>;
  constructor(visibleTypes: string[]) {
    super();
    this._visibleTypes = new Set(visibleTypes);
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return this._visibleTypes.has(TimelineVisibleEventsFilter._eventType(event));
  }

  static _eventType(event: SDK.TracingModel.Event): RecordType {
    if (event.hasCategory(TimelineModelImpl.Category.Console)) {
      return RecordType.ConsoleTime;
    }
    if (event.hasCategory(TimelineModelImpl.Category.UserTiming)) {
      return RecordType.UserTiming;
    }
    if (event.hasCategory(TimelineModelImpl.Category.LatencyInfo)) {
      return RecordType.LatencyInfo;
    }
    return event.name as RecordType;
  }
}

export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
  _invisibleTypes: Set<string>;
  constructor(invisibleTypes: string[]) {
    super();
    this._invisibleTypes = new Set(invisibleTypes);
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return !this._invisibleTypes.has(TimelineVisibleEventsFilter._eventType(event));
  }
}

export class ExclusiveNameFilter extends TimelineModelFilter {
  _excludeNames: Set<string>;
  constructor(excludeNames: string[]) {
    super();
    this._excludeNames = new Set(excludeNames);
  }

  accept(event: SDK.TracingModel.Event): boolean {
    return !this._excludeNames.has(event.name);
  }
}
