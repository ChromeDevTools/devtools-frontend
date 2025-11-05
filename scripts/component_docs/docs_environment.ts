// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../front_end/testing/EnvironmentHelpers.js';

export function setup(): Promise<void> {
  return FrontendHelpers.initializeGlobalVars();
}

export function cleanup(): Promise<void> {
  return FrontendHelpers.deinitializeGlobalVars();
}
