// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './devtools_app.js';
import * as Startup from './startup/startup.js';

if (self.testRunner) {
  testRunner.dumpAsText();
  testRunner.waitUntilDone();
}

Startup.RuntimeInstantiator.startApplication('integration_test_runner');
