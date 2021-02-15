// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {reloadDevTools} from '../../shared/helper.js';
import {mean, percentile, storeGeneratedResults} from '../helpers/perf-helper.js';

interface PerfTimings {
  bootperf: number[];
  mean: number;
  percentile50: number;
  percentile90: number;
  percentile99: number;
}

const RUNS = 37;

describe('Boot performance', () => {
  const times: PerfTimings = {
    bootperf: [],
    mean: 0,
    percentile50: 0,
    percentile90: 0,
    percentile99: 0,
  };

  after(async () => {
    /* eslint-disable no-console */
    const values = times.bootperf;
    times.mean = Number(mean(values).toFixed(2));
    times.percentile50 = Number(percentile(values, 0.5).toFixed(2));
    times.percentile90 = Number(percentile(values, 0.9).toFixed(2));
    times.percentile99 = Number(percentile(values, 0.99).toFixed(2));

    await storeGeneratedResults('devtools-perf.json', JSON.stringify(times));

    console.log(`Mean boot time: ${times.mean}ms`);
    console.log(`50th percentile boot time: ${times.percentile50}ms`);
    console.log(`90th percentile boot time: ${times.percentile90}ms`);
    console.log(`99th percentile boot time: ${times.percentile99}ms`);
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
