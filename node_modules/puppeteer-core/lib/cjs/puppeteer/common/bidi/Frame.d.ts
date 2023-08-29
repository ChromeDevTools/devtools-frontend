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
import { ElementHandle } from '../../api/ElementHandle.js';
import { Frame as BaseFrame } from '../../api/Frame.js';
import { CDPSession } from '../Connection.js';
import { PuppeteerLifeCycleEvent } from '../LifecycleWatcher.js';
import { TimeoutSettings } from '../TimeoutSettings.js';
import { EvaluateFunc, EvaluateFuncWith, HandleFor, NodeFor } from '../types.js';
import { BrowsingContext } from './BrowsingContext.js';
import { HTTPResponse } from './HTTPResponse.js';
import { Page } from './Page.js';
import { Sandbox, SandboxChart } from './Sandbox.js';
/**
 * Puppeteer's Frame class could be viewed as a BiDi BrowsingContext implementation
 * @internal
 */
export declare class Frame extends BaseFrame {
    #private;
    sandboxes: SandboxChart;
    _id: string;
    constructor(page: Page, context: BrowsingContext, timeoutSettings: TimeoutSettings, parentId?: string | null);
    _client(): CDPSession;
    mainRealm(): Sandbox;
    isolatedRealm(): Sandbox;
    page(): Page;
    name(): string;
    url(): string;
    parentFrame(): Frame | null;
    childFrames(): Frame[];
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    goto(url: string, options?: {
        referer?: string;
        referrerPolicy?: string;
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<HTTPResponse | null>;
    setContent(html: string, options: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<void>;
    content(): Promise<string>;
    title(): Promise<string>;
    context(): BrowsingContext;
    $<Selector extends string>(selector: Selector): Promise<ElementHandle<NodeFor<Selector>> | null>;
    $$<Selector extends string>(selector: Selector): Promise<Array<ElementHandle<NodeFor<Selector>>>>;
    $eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<NodeFor<Selector>, Params> = EvaluateFuncWith<NodeFor<Selector>, Params>>(selector: Selector, pageFunction: string | Func, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $$eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<Array<NodeFor<Selector>>, Params> = EvaluateFuncWith<Array<NodeFor<Selector>>, Params>>(selector: Selector, pageFunction: string | Func, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $x(expression: string): Promise<Array<ElementHandle<Node>>>;
    waitForNavigation(options?: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<HTTPResponse | null>;
    dispose(): void;
}
//# sourceMappingURL=Frame.d.ts.map