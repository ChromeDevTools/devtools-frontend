// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeCatchParameterClosure() {
  const functionCaptured = {kind: 'function'};
  try {
    throw {kind: 'caught'};
  } catch (caught) {
    (function discardedCaughtReader() {
      return caught;
    })();
    return function catchReader() {
      return functionCaptured;
    };
  }
}

globalThis.catchParameterClosure = makeCatchParameterClosure();
