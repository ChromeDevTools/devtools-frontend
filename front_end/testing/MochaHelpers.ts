// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

export function pruneSuite(suite: Mocha.Suite, shouldIncludeTest: (test: Mocha.Test) => boolean) {
  suite.tests = suite.tests.filter(shouldIncludeTest);
  suite.suites.forEach(suite => pruneSuite(suite, shouldIncludeTest));
}

export function duplicateTests(suite: Mocha.Suite, repetitions: number) {
  if (repetitions > 1) {
    const originalTests = [...suite.tests];
    suite.tests = [];
    for (const test of originalTests) {
      suite.tests.push(test);
      for (let i = 1; i < repetitions; i++) {
        const cloned = test.clone();
        cloned.pending = test.pending;
        suite.addTest(cloned);
        // @ts-expect-error _onlyTests is internal.
        if (suite._onlyTests.includes(test)) {
          // @ts-expect-error _onlyTests is internal.
          suite._onlyTests.push(cloned);
        }
      }
    }
  }
  suite.suites.forEach(s => duplicateTests(s, repetitions));
}
