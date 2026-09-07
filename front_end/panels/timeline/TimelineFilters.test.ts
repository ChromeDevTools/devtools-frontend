// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Trace from '../../models/trace/trace.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {makeCompleteEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describe('TimelineFilters', () => {
  setupLocaleHooks();

  describe('IsLong', () => {
    it('returns true if the event is longer than the defined duration for a new engine event', () => {
      const longEvent = makeCompleteEvent('Event', 0, 60_000);
      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(Trace.Types.Timing.Milli(50));
      assert.isTrue(filter.accept(longEvent));
    });

    it('returns false if the event is shorter than the defined duration for a new engine event', () => {
      const shortEvent = makeCompleteEvent('Event', 0, 40_000);
      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(Trace.Types.Timing.Milli(50));
      assert.isFalse(filter.accept(shortEvent));
    });
  });

  describe('Category', () => {
    it('returns false for a new event if it has a category that is hidden', () => {
      const userTimingEvent = makeCompleteEvent('UserTiming', 0, 10_000, Trace.Types.Events.Categories.UserTiming);
      // These events are usually visible, so make the category hidden before
      // running this test.
      Trace.Styles.getCategoryStyles()['scripting'].hidden = true;

      const filter = new Timeline.TimelineFilters.Category();
      assert.isFalse(filter.accept(userTimingEvent));
      Trace.Styles.getCategoryStyles()['scripting'].hidden = false;
    });

    it('returns true for a new event if it has a category that is visible', () => {
      const userTimingEvent = makeCompleteEvent('UserTiming', 0, 10_000, Trace.Types.Events.Categories.UserTiming);
      const filter = new Timeline.TimelineFilters.Category();
      assert.isTrue(filter.accept(userTimingEvent));
      Trace.Styles.getCategoryStyles()['scripting'].hidden = false;
    });
  });
});
