// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Local debugging utilities.
 */

export function isDebugMode(): boolean {
  return Boolean(localStorage.getItem('debugAiCodeCompletionEnabled'));
}

export function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

function setDebugAiCodeCompletionEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('debugAiCodeCompletionEnabled', 'true');
  } else {
    localStorage.removeItem('debugAiCodeCompletionEnabled');
  }
}
// @ts-expect-error
globalThis.setDebugAiCodeCompletionEnabled = setDebugAiCodeCompletionEnabled;
