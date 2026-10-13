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

import {ApiStateProvider, type InspectedPage, type State, type SuiteSettings} from './api-state-provider.js';

export type {InspectedPage, State, SuiteSettings};

export const devtoolsApiTestInterface: MochaInterface<State, SuiteSettings> = createMochaInterface({
  description: 'DevTools API test interface',
  stateProvider: ApiStateProvider.instance,
});

/**
 * Defines a suite of API tests.
 */
export const describe: SuiteFunction = devtoolsApiTestInterface.describe;

/**
 * Defines an API test. The test body receives the inspected page and the
 * universe that is connected to it.
 */
export const it: TestFunction<State> = devtoolsApiTestInterface.it;

/**
 * Configures how the universe and the inspected page of the tests of the
 * enclosing suite are created.
 */
export const setup: SetupFunction<SuiteSettings> = devtoolsApiTestInterface.setup;
