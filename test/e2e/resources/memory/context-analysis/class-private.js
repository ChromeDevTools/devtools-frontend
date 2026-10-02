// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The class scope holds the private method and the class brand in a context.
// V8 does not track uses of private names, so it omits the variables of class
// scopes, while the enclosing function scope is still analyzed.
function makePrivateMemberInstance() {
  const privateOuterCaptured = {kind: 'private-outer-captured'};
  const privateOuterDead = {data: new Array(128).fill(0)};

  (function discardedPrivateOuterDeadReader() {
    return privateOuterDead;
  })();

  class Target {
    #privateField = {kind: 'private-field'};

    #privateMethod() {
      return this.#privateField;
    }

    read() {
      return [this.#privateMethod(), privateOuterCaptured];
    }
  }

  return new Target();
}

globalThis.privateMemberInstance = makePrivateMemberInstance();
