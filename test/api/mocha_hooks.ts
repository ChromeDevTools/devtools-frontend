// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {stopServer} from '../conductor/test_server.js';

import {ApiStateProvider} from './api-state-provider.js';

export async function mochaGlobalSetup(): Promise<void> {
  await ApiStateProvider.instance.resolveBrowser();
}

export async function mochaGlobalTeardown(): Promise<void> {
  await ApiStateProvider.instance.closeBrowser();
  stopServer();
}
