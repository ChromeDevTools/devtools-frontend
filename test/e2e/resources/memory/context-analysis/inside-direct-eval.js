// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeInsideDirectEvalClosure() {
  eval('function makeInsideEval() {\n' +
       '  const insideEvalCaptured = {kind: "inside-eval-captured"};\n' +
       '  const insideEvalDead = {data: new Array(128).fill(0)};\n' +
       '  (function discardedInsideEvalDeadReader() {\n' +
       '    return insideEvalDead;\n' +
       '  })();\n' +
       '  return function insideEvalReader() {\n' +
       '    return insideEvalCaptured;\n' +
       '  };\n' +
       '}\n' +
       'globalThis.insideDirectEvalClosure = makeInsideEval();\n' +
       '//# sourceURL=inside-direct-eval.js\n');
}

makeInsideDirectEvalClosure();
