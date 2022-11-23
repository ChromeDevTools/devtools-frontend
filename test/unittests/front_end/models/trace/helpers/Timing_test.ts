// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

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
