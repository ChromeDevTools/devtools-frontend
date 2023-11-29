// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type ElementHandle} from 'puppeteer-core';

import type * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import {
  navigateToPerformanceTab,
} from '../../../e2e/helpers/performance-helpers.js';
import {
  reloadDevTools,
  waitFor,
} from '../../../shared/helper.js';
import {mean, percentile} from '../../helpers/perf-helper.js';
import {addBenchmarkResult, type Benchmark} from '../../report/report.js';

async function getPanelWithFixture(fixture: string): Promise<ElementHandle> {
  await navigateToPerformanceTab();
  const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
  await uploadProfileHandle.uploadFile(`test/unittests/fixtures/traces/${fixture}.json.gz`);
  return await waitFor('.widget.panel.timeline');
}
describe('Performance panel trace load performance', () => {
  const allBenchmarks: Benchmark[] = [];

  describe('Total trace load time', async () => {
    beforeEach(async () => {
      // Reload devtools to get a fresh version of the panel on each
      // run and prevent a skew due to caching, etc.
      await reloadDevTools();
    });
    const RUNS = 10;
    const traceLoadBenchmark: Benchmark = {
      name: 'TraceLoad',
      values: [],
      mean: 0,
      percentile50: 0,
      percentile90: 0,
      percentile99: 0,
    };
    for (let run = 1; run <= RUNS; run++) {
      it(`run ${run}/${RUNS}`, async function() {
        this.timeout(20_000);
        const panelElement = await getPanelWithFixture('web-dev');
        const eventPromise = panelElement.evaluate(el => {
          return new Promise<number>(resolve => {
            el.addEventListener('traceload', e => {
              const ev = e as Timeline.BenchmarkEvents.TraceLoadEvent;
              resolve(ev.duration);
            }, {once: true});
          });
        });
        const duration = await eventPromise;
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        traceLoadBenchmark.values.push(timeTaken);
      });
    }
    after(() => {
      allBenchmarks.push(traceLoadBenchmark);
    });
  });

  after(async () => {
    // Calculate statistics for each benchmark.
    for (const benchmark of allBenchmarks) {
      /* eslint-disable no-console */
      const values = benchmark.values;
      benchmark.mean = Number(mean(values).toFixed(2));
      benchmark.percentile50 = Number(percentile(values, 0.5).toFixed(2));
      benchmark.percentile90 = Number(percentile(values, 0.9).toFixed(2));
      benchmark.percentile99 = Number(percentile(values, 0.99).toFixed(2));
      addBenchmarkResult(benchmark);
      console.log(`Benchmark name: ${benchmark.name}`);
      console.log(`Mean boot time: ${benchmark.mean}ms`);
      console.log(`50th percentile boot time: ${benchmark.percentile50}ms`);
      console.log(`90th percentile boot time: ${benchmark.percentile90}ms`);
      console.log(`99th percentile boot time: ${benchmark.percentile99}ms`);
      /* eslint-enable no-console */
    }
  });
});
