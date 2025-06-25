// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

describeWithEnvironment('LCPPhases', function() {
  it('calculates text lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-web-font.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 106.482);

    const wantTtfb = Types.Timing.Micro(6115);
    const wantRenderDelay = Types.Timing.Micro(100367);
    assert.exists(insight.phases);
    const actual = Object.fromEntries(Object.entries(insight.phases).map(([key, value]) => [key, value.range]));
    assert.deepEqual(actual, {ttfb: wantTtfb, renderDelay: wantRenderDelay});
  });

  it('calculates image lcp phases', async () => {
    const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);

    assert.strictEqual(insight.lcpMs, 109.623);

    if (!insight.phases) {
      throw new Error('No LCP phases');
    }

    const phases = {
      ttfb: Helpers.Timing.microToMilli(insight.phases.ttfb?.range).toFixed(2),
      loadTime: Helpers.Timing.microToMilli(insight.phases.loadDuration?.range as Types.Timing.Micro).toFixed(2),
      loadDelay: Helpers.Timing.microToMilli(insight.phases.loadDelay?.range as Types.Timing.Micro).toFixed(2),
      renderDelay: Helpers.Timing.microToMilli(insight.phases.renderDelay?.range).toFixed(2),
    };
    assert.deepEqual(phases, {ttfb: '6.94', loadTime: '12.10', loadDelay: '33.74', renderDelay: '56.85'});
  });

  describe('warnings', function() {
    it('warns when there is no lcp', async () => {
      const {data, insights} = await processTrace(this, 'user-timings.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      assert.isUndefined(insight.lcpMs);
      assert.isUndefined(insight.phases);
      assert.strictEqual(insight.warnings?.[0], 'NO_LCP');
    });

    it('no main document url', async () => {
      const {data, insights} = await processTrace(this, 'about-blank-first.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('LCPPhases', insights, firstNav);

      assert.strictEqual(insight.lcpMs, 204.909);
      assert.isUndefined(insight.phases);
      assert.strictEqual(insight.warnings?.[0], 'NO_DOCUMENT_REQUEST');
    });
  });

  it('can handle old traces with missing data and return null for breakdowns of the phases', async () => {
    const {data, insights} = await processTrace(this, 'multiple-navigations.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const insight = getInsightOrError('LCPPhases', insights, firstNav);
    // This insight has invalid phase data, so we expect the value to be undefined.
    assert.isUndefined(insight.phases);
  });
});
