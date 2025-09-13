// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('TraceFilter', () => {
  describe('VisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (data.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const visibleFilter = new Trace.Extras.TraceFilter.VisibleEventsFilter([
        // Set an random record type to be visible - the exact type is not important for the test.
        Trace.Types.Events.Name.USER_TIMING,
      ]);

      assert.isTrue(visibleFilter.accept(userTimingEvent));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the blink.console category', async function() {
        const {data} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const consoleTimingEvent = (data.UserTimings.consoleTimings).at(0);
        assert.isOk(consoleTimingEvent);
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(consoleTimingEvent),
            Trace.Types.Events.Name.CONSOLE_TIME);
      });

      it('returns UserTiming if the event has the blink.user_timing category', async function() {
        const {data} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
        const userTimingEvent = (data.UserTimings.performanceMeasures).at(0);
        assert.isOk(userTimingEvent);
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(userTimingEvent),
            Trace.Types.Events.Name.USER_TIMING);
      });

      it('returns the event name if the event is any other category', async function() {
        const {data} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
        const layoutShiftEvent = data.LayoutShifts.clusters.at(0)?.events.at(0);
        assert.isOk(layoutShiftEvent);
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(layoutShiftEvent),
            Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT);
      });
    });
  });

  describe('TimelineInvisibleEventsFilter', () => {
    it('does not accept events that have been set as invisible', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (data.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const invisibleFilter = new Trace.Extras.TraceFilter.InvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,

      ]);
      assert.isFalse(invisibleFilter.accept(userTimingEvent));
    });

    it('accepts events that have not been set as invisible', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = data.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const invisibleFilter = new Trace.Extras.TraceFilter.InvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,

      ]);
      assert.isTrue(invisibleFilter.accept(layoutShiftEvent));
    });
  });

  describe('ExclusiveNameFilter', () => {
    it('accepts events that do not match the provided set of names to exclude', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = (data.UserTimings.performanceMeasures).at(0);
      assert.isOk(userTimingEvent);

      const filter = new Trace.Extras.TraceFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.LAYOUT_SHIFT,
      ]);
      assert.isTrue(filter.accept(userTimingEvent));
    });

    it('rejects events that match the provided set of names to exclude', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const layoutShiftEvent = data.LayoutShifts.clusters.at(0)?.events.at(0);
      assert.isOk(layoutShiftEvent);

      const filter = new Trace.Extras.TraceFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT,
      ]);
      assert.isFalse(filter.accept(layoutShiftEvent));
    });
  });
});
