/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Gets the global version if we're in the browser, else loads the node-fetch module.
 *
 * @internal
 */
export const getFetch = async () => {
    return globalThis.fetch || (await import('cross-fetch')).fetch;
};
//# sourceMappingURL=fetch.js.map