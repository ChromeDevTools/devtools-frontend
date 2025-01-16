// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('DOMStatsHandler', () => {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.DOMStats.reset();
    Trace.Handlers.ModelHandlers.Meta.reset();
  });

  it('should get DOM stats for each frame', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'multi-frame-dom-stats.json.gz');

    const {mainFrameId} = parsedTrace.Meta;
    const {domStatsByFrameId} = parsedTrace.DOMStats;

    assert.strictEqual(domStatsByFrameId.size, 2);
    const mainFrameStats = domStatsByFrameId.get(mainFrameId)!.at(-1);
    const mainFrameData = mainFrameStats!.args.data;
    assert.strictEqual(mainFrameData.totalElements, 7);
    assert.strictEqual(mainFrameData.maxDepth!.depth, 3);
    assert.strictEqual(mainFrameData.maxDepth!.nodeName, 'DIV id=\'child\'');
    assert.strictEqual(mainFrameData.maxChildren!.numChildren, 4);
    assert.strictEqual(mainFrameData.maxChildren!.nodeName, 'BODY');
  });
});
