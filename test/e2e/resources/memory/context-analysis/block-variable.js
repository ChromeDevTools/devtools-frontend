// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeBlockVariableClosure(paramCaptured) {
  let dead = 1;
  (function discardedDeadReader() {
    return dead;
  })();
  dead = 2;
  {
    let blockScoped = 3;
    dead = blockScoped;
  }
  function inner(c) {
    let d = 2;
    return paramCaptured + c + d;
  }
  return inner;
}

globalThis.blockVariableClosure = makeBlockVariableClosure(10);
