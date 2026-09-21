// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeInstanceMethodClosure() {
  const instanceMethodCaptured = {kind: 'instance-method-captured'};
  const instanceMethodDead = {data: new Array(128).fill(0)};

  (function discardedInstanceMethodDead() {
    return instanceMethodDead;
  })();

  class Target {
    instanceMethod() {
      return instanceMethodCaptured;
    }
  }

  return new Target();
}

function makeStaticMethodClosure() {
  const staticMethodCaptured = {kind: 'static-method-captured'};
  const staticMethodDead = {data: new Array(128).fill(0)};

  (function discardedStaticMethodDead() {
    return staticMethodDead;
  })();

  class Target {
    static staticMethod() {
      return staticMethodCaptured;
    }
  }

  return Target;
}

globalThis.classInstanceMethod = makeInstanceMethodClosure();
globalThis.classStaticMethod = makeStaticMethodClosure();
