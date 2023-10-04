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
import type { Observable } from '../../../third_party/rxjs/rxjs.js';
import type { HandleFor } from '../../common/types.js';
import { Locator, type VisibilityOption } from './locators.js';
/**
 * @internal
 */
export declare abstract class DelegatedLocator<T, U> extends Locator<U> {
    #private;
    constructor(delegate: Locator<T>);
    protected get delegate(): Locator<T>;
    setTimeout(timeout: number): DelegatedLocator<T, U>;
    setVisibility<ValueType extends Node, NodeType extends Node>(this: DelegatedLocator<ValueType, NodeType>, visibility: VisibilityOption): DelegatedLocator<ValueType, NodeType>;
    setWaitForEnabled<ValueType extends Node, NodeType extends Node>(this: DelegatedLocator<ValueType, NodeType>, value: boolean): DelegatedLocator<ValueType, NodeType>;
    setEnsureElementIsInTheViewport<ValueType extends Element, ElementType extends Element>(this: DelegatedLocator<ValueType, ElementType>, value: boolean): DelegatedLocator<ValueType, ElementType>;
    setWaitForStableBoundingBox<ValueType extends Element, ElementType extends Element>(this: DelegatedLocator<ValueType, ElementType>, value: boolean): DelegatedLocator<ValueType, ElementType>;
    abstract _clone(): DelegatedLocator<T, U>;
    abstract _wait(): Observable<HandleFor<U>>;
}
//# sourceMappingURL=DelegatedLocator.d.ts.map