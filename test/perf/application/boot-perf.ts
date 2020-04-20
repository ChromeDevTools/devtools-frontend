// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {reloadDevTools} from '../../shared/helper.js';
import {storeGeneratedResults} from '../helpers/perf-helper.js';

interface PerfTimings {
  [name: string]: number[]
}

describe('Boot performance', () => {
  it('runs 37 times', async () => {
    const times: PerfTimings = {
      bootperf: [],
    };
    for (let run = 0; run < 37; run++) {
      const start = performance.now();
      await reloadDevTools();

      // Ensure only 2 decimal places.
      const timeTaken = (performance.now() - start).toFixed(2);
      times.bootperf.push(Number(timeTaken));
    }

    await storeGeneratedResults('devtools-perf.json', JSON.stringify(times));
  }).timeout(90000);  // 90 second timeout because booting can take a second or so.
});
