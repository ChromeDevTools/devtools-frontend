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
import { Target, TargetType } from '../../api/Target.js';
import { CDPSession } from '../Connection.js';
import type { WebWorker } from '../WebWorker.js';
import { Browser } from './Browser.js';
import { BrowserContext } from './BrowserContext.js';
import { BrowsingContext } from './BrowsingContext.js';
import { Page } from './Page.js';
export declare class BiDiTarget extends Target {
    protected _browserContext: BrowserContext;
    constructor(browserContext: BrowserContext);
    worker(): Promise<WebWorker | null>;
    browser(): Browser;
    browserContext(): BrowserContext;
    opener(): Target | undefined;
    _setBrowserContext(browserContext: BrowserContext): void;
}
/**
 * @internal
 */
export declare class BiDiBrowserTarget extends BiDiTarget {
    url(): string;
    type(): TargetType;
}
/**
 * @internal
 */
export declare class BiDiBrowsingContextTarget extends BiDiTarget {
    protected _browsingContext: BrowsingContext;
    constructor(browserContext: BrowserContext, browsingContext: BrowsingContext);
    url(): string;
    createCDPSession(): Promise<CDPSession>;
    type(): TargetType;
}
/**
 * @internal
 */
export declare class BiDiPageTarget extends BiDiBrowsingContextTarget {
    #private;
    constructor(browserContext: BrowserContext, browsingContext: BrowsingContext);
    page(): Promise<Page | null>;
    _setBrowserContext(browserContext: BrowserContext): void;
}
//# sourceMappingURL=Target.d.ts.map