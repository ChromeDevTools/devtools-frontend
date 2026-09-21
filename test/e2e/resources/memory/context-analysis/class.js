// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeInstanceFieldClosure() {
  const instanceCaptured = {kind: 'instance-captured'};
  const instanceDead = {data: new Array(128).fill(0)};

  (function discardedInstanceDead() {
    return instanceDead;
  })();

  class Target {
    instanceField = function instanceReader() {
      return instanceCaptured;
    };
  }

  return new Target();
}

function makeStaticFieldClosure() {
  const staticCaptured = {kind: 'static-captured'};
  const staticDead = {data: new Array(128).fill(0)};

  (function discardedStaticDead() {
    return staticDead;
  })();

  class Target {
    static staticField = function staticReader() {
      return staticCaptured;
    };
  }

  return Target;
}

globalThis.classInstance = makeInstanceFieldClosure();
globalThis.classStatic = makeStaticFieldClosure();
