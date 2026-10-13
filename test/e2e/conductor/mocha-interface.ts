// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createMochaInterface,
  type MochaInterface,
  type SetupFunction,
  type SuiteFunction,
  type TestFunction,
} from '../../conductor/mocha-interface.js';

import {type E2EState, type State, StateProvider, type SuiteSettings} from './state-provider.js';

const devtoolsTestInterface: MochaInterface<E2EState, SuiteSettings> = createMochaInterface({
  description: 'DevTools test interface',
  stateProvider: StateProvider.instance,
});

/**
 * Defines a suite of e2e tests.
 */
export const describe: SuiteFunction = devtoolsTestInterface.describe;

/**
 * Defines an e2e test. The test body receives the DevTools page, the inspected
 * page and the browser that the test should use.
 */
export const it: TestFunction<State> = devtoolsTestInterface.it;

/**
 * Configures the browser and DevTools for the tests of the enclosing suite.
 */
export const setup: SetupFunction<SuiteSettings> = devtoolsTestInterface.setup;

// eslint-disable-next-line no-restricted-syntax
export default devtoolsTestInterface;
