// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

function milliToMicro(value: number) {
  return TraceModel.Types.Timing.MicroSeconds(value * 1000);
}

describeWithEnvironment('Timing helpers', () => {
  describe('Timing conversions', () => {
    it('can convert milliseconds to microseconds', () => {
      const input = TraceModel.Types.Timing.MilliSeconds(1);
      const expected = TraceModel.Types.Timing.MicroSeconds(1000);
      assert.strictEqual(TraceModel.Helpers.Timing.millisecondsToMicroseconds(input), expected);
    });

    it('can convert seconds to milliseconds', () => {
      const input = TraceModel.Types.Timing.Seconds(1);
      const expected = TraceModel.Types.Timing.MilliSeconds(1000);
      assert.strictEqual(TraceModel.Helpers.Timing.secondsToMilliseconds(input), expected);
    });

    it('can convert seconds to microseconds', () => {
      const input = TraceModel.Types.Timing.Seconds(1);
      // 1 Second = 1000 Milliseconds
      // 1000 Milliseconds = 1,000,000 Microseconds
      const expected = TraceModel.Types.Timing.MicroSeconds(1_000_000);
      assert.strictEqual(TraceModel.Helpers.Timing.secondsToMicroseconds(input), expected);
    });

    it('can convert microSeconds milliseconds', () => {
      const input = TraceModel.Types.Timing.MicroSeconds(1_000_000);
      const expected = TraceModel.Types.Timing.MilliSeconds(1_000);
      assert.strictEqual(TraceModel.Helpers.Timing.microSecondsToMilliseconds(input), expected);
    });
  });

  it('eventTimingsMicroSeconds returns the right numbers', async () => {
    const event = {
      ts: 10,
      dur: 5,
    } as unknown as TraceModel.Types.TraceEvents.TraceEventData;
    assert.deepEqual(TraceModel.Helpers.Timing.eventTimingsMicroSeconds(event), {
      startTime: TraceModel.Types.Timing.MicroSeconds(10),
      endTime: TraceModel.Types.Timing.MicroSeconds(15),
      duration: TraceModel.Types.Timing.MicroSeconds(5),
    });
  });

  it('eventTimingsMilliSeconds returns the right numbers', async () => {
    const event = {
      ts: 10_000,
      dur: 5_000,
    } as unknown as TraceModel.Types.TraceEvents.TraceEventData;
    assert.deepEqual(TraceModel.Helpers.Timing.eventTimingsMilliSeconds(event), {
      startTime: TraceModel.Types.Timing.MilliSeconds(10),
      endTime: TraceModel.Types.Timing.MilliSeconds(15),
      duration: TraceModel.Types.Timing.MilliSeconds(5),
    });
  });

  it('eventTimingsSeconds returns the right numbers', async () => {
    const event = {
      ts: 100_000,  // 100k microseconds = 100ms = 0.1second
      dur: 50_000,  // 50k microseconds = 50ms = 0.05second
    } as unknown as TraceModel.Types.TraceEvents.TraceEventData;
    assert.deepEqual(TraceModel.Helpers.Timing.eventTimingsSeconds(event), {
      startTime: TraceModel.Types.Timing.Seconds(0.1),
      endTime: TraceModel.Types.Timing.Seconds(0.15),
      duration: TraceModel.Types.Timing.Seconds(0.05),
    });
  });

  describe('timeStampForEventAdjustedByClosestNavigation', () => {
    it('can use the navigation ID to adjust the time correctly', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const lcpEvent = traceData.PageLoadMetrics.allMarkerEvents.find(event => {
        // Just one LCP Event so we do not need to worry about ordering and finding the right one.
        return event.name === 'largestContentfulPaint::Candidate';
      });
      if (!lcpEvent) {
        throw new Error('Could not find LCP event');
      }
      // Ensure we are testing the navigationID path!
      assert.exists(lcpEvent.args.data?.navigationId);
      const adjustedTime = TraceModel.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          lcpEvent,
          traceData.Meta.traceBounds,
          traceData.Meta.navigationsByNavigationId,
          traceData.Meta.navigationsByFrameId,
      );

      const unadjustedTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(
          TraceModel.Types.Timing.MicroSeconds(lcpEvent.ts - traceData.Meta.traceBounds.min),
      );
      assert.strictEqual(unadjustedTime.toFixed(2), String(130.31));

      // To make the assertion easier to read.
      const timeAsMS = TraceModel.Helpers.Timing.microSecondsToMilliseconds(adjustedTime);
      assert.strictEqual(timeAsMS.toFixed(2), String(118.44));
    });

    it('can use the frame ID to adjust the time correctly', async function() {
      const {traceData} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
      const dclEvent = traceData.PageLoadMetrics.allMarkerEvents.find(event => {
        return event.name === 'MarkDOMContent' && event.args.data?.frame === traceData.Meta.mainFrameId;
      });
      if (!dclEvent) {
        throw new Error('Could not find DCL event');
      }
      // Ensure we are testing the frameID path!
      assert.isUndefined(dclEvent.args.data?.navigationId);

      const unadjustedTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(
          TraceModel.Types.Timing.MicroSeconds(dclEvent.ts - traceData.Meta.traceBounds.min),
      );
      assert.strictEqual(unadjustedTime.toFixed(2), String(190.79));
      const adjustedTime = TraceModel.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          dclEvent,
          traceData.Meta.traceBounds,
          traceData.Meta.navigationsByNavigationId,
          traceData.Meta.navigationsByFrameId,
      );

      // To make the assertion easier to read.
      const timeAsMS = TraceModel.Helpers.Timing.microSecondsToMilliseconds(adjustedTime);
      assert.strictEqual(timeAsMS.toFixed(2), String(178.92));
    });
  });

  describe('expandWindowByPercentOrToOneMillisecond', () => {
    it('can expand trace window by a percentage', async function() {
      const traceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          milliToMicro(40),
          milliToMicro(60),
      );

      const maxTraceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          milliToMicro(0),
          milliToMicro(100),
      );

      const expandedTraceWindow =
          TraceModel.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(traceWindow, maxTraceWindow, 50);

      // Since initial window was 20ms, make sure the that it is 30ms after being expanded by 50%
      assert.strictEqual(expandedTraceWindow.range, 30000);
      // min and max bounds are expanded by 25% from the initial window bounds
      assert.strictEqual(expandedTraceWindow.min, 35000);
      assert.strictEqual(expandedTraceWindow.max, 65000);
    });

    it('if the expanded window is smaller than 1 millisecond, expands it to 1 millisecond ', async function() {
      // Trace window that is smaller than 1 millisecond
      const traceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          TraceModel.Types.Timing.MicroSeconds(1000),
          TraceModel.Types.Timing.MicroSeconds(1500),
      );
      const maxTraceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          milliToMicro(0),
          milliToMicro(100),
      );

      const expandedTraceWindow =
          TraceModel.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(traceWindow, maxTraceWindow, 5);

      // Make sure the window was expanded to 1 millisecond instead of 5 percent.
      assert.strictEqual(expandedTraceWindow.range, 1000);
      // The middle of the window should not change
      assert.strictEqual(
          (traceWindow.max + traceWindow.min) / 2, (expandedTraceWindow.max + expandedTraceWindow.min) / 2);

      assert.strictEqual(expandedTraceWindow.min, 750);
      assert.strictEqual(expandedTraceWindow.max, 1750);
    });

    it('window does not expand past the provided max window', async function() {
      const traceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          milliToMicro(5),
          milliToMicro(55),
      );
      const maxTraceWindow = TraceModel.Helpers.Timing.traceWindowFromMicroSeconds(
          milliToMicro(0),
          milliToMicro(100),
      );

      const expandedTraceWindow =
          TraceModel.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(traceWindow, maxTraceWindow, 50);
      assert.strictEqual(expandedTraceWindow.range, 67500);
      // Since the expanded window min bound would be smaller than the max window min bound, the expanded window min should be equal to the max window min
      assert.strictEqual(expandedTraceWindow.min, 0);
      assert.strictEqual(expandedTraceWindow.max, 67500);
    });
  });

  describe('BoundsIncludeTimeRange', () => {
    const {boundsIncludeTimeRange, traceWindowFromMicroSeconds} = TraceModel.Helpers.Timing;

    it('is false for an event that is outside the LHS of the visible bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(10),
          milliToMicro(20),
      );

      assert.isFalse(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });

    it('is false for an event that is outside the RHS of the visible bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(101),
          milliToMicro(200),
      );

      assert.isFalse(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });

    it('is true for an event that overlaps the LHS of the bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(0),
          milliToMicro(52),
      );

      assert.isTrue(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });

    it('is true for an event that overlaps the RHS of the bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(99),
          milliToMicro(101),
      );

      assert.isTrue(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });

    it('is true for an event that is entirely within the bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(51),
          milliToMicro(75),
      );

      assert.isTrue(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });

    it('is true for an event that is larger than the bounds', () => {
      const bounds = traceWindowFromMicroSeconds(
          milliToMicro(50),
          milliToMicro(100),
      );

      const timeRange = traceWindowFromMicroSeconds(
          milliToMicro(0),
          milliToMicro(200),
      );

      assert.isTrue(boundsIncludeTimeRange({
        bounds,
        timeRange,
      }));
    });
  });

  describe('timestampIsInBounds', () => {
    const {eventIsInBounds} = TraceModel.Helpers.Timing;
    const {MicroSeconds} = TraceModel.Types.Timing;

    const bounds: TraceModel.Types.Timing.TraceWindowMicroSeconds = {
      min: MicroSeconds(100),
      max: MicroSeconds(200),
      range: MicroSeconds(100),
    };

    const makeEvent = (ts: number, dur: number) => ({
                                                     ts: TraceModel.Types.Timing.MicroSeconds(ts),
                                                     dur: TraceModel.Types.Timing.MicroSeconds(dur),
                                                   }) as unknown as TraceModel.Types.TraceEvents.TraceEventData;

    // Left boundary
    assert.isTrue(eventIsInBounds(makeEvent(101, 1), bounds));
    assert.isTrue(eventIsInBounds(makeEvent(100, 1), bounds));
    assert.isTrue(eventIsInBounds(makeEvent(99, 1), bounds));
    assert.isTrue(eventIsInBounds(makeEvent(150, 500), bounds));
    assert.isFalse(eventIsInBounds(makeEvent(98, 1), bounds));
    assert.isFalse(eventIsInBounds(makeEvent(0, 1), bounds));
    assert.isFalse(eventIsInBounds(makeEvent(0, 0), bounds));

    // Right boundary
    assert.isTrue(eventIsInBounds(makeEvent(199, 1), bounds));
    assert.isTrue(eventIsInBounds(makeEvent(200, 1), bounds));
    assert.isFalse(eventIsInBounds(makeEvent(201, 1), bounds));
    assert.isFalse(eventIsInBounds(makeEvent(300, 50), bounds));
  });

  describe('timestampIsInBounds', () => {
    const {timestampIsInBounds} = TraceModel.Helpers.Timing;
    const {MicroSeconds} = TraceModel.Types.Timing;
    it('is true if the value is in the bounds and false otherwise', async () => {
      const bounds: TraceModel.Types.Timing.TraceWindowMicroSeconds = {
        min: MicroSeconds(1),
        max: MicroSeconds(10),
        range: MicroSeconds(9),
      };

      assert.isTrue(timestampIsInBounds(bounds, MicroSeconds(1)));
      assert.isTrue(timestampIsInBounds(bounds, MicroSeconds(5)));
      assert.isTrue(timestampIsInBounds(bounds, MicroSeconds(10)));
      assert.isFalse(timestampIsInBounds(bounds, MicroSeconds(0)));
      assert.isFalse(timestampIsInBounds(bounds, MicroSeconds(11)));
    });
  });
});
