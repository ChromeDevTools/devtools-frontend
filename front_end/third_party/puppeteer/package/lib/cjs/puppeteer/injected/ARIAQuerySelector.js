"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ariaQuerySelectorAll = exports.ariaQuerySelector = void 0;
const ariaQuerySelector = (root, selector) => {
    return window.__ariaQuerySelector(root, selector);
};
exports.ariaQuerySelector = ariaQuerySelector;
const ariaQuerySelectorAll = async function* (root, selector) {
    yield* await window.__ariaQuerySelectorAll(root, selector);
};
exports.ariaQuerySelectorAll = ariaQuerySelectorAll;
//# sourceMappingURL=ARIAQuerySelector.js.map