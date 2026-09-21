// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeWithClosure(obj) {
  const outerCaptured = {kind: 'with'};
  const outerDead = {data: new Array(128).fill(0)};

  (function discardedOuterDeadReader() {
    return outerDead;
  })();

  with(obj) {
    return function withReader() {
      return outerCaptured;
    };
  }
}

globalThis.withClosure = makeWithClosure({a: 10});
