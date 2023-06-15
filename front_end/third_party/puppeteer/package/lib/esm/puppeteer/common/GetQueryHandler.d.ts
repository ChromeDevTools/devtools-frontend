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
import { ARIAQueryHandler } from './AriaQueryHandler.js';
import { PierceQueryHandler } from './PierceQueryHandler.js';
import type { QueryHandler } from './QueryHandler.js';
import { TextQueryHandler } from './TextQueryHandler.js';
import { XPathQueryHandler } from './XPathQueryHandler.js';
export declare const BUILTIN_QUERY_HANDLERS: Readonly<{
    aria: typeof ARIAQueryHandler;
    pierce: typeof PierceQueryHandler;
    xpath: typeof XPathQueryHandler;
    text: typeof TextQueryHandler;
}>;
/**
 * @internal
 */
export declare function getQueryHandlerByName(name: string): typeof QueryHandler | undefined;
/**
 * @internal
 */
export declare function getQueryHandlerAndSelector(selector: string): {
    updatedSelector: string;
    QueryHandler: typeof QueryHandler;
};
//# sourceMappingURL=GetQueryHandler.d.ts.map