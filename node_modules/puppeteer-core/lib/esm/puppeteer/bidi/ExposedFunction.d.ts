/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Awaitable } from '../common/types.js';
import type { BidiFrame } from './Frame.js';
/**
 * @internal
 */
export declare class ExposeableFunction<Args extends unknown[], Ret> {
    #private;
    readonly name: string;
    constructor(frame: BidiFrame, name: string, apply: (...args: Args) => Awaitable<Ret>, isolate?: boolean);
    expose(): Promise<void>;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
}
//# sourceMappingURL=ExposedFunction.d.ts.map