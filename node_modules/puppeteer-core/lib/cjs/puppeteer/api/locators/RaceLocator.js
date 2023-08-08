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
exports.RaceLocator = void 0;
const rxjs_js_1 = require("../../../third_party/rxjs/rxjs.js");
const locators_js_1 = require("./locators.js");
function checkLocatorArray(locators) {
    for (const locator of locators) {
        if (!(locator instanceof locators_js_1.Locator)) {
            throw new Error('Unknown locator for race candidate');
        }
    }
    return locators;
}
/**
 * @internal
 */
class RaceLocator extends locators_js_1.Locator {
    static create(locators) {
        const array = checkLocatorArray(locators);
        return new RaceLocator(array);
    }
    #locators;
    constructor(locators) {
        super();
        this.#locators = locators;
    }
    _clone() {
        return new RaceLocator(this.#locators.map(locator => {
            return locator.clone();
        })).copyOptions(this);
    }
    _wait(options) {
        return (0, rxjs_js_1.race)(...this.#locators.map(locator => {
            return locator._wait(options);
        }));
    }
}
exports.RaceLocator = RaceLocator;
//# sourceMappingURL=RaceLocator.js.map