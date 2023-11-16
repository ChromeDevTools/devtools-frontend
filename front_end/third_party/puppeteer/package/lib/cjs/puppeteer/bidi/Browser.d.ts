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
/// <reference types="node" />
import type { ChildProcess } from 'child_process';
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { Browser, type BrowserCloseCallback, type BrowserContextOptions } from '../api/Browser.js';
import type { Page } from '../api/Page.js';
import type { Target } from '../api/Target.js';
import type { Viewport } from '../common/Viewport.js';
import { BidiBrowserContext } from './BrowserContext.js';
import type { BidiConnection } from './Connection.js';
import { type BidiTarget } from './Target.js';
/**
 * @internal
 */
export interface BidiBrowserOptions {
    process?: ChildProcess;
    closeCallback?: BrowserCloseCallback;
    connection: BidiConnection;
    defaultViewport: Viewport | null;
    ignoreHTTPSErrors?: boolean;
}
/**
 * @internal
 */
export declare class BidiBrowser extends Browser {
    #private;
    readonly protocol = "webDriverBiDi";
    static readonly subscribeModules: string[];
    static readonly subscribeCdpEvents: Bidi.Cdp.EventNames[];
    static create(opts: BidiBrowserOptions): Promise<BidiBrowser>;
    constructor(opts: BidiBrowserOptions & {
        browserName: string;
        browserVersion: string;
    });
    userAgent(): never;
    get connection(): BidiConnection;
    wsEndpoint(): string;
    close(): Promise<void>;
    get connected(): boolean;
    process(): ChildProcess | null;
    createIncognitoBrowserContext(_options?: BrowserContextOptions): Promise<BidiBrowserContext>;
    version(): Promise<string>;
    browserContexts(): BidiBrowserContext[];
    _closeContext(browserContext: BidiBrowserContext): Promise<void>;
    defaultBrowserContext(): BidiBrowserContext;
    newPage(): Promise<Page>;
    targets(): Target[];
    _getTargetById(id: string): BidiTarget;
    target(): Target;
    disconnect(): void;
}
//# sourceMappingURL=Browser.d.ts.map