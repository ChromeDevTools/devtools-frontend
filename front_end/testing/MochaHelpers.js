// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function pruneSuite(suite, shouldIncludeTest) {
    suite.tests = suite.tests.filter(shouldIncludeTest);
    suite.suites.forEach(suite => pruneSuite(suite, shouldIncludeTest));
}
export function duplicateTests(suite, repetitions) {
    if (repetitions > 1) {
        const originalTests = [...suite.tests];
        suite.tests = [];
        for (const test of originalTests) {
            suite.tests.push(test);
            for (let i = 1; i < repetitions; i++) {
                const cloned = test.clone();
                cloned.pending = test.pending;
                suite.addTest(cloned);
            }
        }
    }
    suite.suites.forEach(s => duplicateTests(s, repetitions));
}
//# sourceMappingURL=MochaHelpers.js.map