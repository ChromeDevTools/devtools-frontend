// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {loadTests} from './cxx-debugging-extension-helpers.js';

function importTest(name: string, path: string) {
  describe(name, function() {
    require(path);
  });
}

describe('CXX Debugging Extension Test Suite', function() {
  for (const {name, file} of loadTests()) {
    if (!file) {
      continue;
    }
    importTest(name, `./standalone/${file}`);
  }
});
