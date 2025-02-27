
import type {Platform} from '../conductor/platform.js';

import type {BrowserSettings, BrowserWrapper} from './shared/browser-helper.js';
import type {DevToolsFronendPage, DevtoolsSettings} from './shared/frontend-helper.js';
import type {InspectedPage} from './shared/target-helper.js';


declare global {
  namespace Mocha {
    export interface TestFunction {
      (title: string, fn: E2E.TestCallbackWithState): void;

      skipOnPlatforms: (platforms: Platform[], title: string, fn: Mocha.AsyncFunc) => void;
    }
    export interface Suite {
      settings: E2E.SuiteSettings;
      state: E2E.State;
      browser: BrowserWrapper;
    }
  }
  namespace E2E {
    export type HarnessSettings = BrowserSettings&DevtoolsSettings;
    export type SuiteSettings = Partial<HarnessSettings>;

    export interface State {
      devToolsPage: DevToolsFronendPage;
      inspectedPage: InspectedPage;
      browser: BrowserWrapper;
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    export type TestCallbackWithState = (state: State) => PromiseLike<any>;
  }
}
