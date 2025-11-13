// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {performance} from 'perf_hooks';

import {measurements} from '../report/report.js';

// Constantly flakes on Linux and Windows bots.
describe('[crbug.com/451846268]: Boot performance', () => {
  const RUNS = 10;

  for (let run = 1; run <= RUNS; run++) {
    it(`run ${run}/${RUNS}`, async ({devToolsPage}) => {
      const start = performance.now();
      await devToolsPage.reload();

      // Ensure only 2 decimal places.
      const timeTaken = (performance.now() - start).toFixed(2);
      measurements.BootPerf.push(Number(timeTaken));
    });
  }
});
