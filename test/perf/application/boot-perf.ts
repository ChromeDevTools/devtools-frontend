// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';
import {resetPages} from '../../shared/helper.js';
import {storeGeneratedResults} from '../perf-helper.js';

interface PerfTimings {
  [name: string]: number[]
}

describe('Boot performance', () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('runs 37 times', async () => {
    const times: PerfTimings = {
      bootperf: [],
    };
    for (let run = 0; run < 37; run++) {
      const start = performance.now();
      await resetPages();
      times.bootperf.push(performance.now() - start);
    }

    await storeGeneratedResults('devtools-perf.json', JSON.stringify(times));
  }).timeout(90000);  // 90 second timeout because booting can take a second or so.
});
