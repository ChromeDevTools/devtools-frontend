// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeBlockVariableInnerClosure(paramCaptured) {
  function inner(c) {
    let d = 2;
    {
      let blockScoped = 3;
      d = paramCaptured + blockScoped + c + d;
    }
    return d;
  }
  return inner;
}

globalThis.blockVariableInnerClosure = makeBlockVariableInnerClosure(10);
