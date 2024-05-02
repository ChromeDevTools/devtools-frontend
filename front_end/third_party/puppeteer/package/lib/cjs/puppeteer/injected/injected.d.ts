/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
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
    xpathQuerySelectorAll: (root: Node, selector: string, maxResults?: number) => Iterable<Node>;
    pierce(root: Node): IterableIterator<Node | ShadowRoot>;
    pierceAll(root: Node): IterableIterator<Node | ShadowRoot>;
    checkVisibility: (node: Node | null, visible?: boolean | undefined) => boolean | Node;
    textQuerySelectorAll: (root: Node, selector: string) => Generator<Element, any, unknown>;
    pQuerySelectorAll: (root: Node, selector: string) => import("../puppeteer-core.js").AwaitableIterable<Node>;
    pQuerySelector: (root: Node, selector: string) => Promise<Node | null>;
    pierceQuerySelector: (root: Node, selector: string) => Element | null;
    pierceQuerySelectorAll: (element: Node, selector: string) => Element[];
    customQuerySelectors: {
        "__#51267@#selectors": Map<string, CustomQuerySelectors.CustomQuerySelector>;
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