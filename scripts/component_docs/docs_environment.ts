// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../front_end/core/common/common.js';
import * as FrontendHelpers from '../../front_end/testing/EnvironmentHelpers.js';
import * as ThemeSupport from '../../front_end/ui/legacy/theme_support/theme_support.js';

export async function setup(): Promise<void> {
  await FrontendHelpers.initializeGlobalVars();
  const setting = Common.Settings.Settings.instance().moduleSetting('ui-theme');
  ThemeSupport.ThemeSupport.instance({forceNew: true, setting});
}

export function cleanup(): Promise<void> {
  return FrontendHelpers.deinitializeGlobalVars();
}
