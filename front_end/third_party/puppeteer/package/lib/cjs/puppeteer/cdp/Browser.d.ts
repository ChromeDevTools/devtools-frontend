/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/// <reference types="node" />
import type { ChildProcess } from 'child_process';
import type { DebugInfo } from '../api/Browser.js';
import { Browser as BrowserBase, type BrowserCloseCallback, type BrowserContextOptions, type IsPageTargetCallback, type Permission, type TargetFilterCallback } from '../api/Browser.js';
import { BrowserContext } from '../api/BrowserContext.js';
import type { Page } from '../api/Page.js';
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
    createBrowserContext(options?: BrowserContextOptions): Promise<CdpBrowserContext>;
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
    disconnect(): Promise<void>;
    get connected(): boolean;
    get debugInfo(): DebugInfo;
}
/**
 * @internal
 */
export declare class CdpBrowserContext extends BrowserContext {
    #private;
    constructor(connection: Connection, browser: CdpBrowser, contextId?: string);
    get id(): string | undefined;
    targets(): CdpTarget[];
    pages(): Promise<Page[]>;
    isIncognito(): boolean;
    overridePermissions(origin: string, permissions: Permission[]): Promise<void>;
    clearPermissionOverrides(): Promise<void>;
    newPage(): Promise<Page>;
    browser(): CdpBrowser;
    close(): Promise<void>;
}
//# sourceMappingURL=Browser.d.ts.map