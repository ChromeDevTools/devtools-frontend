// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Local debugging utilities for DevTools AI subsystems.
 */
import * as Platform from '../../core/platform/platform.js';
export const DEVTOOLS_AI_DEBUG_STORAGE_KEY = 'devToolsAiDebug';
/**
 * Reads the persisted DevTools AI debug configuration from `localStorage`.
 */
export function getDevToolsAIDebugConfig() {
    try {
        const raw = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem(DEVTOOLS_AI_DEBUG_STORAGE_KEY);
        if (!raw) {
            return { assistance: false, gca: false, codeGenComplete: false };
        }
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) {
            return { assistance: false, gca: false, codeGenComplete: false };
        }
        const record = parsed;
        return {
            assistance: Boolean(record.assistance),
            gca: Boolean(record.gca),
            codeGenComplete: Boolean(record.codeGenComplete),
        };
    }
    catch {
        return { assistance: false, gca: false, codeGenComplete: false };
    }
}
/**
 * Merges `config` into the persisted `devToolsAiDebug` object in `localStorage`
 * and logs the resulting state to the console.
 */
export function setDevToolsAIDebug(config = {}) {
    const current = getDevToolsAIDebugConfig();
    const nextConfig = {
        assistance: config.assistance ?? current.assistance,
        gca: config.gca ?? current.gca,
        codeGenComplete: config.codeGenComplete ?? current.codeGenComplete,
    };
    const storage = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage();
    try {
        storage?.setItem(DEVTOOLS_AI_DEBUG_STORAGE_KEY, JSON.stringify(nextConfig));
    }
    catch {
        // Ignore storage write errors in restricted contexts.
    }
    // eslint-disable-next-line no-console
    console.log('DevTools AI debug config:', nextConfig);
    return nextConfig;
}
export function isDebugMode() {
    return getDevToolsAIDebugConfig().assistance;
}
export function debugLog(...log) {
    if (!isDebugMode()) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...log);
}
export function isCodeGenCompleteDebugMode() {
    return getDevToolsAIDebugConfig().codeGenComplete;
}
export function debugCodeGenCompleteLog(...log) {
    if (!isCodeGenCompleteDebugMode()) {
        return;
    }
    // eslint-disable-next-line no-console
    console.log(...log);
}
/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled, gca: enabled})` instead.
 */
export function setDebugAiAssistanceEnabled(enabled) {
    console.warn('setDebugAiAssistanceEnabled is deprecated and will be removed soon. ' +
        `Use setDevToolsAIDebug({assistance: ${Boolean(enabled)}, gca: ${Boolean(enabled)}}) instead.`);
    setDevToolsAIDebug({ assistance: Boolean(enabled), gca: Boolean(enabled) });
}
/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled})` instead.
 */
export function setAiAssistanceStructuredLogEnabled(enabled) {
    console.warn('setAiAssistanceStructuredLogEnabled is deprecated and will be removed soon. ' +
        `Use setDevToolsAIDebug({assistance: ${Boolean(enabled)}}) instead.`);
    setDevToolsAIDebug({ assistance: Boolean(enabled) });
}
/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export function setDebugAiCodeCompletionEnabled(enabled) {
    console.warn('setDebugAiCodeCompletionEnabled is deprecated and will be removed soon. ' +
        `Use setDevToolsAIDebug({codeGenComplete: ${Boolean(enabled)}}) instead.`);
    setDevToolsAIDebug({ codeGenComplete: Boolean(enabled) });
}
/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export function setDebugAiCodeGenerationEnabled(enabled) {
    console.warn('setDebugAiCodeGenerationEnabled is deprecated and will be removed soon. ' +
        `Use setDevToolsAIDebug({codeGenComplete: ${Boolean(enabled)}}) instead.`);
    setDevToolsAIDebug({ codeGenComplete: Boolean(enabled) });
}
globalThis.setDevToolsAIDebug = setDevToolsAIDebug;
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;
globalThis.setDebugAiCodeCompletionEnabled = setDebugAiCodeCompletionEnabled;
globalThis.setDebugAiCodeGenerationEnabled = setDebugAiCodeGenerationEnabled;
//# sourceMappingURL=debug.js.map