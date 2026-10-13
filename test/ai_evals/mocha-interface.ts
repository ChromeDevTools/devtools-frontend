// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createMochaInterface,
  type MochaInterface,
  type SetupFunction,
  type SuiteFunction,
  type TestFunction,
} from '../conductor/mocha-interface.js';

import {type AiEvalState, AiEvalStateProvider, type AiEvalSuiteSettings} from './ai-eval-state-provider.js';

export const devtoolsAiEvalTestInterface: MochaInterface<AiEvalState, AiEvalSuiteSettings> = createMochaInterface({
  description: 'DevTools AI Eval test interface',
  stateProvider: AiEvalStateProvider.instance,
});

/**
 * Defines a suite of AI evals.
 */
export const describe: SuiteFunction = devtoolsAiEvalTestInterface.describe;

/**
 * Defines an AI eval. The test body receives the e2e state and the eval task.
 */
export const it: TestFunction<AiEvalState> = devtoolsAiEvalTestInterface.it;

/**
 * Configures the browser, DevTools and the eval task for the tests of the
 * enclosing suite.
 */
export const setup: SetupFunction<AiEvalSuiteSettings> = devtoolsAiEvalTestInterface.setup;
