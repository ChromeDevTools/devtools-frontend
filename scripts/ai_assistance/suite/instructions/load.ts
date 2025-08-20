// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

const DIR = path.dirname(import.meta.filename);

export function loadInstructions(name: string): string {
  const content = fs.readFileSync(path.join(DIR, name + '.md'), 'utf8');
  return content;
}
