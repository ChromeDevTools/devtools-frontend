// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';

function makeFakeEventWithName(name: TimelineModel.TimelineModel.RecordType): SDK.TracingModel.Event {
  const event = {
    name,
    hasCategory() {
      // Stub out the hasCategory method to avoid test run errors.
      return false;
    },
  };
  return event as unknown as SDK.TracingModel.Event;
}

function makeFakeEventWithCategory(category: string): SDK.TracingModel.Event {
  const event = {
    name: 'fake-test-event',
    hasCategory(c: string) {
      return c === category;
    },
  };
  return event as unknown as SDK.TracingModel.Event;
}

describe('TimelineModelFilter', () => {
  describe('TimelineVisibleEventsFilter', () => {
    it('accepts events that are set in the constructor and rejects other events', () => {
      const visibleFilter = new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter([
        // Set an random record type to be visible - the exact type is not important for the test.
        TimelineModel.TimelineModel.RecordType.ConsoleTime,
      ]);

      assert.isTrue(visibleFilter.accept(makeFakeEventWithName(TimelineModel.TimelineModel.RecordType.ConsoleTime)));
      assert.isFalse(visibleFilter.accept(makeFakeEventWithName(TimelineModel.TimelineModel.RecordType.LatencyInfo)));
    });

    describe('eventType', () => {
      it('returns ConsoleTime if the event has the Console category', () => {
        const consoleEvent = makeFakeEventWithCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.Console);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(consoleEvent),
            TimelineModel.TimelineModel.RecordType.ConsoleTime);
      });

      it('returns UserTiming if the event has the UserTiming category', () => {
        const timingEvent =
            makeFakeEventWithCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(timingEvent),
            TimelineModel.TimelineModel.RecordType.UserTiming);
      });

      it('returns LatencyInfo if the event has the LatencyInfo category', () => {
        const latencyInfoEvent =
            makeFakeEventWithCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.LatencyInfo);
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(latencyInfoEvent),
            TimelineModel.TimelineModel.RecordType.LatencyInfo);
      });

      it('returns the event name if the event is any other category', () => {
        const otherEvent = makeFakeEventWithCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.Loading);
        otherEvent.name = 'other';
        assert.strictEqual(
            TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter.eventType(otherEvent), 'other');
      });
    });
  });
});
