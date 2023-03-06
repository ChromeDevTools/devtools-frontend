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
import { AwaitableIterable } from '../common/types.js';
/**
 * @internal
 */
export declare class AsyncIterableUtil {
    static map<T, U>(iterable: AwaitableIterable<T>, map: (item: T) => Promise<U>): AsyncIterable<U>;
    static flatMap<T>(iterable: AwaitableIterable<T>, map: (item: T) => AwaitableIterable<T>): AsyncIterable<T>;
    static collect<T>(iterable: AwaitableIterable<T>): Promise<T[]>;
    static first<T>(iterable: AwaitableIterable<T>): Promise<T | undefined>;
}
//# sourceMappingURL=AsyncIterableUtil.d.ts.map