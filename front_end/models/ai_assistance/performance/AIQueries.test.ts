// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightSetOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import {AIQueries} from '../ai_assistance.js';

describeWithEnvironment('AIQueries', () => {
  it('can query for the longest tasks', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(parsedTrace.insights);

    const firstNav = getFirstOrError(parsedTrace.data.Meta.navigationsByNavigationId.values());
    const insightSet = getInsightSetOrError(parsedTrace.insights, firstNav);
    const tasks = AIQueries.longestTasks(firstNav.args.data?.navigationId, insightSet.bounds, parsedTrace);
    assert.isOk(tasks);

    const expected = [39, 33, 21];
    assert.deepEqual(tasks.map(task => Math.round(task.rootNode.totalTime)), expected);
  });
});
