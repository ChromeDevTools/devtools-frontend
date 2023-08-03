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
exports.FunctionLocator = void 0;
const rxjs_js_1 = require("../../../third_party/rxjs/rxjs.js");
const locators_js_1 = require("./locators.js");
/**
 * @internal
 */
class FunctionLocator extends locators_js_1.Locator {
    static create(pageOrFrame, func) {
        return new FunctionLocator(pageOrFrame, func).setTimeout('getDefaultTimeout' in pageOrFrame
            ? pageOrFrame.getDefaultTimeout()
            : pageOrFrame.page().getDefaultTimeout());
    }
    #pageOrFrame;
    #func;
    constructor(pageOrFrame, func) {
        super();
        this.#pageOrFrame = pageOrFrame;
        this.#func = func;
    }
    _clone() {
        return new FunctionLocator(this.#pageOrFrame, this.#func);
    }
    _wait(options) {
        const signal = options?.signal;
        return (0, rxjs_js_1.defer)(() => {
            return (0, rxjs_js_1.from)(this.#pageOrFrame.waitForFunction(this.#func, {
                timeout: this.timeout,
                signal,
            }));
        }).pipe((0, rxjs_js_1.throwIfEmpty)());
    }
}
exports.FunctionLocator = FunctionLocator;
//# sourceMappingURL=FunctionLocator.js.map