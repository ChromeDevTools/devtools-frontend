// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

import {loadModelDataFromTraceFile} from '../../helpers/TraceHelpers.js';

describe('TraceModel helpers', async () => {
  describe('extractOriginFromTrace', () => {
    it('extracts the origin of a parsed trace correctly', async () => {
      const model = await loadModelDataFromTraceFile('web-dev.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(model);
      assert.strictEqual(origin, 'web.dev');
    });

    it('will remove the `www` if it is present', async () => {
      const traceEvents = await loadModelDataFromTraceFile('multiple-navigations.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(traceEvents);
      assert.strictEqual(origin, 'google.com');
    });

    it('returns null when no origin is found', async () => {
      const traceEvents = await loadModelDataFromTraceFile('basic.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(traceEvents);
      assert.isNull(origin);
    });
  });

  describe('Timing conversions', () => {
    it('can convert milliseconds to microseconds', () => {
      const input = TraceModel.Types.Timing.MilliSeconds(1);
      const expected = TraceModel.Types.Timing.MicroSeconds(1000);
      assert.strictEqual(TraceModel.Helpers.millisecondsToMicroseconds(input), expected);
    });

    it('can convert seconds to milliseconds', () => {
      const input = TraceModel.Types.Timing.Seconds(1);
      const expected = TraceModel.Types.Timing.MilliSeconds(1000);
      assert.strictEqual(TraceModel.Helpers.secondsToMilliseconds(input), expected);
    });

    it('can convert seconds to microseconds', () => {
      const input = TraceModel.Types.Timing.Seconds(1);
      // 1 Second = 1000 Milliseconds
      // 1000 Millisecond = 1,000,000 Microseconds
      const expected = TraceModel.Types.Timing.MicroSeconds(1_000_000);
      assert.strictEqual(TraceModel.Helpers.secondsToMicroseconds(input), expected);
    });
  });
});
