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
import { type Disposed, type Moveable } from '../common/types.js';
export declare function moveable<Class extends abstract new (...args: never[]) => Moveable>(Class: Class, _: ClassDecoratorContext<Class>): Class;
export declare function throwIfDisposed<This extends Disposed>(message?: (value: This) => string): (target: (this: This, ...args: any[]) => any, _: unknown) => (this: This, ...args: any[]) => any;
/**
 * The decorator only invokes the target if the target has not been invoked with
 * the same arguments before. The decorated method throws an error if it's
 * invoked with a different number of elements: if you decorate a method, it
 * should have the same number of arguments
 *
 * @internal
 */
export declare function invokeAtMostOnceForArguments(target: (this: unknown, ...args: any[]) => any, _: unknown): typeof target;
export declare function guarded<T extends object>(getKey?: (this: T) => object): (target: (this: T, ...args: any[]) => Promise<any>, _: ClassMethodDecoratorContext<T>) => (this: T, ...args: any[]) => Promise<any>;
//# sourceMappingURL=decorators.d.ts.map