// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeInstanceFieldInitializerContext() {
  class Target {
    instanceField = (() => {
      const instanceInitLocalCaptured = {kind: 'instance-init-local-captured'};
      const instanceInitLocalDead = {data: new Array(128).fill(0)};

      (function discardedInstanceInitLocalDead() {
        return instanceInitLocalDead;
      })();

      return function readInstanceInitLocal() {
        return instanceInitLocalCaptured;
      };
    })();
  }

  return new Target();
}

function makeStaticFieldInitializerContext() {
  class Target {
    static staticField = (() => {
      const staticInitLocalCaptured = {kind: 'static-init-local-captured'};
      const staticInitLocalDead = {data: new Array(128).fill(0)};

      (function discardedStaticInitLocalDead() {
        return staticInitLocalDead;
      })();

      return function readStaticInitLocal() {
        return staticInitLocalCaptured;
      };
    })();
  }

  return Target;
}

globalThis.classInstanceInitializerContext = makeInstanceFieldInitializerContext();
globalThis.classStaticInitializerContext = makeStaticFieldInitializerContext();
