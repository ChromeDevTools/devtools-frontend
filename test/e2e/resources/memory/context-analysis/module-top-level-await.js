// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// A module paused at a top-level `await` resumes in its module context, so the
// rest of the module can still read `moduleAwaitNeeded`.
const moduleAwaitNeeded = {
  kind: 'module-await-needed'
};
const moduleAwaitDead = {
  data: new Array(128).fill(0)
};
(function discardedModuleAwaitReader() {
  return [moduleAwaitNeeded, moduleAwaitDead];
})();

// Never resolves, so the module stays paused.
await new Promise(() => {});

globalThis.moduleAwaitResult = moduleAwaitNeeded;
