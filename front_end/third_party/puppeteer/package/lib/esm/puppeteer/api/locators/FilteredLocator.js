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
import { filter, from, map, mergeMap, throwIfEmpty, } from '../../../third_party/rxjs/rxjs.js';
import { DelegatedLocator } from './DelegatedLocator.js';
/**
 * @internal
 */
export class FilteredLocator extends DelegatedLocator {
    #predicate;
    constructor(base, predicate) {
        super(base);
        this.#predicate = predicate;
    }
    _clone() {
        return new FilteredLocator(this.delegate.clone(), this.#predicate).copyOptions(this);
    }
    _wait(options) {
        return this.delegate._wait(options).pipe(mergeMap(handle => {
            return from(Promise.resolve(this.#predicate(handle, options?.signal))).pipe(filter(value => {
                return value;
            }), map(() => {
                // SAFETY: It passed the predicate, so this is correct.
                return handle;
            }));
        }), throwIfEmpty());
    }
}
//# sourceMappingURL=FilteredLocator.js.map