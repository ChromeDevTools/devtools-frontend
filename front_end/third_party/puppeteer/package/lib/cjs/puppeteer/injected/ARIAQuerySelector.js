"use strict";
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
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