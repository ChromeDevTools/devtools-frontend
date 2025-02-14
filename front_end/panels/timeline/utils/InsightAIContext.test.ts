// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describeWithEnvironment('InsightAIContext', () => {
  it('gets the title from the provided insight', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    assert.isOk(insights);
    const firstNav = getFirstOrError(parsedTrace.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);
    const aiContext = new Utils.InsightAIContext.ActiveInsight(insight, parsedTrace);
    assert.strictEqual(aiContext.title(), 'LCP by phase');
  });
});
