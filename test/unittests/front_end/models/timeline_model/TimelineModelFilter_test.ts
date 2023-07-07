// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import {
  DevToolsTimelineCategory,
  makeFakeSDKEventFromPayload,
} from '../../helpers/TraceHelpers.js';

const consoleEvent = makeFakeSDKEventFromPayload({
  categories: [DevToolsTimelineCategory, TimelineModel.TimelineModel.TimelineModelImpl.Category.Console],
  name: TimelineModel.TimelineModel.RecordType.ConsoleTime,
  ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
  ts: 1,
});

const userTimingEvent = makeFakeSDKEventFromPayload({
  categories: [DevToolsTimelineCategory, TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming],
  name: TimelineModel.TimelineModel.RecordType.UserTiming,
  ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
  ts: 1,
});

describe('TimelineModelFilter', () => {
  describe('TimelineVisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', () => {
      const visibleFilter = new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter([
        // Set an random record type to be visible - the exact type is not important for the test.
        TimelineModel.TimelineModel.RecordType.ConsoleTime,
      ]);

      assert.isTrue(visibleFilter.accept(consoleEvent));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the Console category', () => {
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(consoleEvent),
            TimelineModel.TimelineModel.RecordType.ConsoleTime);
      });

      it('returns UserTiming if the event has the UserTiming category', () => {
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(userTimingEvent),
            TimelineModel.TimelineModel.RecordType.UserTiming);
      });

      it('returns the event name if the event is any other category', () => {
        const otherEvent = makeFakeSDKEventFromPayload({
          categories: [DevToolsTimelineCategory, TimelineModel.TimelineModel.TimelineModelImpl.Category.Loading],
          name: 'other',
          ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
          ts: 1,
        });
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(otherEvent), 'other');
      });
    });
  });

  describe('TimelineInvisibleEventsFilter', () => {
    it('does not accept events that have been set as invisible', () => {
      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        // Set an random record type to be invisible - the exact type is not important for the test.
        TimelineModel.TimelineModel.RecordType.ConsoleTime,
      ]);
      assert.isFalse(invisibleFilter.accept(consoleEvent));
    });
    it('accepts events that have not been set as invisible', () => {
      const invisibleFilter = new TimelineModel.TimelineModelFilter.TimelineInvisibleEventsFilter([
        // Set an random record type to be invisible - the exact type is not important for the test.
        TimelineModel.TimelineModel.RecordType.ConsoleTime,
      ]);
      assert.isTrue(invisibleFilter.accept(userTimingEvent));
    });
  });

  describe('ExclusiveNameFilter', () => {
    function makeEventWithName(name: string): TraceEngine.Legacy.Event {
      return makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
      });
    }
    it('accepts events that do not match the provided set of names to exclude', () => {
      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter(['exclude-name']);
      const event = makeEventWithName('some-event');
      assert.isTrue(filter.accept(event));
    });
    it('rejects events that match the provided set of names to exclude', () => {
      const filter = new TimelineModel.TimelineModelFilter.ExclusiveNameFilter(['exclude-name']);
      const event = makeEventWithName('exclude-name');
      assert.isFalse(filter.accept(event));
    });
  });
});
