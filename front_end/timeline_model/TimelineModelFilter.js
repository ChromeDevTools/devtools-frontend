// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
   * @return {!TimelineModel.TimelineModel.RecordType}
   */
  static _eventType(event) {
    if (event.hasCategory(TimelineModel.TimelineModel.Category.Console)) {
      return TimelineModel.TimelineModel.RecordType.ConsoleTime;
    }
    if (event.hasCategory(TimelineModel.TimelineModel.Category.UserTiming)) {
      return TimelineModel.TimelineModel.RecordType.UserTiming;
    }
    if (event.hasCategory(TimelineModel.TimelineModel.Category.LatencyInfo)) {
      return TimelineModel.TimelineModel.RecordType.LatencyInfo;
    }
    return /** @type !TimelineModel.TimelineModel.RecordType */ (event.name);
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

/* Legacy exported object */
self.TimelineModel = self.TimelineModel || {};

/* Legacy exported object */
TimelineModel = TimelineModel || {};

/** @constructor */
TimelineModel.TimelineModelFilter = TimelineModelFilter;

/** @constructor */
TimelineModel.TimelineVisibleEventsFilter = TimelineVisibleEventsFilter;

/** @constructor */
TimelineModel.TimelineInvisibleEventsFilter = TimelineInvisibleEventsFilter;

/** @constructor */
TimelineModel.ExclusiveNameFilter = ExclusiveNameFilter;
