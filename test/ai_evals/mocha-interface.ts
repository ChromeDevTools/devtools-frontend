// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createMochaInterface} from '../conductor/mocha-interface.js';
import type {E2EState} from '../e2e/conductor/state-provider.js';

import {AiEvalStateProvider} from './ai-eval-state-provider.js';

export const devtoolsAiEvalTestInterface = createMochaInterface<E2EState, E2E.SuiteSettings>({
  description: 'DevTools AI Eval test interface',
  stateProvider: AiEvalStateProvider.instance,
});
