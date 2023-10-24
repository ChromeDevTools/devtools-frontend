/**
 * Copyright 2022 Google Inc. All rights reserved.
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
/// <reference types="node" />
import type { ProtocolError } from '../common/Errors.js';
/**
 * @internal
 */
export interface ErrorLike extends Error {
    name: string;
    message: string;
}
/**
 * @internal
 */
export declare function isErrorLike(obj: unknown): obj is ErrorLike;
/**
 * @internal
 */
export declare function isErrnoException(obj: unknown): obj is NodeJS.ErrnoException;
/**
 * @internal
 */
export declare function rewriteError(error: ProtocolError, message: string, originalMessage?: string): Error;
/**
 * @internal
 */
export declare function createProtocolErrorMessage(object: {
    error: {
        message: string;
        data: any;
        code: number;
    };
}): string;
//# sourceMappingURL=ErrorLike.d.ts.map