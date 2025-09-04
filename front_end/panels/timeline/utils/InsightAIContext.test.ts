// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightSetOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithEnvironment('AIQueries', () => {
  it('can query for the longest tasks', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);

    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insightSet = getInsightSetOrError(insights, firstNav);
    const tasks =
        Utils.InsightAIContext.AIQueries.longestTasks(firstNav.args.data?.navigationId, insightSet.bounds, parsedTrace);
    assert.isOk(tasks);

    const expected = [33, 21, 16];
    assert.deepEqual(tasks.map(task => Math.round(task.rootNode.totalTime)), expected);
  });
});
