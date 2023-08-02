// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const target = window.location.search.substr(1);

try {
  const moduleImport = await import(target);

  let wasmModule = undefined;

  window.isReady = function() {
    return wasmModule !== undefined;
  };

  window.go = function() {
    if (isReady()) {
      console.trace('go()');
      return wasmModule._main();
    }
    return true;
  };

  window.load = async function() {
    wasmModule = await moduleImport.default();
    console.trace('loaded');
    return true;
  };
} catch (e) {
  window.load = () => {
    throw e;
  }
}
