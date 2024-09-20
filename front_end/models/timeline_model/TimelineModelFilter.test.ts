// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as Trace from '../trace/trace.js';

describeWithEnvironment('TimelineModelFilter', () => {
  describe('TimelineVisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (parsedTrace.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const visibleFilter = new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter([
        // Set an random record type to be visible - the exact type is not important for the test.
        Trace.Types.Events.Name.USER_TIMING,
      ]);

      assert.isTrue(visibleFilter.accept(userTimingEvent));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the blink.console category', async function() {
        const {parsedTrace} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const consoleTimingEvent = (parsedTrace.UserTimings.consoleTimings).at(0);
        assert.isOk(consoleTimingEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(consoleTimingEvent),
            Trace.Types.Events.Name.CONSOLE_TIME);
      });

      it('returns UserTiming if the event has the blink.user_timing category', async function() {
        const {parsedTrace} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const userTimingEvent = (parsedTrace.UserTimings.performanceMeasures).at(0);
        assert.isOk(userTimingEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(userTimingEvent),
            Trace.Types.Events.Name.USER_TIMING);
      });

      it('returns the event name if the event is any other category', async function() {
        const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
        const layoutShiftEvent = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
        assert.isOk(layoutShiftEvent);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(layoutShiftEvent),
            Trace.Types.Events.Name.LAYOUT_SHIFT);
      });
    });
  });

  describe('TimelineInvisibleEventsFilter', () => {
    it('does not accept events that have been set as invisible', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (parsedTrace.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,

      ]);
      assert.isFalse(invisibleFilter.accept(userTimingEvent));
    });

    it('accepts events that have not been set as invisible', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,

      ]);
      assert.isTrue(invisibleFilter.accept(layoutShiftEvent));
    });
  });

  describe('ExclusiveNameFilter', () => {
    it('accepts events that do not match the provided set of names to exclude', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (parsedTrace.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.LAYOUT_SHIFT,
      ]);
      assert.isTrue(filter.accept(userTimingEvent));
    });

    it('rejects events that match the provided set of names to exclude', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.LAYOUT_SHIFT,
      ]);
      assert.isFalse(filter.accept(layoutShiftEvent));
    });
  });
});
