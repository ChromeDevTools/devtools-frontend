/**
 * Copyright 2023 Google Inc. All rights reserved.
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
import { type CDPSession } from '../api/CDPSession.js';
import { Target, TargetType } from '../api/Target.js';
import { type BidiBrowser } from './Browser.js';
import { type BidiBrowserContext } from './BrowserContext.js';
import { type BrowsingContext } from './BrowsingContext.js';
import { BidiPage } from './Page.js';
/**
 * @internal
 */
export declare class BidiTarget extends Target {
    protected _browserContext: BidiBrowserContext;
    constructor(browserContext: BidiBrowserContext);
    worker(): Promise<null>;
    browser(): BidiBrowser;
    browserContext(): BidiBrowserContext;
    opener(): Target | undefined;
    _setBrowserContext(browserContext: BidiBrowserContext): void;
}
/**
 * @internal
 */
export declare class BiDiBrowserTarget extends BidiTarget {
    url(): string;
    type(): TargetType;
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
    page(): Promise<BidiPage | null>;
    _setBrowserContext(browserContext: BidiBrowserContext): void;
}
//# sourceMappingURL=Target.d.ts.map