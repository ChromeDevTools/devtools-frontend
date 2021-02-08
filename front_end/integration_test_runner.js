// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './devtools_app.js';
import './accessibility/accessibility-legacy.js';
import './animation/animation-legacy.js';
import './bindings/bindings-legacy.js';
import './color_picker/color_picker-legacy.js';
import './common/common-legacy.js';
import './data_grid/data_grid-legacy.js';
import './developer_resources/developer_resources-legacy.js';
import './diff/diff-legacy.js';
import './event_listeners/event_listeners-legacy.js';
import './extensions/extensions-legacy.js';
import './formatter/formatter-legacy.js';
import './har_importer/har_importer-legacy.js';
import './host/host-legacy.js';
import './inline_editor/inline_editor-legacy.js';
import './root/root-legacy.js';
import './sdk/sdk-legacy.js';
import * as Startup from './startup/startup.js';

if (self.testRunner) {
  testRunner.dumpAsText();
  testRunner.waitUntilDone();
}

Startup.RuntimeInstantiator.startApplication('integration_test_runner');
