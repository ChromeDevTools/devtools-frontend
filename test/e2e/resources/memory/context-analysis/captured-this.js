// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeThisClosures(keepReader) {
  const alwaysDead = {data: new Array(128).fill(0)};

  (function discardedAlwaysDeadReader() {
    return alwaysDead;
  })();

  if (keepReader) {
    return () => this;
  }
  return () => 1;
}

globalThis.liveThisReader = makeThisClosures.call({kind: 'live receiver'}, true);
globalThis.unrelatedThisReader = makeThisClosures.call({kind: 'dead receiver'}, false);
