// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import * as TimelineUtils from '../../panels/timeline/utils/utils.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Tracing from './tracing.js';

const {getInsightAgentFocusToDebug} = Tracing.ExternalRequests;

describeWithEnvironment('ExternalRequests', () => {
  it('finds the insight by the title', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    const model = Trace.TraceModel.Model.createWithAllHandlers();
    await model.parse(events);

    const result = await getInsightAgentFocusToDebug(model, 'LCP breakdown');
    if ('error' in result) {
      assert.fail(`Test failed: ${result.error}`);
    }
    assert.instanceOf(result.focus, TimelineUtils.AIContext.AgentFocus);
    assert.strictEqual(result.focus.data.type === 'insight' && result.focus.data.insight.insightKey, 'LCPBreakdown');
  });

  it('errors if it cannot find the insight', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    const model = Trace.TraceModel.Model.createWithAllHandlers();
    await model.parse(events);

    const result = await getInsightAgentFocusToDebug(model, 'FakeInsightTitle');
    if ('focus' in result) {
      assert.fail('Test should not find an focus.');
    }
    assert.strictEqual(result.error, 'Could not find matching insight for FakeInsightTitle');
  });
});
