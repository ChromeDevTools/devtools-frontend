// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

import type * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import {GEN_DIR} from '../../../conductor/paths.js';
import {
  navigateToPerformanceTab,
} from '../../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../../e2e_non_hosted/shared/target-helper.js';
import {measurements} from '../../report/report.js';

async function timeFixture(fixture: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage): Promise<number> {
  await navigateToPerformanceTab(undefined, devToolsPage, inspectedPage);
  const panelElement = await devToolsPage.waitFor('.widget.panel.timeline');
  await panelElement.evaluate(el => {
    // @ts-expect-error page context.
    window.perfDuration = 0;
    el.addEventListener('traceload', e => {
      const ev = e as Timeline.BenchmarkEvents.TraceLoadEvent;
      // @ts-expect-error page context.
      window.perfDuration = ev.duration;
    }, {once: true});
  });
  const uploadProfileHandle = await devToolsPage.waitFor('input[type=file]');
  await uploadProfileHandle.uploadFile(path.join(GEN_DIR, `front_end/panels/timeline/fixtures/traces/${fixture}.gz`));
  // We use wait for function to avoid long running evaluation calls to
  // avoid protocol-level timeouts.
  return await devToolsPage.waitForFunction(async () => {
    const result = await devToolsPage.evaluate(() => {
      // @ts-expect-error page context.
      return window.perfDuration;
    });
    if (!result) {
      return undefined;
    }
    return result;
  });
}

describe('Performance panel trace load performance', () => {
  // Skipped because this throws range errors
  describe('[crbug.com/433466849] Large CPU profile load benchmark', function() {
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
