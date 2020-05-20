// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {reloadDevTools} from '../../shared/helper.js';
import {mean, percentile, storeGeneratedResults} from '../helpers/perf-helper.js';

interface PerfTimings {
  [name: string]: number[]
}

describe('Boot performance', () => {
  const total = 37;
  const times: PerfTimings = {
    bootperf: [],
  };

  after(async () => {
    await storeGeneratedResults('devtools-perf.json', JSON.stringify(times));

    /* eslint-disable no-console */
    const values = times.bootperf;
    console.log(`Mean boot time: ${mean(values).toFixed(2)}ms`);
    console.log(`50th percentile boot time: ${percentile(values, 0.5).toFixed(2)}ms`);
    console.log(`90th percentile boot time: ${percentile(values, 0.9).toFixed(2)}ms`);
    console.log(`99th percentile boot time: ${percentile(values, 0.99).toFixed(2)}ms`);
    /* eslint-enable no-console */
  });
  for (let run = 1; run <= total; run++) {
    it(`run ${run}/${total}`, async () => {
      const start = performance.now();
      await reloadDevTools();

      // Ensure only 2 decimal places.
      const timeTaken = (performance.now() - start).toFixed(2);
      times.bootperf.push(Number(timeTaken));
    }).timeout(5000);  // 5 second timeout because booting can take a second or so.
  }
});
