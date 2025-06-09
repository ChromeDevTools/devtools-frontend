// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {Platform} from '../conductor/platform.js';

import type {BrowserSettings, BrowserWrapper} from './shared/browser-helper.js';
import type {DevToolsPage, DevtoolsSettings} from './shared/frontend-helper.js';
import type {InspectedPage} from './shared/target-helper.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __pendingEvents: Map<string, Event[]>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __eventHandlers: WeakMap<Element, Map<string, Promise<void>>>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    __getRenderCoordinatorPendingFrames(): number;
  }
  namespace Mocha {
    export interface TestFunction {
      (title: string, fn: E2E.TestAsyncCallbackWithState): void;

      skipOnPlatforms: (platforms: Platform[], title: string, fn: E2E.TestAsyncCallbackWithState) => void;
    }

    export interface ExclusiveTestFunction {
      (title: string, fn: E2E.TestAsyncCallbackWithState): void;
    }

    export interface PendingTestFunction {
      (title: string, fn: E2E.TestAsyncCallbackWithState): void;
    }

    export interface Suite {
      settings: E2E.SuiteSettings;
      state: E2E.State;
      browser: BrowserWrapper;
    }

    export interface HookFunction {
      (fn: E2E.SuiteSettings): void;
    }
  }
  namespace E2E {
    export type HarnessSettings = BrowserSettings&DevtoolsSettings;
    export type SuiteSettings = Partial<HarnessSettings>;

    export interface State {
      devToolsPage: DevToolsPage;
      inspectedPage: InspectedPage;
      browser: BrowserWrapper;
    }

    // We do not allow test functions to affect mocha context.
    export type TestAsyncCallbackWithState = (this: undefined, state: State) => PromiseLike<unknown>;
  }
}
