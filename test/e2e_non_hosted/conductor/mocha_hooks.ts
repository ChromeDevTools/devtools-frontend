// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {StateProvider} from './state-provider.js';

export async function mochaGlobalTeardown(this: Mocha.Suite) {
  await StateProvider.instance.closeBrowsers();
}
