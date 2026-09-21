// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeModuleClosure() {
  const moduleCaptured = {kind: 'module'};
  const moduleDead = {data: new Array(128).fill(0)};
  (function discardedModuleDeadReader() {
    return moduleDead;
  })();

  return function moduleReader() {
    return moduleCaptured;
  };
}

globalThis.moduleClosure = makeModuleClosure();
