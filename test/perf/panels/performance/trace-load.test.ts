// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  navigateToPerformanceTab,
  uploadTraceFile,
} from '../../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../../../e2e/shared/DevToolsPage.js';
import type {InspectedPage} from '../../../e2e/shared/InspectedPage.js';
import {percentile} from '../../helpers/perf-helper.js';
import {measurements} from '../../report/report.js';
async function timeFixture(fixture: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage): Promise<number> {
  await navigateToPerformanceTab(devToolsPage, inspectedPage, undefined);
  await devToolsPage.waitFor('.widget.panel.timeline');

  return await uploadTraceFile(devToolsPage, `front_end/panels/timeline/fixtures/traces/${fixture}.gz`);
}

describe('Performance panel trace load performance', () => {
  describe('Large CPU profile load benchmark', function() {
    const RUNS = 10;
    this.timeout(60_000);

    for (let run = 1; run <= RUNS; run++) {
      it('run large cpu profile benchmark ' + run, async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.reload();
        const duration = await timeFixture('large-profile.cpuprofile', devToolsPage, inspectedPage);
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        measurements.LargeCPULoad.push(timeTaken);
      });
    }
  });

  describe('Large DOM trace load benchmark', function() {
    const RUNS = 10;
    // Loading this trace took 10+ seconds before the FlowsHandler fix for
    // crbug.com/382545507. The budget guards against regressions of that
    // magnitude. It is checked against the median of all runs rather than
    // each run individually, so that a single slow iteration on a busy bot
    // does not fail the suite.
    const MEDIAN_LOAD_TIME_BUDGET_MS = 8_000;

    for (let run = 1; run <= RUNS; run++) {
      it('run large dom trace load benchmark ' + run, async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.reload();
        const duration = await timeFixture('dom-size-long.json', devToolsPage, inspectedPage);
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        measurements.LargeDOMTraceLoad.push(timeTaken);
      });
    }

    it('median trace load time stays within budget', async () => {
      const loadTimes = measurements.LargeDOMTraceLoad;
      if (loadTimes.length === 0) {
        // Nothing to check, e.g. because only this test was selected to run.
        return;
      }
      const median = percentile(loadTimes, 0.5);
      assert.isBelow(median, MEDIAN_LOAD_TIME_BUDGET_MS,
                     `Median trace load time of ${median}ms over ${loadTimes.length} runs exceeds the ${
                         MEDIAN_LOAD_TIME_BUDGET_MS}ms budget. Load times: ${loadTimes.join(', ')}`);
    });
  });
});
