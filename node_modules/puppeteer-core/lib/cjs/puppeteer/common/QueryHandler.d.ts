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
import { ElementHandle } from '../api/ElementHandle.js';
import type PuppeteerUtil from '../injected/injected.js';
import type { Frame } from './Frame.js';
import type { WaitForSelectorOptions } from './IsolatedWorld.js';
import type { Awaitable, AwaitableIterable } from './types.js';
/**
 * @internal
 */
export type QuerySelectorAll = (node: Node, selector: string, PuppeteerUtil: PuppeteerUtil) => AwaitableIterable<Node>;
/**
 * @internal
 */
export type QuerySelector = (node: Node, selector: string, PuppeteerUtil: PuppeteerUtil) => Awaitable<Node | null>;
/**
 * @internal
 */
export declare class QueryHandler {
    static querySelectorAll?: QuerySelectorAll;
    static querySelector?: QuerySelector;
    static get _querySelector(): QuerySelector;
    static get _querySelectorAll(): QuerySelectorAll;
    /**
     * Queries for multiple nodes given a selector and {@link ElementHandle}.
     *
     * Akin to {@link Document.prototype.querySelectorAll}.
     */
    static queryAll(element: ElementHandle<Node>, selector: string): AwaitableIterable<ElementHandle<Node>>;
    /**
     * Queries for a single node given a selector and {@link ElementHandle}.
     *
     * Akin to {@link Document.prototype.querySelector}.
     */
    static queryOne(element: ElementHandle<Node>, selector: string): Promise<ElementHandle<Node> | null>;
    /**
     * Waits until a single node appears for a given selector and
     * {@link ElementHandle}.
     *
     * This will always query the handle in the Puppeteer world and migrate the
     * result to the main world.
     */
    static waitFor(elementOrFrame: ElementHandle<Node> | Frame, selector: string, options: WaitForSelectorOptions): Promise<ElementHandle<Node> | null>;
}
//# sourceMappingURL=QueryHandler.d.ts.map