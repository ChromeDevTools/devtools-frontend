// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const asyncBodyGate = new Promise(() => {});

// Only the body of the paused async function reads `asyncBodyNeeded` once it
// resumes. No live closure reads it, so only the async function object keeps
// it in use.
async function suspendAsyncBody() {
  const asyncBodyNeeded = {kind: 'async-body-needed'};
  const asyncBodyDead = {data: new Array(128).fill(0)};
  (function discardedAsyncBodyReader() {
    return [asyncBodyNeeded, asyncBodyDead];
  })();
  await asyncBodyGate;
  return asyncBodyNeeded;
}

globalThis.suspendedAsyncBodyPromise = suspendAsyncBody();
globalThis.asyncBodyGate = asyncBodyGate;
