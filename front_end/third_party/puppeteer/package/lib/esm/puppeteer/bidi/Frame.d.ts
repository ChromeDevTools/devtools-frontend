/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CDPSession } from '../api/CDPSession.js';
import type { ElementHandle } from '../api/ElementHandle.js';
import { Frame, type GoToOptions, type WaitForOptions } from '../api/Frame.js';
import type { WaitForSelectorOptions } from '../api/Page.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import type { Awaitable, NodeFor } from '../common/types.js';
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
    isOOPFrame(): never;
    url(): string;
    parentFrame(): BidiFrame | null;
    childFrames(): BidiFrame[];
    goto(url: string, options?: GoToOptions): Promise<BidiHTTPResponse | null>;
    setContent(html: string, options?: WaitForOptions): Promise<void>;
    context(): BrowsingContext;
    waitForNavigation(options?: WaitForOptions): Promise<BidiHTTPResponse | null>;
    waitForDevicePrompt(): never;
    get detached(): boolean;
    [disposeSymbol](): void;
    exposeFunction<Args extends unknown[], Ret>(name: string, apply: (...args: Args) => Awaitable<Ret>): Promise<void>;
    waitForSelector<Selector extends string>(selector: Selector, options?: WaitForSelectorOptions): Promise<ElementHandle<NodeFor<Selector>> | null>;
}
//# sourceMappingURL=Frame.d.ts.map