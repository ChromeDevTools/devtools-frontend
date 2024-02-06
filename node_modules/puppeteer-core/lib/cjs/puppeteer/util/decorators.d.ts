/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Disposed, Moveable } from '../common/types.js';
export declare function moveable<Class extends abstract new (...args: never[]) => Moveable>(Class: Class, _: ClassDecoratorContext<Class>): Class;
export declare function throwIfDisposed<This extends Disposed>(message?: (value: This) => string): (target: (this: This, ...args: any[]) => any, _: unknown) => (this: This, ...args: any[]) => any;
export declare function inertIfDisposed<This extends Disposed>(target: (this: This, ...args: any[]) => any, _: unknown): (this: This, ...args: any[]) => any;
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