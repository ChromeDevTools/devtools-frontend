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
import { type Observable } from '../../../third_party/rxjs/rxjs.js';
import { type Awaitable, type HandleFor } from '../../common/types.js';
import { type Frame } from '../Frame.js';
import { type Page } from '../Page.js';
import { type ActionOptions, Locator } from './locators.js';
/**
 * @internal
 */
export declare class FunctionLocator<T> extends Locator<T> {
    #private;
    static create<Ret>(pageOrFrame: Page | Frame, func: () => Awaitable<Ret>): Locator<Ret>;
    private constructor();
    _clone(): FunctionLocator<T>;
    _wait(options?: Readonly<ActionOptions>): Observable<HandleFor<T>>;
}
//# sourceMappingURL=FunctionLocator.d.ts.map