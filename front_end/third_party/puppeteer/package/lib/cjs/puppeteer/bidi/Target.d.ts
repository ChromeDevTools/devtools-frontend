/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CDPSession } from '../api/CDPSession.js';
import type { Page } from '../api/Page.js';
import { Target, TargetType } from '../api/Target.js';
import type { BidiBrowser } from './Browser.js';
import type { BidiBrowserContext } from './BrowserContext.js';
import { type BrowsingContext } from './BrowsingContext.js';
import { BidiPage } from './Page.js';
/**
 * @internal
 */
export declare abstract class BidiTarget extends Target {
    protected _browserContext: BidiBrowserContext;
    constructor(browserContext: BidiBrowserContext);
    _setBrowserContext(browserContext: BidiBrowserContext): void;
    asPage(): Promise<Page>;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): never;
    createCDPSession(): Promise<CDPSession>;
}
/**
 * @internal
 */
export declare class BiDiBrowserTarget extends Target {
    #private;
    constructor(browser: BidiBrowser);
    url(): string;
    type(): TargetType;
    asPage(): Promise<Page>;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): never;
    createCDPSession(): Promise<CDPSession>;
}
/**
 * @internal
 */
export declare class BiDiBrowsingContextTarget extends BidiTarget {
    protected _browsingContext: BrowsingContext;
    constructor(browserContext: BidiBrowserContext, browsingContext: BrowsingContext);
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
}
/**
 * @internal
 */
export declare class BiDiPageTarget extends BiDiBrowsingContextTarget {
    #private;
    constructor(browserContext: BidiBrowserContext, browsingContext: BrowsingContext);
    page(): Promise<BidiPage>;
    _setBrowserContext(browserContext: BidiBrowserContext): void;
}
//# sourceMappingURL=Target.d.ts.map