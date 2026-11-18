// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { afterEach, beforeEach } from 'mocha';
const testTeardowns = [];
let rootTeardownRunnerRegistered = false;
export function setRootTeardownRunnerRegistered() {
    rootTeardownRunnerRegistered = true;
}
export function isRootTeardownRunnerRegistered() {
    return rootTeardownRunnerRegistered;
}
export function hasPendingTestTeardowns() {
    return testTeardowns.length > 0;
}
/**
 * Registers a teardown callback for the currently running test.
 *
 * Must only be called while a test is running (from a `beforeEach` hook or
 * the test body). `beforeEachWithTeardown()` satisfies this automatically.
 */
export function registerTestTeardown(fn) {
    testTeardowns.push(fn);
}
export function beforeEachWithTeardown(setupFn, teardownFn) {
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
export async function runTestTeardowns() {
    let firstError = null;
    while (testTeardowns.length > 0) {
        const teardown = testTeardowns.pop();
        if (teardown) {
            try {
                await teardown();
            }
            catch (err) {
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
//# sourceMappingURL=TestTeardown.js.map