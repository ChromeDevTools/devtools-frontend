// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeForOfClosures() {
  const closures = [];
  const functionCaptured = {kind: 'function'};
  for (const item of [1, 2]) {
    const captured = {item};
    const dead = {data: new Array(item * 128).fill(0)};

    (function discardedBlockReader() {
      return [item, dead];
    })();
    closures.push(function blockInner() {
      return [functionCaptured, captured];
    });
  }
  return closures;
}

globalThis.forOfClosures = makeForOfClosures();
globalThis.forOfClosures[0]();
