// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs/promises';
import path from 'node:path';

const entries = await fs.readdir(path.join(import.meta.dirname, 'lib'), {
  withFileTypes: true,
});

/**
 * @type {Record<string, unknown>}
 */
const rules = {};
for (const entry of entries) {
  if (entry.isDirectory()) {
    continue;
  }

  const filename = path.resolve(
    path.join(import.meta.dirname, 'lib', entry.name),
  );
  const ruleModule = await import(filename);
  const name = path.parse(entry.name).name;
  rules[name] = ruleModule.default;
}

export default {
  rules,
};
