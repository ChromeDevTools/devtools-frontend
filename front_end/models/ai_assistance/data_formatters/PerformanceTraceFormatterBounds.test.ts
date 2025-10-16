// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {AIContext, PerformanceTraceFormatter} from '../ai_assistance.js';

async function createFormatter(context: Mocha.Context|Mocha.Suite|null, name: string): Promise<
    {formatter: PerformanceTraceFormatter.PerformanceTraceFormatter, parsedTrace: Trace.TraceModel.ParsedTrace}> {
  const parsedTrace = await TraceLoader.traceEngine(context, name, undefined, {
    withTimelinePanel: false,
  });
  assert.isOk(parsedTrace.insights);
  const focus = AIContext.AgentFocus.fromParsedTrace(parsedTrace);
  const formatter = new PerformanceTraceFormatter.PerformanceTraceFormatter(focus);
  return {formatter, parsedTrace};
}

describe('PerformanceTraceFormatter', () => {
  let snapshotTester: SnapshotTester;
  before(async () => {
    snapshotTester = new SnapshotTester(import.meta);
    await snapshotTester.load();
  });

  after(async () => {
    await snapshotTester.finish();
  });

  describe('serializeBounds', () => {
    it('works', async function() {
      const {formatter} = await createFormatter(this, 'web-dev.json.gz');
      const output = formatter.serializeBounds({
        min: Trace.Types.Timing.Micro(1),
        max: Trace.Types.Timing.Micro(2),
        range: Trace.Types.Timing.Micro(2),
      });
      snapshotTester.assert(this, output);
    });
  });
});
