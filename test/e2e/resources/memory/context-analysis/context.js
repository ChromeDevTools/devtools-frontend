// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeClosure(size) {
  const captured = {kind: 'captured'};
  const dead = {data: new Array(size).fill(0)};

  (function discardedDeadReader() {
    return dead;
  })();
  return function inner() {
    return captured;
  };
}

globalThis.smallClosure = makeClosure(4);
globalThis.largeClosure = makeClosure(256);
