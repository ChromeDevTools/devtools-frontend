// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


export class IsLong extends TimelineModel.TimelineModelFilter {
  constructor() {
    super();
    this._minimumRecordDuration = 0;
  }

  /**
   * @param {number} value
   */
  setMinimumRecordDuration(value) {
    this._minimumRecordDuration = value;
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    const duration = event.endTime ? event.endTime - event.startTime : 0;
    return duration >= this._minimumRecordDuration;
  }
}

export class Category extends TimelineModel.TimelineModelFilter {
  constructor() {
    super();
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !Timeline.TimelineUIUtils.eventStyle(event).category.hidden;
  }
}

export class TimelineRegExp extends TimelineModel.TimelineModelFilter {
  /**
   * @param {!RegExp=} regExp
   */
  constructor(regExp) {
    super();
    /** @type {?RegExp} */
    this._regExp;
    this.setRegExp(regExp || null);
  }

  /**
   * @param {?RegExp} regExp
   */
  setRegExp(regExp) {
    this._regExp = regExp;
  }

  /**
   * @return {?RegExp}
   */
  regExp() {
    return this._regExp;
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !this._regExp || Timeline.TimelineUIUtils.testContentMatching(event, this._regExp);
  }
}

/* Legacy exported object */
self.Timeline = self.Timeline || {};

/* Legacy exported object */
Timeline = Timeline || {};

Timeline.TimelineFilters = {};

/** @constructor */
Timeline.TimelineFilters.IsLong = IsLong;

/** @constructor */
Timeline.TimelineFilters.Category = Category;

/** @constructor */
Timeline.TimelineFilters.RegExp = TimelineRegExp;
