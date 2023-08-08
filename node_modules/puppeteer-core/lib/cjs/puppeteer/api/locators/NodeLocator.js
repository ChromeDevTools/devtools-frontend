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
exports.NodeLocator = void 0;
const rxjs_js_1 = require("../../../third_party/rxjs/rxjs.js");
const locators_js_1 = require("./locators.js");
/**
 * @internal
 */
class NodeLocator extends locators_js_1.Locator {
    static create(pageOrFrame, selector) {
        return new NodeLocator(pageOrFrame, selector).setTimeout('getDefaultTimeout' in pageOrFrame
            ? pageOrFrame.getDefaultTimeout()
            : pageOrFrame.page().getDefaultTimeout());
    }
    #pageOrFrame;
    #selector;
    constructor(pageOrFrame, selector) {
        super();
        this.#pageOrFrame = pageOrFrame;
        this.#selector = selector;
    }
    /**
     * Waits for the element to become visible or hidden. visibility === 'visible'
     * means that the element has a computed style, the visibility property other
     * than 'hidden' or 'collapse' and non-empty bounding box. visibility ===
     * 'hidden' means the opposite of that.
     */
    #waitForVisibilityIfNeeded = (handle) => {
        if (!this.visibility) {
            return rxjs_js_1.EMPTY;
        }
        return (() => {
            switch (this.visibility) {
                case 'hidden':
                    return (0, rxjs_js_1.defer)(() => {
                        return (0, rxjs_js_1.from)(handle.isHidden());
                    });
                case 'visible':
                    return (0, rxjs_js_1.defer)(() => {
                        return (0, rxjs_js_1.from)(handle.isVisible());
                    });
            }
        })().pipe((0, rxjs_js_1.first)(rxjs_js_1.identity), (0, rxjs_js_1.retry)({ delay: locators_js_1.RETRY_DELAY }), (0, rxjs_js_1.ignoreElements)());
    };
    _clone() {
        return new NodeLocator(this.#pageOrFrame, this.#selector).copyOptions(this);
    }
    _wait(options) {
        const signal = options?.signal;
        return (0, rxjs_js_1.defer)(() => {
            return (0, rxjs_js_1.from)(this.#pageOrFrame.waitForSelector(this.#selector, {
                visible: false,
                timeout: this._timeout,
                signal,
            }));
        }).pipe((0, rxjs_js_1.filter)((value) => {
            return value !== null;
        }), (0, rxjs_js_1.throwIfEmpty)(), this.operators.conditions([this.#waitForVisibilityIfNeeded], signal));
    }
}
exports.NodeLocator = NodeLocator;
//# sourceMappingURL=NodeLocator.js.map