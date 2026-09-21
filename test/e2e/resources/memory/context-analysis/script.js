// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Top-level `let`/`const` of a classic script are allocated in the script's
// own context, which lives as long as the script itself.
const scriptCaptured = {
  kind: 'script'
};
let scriptDead = {data: new Array(128).fill(0)};

(function discardedScriptDeadReader() {
  return scriptDead;
})();

globalThis.scriptClosure = function scriptReader() {
  return scriptCaptured;
};
