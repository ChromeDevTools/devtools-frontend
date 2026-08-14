/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Target, TargetType } from '../api/Target.js';
import type { Logger } from '../common/Debug.js';
import type { CDPSession } from '../puppeteer-core.js';
import type { BidiBrowser } from './Browser.js';
import type { BidiBrowserContext } from './BrowserContext.js';
import type { BidiFrame } from './Frame.js';
import { BidiPage } from './Page.js';
import type { BidiWebWorker } from './WebWorker.js';
/**
 * @internal
 */
export declare class BidiBrowserTarget extends Target {
    #private;
    constructor(browser: BidiBrowser, logger: Logger);
    asPage(): Promise<BidiPage>;
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): Target | undefined;
}
/**
 * @internal
 */
export declare class BidiPageTarget extends Target {
    #private;
    constructor(page: BidiPage, logger: Logger);
    page(): Promise<BidiPage>;
    asPage(): Promise<BidiPage>;
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): Target | undefined;
}
/**
 * @internal
 */
export declare class BidiFrameTarget extends Target {
    #private;
    constructor(frame: BidiFrame, logger: Logger);
    page(): Promise<BidiPage>;
    asPage(): Promise<BidiPage>;
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): Target | undefined;
}
/**
 * @internal
 */
export declare class BidiWorkerTarget extends Target {
    #private;
    constructor(worker: BidiWebWorker, logger: Logger);
    page(): Promise<BidiPage>;
    asPage(): Promise<BidiPage>;
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): Target | undefined;
}
//# sourceMappingURL=Target.d.ts.map