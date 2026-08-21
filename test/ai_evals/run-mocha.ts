// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {SOURCE_ROOT} from '../conductor/paths.js';
import {loadTests, TestConfig} from '../conductor/test_config.js';
import {run} from '../shared/run-mocha.js';

import {devtoolsAiEvalTestInterface} from './mocha-interface.js';

// Returns true if the provided Chrome binary path points to the "Chrome for
// Testing" (CfT) binary, which lives in third_party/chrome.
function isCftPath() {
  const cftPathBase = path.join(SOURCE_ROOT, 'third_party', 'chrome');
  const chromePath = path.normalize(TestConfig.chromeBinary);
  const chromeRelativePath = path.relative(cftPathBase, chromePath);
  // Despite its name, path.relative() can return an absolute path on Windows,
  // if the two paths are on different drives, hence the isAbsolute check.
  return chromeRelativePath && !chromeRelativePath.startsWith('..') && !path.isAbsolute(chromeRelativePath);
}

function findChromeInPath(): string {
  const envPath = process.env.PATH || '';
  for (const dir of envPath.split(path.delimiter)) {
    const candidate = path.join(dir, 'google-chrome');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return '/usr/bin/google-chrome';
}

if (os.platform() !== 'linux') {
  throw new Error(`Unsupported platform: ${os.platform()}! Expecting 'linux'.`);
}

if (!TestConfig.chromeBinary || isCftPath()) {
  const chromePath = findChromeInPath();
  console.warn(`Unsupported Chrome binary ${TestConfig.chromeBinary}. Using PATH binary: ${chromePath}`);
  TestConfig.chromeBinary = chromePath;
}

void run({
  require: [
    path.join(__dirname, 'mocha_hooks.js'),
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
  ],
  spec: loadTests(__dirname),
  timeout: TestConfig.debug ? 0 : 180_000,
  suiteName: 'ai_evals',
  ui: devtoolsAiEvalTestInterface as unknown as 'bdd',
});
