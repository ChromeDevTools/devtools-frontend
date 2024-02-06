/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { WaitForTargetOptions } from '../api/Browser.js';
import { BrowserContext } from '../api/BrowserContext.js';
import type { Page } from '../api/Page.js';
import type { Target } from '../api/Target.js';
import type { Viewport } from '../common/Viewport.js';
import type { BidiBrowser } from './Browser.js';
import type { BidiConnection } from './Connection.js';
import { UserContext } from './core/UserContext.js';
import type { BidiPage } from './Page.js';
/**
 * @internal
 */
export interface BidiBrowserContextOptions {
    defaultViewport: Viewport | null;
}
/**
 * @internal
 */
export declare class BidiBrowserContext extends BrowserContext {
    #private;
    constructor(browser: BidiBrowser, userContext: UserContext, options: BidiBrowserContextOptions);
    targets(): Target[];
    waitForTarget(predicate: (x: Target) => boolean | Promise<boolean>, options?: WaitForTargetOptions): Promise<Target>;
    get connection(): BidiConnection;
    newPage(): Promise<Page>;
    close(): Promise<void>;
    browser(): BidiBrowser;
    pages(): Promise<BidiPage[]>;
    isIncognito(): boolean;
    overridePermissions(): never;
    clearPermissionOverrides(): never;
    get id(): string | undefined;
}
//# sourceMappingURL=BrowserContext.d.ts.map