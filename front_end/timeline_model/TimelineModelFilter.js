// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars

import {RecordType, TimelineModelImpl} from './TimelineModel.js';

export class TimelineModelFilter {
  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return true;
  }
}

export class TimelineVisibleEventsFilter extends TimelineModelFilter {
  /**
   * @param {!Array<string>} visibleTypes
   */
  constructor(visibleTypes) {
    super();
    this._visibleTypes = new Set(visibleTypes);
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return this._visibleTypes.has(TimelineVisibleEventsFilter._eventType(event));
  }

  /**
   * @return {!RecordType}
   */
  static _eventType(event) {
    if (event.hasCategory(TimelineModelImpl.Category.Console)) {
      return RecordType.ConsoleTime;
    }
    if (event.hasCategory(TimelineModelImpl.Category.UserTiming)) {
      return RecordType.UserTiming;
    }
    if (event.hasCategory(TimelineModelImpl.Category.LatencyInfo)) {
      return RecordType.LatencyInfo;
    }
    return /** @type !RecordType */ (event.name);
  }
}

export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
  /**
   * @param {!Array<string>} invisibleTypes
   */
  constructor(invisibleTypes) {
    super();
    this._invisibleTypes = new Set(invisibleTypes);
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !this._invisibleTypes.has(TimelineVisibleEventsFilter._eventType(event));
  }
}

export class ExclusiveNameFilter extends TimelineModelFilter {
  /**
   * @param {!Array<string>} excludeNames
   */
  constructor(excludeNames) {
    super();
    this._excludeNames = new Set(excludeNames);
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !this._excludeNames.has(event.name);
  }
}
