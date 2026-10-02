// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Two different functions read `sharedByReaders` from the same context. Only
// one of them survives, which is enough to keep the variable alive.
function makeMultipleReaders() {
  const sharedByReaders = {kind: 'shared-by-readers'};
  const multipleReadersDead = {data: new Array(128).fill(0)};

  (function discardedSharedReader() {
    return [sharedByReaders, multipleReadersDead];
  })();

  return function liveSharedReader() {
    return sharedByReaders;
  };
}

globalThis.multipleReadersClosure = makeMultipleReaders();
