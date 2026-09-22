// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {GnAstExtractor} from '../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../extractors/typescript_analyzer.ts';
import {checkDepsGn} from '../validator.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');

describe('validator', () => {
  afterEach(() => {
    GnAstExtractor.clearCacheForTesting();
    TypeScriptAnalyzer.clearCacheForTesting();
  });

  it('warns correctly for missing targets even when files are relative and cwd is different', async () => {
    const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'gn-test-'),
    );
    await fs.promises.cp(FIXTURES_DIR, tempDir, {recursive: true});

    const relFile = 'missing_target_file.ts';
    const absPathInFixtures = path.join(tempDir, relFile);
    await fs.promises.writeFile(absPathInFixtures, 'console.log("hello");');

    const originalCwd = process.cwd();
    const originalConsoleWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => {
      warnings.push(msg);
    };

    try {
      process.chdir(path.join(import.meta.dirname, 'utils'));

      await checkDepsGn(tempDir, [relFile]);

      assert.isNotEmpty(
          warnings,
          'Validator warned correctly about missing target',
      );
    } finally {
      process.chdir(originalCwd);
      console.warn = originalConsoleWarn;
      await fs.promises.rm(tempDir, {recursive: true, force: true});
    }
  });
});
