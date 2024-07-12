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
      selfTime: TraceModel.Types.Timing.MicroSeconds(5),
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
      selfTime: TraceModel.Types.Timing.MilliSeconds(5),
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
      selfTime: TraceModel.Types.Timing.Seconds(0.05),
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
