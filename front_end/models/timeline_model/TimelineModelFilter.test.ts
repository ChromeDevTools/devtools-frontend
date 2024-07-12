// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as TraceEngine from '../trace/trace.js';

describe('TimelineModelFilter', () => {
  describe('TimelineVisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (traceData.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const visibleFilter = new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter([
        // Set an random record type to be visible - the exact type is not important for the test.
        TraceEngine.Types.TraceEvents.KnownEventName.UserTiming,
      ]);

      assert.isTrue(visibleFilter.accept(userTimingEvent));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the blink.console category', async function() {
        const {traceData} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const consoleTimingEvent = (traceData.UserTimings.consoleTimings).at(0);
        assert.isOk(consoleTimingEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(consoleTimingEvent),
            TraceEngine.Types.TraceEvents.KnownEventName.ConsoleTime);
      });

      it('returns UserTiming if the event has the blink.user_timing category', async function() {
        const {traceData} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const userTimingEvent = (traceData.UserTimings.performanceMeasures).at(0);
        assert.isOk(userTimingEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(userTimingEvent),
            TraceEngine.Types.TraceEvents.KnownEventName.UserTiming);
      });

      it('returns the event name if the event is any other category', async function() {
        const {traceData} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
        const layoutShiftEvent = traceData.LayoutShifts.clusters.at(0)?.events.at(0);
        assert.isOk(layoutShiftEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(layoutShiftEvent),
            TraceEngine.Types.TraceEvents.KnownEventName.LayoutShift);
      });
    });
  });

  describe('TimelineInvisibleEventsFilter', () => {
    it('does not accept events that have been set as invisible', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (traceData.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        TraceEngine.Types.TraceEvents.KnownEventName.UserTiming,

      ]);
      assert.isFalse(invisibleFilter.accept(userTimingEvent));
    });

    it('accepts events that have not been set as invisible', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = traceData.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        TraceEngine.Types.TraceEvents.KnownEventName.UserTiming,

      ]);
      assert.isTrue(invisibleFilter.accept(layoutShiftEvent));
    });
  });

  describe('ExclusiveNameFilter', () => {
    it('accepts events that do not match the provided set of names to exclude', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (traceData.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([
        TraceEngine.Types.TraceEvents.KnownEventName.LayoutShift,
      ]);
      assert.isTrue(filter.accept(userTimingEvent));
    });

    it('rejects events that match the provided set of names to exclude', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = traceData.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([
        TraceEngine.Types.TraceEvents.KnownEventName.LayoutShift,
      ]);
      assert.isFalse(filter.accept(layoutShiftEvent));
    });
  });
});
