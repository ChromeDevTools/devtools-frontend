// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';  // eslint-disable-line rulesdir/es_modules_import

export interface Benchmark {
  name: string;
  values: number[];
  mean: number;
  percentile50: number;
  percentile90: number;
  percentile99: number;
}

const results: Benchmark[] = [];

export function addBenchmarkResult(benchmark: Benchmark) {
  results.push(benchmark);
}

export function clearResults() {
  results.length = 0;
}

export function writeReport() {
  // This points to perf-data under devtools root directory
  // devtools-frontend/perf-data.
  const directory = join(__dirname, '..', '..', '..', '..', '..', '..', 'perf-data');
  fs.mkdirSync(directory, {recursive: true});

  const filePath = join(directory, 'devtools-perf.json');
  fs.writeFileSync(filePath, JSON.stringify(results), {encoding: 'utf8'});
  // eslint-disable-next-line no-console
  console.log(`perf report file was written to ${filePath}`);
}
