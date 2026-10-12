// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';

import {createMochaInterface} from '../conductor/mocha-interface.js';

import {type AiEvalState, AiEvalStateProvider} from './ai-eval-state-provider.js';

export const devtoolsAiEvalTestInterface: {
  (rootSuite: Mocha.Suite): void,
  description: string,
} = createMochaInterface<AiEvalState, E2E.SuiteSettings>({
  description: 'DevTools AI Eval test interface',
  stateProvider: AiEvalStateProvider.instance,
});
