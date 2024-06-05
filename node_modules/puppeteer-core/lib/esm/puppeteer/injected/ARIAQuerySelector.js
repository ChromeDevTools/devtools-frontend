/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
export const ariaQuerySelector = (root, selector) => {
    return window.__ariaQuerySelector(root, selector);
};
export const ariaQuerySelectorAll = async function* (root, selector) {
    yield* await window.__ariaQuerySelectorAll(root, selector);
};
//# sourceMappingURL=ARIAQuerySelector.js.map