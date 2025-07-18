// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

const {getInsightToDebug} = Timeline.ExternalRequests;

describeWithEnvironment('ExternalRequests', () => {
  it('finds the insight by the title', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    const model = Trace.TraceModel.Model.createWithAllHandlers();
    await model.parse(events);

    const result = await getInsightToDebug(model, 'LCP breakdown');
    if ('error' in result) {
      assert.fail(`Test failed: ${result.error}`);
    }
    assert.instanceOf(result.insight, Timeline.Utils.InsightAIContext.ActiveInsight);
    assert.strictEqual(result.insight.insight.insightKey, 'LCPBreakdown');
  });

  it('errors if it cannot find the insight', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    const model = Trace.TraceModel.Model.createWithAllHandlers();
    await model.parse(events);

    const result = await getInsightToDebug(model, 'FakeInsightTitle');
    if ('insight' in result) {
      assert.fail('Test should not find an insight.');
    }
    assert.strictEqual(result.error, 'Could not find matching insight for FakeInsightTitle');
  });
});
