/**
 * Copyright 2022 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { BrowserContext } from '../api/BrowserContext.js';
import type { Page } from '../api/Page.js';
import type { Target } from '../api/Target.js';
import type { Viewport } from '../common/Viewport.js';
import type { BidiBrowser } from './Browser.js';
import type { BidiConnection } from './Connection.js';
import type { BidiPage } from './Page.js';
/**
 * @internal
 */
export interface BidiBrowserContextOptions {
    defaultViewport: Viewport | null;
    isDefault: boolean;
}
/**
 * @internal
 */
export declare class BidiBrowserContext extends BrowserContext {
    #private;
    constructor(browser: BidiBrowser, options: BidiBrowserContextOptions);
    targets(): Target[];
    waitForTarget(predicate: (x: Target) => boolean | Promise<boolean>, options?: {
        timeout?: number;
    }): Promise<Target>;
    get connection(): BidiConnection;
    newPage(): Promise<Page>;
    close(): Promise<void>;
    browser(): BidiBrowser;
    pages(): Promise<BidiPage[]>;
    isIncognito(): boolean;
}
//# sourceMappingURL=BrowserContext.d.ts.map