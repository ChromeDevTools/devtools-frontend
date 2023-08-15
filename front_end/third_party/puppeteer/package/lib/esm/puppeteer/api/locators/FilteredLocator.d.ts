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
import { Observable } from '../../../third_party/rxjs/rxjs.js';
import { Awaitable, HandleFor } from '../../common/common.js';
import { DelegatedLocator } from './DelegatedLocator.js';
import { ActionOptions, Locator } from './locators.js';
/**
 * @public
 */
export type Predicate<From, To extends From = From> = ((value: From) => value is To) | ((value: From) => Awaitable<boolean>);
/**
 * @internal
 */
export type HandlePredicate<From, To extends From = From> = ((value: HandleFor<From>, signal?: AbortSignal) => value is HandleFor<To>) | ((value: HandleFor<From>, signal?: AbortSignal) => Awaitable<boolean>);
/**
 * @internal
 */
export declare class FilteredLocator<From, To extends From> extends DelegatedLocator<From, To> {
    #private;
    constructor(base: Locator<From>, predicate: HandlePredicate<From, To>);
    _clone(): FilteredLocator<From, To>;
    _wait(options?: Readonly<ActionOptions>): Observable<HandleFor<To>>;
}
//# sourceMappingURL=FilteredLocator.d.ts.map