/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ChildProcess } from 'node:child_process';
import type { DebugInfo } from '../api/Browser.js';
import { Browser as BrowserBase, type BrowserCloseCallback, type BrowserContextOptions, type IsPageTargetCallback, type TargetFilterCallback } from '../api/Browser.js';
import type { Page } from '../api/Page.js';
import type { DownloadBehavior } from '../common/DownloadBehavior.js';
import type { Viewport } from '../common/Viewport.js';
import { CdpBrowserContext } from './BrowserContext.js';
import type { Connection } from './Connection.js';
import { type CdpTarget } from './Target.js';
import { TargetManager } from './TargetManager.js';
/**
 * @internal
 */
export declare class CdpBrowser extends BrowserBase {
    #private;
    readonly protocol = "cdp";
    static _create(connection: Connection, contextIds: string[], acceptInsecureCerts: boolean, defaultViewport?: Viewport | null, downloadBehavior?: DownloadBehavior, process?: ChildProcess, closeCallback?: BrowserCloseCallback, targetFilterCallback?: TargetFilterCallback, isPageTargetCallback?: IsPageTargetCallback, waitForInitiallyDiscoveredTargets?: boolean, networkEnabled?: boolean): Promise<CdpBrowser>;
    constructor(connection: Connection, contextIds: string[], defaultViewport?: Viewport | null, process?: ChildProcess, closeCallback?: BrowserCloseCallback, targetFilterCallback?: TargetFilterCallback, isPageTargetCallback?: IsPageTargetCallback, waitForInitiallyDiscoveredTargets?: boolean, networkEnabled?: boolean);
    _attach(downloadBehavior: DownloadBehavior | undefined): Promise<void>;
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
    installExtension(path: string): Promise<string>;
    uninstallExtension(id: string): Promise<void>;
    targets(): CdpTarget[];
    target(): CdpTarget;
    version(): Promise<string>;
    userAgent(): Promise<string>;
    close(): Promise<void>;
    disconnect(): Promise<void>;
    get connected(): boolean;
    get debugInfo(): DebugInfo;
    isNetworkEnabled(): boolean;
}
//# sourceMappingURL=Browser.d.ts.map