/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @internal
 */
export function createIncrementalIdGenerator() {
    let id = 0;
    return () => {
        return ++id;
    };
}
//# sourceMappingURL=incremental-id-generator.js.map