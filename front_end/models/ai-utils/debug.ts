// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Local debugging utilities.
 */

import * as Platform from '../../core/platform/platform.js';

export function isDebugMode(): boolean {
  return Boolean(Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem('debugAiAssistancePanelEnabled'));
}

export function isStructuredLogEnabled(): boolean {
  return Boolean(Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem('aiAssistanceStructuredLogEnabled'));
}

export function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

function setDebugAiAssistanceEnabled(enabled: boolean): void {
  const localStorage = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage();
  if (enabled) {
    localStorage?.setItem('debugAiAssistancePanelEnabled', 'true');
  } else {
    localStorage?.removeItem('debugAiAssistancePanelEnabled');
  }
  setAiAssistanceStructuredLogEnabled(enabled);
}
// @ts-expect-error
globalThis.setDebugAiAssistanceEnabled = setDebugAiAssistanceEnabled;

function setAiAssistanceStructuredLogEnabled(enabled: boolean): void {
  const localStorage = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage();
  if (enabled) {
    localStorage?.setItem('aiAssistanceStructuredLogEnabled', 'true');
  } else {
    localStorage?.removeItem('aiAssistanceStructuredLogEnabled');
  }
}
// @ts-expect-error
globalThis.setAiAssistanceStructuredLogEnabled = setAiAssistanceStructuredLogEnabled;
