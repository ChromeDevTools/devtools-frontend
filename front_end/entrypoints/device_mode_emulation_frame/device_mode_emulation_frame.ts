// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../core/dom_extension/dom_extension.js';
import '../../Images/Images.js';

if (window.opener) {
  const app = window.opener.Emulation.AdvancedApp.instance();
  app.deviceModeEmulationFrameLoaded(document);
}
