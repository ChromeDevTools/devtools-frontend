/**
 * Copyright 2017 Google Inc. All rights reserved.
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
/// <reference types="node" />
import type { ChildProcess } from 'child_process';
import { Browser as BrowserBase, type BrowserCloseCallback, type BrowserContextOptions, type IsPageTargetCallback, type Permission, type TargetFilterCallback, type WaitForTargetOptions } from '../api/Browser.js';
import { BrowserContext } from '../api/BrowserContext.js';
import type { Page } from '../api/Page.js';
import type { Target } from '../api/Target.js';
import type { Viewport } from '../common/Viewport.js';
import type { Connection } from './Connection.js';
import { type CdpTarget } from './Target.js';
import { type TargetManager } from './TargetManager.js';
/**
 * @internal
 */
export declare class CdpBrowser extends BrowserBase {
    #private;
    readonly protocol = "cdp";
    static _create(product: 'firefox' | 'chrome' | undefined, connection: Connection, contextIds: string[], ignoreHTTPSErrors: boolean, defaultViewport?: Viewport | null, process?: ChildProcess, closeCallback?: BrowserCloseCallback, targetFilterCallback?: TargetFilterCallback, isPageTargetCallback?: IsPageTargetCallback, waitForInitiallyDiscoveredTargets?: boolean): Promise<CdpBrowser>;
    constructor(product: 'chrome' | 'firefox' | undefined, connection: Connection, contextIds: string[], ignoreHTTPSErrors: boolean, defaultViewport?: Viewport | null, process?: ChildProcess, closeCallback?: BrowserCloseCallback, targetFilterCallback?: TargetFilterCallback, isPageTargetCallback?: IsPageTargetCallback, waitForInitiallyDiscoveredTargets?: boolean);
    _attach(): Promise<void>;
    _detach(): void;
    process(): ChildProcess | null;
    _targetManager(): TargetManager;
    _getIsPageTargetCallback(): IsPageTargetCallback | undefined;
    createIncognitoBrowserContext(options?: BrowserContextOptions): Promise<CdpBrowserContext>;
    browserContexts(): CdpBrowserContext[];
    defaultBrowserContext(): CdpBrowserContext;
    _disposeContext(contextId?: string): Promise<void>;
    wsEndpoint(): string;
    newPage(): Promise<Page>;
    _createPageInContext(contextId?: string): Promise<Page>;
    targets(): CdpTarget[];
    target(): CdpTarget;
    version(): Promise<string>;
    userAgent(): Promise<string>;
    close(): Promise<void>;
    disconnect(): void;
    get connected(): boolean;
}
/**
 * @internal
 */
export declare class CdpBrowserContext extends BrowserContext {
    #private;
    constructor(connection: Connection, browser: CdpBrowser, contextId?: string);
    get id(): string | undefined;
    targets(): CdpTarget[];
    waitForTarget(predicate: (x: Target) => boolean | Promise<boolean>, options?: WaitForTargetOptions): Promise<Target>;
    pages(): Promise<Page[]>;
    isIncognito(): boolean;
    overridePermissions(origin: string, permissions: Permission[]): Promise<void>;
    clearPermissionOverrides(): Promise<void>;
    newPage(): Promise<Page>;
    browser(): CdpBrowser;
    close(): Promise<void>;
}
//# sourceMappingURL=Browser.d.ts.map