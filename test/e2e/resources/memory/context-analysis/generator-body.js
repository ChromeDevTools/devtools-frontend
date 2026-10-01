// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Only the body of the paused generator reads `generatorBodyNeeded` once it
// resumes. No live closure reads it, so only the generator object keeps it in
// use.
function* makeGeneratorBody() {
  const generatorBodyNeeded = {kind: 'generator-body-needed'};
  const generatorBodyDead = {data: new Array(128).fill(0)};
  (function discardedGeneratorBodyReader() {
    return [generatorBodyNeeded, generatorBodyDead];
  })();
  yield 1;
  return generatorBodyNeeded;
}

globalThis.suspendedBodyGenerator = makeGeneratorBody();
globalThis.suspendedBodyGenerator.next();
