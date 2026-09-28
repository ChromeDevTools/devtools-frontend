// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The enclosing function deliberately captures nothing, so it needs no context of its own. The
// block scope of the loop is then the only scope of this script that needs a context, and its
// ScopeInfo has no `outer_scope_info`. It can only be attributed to this script through the
// ScopeInfo of the callback it encloses.
function makeClassicForLoopCallbacks() {
  const callbacks = [];
  for (let index = 0, loopDead = {data: new Array(128).fill(0)}; index < 2; ++index) {
    (function discardedLoopReader() {
      return loopDead;
    })();
    callbacks.push(() => index);
  }
  return callbacks;
}

globalThis.classicForLoopCallbacks = makeClassicForLoopCallbacks();
// Calling a callback compiles it, which gives it a ScopeInfo of its own whose `outer_scope_info`
// leads to the block scope of the loop. While uncompiled, it would link the block scope through
// `raw_outer_scope_info_or_feedback_metadata` of its SharedFunctionInfo instead. Calling it makes
// this script cover attributing enclosing scopes through `outer_scope_info`.
globalThis.classicForLoopCallbacks[0]();
