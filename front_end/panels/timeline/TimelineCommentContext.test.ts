// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describe('TimelineCommentContext', function() {
  describe('agentContextForEntry', () => {
    it('describes the event name, timing, warnings and traced page of an entry', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
      const longTask = parsedTrace.data.Warnings.perWarning.get('LONG_TASK')?.at(0);
      assert.isOk(longTask);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(longTask, parsedTrace);

      assert.deepEqual(lines, [
        'Trace event: RunTask',
        'Timing: starts at 4,264\xA0ms, duration 143\xA0ms, self time 53\xA0μs',
        'Warnings: Long task',
        'Traced page: https://b2607f8b04800100000289cb1c0a82ba72253000000000000000001.proxy.googlers.com/long-interaction/index.html?x=35',
      ]);
    });

    it('omits the lines that have no value', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // Network requests have no tree node, so no self time, and no warnings.
      const request = parsedTrace.data.NetworkRequests.byTime.at(0);
      assert.isOk(request);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(request, parsedTrace);

      assert.deepEqual(lines, [
        'Trace event: SyntheticNetworkRequest',
        'Timing: starts at 4\xA0ms, duration 45\xA0ms',
        'Traced page: https://web.dev/',
      ]);
    });
  });
});
