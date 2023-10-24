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
import { Deferred } from '../util/Deferred.js';
import { ProtocolError } from './Errors.js';
/**
 * Manages callbacks and their IDs for the protocol request/response communication.
 *
 * @internal
 */
export declare class CallbackRegistry {
    #private;
    create(label: string, timeout: number | undefined, request: (id: number) => void): Promise<unknown>;
    reject(id: number, message: string, originalMessage?: string): void;
    _reject(callback: Callback, errorMessage: string | ProtocolError, originalMessage?: string): void;
    resolve(id: number, value: unknown): void;
    clear(): void;
}
/**
 * @internal
 */
export declare class Callback {
    #private;
    constructor(id: number, label: string, timeout?: number);
    resolve(value: unknown): void;
    reject(error: Error): void;
    get id(): number;
    get promise(): Deferred<unknown>;
    get error(): ProtocolError;
    get label(): string;
}
/**
 * @internal
 */
export declare function createIncrementalIdGenerator(): GetIdFn;
/**
 * @internal
 */
export type GetIdFn = () => number;
//# sourceMappingURL=CallbackRegistry.d.ts.map