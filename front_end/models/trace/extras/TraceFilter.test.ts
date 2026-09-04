// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {makeCompleteEvent} from '../../../testing/TraceHelpers.js';
import * as Trace from '../trace.js';

describeWithEnvironment('TraceFilter', () => {
  const userTimingEvent = makeCompleteEvent('some-measure', 0, 10, 'blink.user_timing');
  const consoleTimingEvent = makeCompleteEvent('some-console-time', 0, 10, 'blink.console');
  const layoutShiftEvent = makeCompleteEvent(Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT, 0, 10);

  describe('VisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', () => {
      const visibleFilter = new Trace.Extras.TraceFilter.VisibleEventsFilter([
        // Set a random record type to be visible - the exact type is not important for the test.
        Trace.Types.Events.Name.USER_TIMING,
      ]);

      assert.isTrue(visibleFilter.accept(userTimingEvent));
      assert.isFalse(visibleFilter.accept(layoutShiftEvent));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the blink.console category', () => {
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(consoleTimingEvent),
            Trace.Types.Events.Name.CONSOLE_TIME);
      });

      it('returns UserTiming if the event has the blink.user_timing category', () => {
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(userTimingEvent),
            Trace.Types.Events.Name.USER_TIMING);
      });

      it('returns the event name if the event is any other category', () => {
        assert.strictEqual(
            Trace.Extras.TraceFilter.VisibleEventsFilter.eventType(layoutShiftEvent),
            Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT);
      });
    });
  });

  describe('TimelineInvisibleEventsFilter', () => {
    it('does not accept events that have been set as invisible', () => {
      const invisibleFilter = new Trace.Extras.TraceFilter.InvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,
      ]);
      assert.isFalse(invisibleFilter.accept(userTimingEvent));
    });

    it('accepts events that have not been set as invisible', () => {
      const invisibleFilter = new Trace.Extras.TraceFilter.InvisibleEventsFilter([
        Trace.Types.Events.Name.USER_TIMING,
      ]);
      assert.isTrue(invisibleFilter.accept(layoutShiftEvent));
    });
  });

  describe('ExclusiveNameFilter', () => {
    it('accepts events that do not match the provided set of names to exclude', () => {
      const filter = new Trace.Extras.TraceFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.LAYOUT_SHIFT,
      ]);
      assert.isTrue(filter.accept(userTimingEvent));
    });

    it('rejects events that match the provided set of names to exclude', () => {
      const filter = new Trace.Extras.TraceFilter.ExclusiveNameFilter([
        Trace.Types.Events.Name.SYNTHETIC_LAYOUT_SHIFT,
      ]);
      assert.isFalse(filter.accept(layoutShiftEvent));
    });
  });
});
