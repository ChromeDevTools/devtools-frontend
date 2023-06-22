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
import { Deferred } from '../util/Deferred.js';
import * as CustomQuerySelectors from './CustomQuerySelector.js';
import { IntervalPoller, MutationPoller, RAFPoller } from './Poller.js';
/**
 * @internal
 */
declare const PuppeteerUtil: Readonly<{
    Deferred: typeof Deferred;
    createFunction: (functionValue: string) => (...args: unknown[]) => unknown;
    createTextContent: (root: Node) => import("./TextContent.js").TextContent;
    IntervalPoller: typeof IntervalPoller;
    isSuitableNodeForTextMatching: (node: Node) => boolean;
    MutationPoller: typeof MutationPoller;
    RAFPoller: typeof RAFPoller;
    xpathQuerySelectorAll: (root: Node, selector: string) => Iterable<Node>;
    pierce(root: Node): IterableIterator<Node | ShadowRoot>;
    pierceAll(root: Node): IterableIterator<Node | ShadowRoot>;
    checkVisibility: (node: Node | null, visible?: boolean | undefined) => boolean | Node;
    textQuerySelectorAll: (root: Node, selector: string) => Generator<Element, any, unknown>;
    pQuerySelectorAll: (root: Node, selector: string) => import("../puppeteer-core.js").AwaitableIterable<Node>;
    pQuerySelector: (root: Node, selector: string) => Promise<Node | null>;
    pierceQuerySelector: (root: Node, selector: string) => Element | null;
    pierceQuerySelectorAll: (element: Node, selector: string) => Element[];
    customQuerySelectors: {
        "__#43088@#selectors": Map<string, CustomQuerySelectors.CustomQuerySelector>;
        register(name: string, handler: import("../puppeteer-core.js").CustomQueryHandler): void;
        unregister(name: string): void;
        get(name: string): CustomQuerySelectors.CustomQuerySelector | undefined;
        clear(): void;
    };
    ariaQuerySelector: (root: Node, selector: string) => Promise<Node | null>;
    ariaQuerySelectorAll: (root: Node, selector: string) => AsyncIterable<Node>;
}>;
/**
 * @internal
 */
type PuppeteerUtil = typeof PuppeteerUtil;
/**
 * @internal
 */
export default PuppeteerUtil;
//# sourceMappingURL=injected.d.ts.map