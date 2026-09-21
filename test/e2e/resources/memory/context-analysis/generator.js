// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function* makeGeneratorContext() {
  const neededAfterYield = {kind: 'needed'};
  const generatorDead = {data: new Array(128).fill(0)};
  const neededAfterYieldReader = () => neededAfterYield;
  (function discardedGeneratorDeadReader() {
    return generatorDead;
  })();
  yield 1;
  return neededAfterYieldReader();
}

globalThis.suspendedGenerator = makeGeneratorContext();
globalThis.suspendedGenerator.next();
