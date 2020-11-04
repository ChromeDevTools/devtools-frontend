// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

/**
 * @suppressGlobalPropertiesCheck
 */
function toolboxLoaded() {
  if (!window.opener) {
    return;
  }
  const app = window.opener['Emulation']['AdvancedApp']['_instance']();
  app['toolboxLoaded'](document);
}

Platform.runOnWindowLoad(toolboxLoaded);
