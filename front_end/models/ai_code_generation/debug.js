// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Local debugging utilities.
 */
export function isDebugMode() {
    return Boolean(localStorage.getItem('debugAiCodeGenerationEnabled'));
}
export function debugLog(...log) {
    if (!isDebugMode()) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...log);
}
function setDebugAiCodeGenerationEnabled(enabled) {
    if (enabled) {
        localStorage.setItem('debugAiCodeGenerationEnabled', 'true');
    }
    else {
        localStorage.removeItem('debugAiCodeGenerationEnabled');
    }
}
// @ts-expect-error
globalThis.setDebugAiCodeGenerationEnabled = setDebugAiCodeGenerationEnabled;
//# sourceMappingURL=debug.js.map