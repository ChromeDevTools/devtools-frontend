// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadModelDataFromTraceFile} from '../../../helpers/TraceHelpers.js';

const {assert} = chai;
function milliToMicro(value: number) {
  return TraceModel.Types.Timing.MicroSeconds(value * 1000);
}
function secToMicro(value: TraceModel.Types.Timing.Seconds): TraceModel.Types.Timing.MicroSeconds {
  return milliToMicro(value * 1000);
}

describe('Timing helpers', () => {
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
  describe('detectBestTimeUnit', () => {
    it('detects microseconds', () => {
      const time = TraceModel.Types.Timing.MicroSeconds(890);
      assert.strictEqual(
          TraceModel.Helpers.Timing.detectBestTimeUnit(time), TraceModel.Types.Timing.TimeUnit.MICROSECONDS);
    });

    it('detects milliseconds', () => {
      const time = milliToMicro(8.9122);
      assert.strictEqual(
          TraceModel.Helpers.Timing.detectBestTimeUnit(time), TraceModel.Types.Timing.TimeUnit.MILLISECONDS);
    });

    it('detects seconds', () => {
      const time = secToMicro(TraceModel.Types.Timing.Seconds(8.9134));
      assert.strictEqual(TraceModel.Helpers.Timing.detectBestTimeUnit(time), TraceModel.Types.Timing.TimeUnit.SECONDS);
    });

    it('detects minutes', () => {
      const time = secToMicro(TraceModel.Types.Timing.Seconds(203));  // 3 mins, 23 sec in seconds.
      assert.strictEqual(TraceModel.Helpers.Timing.detectBestTimeUnit(time), TraceModel.Types.Timing.TimeUnit.MINUTES);
    });
  });

  describe('formatTime', () => {
    it('formats microseconds', () => {
      const time = TraceModel.Types.Timing.MicroSeconds(890);
      assert.strictEqual(TraceModel.Helpers.Timing.formatMicrosecondsTime(time), '890μs');
    });

    it('formats milliseconds', () => {
      const time = milliToMicro(8.9122);
      assert.strictEqual(TraceModel.Helpers.Timing.formatMicrosecondsTime(time), '8.912ms');
    });

    it('formats seconds', () => {
      const time = secToMicro(TraceModel.Types.Timing.Seconds(8.9134));
      assert.strictEqual(TraceModel.Helpers.Timing.formatMicrosecondsTime(time), '8.913s');
    });

    it('formats minutes', () => {
      const time = secToMicro(TraceModel.Types.Timing.Seconds(203));  // 3 mins, 23 sec in seconds.
      assert.strictEqual(TraceModel.Helpers.Timing.formatMicrosecondsTime(time), '3m 23s');
    });
  });

  describe('timeStampForEventAdjustedByClosestNavigation', () => {
    it('can use the navigation ID to adjust the time correctly', async () => {
      const traceParsedData = await loadModelDataFromTraceFile('web-dev.json.gz');
      const lcpEvent = traceParsedData.PageLoadMetrics.allMarkerEvents.find(event => {
        // Just one LCP Event so we do not need to worry about ordering and finding the right one.
        return event.name === 'largestContentfulPaint::Candidate';
      });
      if (!lcpEvent) {
        throw new Error('Could not find LCP event');
      }
      // Ensure we are testing the navigationID path!
      assert.isDefined(lcpEvent.args.data?.navigationId);
      const adjustedTime = TraceModel.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          lcpEvent,
          traceParsedData.Meta.traceBounds,
          traceParsedData.Meta.navigationsByNavigationId,
          traceParsedData.Meta.navigationsByFrameId,
      );

      const unadjustedTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(
          TraceModel.Types.Timing.MicroSeconds(lcpEvent.ts - traceParsedData.Meta.traceBounds.min),
      );
      assert.strictEqual(unadjustedTime.toFixed(2), String(130.31));

      // To make the assertion easier to read.
      const timeAsMS = TraceModel.Helpers.Timing.microSecondsToMilliseconds(adjustedTime);
      assert.strictEqual(timeAsMS.toFixed(2), String(118.44));
    });

    it('can use the frame ID to adjust the time correctly', async () => {
      const traceParsedData = await loadModelDataFromTraceFile('web-dev.json.gz');
      const dclEvent = traceParsedData.PageLoadMetrics.allMarkerEvents.find(event => {
        return event.name === 'MarkDOMContent' && event.args.data?.frame === traceParsedData.Meta.mainFrameId;
      });
      if (!dclEvent) {
        throw new Error('Could not find DCL event');
      }
      // Ensure we are testing the frameID path!
      assert.isUndefined(dclEvent.args.data?.navigationId);

      const unadjustedTime = TraceModel.Helpers.Timing.microSecondsToMilliseconds(
          TraceModel.Types.Timing.MicroSeconds(dclEvent.ts - traceParsedData.Meta.traceBounds.min),
      );
      assert.strictEqual(unadjustedTime.toFixed(2), String(190.79));
      const adjustedTime = TraceModel.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          dclEvent,
          traceParsedData.Meta.traceBounds,
          traceParsedData.Meta.navigationsByNavigationId,
          traceParsedData.Meta.navigationsByFrameId,
      );

      // To make the assertion easier to read.
      const timeAsMS = TraceModel.Helpers.Timing.microSecondsToMilliseconds(adjustedTime);
      assert.strictEqual(timeAsMS.toFixed(2), String(178.92));
    });
  });
});
