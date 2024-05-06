// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';  // eslint-disable-line rulesdir/es_modules_import

import * as ts from '../../conductor/test_config.js';

const results: Benchmark[] = [];

// Based on skia-perf format:
// https://skia.googlesource.com/buildbot/+/refs/heads/main/perf/FORMAT.md
// https://pkg.go.dev/go.skia.org/infra/perf/go/ingest/format#Result
interface BenchmarkBase {
  key: {
    // For example "trace load"
    test: string,
    [key: string]: string,
  };
}

// Only one of `measurement` or `measurements` should be populated.
export type Benchmark = BenchmarkMultiMeasure|BenchmarkSingleMeasure;

// The idea behind Measurements is that you may have more than one
// metric you want to report at the end of running a test, for example
// you may track the fastest time it took to run a test, and also the
// median and max time.
interface BenchmarkMultiMeasure extends BenchmarkBase {
  measurements: {
    [key: string]: SingleMeasurement[],
  };
}

interface BenchmarkSingleMeasure extends BenchmarkBase {
  measurement: number;
}

interface SingleMeasurement {
  // Example: "min"
  value: string;
  measurement: number;
}

export function addBenchmarkResult(benchmark: Benchmark) {
  results.push(benchmark);
}

export function clearResults() {
  results.length = 0;
}

export function writeReport() {
  // This points to perf-data under devtools root directory
  // devtools-frontend/perf-data.
  const directory = join(ts.TestConfig.artifactsDir, 'perf-data');
  fs.mkdirSync(directory, {recursive: true});

  const filePath = join(directory, 'devtools-perf.json');
  fs.writeFileSync(filePath, JSON.stringify(results), {encoding: 'utf8'});
  // eslint-disable-next-line no-console
  console.log(`perf report file was written to ${filePath}`);
}
