// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {
  createContextForNavigation,
  getFirstOrError,
  getInsightOrError,
  processTrace,
} from '../../../testing/InsightHelpers.js';
import * as Trace from '../trace.js';

describeWithEnvironment('Viewport', function() {
  it('detects mobile optimized viewport', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const insight =
        getInsightOrError('Viewport', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));

    assert.isTrue(insight.mobileOptimized);
  });

  it('detects mobile unoptimized viewport (w/ no pointer interactions)', async () => {
    const {data} = await processTrace(this, 'lcp-images.json.gz');
    const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const context = createContextForNavigation(data, navigation, data.Meta.mainFrameId);
    const events =
        data.UserInteractions.beginCommitCompositorFrameEvents.filter(event => event.args.frame === context.frameId);
    assert.isNotEmpty(events);
    for (const event of events) {
      event.args.is_mobile_optimized = false;
    }

    const insight = Trace.Insights.Models.Viewport.generateInsight(data, context);
    assert.isFalse(insight.mobileOptimized);
    assert.strictEqual(insight.metricSavings?.INP, 0);
    assert.isEmpty(insight.longPointerInteractions);
  });

  it('detects mobile unoptimized viewport (w/ pointer interactions)', async () => {
    const {data} = await processTrace(this, 'nytimes-bad-mobile-viewport.json.gz');
    const context = {
      bounds: data.Meta.traceBounds,
      frameId: data.Meta.mainFrameId,
    };

    const insight = Trace.Insights.Models.Viewport.generateInsight(data, context);
    assert.isFalse(insight.mobileOptimized);
    assert.strictEqual(insight.metricSavings?.INP, 248);
    assert.lengthOf(insight.longPointerInteractions ?? [], 1);
  });
});
