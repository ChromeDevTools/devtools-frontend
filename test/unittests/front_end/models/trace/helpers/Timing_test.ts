// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';

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
});
