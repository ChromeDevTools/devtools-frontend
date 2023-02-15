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
import type { CustomQueryHandler } from '../common/CustomQueryHandler.js';
import type { Awaitable, AwaitableIterable } from '../common/types.js';
export interface CustomQuerySelector {
    querySelector(root: Node, selector: string): Awaitable<Node | null>;
    querySelectorAll(root: Node, selector: string): AwaitableIterable<Node>;
}
/**
 * This class mimics the injected {@link CustomQuerySelectorRegistry}.
 */
declare class CustomQuerySelectorRegistry {
    #private;
    register(name: string, handler: CustomQueryHandler): void;
    unregister(name: string): void;
    get(name: string): CustomQuerySelector | undefined;
    clear(): void;
}
export declare const customQuerySelectors: CustomQuerySelectorRegistry;
export {};
//# sourceMappingURL=CustomQuerySelector.d.ts.map