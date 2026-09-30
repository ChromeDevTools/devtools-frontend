// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A module that finished evaluating after a top-level `await`. Only
// `moduleAwaitFinishedCaptured` is still read by a live closure.
const moduleAwaitFinishedCaptured = {
  kind: 'module-await-finished-captured'
};
let moduleAwaitFinishedDead = {data: new Array(128).fill(0)};
(function discardedModuleAwaitFinishedDeadReader() {
  return moduleAwaitFinishedDead;
})();

await Promise.resolve();

globalThis.moduleAwaitFinishedClosure = function moduleAwaitFinishedReader() {
  return moduleAwaitFinishedCaptured;
};
