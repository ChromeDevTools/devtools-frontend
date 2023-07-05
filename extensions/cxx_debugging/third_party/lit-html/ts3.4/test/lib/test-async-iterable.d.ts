/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An async iterable that can have values pushed into it for testing code
 * that consumes async iterables. This iterable can only be safely consumed
 * by one listener.
 */
export declare class TestAsyncIterable<T> implements AsyncIterable<T> {
    /**
     * A Promise that resolves with the next value to be returned by the
     * async iterable returned from iterable()
     */
    private _nextValue;
    private _resolveNextValue;
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
    /**
     * Pushes a new value and returns a Promise that resolves when the value
     * has been emitted by the iterator. push() must not be called before
     * a previous call has completed, so always await a push() call.
     */
    push(value: T): Promise<void>;
}
//# sourceMappingURL=test-async-iterable.d.ts.map
