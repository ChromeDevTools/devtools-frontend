// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

import type * as Timeline from '../../../../front_end/panels/timeline/timeline.js';
import {GEN_DIR} from '../../../conductor/paths.js';
import {
  navigateToPerformanceTab,
} from '../../../e2e/helpers/performance-helpers.js';
import {
  reloadDevTools,
  waitFor,
} from '../../../shared/helper.js';
import {mean, percentile} from '../../helpers/perf-helper.js';
import {addBenchmarkResult, type Benchmark} from '../../report/report.js';

async function timeFixture(fixture: string): Promise<number> {
  await navigateToPerformanceTab();
  const panelElement = await waitFor('.widget.panel.timeline');
  const eventPromise = panelElement.evaluate(el => {
    return new Promise<number>(resolve => {
      el.addEventListener('traceload', e => {
        const ev = e as Timeline.BenchmarkEvents.TraceLoadEvent;
        resolve(ev.duration);
      }, {once: true});
    });
  });
  const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
  await uploadProfileHandle.uploadFile(path.join(GEN_DIR, `front_end/panels/timeline/fixtures/traces/${fixture}.gz`));
  return eventPromise;
}

describe('Performance panel trace load performance', () => {
  const allTestValues: Array<{name: string, values: number[]}> = [];
  // Slow test
  describe.skip('[crbug.com/383713603]: Large CPU profile load benchmark', () => {
    beforeEach(async () => {
      // Reload devtools to get a fresh version of the panel on each
      // run and prevent a skew due to caching, etc.
      await reloadDevTools();
    });
    const RUNS = 10;
    const testValues = {
      name: 'LargeCPULoad',
      values: [] as number[],
    };
    for (let run = 1; run <= RUNS; run++) {
      it('run large cpu profile benchmark', async function() {
        this.timeout(20_000);
        const duration = await timeFixture('large-profile.cpuprofile');
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        testValues.values.push(timeTaken);
      });
    }
    after(() => {
      allTestValues.push(testValues);
    });
  });

  describe('Large DOM trace load benchmark', () => {
    beforeEach(async () => {
      // Reload devtools to get a fresh version of the panel on each
      // run and prevent a skew due to caching, etc.
      await reloadDevTools();
    });
    const RUNS = 10;
    const testValues = {
      name: 'LargeDOMTraceLoad',
      values: [] as number[],
    };
    for (let run = 1; run <= RUNS; run++) {
      it('run large dom trace load benchmark', async function() {
        this.timeout(8_000);
        const duration = await timeFixture('dom-size-long.json');
        // Ensure only 2 decimal places.
        const timeTaken = Number(duration.toFixed(2));
        testValues.values.push(timeTaken);
      });
    }
    after(() => {
      allTestValues.push(testValues);
    });
  });

  after(async () => {
    // Calculate statistics for each benchmark.
    for (const testValues of allTestValues) {
      const values = testValues.values;
      const meanMeasure = Number(mean(values).toFixed(2));
      const percentile50 = Number(percentile(values, 0.5).toFixed(2));
      const percentile90 = Number(percentile(values, 0.9).toFixed(2));
      const percentile99 = Number(percentile(values, 0.99).toFixed(2));

      const benchmark: Benchmark = {
        key: {test: testValues.name, units: 'ms'},
        measurements: {
          stats: [
            {
              value: 'mean',
              measurement: meanMeasure,
            },
            {
              value: 'percentile50',
              measurement: percentile50,
            },
            {
              value: 'percentile90',
              measurement: percentile90,
            },
            {
              value: 'percentile99',
              measurement: percentile99,
            },
          ],
        },
      };
      addBenchmarkResult(benchmark);
      /* eslint-disable no-console */
      console.log(`Benchmark name: ${testValues.name}`);
      console.log(`Mean time: ${meanMeasure}ms`);
      console.log(`50th percentile time: ${percentile50}ms`);
      console.log(`90th percentile time: ${percentile90}ms`);
      console.log(`99th percentile time: ${percentile99}ms`);
      /* eslint-enable no-console */
    }
  });
});
