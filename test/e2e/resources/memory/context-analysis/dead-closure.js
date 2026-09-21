// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeDeadClosureContext(keepReader) {
  const usedOnlyByReader = {kind: 'reader'};
  const alwaysDead = {data: new Array(128).fill(0)};
  (function discardedAlwaysDeadReader() {
    return alwaysDead;
  })();

  if (keepReader) {
    return function reader() {
      return usedOnlyByReader;
    };
  }
  return function unrelated() {
    return 1;
  };
}

globalThis.liveReader = makeDeadClosureContext(true);
globalThis.unrelatedReader = makeDeadClosureContext(false);
