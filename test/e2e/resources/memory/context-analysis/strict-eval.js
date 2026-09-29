// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Eval inside a strict function inherits strict mode from the caller. In
// strict mode eval, 'var' declarations are scoped to the eval scope itself
// rather than leaking out, and can be allocated to context slots.
function makeStrictEvalClosure() {
  'use strict';
  return eval('var strictEvalCaptured = {kind: "strict-eval-captured"};\n' +
              'var strictEvalDead = {data: new Array(128).fill(0)};\n' +
              '(function discardedStrictEvalDeadReader() {\n' +
              '  return strictEvalDead;\n' +
              '})();\n' +
              'function strictEvalReader() {\n' +
              '  return strictEvalCaptured;\n' +
              '}\n' +
              'strictEvalReader;\n' +
              '//# sourceURL=strict-eval-code.js\n');
}

globalThis.strictEvalClosure = makeStrictEvalClosure();
