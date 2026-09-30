// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Top-level `let`/`const` of a module that are captured by an inner function
// are allocated in the module's own context, which lives as long as the module
// itself. Uncaptured ones stay on the stack.
const moduleTopLevelCaptured = {
  kind: 'module-top-level'
};
let moduleTopLevelDead = {data: new Array(128).fill(0)};
// Exported bindings live in cells of the module instead of its context, since
// other modules may import them.
export let moduleTopLevelExported = {
  data: new Array(128).fill(0)
};

(function discardedModuleTopLevelDeadReader() {
  return moduleTopLevelDead;
})();

globalThis.moduleTopLevelClosure = function moduleTopLevelReader() {
  return moduleTopLevelCaptured;
};
