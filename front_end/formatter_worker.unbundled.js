// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './platform/platform.js';
import './text_utils/text_utils.js';
import './cm_headless/cm_headless.js';
import './formatter_worker/formatter_worker.js';

// Release build has Runtime.js bundled.
if (!self.Root || !self.Root.Runtime) {
  self.importScripts('Runtime.js');
}
Root.Runtime.startWorker('formatter_worker');
