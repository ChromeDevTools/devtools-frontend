/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AwaitableIterable } from '../common/types.js';
/**
 * Queries the given node for all nodes matching the given text selector.
 *
 * @internal
 */
export declare const pQuerySelectorAll: (root: Node, selector: string) => AwaitableIterable<Node>;
/**
 * Queries the given node for all nodes matching the given text selector.
 *
 * @internal
 */
export declare const pQuerySelector: (root: Node, selector: string) => Promise<Node | null>;
//# sourceMappingURL=PQuerySelector.d.ts.map