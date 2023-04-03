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
import { QueryHandler } from './QueryHandler.js';
/**
 * @public
 */
export interface CustomQueryHandler {
    /**
     * Searches for a {@link https://developer.mozilla.org/en-US/docs/Web/API/Node | Node} matching the given `selector` from {@link https://developer.mozilla.org/en-US/docs/Web/API/Node | node}.
     */
    queryOne?: (node: Node, selector: string) => Node | null;
    /**
     * Searches for some {@link https://developer.mozilla.org/en-US/docs/Web/API/Node | Nodes} matching the given `selector` from {@link https://developer.mozilla.org/en-US/docs/Web/API/Node | node}.
     */
    queryAll?: (node: Node, selector: string) => Iterable<Node>;
}
/**
 * The registry of {@link CustomQueryHandler | custom query handlers}.
 *
 * @example
 *
 * ```ts
 * Puppeteer.customQueryHandlers.register('lit', { … });
 * const aHandle = await page.$('lit/…');
 * ```
 *
 * @internal
 */
export declare class CustomQueryHandlerRegistry {
    #private;
    /**
     * @internal
     */
    get(name: string): typeof QueryHandler | undefined;
    /**
     * Registers a {@link CustomQueryHandler | custom query handler}.
     *
     * @remarks
     * After registration, the handler can be used everywhere where a selector is
     * expected by prepending the selection string with `<name>/`. The name is
     * only allowed to consist of lower- and upper case latin letters.
     *
     * @example
     *
     * ```ts
     * Puppeteer.customQueryHandlers.register('lit', { … });
     * const aHandle = await page.$('lit/…');
     * ```
     *
     * @param name - Name to register under.
     * @param queryHandler - {@link CustomQueryHandler | Custom query handler} to
     * register.
     *
     * @internal
     */
    register(name: string, handler: CustomQueryHandler): void;
    /**
     * Unregisters the {@link CustomQueryHandler | custom query handler} for the
     * given name.
     *
     * @throws `Error` if there is no handler under the given name.
     *
     * @internal
     */
    unregister(name: string): void;
    /**
     * Gets the names of all {@link CustomQueryHandler | custom query handlers}.
     *
     * @internal
     */
    names(): string[];
    /**
     * Unregisters all custom query handlers.
     *
     * @internal
     */
    clear(): void;
}
/**
 * @internal
 */
export declare const customQueryHandlers: CustomQueryHandlerRegistry;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.registerCustomQueryHandler}
 *
 * @public
 */
export declare function registerCustomQueryHandler(name: string, handler: CustomQueryHandler): void;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.unregisterCustomQueryHandler}
 *
 * @public
 */
export declare function unregisterCustomQueryHandler(name: string): void;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.customQueryHandlerNames}
 *
 * @public
 */
export declare function customQueryHandlerNames(): string[];
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.clearCustomQueryHandlers}
 *
 * @public
 */
export declare function clearCustomQueryHandlers(): void;
//# sourceMappingURL=CustomQueryHandler.d.ts.map