/**
 * Copyright 2019 Google Inc. All rights reserved.
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
import { Protocol } from 'devtools-protocol';
import type { Browser } from '../api/Browser.js';
import type { BrowserContext } from '../api/BrowserContext.js';
import { Page } from '../api/Page.js';
import { Target, TargetType } from '../api/Target.js';
import { Deferred } from '../util/Deferred.js';
import { CDPSession } from './Connection.js';
import { Viewport } from './PuppeteerViewport.js';
import { TargetManager } from './TargetManager.js';
import { TaskQueue } from './TaskQueue.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export declare enum InitializationStatus {
    SUCCESS = "success",
    ABORTED = "aborted"
}
/**
 * @internal
 */
export declare class CDPTarget extends Target {
    #private;
    /**
     * @internal
     */
    _initializedDeferred: Deferred<InitializationStatus>;
    /**
     * @internal
     */
    _isClosedDeferred: Deferred<void>;
    /**
     * @internal
     */
    _targetId: string;
    /**
     * To initialize the target for use, call initialize.
     *
     * @internal
     */
    constructor(targetInfo: Protocol.Target.TargetInfo, session: CDPSession | undefined, browserContext: BrowserContext | undefined, targetManager: TargetManager | undefined, sessionFactory: ((isAutoAttachEmulated: boolean) => Promise<CDPSession>) | undefined);
    /**
     * @internal
     */
    _session(): CDPSession | undefined;
    /**
     * @internal
     */
    protected _sessionFactory(): (isAutoAttachEmulated: boolean) => Promise<CDPSession>;
    createCDPSession(): Promise<CDPSession>;
    url(): string;
    type(): TargetType;
    /**
     * @internal
     */
    _targetManager(): TargetManager;
    /**
     * @internal
     */
    _getTargetInfo(): Protocol.Target.TargetInfo;
    browser(): Browser;
    browserContext(): BrowserContext;
    opener(): Target | undefined;
    /**
     * @internal
     */
    _targetInfoChanged(targetInfo: Protocol.Target.TargetInfo): void;
    /**
     * @internal
     */
    _initialize(): void;
    /**
     * @internal
     */
    protected _checkIfInitialized(): void;
}
/**
 * @internal
 */
export declare class PageTarget extends CDPTarget {
    #private;
    protected pagePromise?: Promise<Page>;
    /**
     * @internal
     */
    constructor(targetInfo: Protocol.Target.TargetInfo, session: CDPSession | undefined, browserContext: BrowserContext, targetManager: TargetManager, sessionFactory: (isAutoAttachEmulated: boolean) => Promise<CDPSession>, ignoreHTTPSErrors: boolean, defaultViewport: Viewport | null, screenshotTaskQueue: TaskQueue);
    _initialize(): void;
    page(): Promise<Page | null>;
    _checkIfInitialized(): void;
}
/**
 * @internal
 */
export declare class WorkerTarget extends CDPTarget {
    #private;
    worker(): Promise<WebWorker | null>;
}
/**
 * @internal
 */
export declare class OtherTarget extends CDPTarget {
}
//# sourceMappingURL=Target.d.ts.map