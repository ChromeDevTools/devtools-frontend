// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// EsLint rule dir loader
// https://github.com/eslint-community/eslint-plugin-rulesdir
// but modified as we need to use it with ESM
// This code is licensed under the MIT license
/**
 * The MIT License (MIT)
 * =====================
 *
 * Copyright © 2017 Teddy Katz
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the “Software”), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @file Allows a local ESLint rules directory to be used without a command-line flag
 * @author Teddy Katz
 */

import { readdirSync } from 'fs';
import { extname, resolve, basename, join } from 'path';
import { pathToFileURL } from 'url';

const RULES_DIR = join(import.meta.dirname, 'lib');

const ruleExtensions = new Set(['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts']);

/**
 * @type {Record<string, unknown>}
 */
const rulesModules = {};

for (const filename of readdirSync(RULES_DIR)) {
  if (!ruleExtensions.has(extname(filename))) {
    continue;
  }
  const absolutePath = resolve(RULES_DIR, filename);
  const ruleName = basename(absolutePath, extname(absolutePath));
  if (rulesModules[ruleName]) {
    throw new Error(
      `eslint-plugin-rulesdir found two rules with the same name: ${ruleName}`,
    );
  }
  const moduleURL =
    process.platform === 'win32'
      ? pathToFileURL(absolutePath).href
      : absolutePath;
  const loadedRule = await import(moduleURL);
  rulesModules[ruleName] = loadedRule.default ? loadedRule.default : loadedRule;
}

export default {
  get rules() {
    return rulesModules;
  },
};
