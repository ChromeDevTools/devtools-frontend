// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {stopServer} from '../conductor/test_server.js';

import {AiEvalStateProvider} from './ai-eval-state-provider.js';
import {validateEvalEnvironment} from './helpers/eval-environment.js';

export async function mochaGlobalSetup(): Promise<void> {
  validateEvalEnvironment();
  await AiEvalStateProvider.instance.resolveBrowser();
}

export async function mochaGlobalTeardown(): Promise<void> {
  await AiEvalStateProvider.instance.closeBrowsers();
  stopServer();
}
