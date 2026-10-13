// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {SOURCE_ROOT} from '../../conductor/paths.js';

const DIR = path.join(SOURCE_ROOT, 'test', 'ai_evals', 'report', 'instructions');

export function loadInstructions(name: string): string {
  const content = fs.readFileSync(path.join(DIR, name + '.md'), 'utf8');
  return content;
}
