// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Checks whether an error is a Node.js filesystem "not found" or "not a directory" error
 * (`ENOENT` or `ENOTDIR`).
 */
export function isNotFoundError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}
