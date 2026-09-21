// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function outer() {
  const outerCaptured = {kind: 'outer captured'};
  const outerDead = {data: new Array(256).fill(0)};

  (function discardedOuterDeadReader() {
    return outerDead;
  })();
  function inner() {
    const innerCaptured = {kind: 'inner captured'};
    const innerDead = {data: new Array(32).fill(0)};

    (function discardedInnerDeadReader() {
      return innerDead;
    })();
    return function nestedInner() {
      return [outerCaptured, innerCaptured];
    };
  }
  return inner();
}

globalThis.nestedClosure = outer();
