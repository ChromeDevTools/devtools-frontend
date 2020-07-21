/**
 * Copyright 2020 Google Inc. All rights reserved.
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
export interface QueryHandler {
    queryOne?: (element: Element | Document, selector: string) => Element | null;
    queryAll?: (element: Element | Document, selector: string) => Element[] | NodeListOf<Element>;
}
export declare function registerCustomQueryHandler(name: string, handler: QueryHandler): void;
/**
 * @param {string} name
 */
export declare function unregisterCustomQueryHandler(name: string): void;
export declare function customQueryHandlers(): Map<string, QueryHandler>;
export declare function clearQueryHandlers(): void;
export declare function getQueryHandlerAndSelector(selector: string): {
    updatedSelector: string;
    queryHandler: QueryHandler;
};
//# sourceMappingURL=QueryHandler.d.ts.map