// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// In a sloppy direct eval, `let` declarations are scoped to the eval scope
// itself, which gets a context when they are captured. The calling function
// calls eval, so V8 omits its variables.
function makeSloppyEvalLetClosure() {
  const sloppyEvalCallerVar = {kind: 'sloppy-eval-caller'};
  return eval('let sloppyEvalCaptured = {kind: "sloppy-eval-captured"};\n' +
              'let sloppyEvalDead = {data: new Array(128).fill(0)};\n' +
              '(function discardedSloppyEvalDeadReader() {\n' +
              '  return sloppyEvalDead;\n' +
              '})();\n' +
              '(function sloppyEvalReader() {\n' +
              '  return [sloppyEvalCaptured, sloppyEvalCallerVar];\n' +
              '});\n' +
              '//# sourceURL=sloppy-eval-let-code.js\n');
}

globalThis.sloppyEvalLetClosure = makeSloppyEvalLetClosure();
