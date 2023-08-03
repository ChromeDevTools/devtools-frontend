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
exports.DelegatedLocator = void 0;
const locators_js_1 = require("./locators.js");
/**
 * @internal
 */
class DelegatedLocator extends locators_js_1.Locator {
    #delegate;
    constructor(delegate) {
        super();
        this.#delegate = delegate;
        this.copyOptions(this.#delegate);
    }
    get delegate() {
        return this.#delegate;
    }
    setTimeout(timeout) {
        const locator = super.setTimeout(timeout);
        locator.#delegate = this.#delegate.setTimeout(timeout);
        return locator;
    }
    setVisibility(visibility) {
        const locator = super.setVisibility(visibility);
        locator.#delegate = locator.#delegate.setVisibility(visibility);
        return locator;
    }
    setWaitForEnabled(value) {
        const locator = super.setWaitForEnabled(value);
        locator.#delegate = this.#delegate.setWaitForEnabled(value);
        return locator;
    }
    setEnsureElementIsInTheViewport(value) {
        const locator = super.setEnsureElementIsInTheViewport(value);
        locator.#delegate = this.#delegate.setEnsureElementIsInTheViewport(value);
        return locator;
    }
    setWaitForStableBoundingBox(value) {
        const locator = super.setWaitForStableBoundingBox(value);
        locator.#delegate = this.#delegate.setWaitForStableBoundingBox(value);
        return locator;
    }
}
exports.DelegatedLocator = DelegatedLocator;
//# sourceMappingURL=DelegatedLocator.js.map