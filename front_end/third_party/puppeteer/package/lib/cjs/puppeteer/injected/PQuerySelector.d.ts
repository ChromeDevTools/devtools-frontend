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