// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeBlockClosure() {
  const functionCaptured = {kind: 'function'};
  const functionDead = {data: new Array(64).fill(0)};

  (function discardedFunctionDeadReader() {
    return functionDead;
  })();

  {
    const blockCaptured = {kind: 'block'};
    const blockDead = {data: new Array(128).fill(0)};

    (function discardedBlockDeadReader() {
      return blockDead;
    })();
    return function blockReader() {
      return [functionCaptured, blockCaptured];
    };
  }
}

globalThis.blockClosure = makeBlockClosure();
