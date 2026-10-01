// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A finished generator still refers to its context, but can't run anymore. So
// the read after `yield` doesn't keep `finishedGeneratorDead` in use.
function* makeFinishedGenerator() {
  const finishedGeneratorDead = {data: new Array(128).fill(0)};
  (function discardedFinishedGeneratorReader() {
    return finishedGeneratorDead;
  })();
  yield 1;
  return finishedGeneratorDead;
}

globalThis.finishedGenerator = makeFinishedGenerator();
globalThis.finishedGenerator.next();
globalThis.finishedGenerator.next();
