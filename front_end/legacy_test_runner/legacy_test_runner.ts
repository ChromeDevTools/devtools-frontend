// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-expect-error
if (self.testRunner) {
  // @ts-expect-error
  testRunner.dumpAsText();
  // @ts-expect-error
  testRunner.waitUntilDone();
}

void (async () => {
  await import('../entrypoints/devtools_app/devtools_app.js');
  await import('./test_runner/test_runner.js');
})();
