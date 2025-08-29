// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

describeWithEnvironment('LCPBreakdown', function() {
  it('calculates text lcp breakdown', async () => {
    const {data, insights} = await processTrace(this, 'lcp-web-font.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 106.482);

    const wantTtfb = Types.Timing.Micro(6115);
    const wantRenderDelay = Types.Timing.Micro(100367);
    assert.exists(insight.subparts);
    const actual = Object.fromEntries(Object.entries(insight.subparts).map(([key, value]) => [key, value.range]));
    assert.deepEqual(actual, {ttfb: wantTtfb, renderDelay: wantRenderDelay});
  });

  it('calculates text lcp breakdown (doc missing receiveHeadersStart)', async () => {
    const {data, insights} = await processTrace(this, 'web-dev.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 118.437);

    const wantTtfb = Types.Timing.Micro(31343);
    const wantRenderDelay = Types.Timing.Micro(87094);
    assert.exists(insight.subparts);
    const actual = Object.fromEntries(Object.entries(insight.subparts).map(([key, value]) => [key, value.range]));
    assert.deepEqual(actual, {ttfb: wantTtfb, renderDelay: wantRenderDelay});
  });

  it('calculates image lcp breakdown', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 109.623);

    if (!insight.subparts) {
      throw new Error('No LCP subparts');
    }

    const subparts = {
      ttfb: Helpers.Timing.microToMilli(insight.subparts.ttfb?.range).toFixed(2),
      loadTime: Helpers.Timing.microToMilli(insight.subparts.loadDuration?.range as Types.Timing.Micro).toFixed(2),
      loadDelay: Helpers.Timing.microToMilli(insight.subparts.loadDelay?.range as Types.Timing.Micro).toFixed(2),
      renderDelay: Helpers.Timing.microToMilli(insight.subparts.renderDelay?.range).toFixed(2),
    };
    assert.deepEqual(subparts, {ttfb: '6.94', loadTime: '12.10', loadDelay: '33.74', renderDelay: '56.85'});
  });

  it('calculates image lcp breakdown (doc missing receiveHeadersStart)', async () => {
    const {data, insights} = await processTrace(this, 'multiple-navigations.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 118.677);

    if (!insight.subparts) {
      throw new Error('No LCP subparts');
    }

    const subparts = {
      ttfb: Helpers.Timing.microToMilli(insight.subparts.ttfb?.range).toFixed(2),
      loadTime: Helpers.Timing.microToMilli(insight.subparts.loadDuration?.range as Types.Timing.Micro).toFixed(2),
      loadDelay: Helpers.Timing.microToMilli(insight.subparts.loadDelay?.range as Types.Timing.Micro).toFixed(2),
      renderDelay: Helpers.Timing.microToMilli(insight.subparts.renderDelay?.range).toFixed(2),
    };
    assert.deepEqual(subparts, {ttfb: '61.47', loadTime: '0.19', loadDelay: '47.74', renderDelay: '9.28'});
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

      assert.isUndefined(insight.lcpMs);
      assert.isUndefined(insight.subparts);
      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPBreakdown', insights, firstNav);

      assert.strictEqual(insight.lcpMs, 204.909);
      assert.isUndefined(insight.subparts);
      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });
});
