// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../devtools_app.js';
import '../panels/accessibility/accessibility-legacy.js';
import '../panels/animation/animation-legacy.js';
import '../models/bindings/bindings-legacy.js';
import '../color_picker/color_picker-legacy.js';
import '../core/common/common-legacy.js';
import '../data_grid/data_grid-legacy.js';
import '../panels/developer_resources/developer_resources-legacy.js';
import '../diff/diff-legacy.js';
import '../panels/event_listeners/event_listeners-legacy.js';
import '../models/extensions/extensions-legacy.js';
import '../formatter/formatter-legacy.js';
import '../har_importer/har_importer-legacy.js';
import '../core/host/host-legacy.js';
import '../inline_editor/inline_editor-legacy.js';
import '../core/root/root-legacy.js';
import '../core/sdk/sdk-legacy.js';
import './test_runner/test_runner.js';

// @ts-ignore
if (self.testRunner) {
  // @ts-ignore
  testRunner.dumpAsText();
  // @ts-ignore
  testRunner.waitUntilDone();
}
