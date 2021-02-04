// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {reloadDevTools} from '../../shared/helper.js';
import {mean, percentile, storeGeneratedResults} from '../helpers/perf-helper.js';

interface PerfTimings {
  bootperf: number[];
  mean: number;
  percentile_50: number;
  percentile_90: number;
  percentile_99: number;
}

const RUNS = 37;

describe('Boot performance', () => {
  const times: PerfTimings = {
    bootperf: [],
    mean: 0,
    percentile_50: 0,
    percentile_90: 0,
    percentile_99: 0,
  };

  after(async () => {
    /* eslint-disable no-console */
    const values = times.bootperf;
    times.mean = Number(mean(values).toFixed(2));
    times.percentile_50 = Number(percentile(values, 0.5).toFixed(2));
    times.percentile_90 = Number(percentile(values, 0.9).toFixed(2));
    times.percentile_99 = Number(percentile(values, 0.99).toFixed(2));

    await storeGeneratedResults('devtools-perf.json', JSON.stringify(times));

    console.log(`Mean boot time: ${times.mean}ms`);
    console.log(`50th percentile boot time: ${times.percentile_50}ms`);
    console.log(`90th percentile boot time: ${times.percentile_90}ms`);
    console.log(`99th percentile boot time: ${times.percentile_99}ms`);
    /* eslint-enable no-console */
  });

  for (let run = 1; run <= RUNS; run++) {
    it(`run ${run}/${RUNS}`, async () => {
      const start = performance.now();
      await reloadDevTools();

      // Ensure only 2 decimal places.
      const timeTaken = (performance.now() - start).toFixed(2);
      times.bootperf.push(Number(timeTaken));
    });
  }
});
