// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {reloadDevTools} from '../../shared/helper.js';
import {mean, percentile} from '../helpers/perf-helper.js';
import {addBenchmarkResult, type Benchmark} from '../report/report.js';

describe('Boot performance', () => {
  const RUNS = 37;
  const benchmark: Benchmark = {
    name: 'BootPerf',
    values: [],
    mean: 0,
    percentile50: 0,
    percentile90: 0,
    percentile99: 0,
  };

  after(() => {
    const values = benchmark.values;
    benchmark.mean = Number(mean(values).toFixed(2));
    benchmark.percentile50 = Number(percentile(values, 0.5).toFixed(2));
    benchmark.percentile90 = Number(percentile(values, 0.9).toFixed(2));
    benchmark.percentile99 = Number(percentile(values, 0.99).toFixed(2));
    addBenchmarkResult(benchmark);
    /* eslint-disable no-console */
    console.log(`Benchmark name: ${benchmark.name}`);
    console.log(`Mean boot time: ${benchmark.mean}ms`);
    console.log(`50th percentile boot time: ${benchmark.percentile50}ms`);
    console.log(`90th percentile boot time: ${benchmark.percentile90}ms`);
    console.log(`99th percentile boot time: ${benchmark.percentile99}ms`);
    /* eslint-enable no-console */
  });

  for (let run = 1; run <= RUNS; run++) {
    it(`run ${run}/${RUNS}`, async () => {
      const start = performance.now();
      await reloadDevTools();

      // Ensure only 2 decimal places.
      const timeTaken = (performance.now() - start).toFixed(2);
      benchmark.values.push(Number(timeTaken));
    });
  }
});
