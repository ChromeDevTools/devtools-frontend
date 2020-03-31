// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface SupportedEnvVars {
  NO_SHUFFLE: boolean;      // Whether or not to shuffle tests.
  STRESS: boolean;          // Stress test (slowdown CPU; multiple iterations)
  VERBOSE: boolean;         // Log stdout from the workers.
  THROTTLE: number;         // CPU throttle multiplier.
  TEST_LIST: string;        // Absolute path to the test list.
  TEST_FILE: string;        // Absolute path to the test file from the test list to run in isolation.
  DEBUG: boolean;           // Debug mode. When enabled, has longer timeouts and runs Chrome in head mode.
  ITERATIONS: number;       // Number of test iterations.
  JOBS: number;             // Number of workers to use.
  SLOWMO: number;           // Number of milliseconds between actions. Recommended value: 50.
  CHROME_BIN: string;       // Absolute path to the Chrome binary.
  INTERACTIVE: boolean;     // [Unused]: Placeholder for screenshot diffing.
  TIMEOUT: number;          // The timeout in ms to wait for tests.
  CHROME_FEATURES: string;  // --enable-features={} for the Chrome binary.
}

export function getEnvVar<Key extends keyof SupportedEnvVars>(
    name: Key, defaultValue?: SupportedEnvVars[Key]): SupportedEnvVars[Key] {
  const envVar = process.env[name];

  if (typeof defaultValue === 'boolean') {
    return (!!envVar) as SupportedEnvVars[Key];
  }

  if (typeof defaultValue === 'number') {
    let value = Number(envVar);
    if (Number.isNaN(value)) {
      value = defaultValue;
    }
    return value as SupportedEnvVars[Key];
  }

  return (envVar || defaultValue) as SupportedEnvVars[Key];
}
