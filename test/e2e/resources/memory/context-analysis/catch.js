// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeCatchClosure() {
  const functionCaptured = {kind: 'function'};
  try {
    throw {kind: 'caught'};
  } catch (caught) {
    const catchDead = {data: new Array(128).fill(0)};
    (function discardedCatchDeadReader() {
      return catchDead;
    })();
    return function catchReader() {
      return [functionCaptured, caught];
    };
  }
}

globalThis.catchClosure = makeCatchClosure();
