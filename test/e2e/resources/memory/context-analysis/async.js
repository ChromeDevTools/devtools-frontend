// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const asyncGate = new Promise(() => {});

async function suspendAsyncContext() {
  const neededAfterAwait = {kind: 'needed'};
  const asyncDead = {data: new Array(128).fill(0)};
  const neededAfterAwaitReader = () => neededAfterAwait;
  (function discardedAsyncDeadReader() {
    return asyncDead;
  })();
  await asyncGate;
  return neededAfterAwaitReader();
}

globalThis.suspendedAsyncPromise = suspendAsyncContext();
globalThis.asyncGate = asyncGate;
