// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

describeWithEnvironment('LCPDiscovery', function() {
  it('calculates image lcp attributes', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    const {checklist} = insight;

    assert.exists(checklist);
    assert.isFalse(checklist.priorityHinted.value);
    assert.isTrue(checklist.requestDiscoverable.value);
    assert.isTrue(checklist.eagerlyLoaded.value);
  });

  it('uses the fetchpriority=high text when the image has fetchpriority set', async () => {
    const {data, insights} = await processTrace(this, 'lcp-fetchpriority-high.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.isOk(insight.checklist);
    assert.isTrue(insight.checklist.priorityHinted.value);
    assert.strictEqual(insight.checklist.priorityHinted.label, 'fetchpriority=high applied');
  });

  it('uses the should apply fetchpriority=high text when the image does not fetchpriority set', async () => {
    const {data, insights} = await processTrace(this, 'web-dev-with-commit.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.isOk(insight.checklist);
    assert.isFalse(insight.checklist.priorityHinted.value);
    assert.strictEqual(insight.checklist.priorityHinted.label, 'fetchpriority=high should be applied');
  });

  it('calculates the LCP optimal time as the document request download start time', async () => {
    const {data, insights} = await processTrace(this, 'web-dev-with-commit.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPDiscovery', insights, firstNav);
    assert.strictEqual(
        insight.earliestDiscoveryTimeTs,
        // this is the TTFB for the document request
        122411004828,
    );
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPDiscovery', insights, firstNav);

      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });
});
