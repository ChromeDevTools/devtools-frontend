"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilteredLocator = void 0;
const rxjs_js_1 = require("../../../third_party/rxjs/rxjs.js");
const DelegatedLocator_js_1 = require("./DelegatedLocator.js");
/**
 * @internal
 */
class FilteredLocator extends DelegatedLocator_js_1.DelegatedLocator {
    #predicate;
    constructor(base, predicate) {
        super(base);
        this.#predicate = predicate;
    }
    _clone() {
        return new FilteredLocator(this.delegate.clone(), this.#predicate).copyOptions(this);
    }
    _wait(options) {
        return this.delegate._wait(options).pipe((0, rxjs_js_1.mergeMap)(handle => {
            return (0, rxjs_js_1.from)(handle.frame.waitForFunction(this.#predicate, { signal: options?.signal, timeout: this._timeout }, handle)).pipe((0, rxjs_js_1.map)(() => {
                // SAFETY: It passed the predicate, so this is correct.
                return handle;
            }));
        }), (0, rxjs_js_1.throwIfEmpty)());
    }
}
exports.FilteredLocator = FilteredLocator;
//# sourceMappingURL=FilteredLocator.js.map