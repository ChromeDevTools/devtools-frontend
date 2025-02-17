// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('LongCriticalNetworkTree', function() {
  it('calculates network dependency tree', async () => {
    const {data, insights} = await processTrace(this, 'lcp-multiple-frames.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LongCriticalNetworkTree', insights, firstNav);

    // The network dependency tree in this trace is
    // | .../index.html
    // |
    // | | .../app.css
    // | | .../app.js
    assert.lengthOf(insight.rootNodes, 1);
    assert.strictEqual(insight.rootNodes[0].request.args.data.url, 'http://localhost:8787/lcp-iframes/index.html');
    assert.lengthOf(insight.rootNodes[0].children, 2);

    const [child0, child1] = insight.rootNodes[0].children;
    assert.strictEqual(child0.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.css');
    assert.lengthOf(child0.children, 0);
    assert.strictEqual(child1.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.js');
    assert.lengthOf(child1.children, 0);
  });
});
