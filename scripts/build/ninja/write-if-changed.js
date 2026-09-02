// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs/promises';

/**
 * Only write content to a file if the content is different that what it previously contained.
 * The reason for only writing when necessary is that GN uses file timestamps to determine freshness.
 * Therefore, if the file contents hasn't changed, but the timestamp has, GN thinks the file is new.
 *
 * Instead, we can only write when the content is changed, meaning we don't touch a file when it is
 * unchanged. This would preserve the original file timestamps and hence GN can correctly conclude
 * the file output hasn't changed.
 *
 * @param {string} generatedFileLocation Location to write to
 * @param {string | Buffer | Uint8Array} newContents The contents to write (or noop if unchanged with previous content)
 */
export async function writeIfChanged(generatedFileLocation, newContents) {
  if (typeof newContents === 'string') {
    try {
      const existing = await fs.readFile(generatedFileLocation, 'utf-8');
      if (existing === newContents) {
        return;
      }
    } catch {
      // If the file doesn't exist, we'll create it.
    }
  } else {
    try {
      const existing = await fs.readFile(generatedFileLocation);
      if (existing.equals(newContents)) {
        return;
      }
    } catch {
      // If the file doesn't exist, we'll create it.
    }
  }

  await fs.writeFile(generatedFileLocation, newContents);
}
