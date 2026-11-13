// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {afterEach, beforeEach} from 'mocha';

type TeardownFn = () => void|Promise<void>;
type SetupFn = () => void|Promise<void>;

const testTeardowns: TeardownFn[] = [];
let rootTeardownRunnerRegistered = false;

export function setRootTeardownRunnerRegistered(): void {
  rootTeardownRunnerRegistered = true;
}

export function isRootTeardownRunnerRegistered(): boolean {
  return rootTeardownRunnerRegistered;
}

export function hasPendingTestTeardowns(): boolean {
  return testTeardowns.length > 0;
}

/**
 * Registers a teardown callback for the currently running test.
 *
 * Must only be called while a test is running (from a `beforeEach` hook or
 * the test body). `beforeEachWithTeardown()` satisfies this automatically.
 */
export function registerTestTeardown(fn: TeardownFn): void {
  testTeardowns.push(fn);
}

export function beforeEachWithTeardown(setupFn: SetupFn, teardownFn: TeardownFn): void {
  beforeEach(async () => {
    await setupFn();
    if (rootTeardownRunnerRegistered) {
      testTeardowns.push(teardownFn);
    }
  });
  afterEach(async () => {
    if (!rootTeardownRunnerRegistered) {
      await teardownFn();
    }
  });
}

export async function runTestTeardowns(): Promise<void> {
  let firstError: unknown = null;
  while (testTeardowns.length > 0) {
    const teardown = testTeardowns.pop();
    if (teardown) {
      try {
        await teardown();
      } catch (err) {
        if (!firstError) {
          firstError = err;
        }
      }
    }
  }
  if (firstError) {
    throw firstError instanceof Error ? firstError : new Error(String(firstError));
  }
}
