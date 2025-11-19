// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import {join} from 'node:path';

import * as ts from '../../conductor/test_config.js';
import {mean, percentile} from '../helpers/perf-helper.js';

const results: Benchmark[] = [];

/**
 * Based on skia-perf format:
 * https://skia.googlesource.com/buildbot/+/refs/heads/main/perf/FORMAT.md
 * https://pkg.go.dev/go.skia.org/infra/perf/go/ingest/format#Result
 **/
interface BenchmarkBase {
  key: {
    // For example "trace load"
    test: string,
    [key: string]: string,
  };
}

/** Only one of `measurement` or `measurements` should be populated. **/
export type Benchmark = BenchmarkMultiMeasure|BenchmarkSingleMeasure;

/**
 * The idea behind Measurements is that you may have more than one
 * metric you want to report at the end of running a test, for example
 * you may track the fastest time it took to run a test, and also the
 * median and max time.
 **/
interface BenchmarkMultiMeasure extends BenchmarkBase {
  measurements: Record<string, SingleMeasurement[]>;
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

export const measurements: Record<string, number[]> = {
  BootPerf: [] as number[],
  LargeDOMTraceLoad: [] as number[],
  LargeCPULoad: [] as number[],
};

export function collectMeasurements() {
  for (const name in measurements) {
    const values = measurements[name];
    const meanMeasure = Number(mean(values).toFixed(2));
    const percentile50 = Number(percentile(values, 0.5).toFixed(2));
    const percentile90 = Number(percentile(values, 0.9).toFixed(2));
    const percentile99 = Number(percentile(values, 0.99).toFixed(2));

    const benchmark: Benchmark = {
      key: {test: name, units: 'ms'},
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
    console.log(`Benchmark name: ${name}`);
    console.log(`Mean time: ${meanMeasure}ms`);
    console.log(`50th percentile time: ${percentile50}ms`);
    console.log(`90th percentile time: ${percentile90}ms`);
    console.log(`99th percentile time: ${percentile99}ms`);
    /* eslint-enable no-console */
  }
}
