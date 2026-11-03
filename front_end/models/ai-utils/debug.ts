// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Local debugging utilities for DevTools AI subsystems.
 */

import * as Platform from '../../core/platform/platform.js';

export const DEVTOOLS_AI_DEBUG_STORAGE_KEY = 'devToolsAiDebug';

/**
 * Configuration options for enabling DevTools AI debug logging in the console.
 * Passed to `window.setDevToolsAIDebug(config)` and persisted in `localStorage`.
 */
export interface DevToolsAIDebugConfig {
  /**
   * Enables console debug logging and structured log persistence for DevTools AI
   * Assistance (`AiAgent`, `AiAgent2`, `AiUtils`, and `panels/ai_assistance/`).
   */
  assistance?: boolean;
  /**
   * Enables console debug logging for the AIDA and GCA host client and
   * request/response translation layer (`AidaClient`, `GcaClient`, and
   * `AidaGcaTranslation`).
   */
  gca?: boolean;
  /**
   * Enables console debug logging for AI Code Completion and AI Code Generation
   * (`AiCodeCompletion` and `AiCodeGeneration`), replacing the separate
   * `debug.ts` helpers in `models/ai_code_completion/` and
   * `models/ai_code_generation/`.
   */
  codeGenComplete?: boolean;
}

/**
 * Reads the persisted DevTools AI debug configuration from `localStorage`.
 */
export function getDevToolsAIDebugConfig(): Required<DevToolsAIDebugConfig> {
  try {
    const raw = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem(DEVTOOLS_AI_DEBUG_STORAGE_KEY);
    if (!raw) {
      return {assistance: false, gca: false, codeGenComplete: false};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return {assistance: false, gca: false, codeGenComplete: false};
    }
    const record = parsed as Record<string, unknown>;
    return {
      assistance: Boolean(record.assistance),
      gca: Boolean(record.gca),
      codeGenComplete: Boolean(record.codeGenComplete),
    };
  } catch {
    return {assistance: false, gca: false, codeGenComplete: false};
  }
}

/**
 * Merges `config` into the persisted `devToolsAiDebug` object in `localStorage`
 * and logs the resulting state to the console.
 */
export function setDevToolsAIDebug(config: DevToolsAIDebugConfig = {}): Required<DevToolsAIDebugConfig> {
  const current = getDevToolsAIDebugConfig();
  const nextConfig: Required<DevToolsAIDebugConfig> = {
    assistance: config.assistance ?? current.assistance,
    gca: config.gca ?? current.gca,
    codeGenComplete: config.codeGenComplete ?? current.codeGenComplete,
  };
  const storage = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage();
  try {
    storage?.setItem(DEVTOOLS_AI_DEBUG_STORAGE_KEY, JSON.stringify(nextConfig));
  } catch {
    // Ignore storage write errors in restricted contexts.
  }
  // eslint-disable-next-line no-console
  console.log('DevTools AI debug config:', nextConfig);
  return nextConfig;
}

export function isDebugMode(): boolean {
  return getDevToolsAIDebugConfig().assistance;
}

export function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

export function isCodeGenCompleteDebugMode(): boolean {
  return getDevToolsAIDebugConfig().codeGenComplete;
}

export function debugCodeGenCompleteLog(...log: unknown[]): void {
  if (!isCodeGenCompleteDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled, gca: enabled})` instead.
 */
export function setDebugAiAssistanceEnabled(enabled: boolean): void {
  console.warn('setDebugAiAssistanceEnabled is deprecated and will be removed soon. ' +
               `Use setDevToolsAIDebug({assistance: ${Boolean(enabled)}, gca: ${Boolean(enabled)}}) instead.`);
  setDevToolsAIDebug({assistance: Boolean(enabled), gca: Boolean(enabled)});
}

/**
 * @deprecated Use `setDevToolsAIDebug({assistance: enabled})` instead.
 */
export function setAiAssistanceStructuredLogEnabled(enabled: boolean): void {
  console.warn('setAiAssistanceStructuredLogEnabled is deprecated and will be removed soon. ' +
               `Use setDevToolsAIDebug({assistance: ${Boolean(enabled)}}) instead.`);
  setDevToolsAIDebug({assistance: Boolean(enabled)});
}

/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export function setDebugAiCodeCompletionEnabled(enabled: boolean): void {
  console.warn('setDebugAiCodeCompletionEnabled is deprecated and will be removed soon. ' +
               `Use setDevToolsAIDebug({codeGenComplete: ${Boolean(enabled)}}) instead.`);
  setDevToolsAIDebug({codeGenComplete: Boolean(enabled)});
}

/**
 * @deprecated Use `setDevToolsAIDebug({codeGenComplete: enabled})` instead.
 */
export function setDebugAiCodeGenerationEnabled(enabled: boolean): void {
  console.warn('setDebugAiCodeGenerationEnabled is deprecated and will be removed soon. ' +
               `Use setDevToolsAIDebug({codeGenComplete: ${Boolean(enabled)}}) instead.`);
  setDevToolsAIDebug({codeGenComplete: Boolean(enabled)});
}

declare global {
  var setDevToolsAIDebug: (config?: DevToolsAIDebugConfig) => Required<DevToolsAIDebugConfig>;
  var setDebugAiAssistanceEnabled: (enabled: boolean) => void;
  var setAiAssistanceStructuredLogEnabled: (enabled: boolean) => void;
  var setDebugAiCodeCompletionEnabled: (enabled: boolean) => void;
  var setDebugAiCodeGenerationEnabled: (enabled: boolean) => void;
}

globalThis.setDevToolsAIDebug = setDevToolsAIDebug;
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;
globalThis.setDebugAiCodeCompletionEnabled = setDebugAiCodeCompletionEnabled;
globalThis.setDebugAiCodeGenerationEnabled = setDebugAiCodeGenerationEnabled;
