// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../trace.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

async function parseAndFinalizeData(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const traceEvents = await TraceLoader.rawEvents(testContext, traceFile);
  TraceModel.Handlers.ModelHandlers.Meta.reset();
  TraceModel.Handlers.ModelHandlers.Meta.initialize();
  for (const event of traceEvents) {
    TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    TraceModel.Handlers.ModelHandlers.UserInteractions.handleEvent(event);
  }
  await TraceModel.Handlers.ModelHandlers.Meta.finalize();
  await TraceModel.Handlers.ModelHandlers.UserInteractions.finalize();

  const data = {
    Meta: TraceModel.Handlers.ModelHandlers.Meta.data(),
    UserInteractions: TraceModel.Handlers.ModelHandlers.UserInteractions.data(),
  } as TraceModel.Handlers.Types.EnabledHandlerDataWithMeta<typeof TraceModel.Handlers.ModelHandlers>;

  return data;
}

describe('Viewport', function() {
  it('detects mobile optimized viewport', async () => {
    const data = await parseAndFinalizeData(this, 'lcp-images.json.gz');
    const context = {
      frameId: data.Meta.mainFrameId,
      navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
    };

    const insight = TraceModel.Insights.InsightRunners.Viewport.generateInsight(data, context);
    assert.strictEqual(insight.mobileOptimized, true);
  });

  it('detects mobile unoptimized viewport', async () => {
    const data = await parseAndFinalizeData(this, 'lcp-images.json.gz');
    const context = {
      frameId: data.Meta.mainFrameId,
      navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
    };
    const events =
        data.UserInteractions.beginCommitCompositorFrameEvents.filter(event => event.args.frame === context.frameId);
    assert.isNotEmpty(events);
    for (const event of events) {
      event.args.is_mobile_optimized = false;
    }

    const insight = TraceModel.Insights.InsightRunners.Viewport.generateInsight(data, context);
    assert.strictEqual(insight.mobileOptimized, false);
  });
});
