// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeShadowedClosures() {
  const shadowed = {kind: 'outer'};
  const outerDead = {data: new Array(64).fill(0)};
  (function discardedOuterDeadReader() {
    return outerDead;
  })();

  function middle() {
    const shadowed = {kind: 'inner'};
    const innerDead = {data: new Array(128).fill(0)};
    (function discardedInnerDeadReader() {
      return innerDead;
    })();
    return function innerReader() {
      return shadowed;
    };
  }

  const innerReader = middle();
  return {
    outerReader() {
      return shadowed;
    },
    innerReader,
  };
}

globalThis.shadowedClosures = makeShadowedClosures();
