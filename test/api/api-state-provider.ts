// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';
import type * as puppeteer from 'puppeteer-core';

import type * as Foundation from '../../front_end/foundation/foundation.js';
import {deinitializeGlobalLocaleVars, initializeGlobalLocaleVars} from '../../front_end/testing/LocaleHelpers.js';
import type {InspectedPage} from '../conductor/inspected_page.js';
import type {TestStateProvider} from '../conductor/mocha-interface-helpers.js';
import {StateProvider} from '../e2e/conductor/state-provider.js';
import {type InspectedPage as E2EInspectedPage, setupInspectedPage} from '../e2e/shared/InspectedPage.js';

import {createTargetUniverse} from './TargetUniverse.js';

export type {InspectedPage};

/**
 * Settings that a suite can register via `setup()`.
 */
export interface SuiteSettings {
  creationOptions?: Partial<Foundation.Universe.CreationOptions>;
  targetUrl?: string;
}

/**
 * The state that API tests receive as the argument of their test body.
 */
export interface State {
  inspectedPage: InspectedPage;
  universe: Foundation.Universe.Universe;
}

export class ApiStateProvider implements TestStateProvider<State, SuiteSettings> {
  static instance: ApiStateProvider = new ApiStateProvider();
  #suiteToSettingsMap = new WeakMap<Mocha.Suite, SuiteSettings>();
  #stateToCleanupMap = new WeakMap<State, () => void>();

  registerSuiteSettings(suite: Mocha.Suite, suiteSettings: SuiteSettings): void {
    this.#suiteToSettingsMap.set(suite, suiteSettings);
  }

  async prepareSuite(suite: Mocha.Suite): Promise<void> {
    await StateProvider.instance.resolveBrowser(suite);
  }

  async resolveBrowser(suite?: Mocha.Suite): Promise<void> {
    if (suite) {
      await StateProvider.instance.resolveBrowser(suite);
    }
  }

  #getSettings(suite: Mocha.Suite): SuiteSettings|undefined {
    return this.#suiteToSettingsMap.get(suite);
  }

  async setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number): Promise<E2EInspectedPage> {
    return await setupInspectedPage(context, serverPort);
  }

  async createState(suite: Mocha.Suite): Promise<State> {
    await this.prepareSuite(suite);
    const browserWrapper = StateProvider.instance.browserForSuite(suite);
    if (!browserWrapper || !browserWrapper.connected) {
      throw new Error('Browser disconnected unexpectedly');
    }
    const browser = browserWrapper.browser;

    const settings = this.#getSettings(suite);
    const browsingContext = await browser.createBrowserContext();
    const inspectedPage = await this.setupInspectedPage(browsingContext, StateProvider.serverPort);

    const targetUrl = settings?.targetUrl ?? `${inspectedPage.domain()}/test/e2e/resources/empty.html`;
    await inspectedPage.goTo(targetUrl);
    const session = await inspectedPage.page.createCDPSession();

    await initializeGlobalLocaleVars();
    const targetUniverse = await createTargetUniverse(session, settings?.creationOptions);

    const state: State = {
      inspectedPage,
      universe: targetUniverse.universe,
    };
    this.#stateToCleanupMap.set(state, targetUniverse.cleanup);
    return state;
  }

  async cleanupState(state: State): Promise<void> {
    try {
      const cleanup = this.#stateToCleanupMap.get(state);
      this.#stateToCleanupMap.delete(state);
      cleanup?.();
    } catch (e) {
      console.error('Unexpected error during target universe cleanup', e);
    }
    try {
      await state.inspectedPage.page.browserContext().close();
    } catch (e) {
      console.error('Unexpected error during cleanup', e);
    }
    deinitializeGlobalLocaleVars();
  }

  async closeBrowser(): Promise<void> {
    await StateProvider.instance.closeBrowsers();
  }
}
