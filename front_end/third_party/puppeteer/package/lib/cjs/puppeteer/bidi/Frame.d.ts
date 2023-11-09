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
import type { CDPSession } from '../api/CDPSession.js';
import { Frame, type GoToOptions, type WaitForOptions } from '../api/Frame.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import type { Awaitable } from '../common/types.js';
import { disposeSymbol } from '../util/disposable.js';
import type { BrowsingContext } from './BrowsingContext.js';
import type { BidiHTTPResponse } from './HTTPResponse.js';
import type { BidiPage } from './Page.js';
import { Sandbox, type SandboxChart } from './Sandbox.js';
/**
 * Puppeteer's Frame class could be viewed as a BiDi BrowsingContext implementation
 * @internal
 */
export declare class BidiFrame extends Frame {
    #private;
    sandboxes: SandboxChart;
    _id: string;
    constructor(page: BidiPage, context: BrowsingContext, timeoutSettings: TimeoutSettings, parentId?: string | null);
    get client(): CDPSession;
    mainRealm(): Sandbox;
    isolatedRealm(): Sandbox;
    page(): BidiPage;
    url(): string;
    parentFrame(): BidiFrame | null;
    childFrames(): BidiFrame[];
    goto(url: string, options?: GoToOptions): Promise<BidiHTTPResponse | null>;
    setContent(html: string, options?: WaitForOptions): Promise<void>;
    context(): BrowsingContext;
    waitForNavigation(options?: WaitForOptions): Promise<BidiHTTPResponse | null>;
    get detached(): boolean;
    [disposeSymbol](): void;
    exposeFunction<Args extends unknown[], Ret>(name: string, apply: (...args: Args) => Awaitable<Ret>): Promise<void>;
}
//# sourceMappingURL=Frame.d.ts.map