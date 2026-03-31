// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  navigateToPerformanceTab,
  uploadTraceFile,
} from '../../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../../../e2e/shared/frontend-helper.js';
import type {InspectedPage} from '../../../e2e/shared/target-helper.js';
import {measurements} from '../../report/report.js';
async function timeFixture(fixture: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage): Promise<number> {
  await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);
  await devToolsPage.waitFor('.widget.panel.timeline');

  return await uploadTraceFile(devToolsPage, `front_end/panels/timeline/fixtures/traces/${fixture}.gz`);
}

describe('Performance panel trace load performance', () => {
  // Flaky test
  describe.skip('[crbug.com/497965839] Large CPU profile load benchmark', function() {
    const RUNS = 10;
    this.timeout(40_000);

    for (let run = 1; run <= RUNS; run++) {
      it('run large cpu profile benchmark', async ({devToolsPage, inspectedPage}) => {
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
    this.timeout(8_000);

    for (let run = 1; run <= RUNS; run++) {
      it('run large dom trace load benchmark', async ({devToolsPage, inspectedPage}) => {
        await devToolsPage.reload();
        const duration = await timeFixture('dom-size-long.json', devToolsPage, inspectedPage);
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        measurements.LargeDOMTraceLoad.push(timeTaken);
      });
    }
  });
});
