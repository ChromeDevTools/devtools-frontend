// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeInstanceFieldInitializerCapture() {
  const instanceInitCaptured = {kind: 'instance-init-captured'};
  const instanceInitDead = {data: new Array(128).fill(0)};

  (function discardedInstanceInitDead() {
    return instanceInitDead;
  })();

  class Target {
    instanceField = instanceInitCaptured;
  }

  return Target;
}

function makeStaticFieldInitializerCapture() {
  const staticInitDead = {kind: 'static-init-dead'};
  const staticInitRegularDead = {data: new Array(128).fill(0)};

  (function discardedStaticInitDead() {
    return staticInitRegularDead;
  })();

  class Target {
    static staticField = staticInitDead;
  }

  return Target;
}

globalThis.classInstanceInitializer = makeInstanceFieldInitializerCapture();
globalThis.classStaticInitializer = makeStaticFieldInitializerCapture();
