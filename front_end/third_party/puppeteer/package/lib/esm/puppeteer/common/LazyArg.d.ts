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
import { ExecutionContext } from './ExecutionContext.js';
/**
 * @internal
 */
export declare class LazyArg<T> {
    #private;
    static create: <T_1>(get: (context: ExecutionContext) => T_1 | Promise<T_1>) => T_1;
    private constructor();
    get(context: ExecutionContext): Promise<T>;
}
//# sourceMappingURL=LazyArg.d.ts.map