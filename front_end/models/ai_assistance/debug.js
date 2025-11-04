// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Local debugging utilities.
 */
export function isDebugMode() {
    return Boolean(localStorage.getItem('debugAiAssistancePanelEnabled'));
}
export function isStructuredLogEnabled() {
    return Boolean(localStorage.getItem('aiAssistanceStructuredLogEnabled'));
}
export function debugLog(...log) {
    if (!isDebugMode()) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...log);
}
function setDebugAiAssistanceEnabled(enabled) {
    if (enabled) {
        localStorage.setItem('debugAiAssistancePanelEnabled', 'true');
    }
    else {
        localStorage.removeItem('debugAiAssistancePanelEnabled');
    }
    setAiAssistanceStructuredLogEnabled(enabled);
}
// @ts-expect-error
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;
function setAiAssistanceStructuredLogEnabled(enabled) {
    if (enabled) {
        localStorage.setItem('aiAssistanceStructuredLogEnabled', 'true');
    }
    else {
        localStorage.removeItem('aiAssistanceStructuredLogEnabled');
    }
}
// @ts-expect-error
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;
//# sourceMappingURL=debug.js.map