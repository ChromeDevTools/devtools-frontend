// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../models/workspace/workspace-legacy.js';
import '../ui/legacy/components/utils/utils-legacy.js';
import '../models/persistence/persistence-legacy.js';
import '../entrypoints/devtools_app/devtools_app.js';
import '../panels/animation/animation-legacy.js';
import '../models/breakpoints/breakpoints-legacy.js';
import '../models/trace/trace-legacy.js';
import '../core/sdk/sdk-legacy.js';
import './test_runner/test_runner.js';

// @ts-ignore
if (self.testRunner) {
  // @ts-ignore
  testRunner.dumpAsText();
  // @ts-ignore
  testRunner.waitUntilDone();
}
