// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {GnAstExtractor} from '../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../extractors/typescript_analyzer.ts';
import {checkDepsGn} from '../validator.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');

describe('validator', () => {
  afterEach(async () => {
    GnAstExtractor.clearCacheForTesting();
    TypeScriptAnalyzer.clearCacheForTesting();

    // Clean up any remaining temp dirs
    const files = await fs.promises.readdir(import.meta.dirname);
    for (const file of files) {
      if (file.startsWith('gn-test-')) {
        await fs.promises.rm(path.join(import.meta.dirname, file), {recursive: true, force: true});
      }
    }
  });

  it('warns correctly for missing targets even when files are relative and cwd is different', async () => {
    const tempDir = await fs.promises.mkdtemp(
        path.join(import.meta.dirname, 'gn-test-'),
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

  it('throws on first missing target when dryRun is true', async () => {
    const tempDir = await fs.promises.mkdtemp(
        path.join(import.meta.dirname, 'gn-test-'),
    );
    await fs.promises.cp(FIXTURES_DIR, tempDir, {recursive: true});

    const relFile = 'missing_target_file.ts';
    const absPathInFixtures = path.join(tempDir, relFile);
    await fs.promises.writeFile(absPathInFixtures, 'console.log("hello");');

    try {
      let thrownError: Error|undefined;
      try {
        await checkDepsGn(tempDir, [relFile], true);
      } catch (e) {
        thrownError = e as Error;
      }
      assert.isDefined(thrownError);
      assert.include(
          thrownError.message,
          'Could not find target for file missing_target_file.ts in project BUILD.gn ASTs',
      );
    } finally {
      await fs.promises.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('does not warn for BUILD.gn files and throws on dependency mismatch in dryRun mode', async () => {
    const tempDir = await fs.promises.mkdtemp(
        path.join(import.meta.dirname, 'gn-test-'),
    );
    await fs.promises.cp(FIXTURES_DIR, tempDir, {recursive: true});

    const originalConsoleWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: string) => {
      warnings.push(msg);
    };

    try {
      let thrownError: Error|undefined;
      try {
        await checkDepsGn(tempDir, [path.join(tempDir, 'BUILD.gn')], true);
      } catch (e) {
        thrownError = e as Error;
      }
      assert.isFalse(
          warnings.some(w => w.includes('Could not find target for file')),
      );
      assert.isDefined(thrownError);
      assert.include(thrownError.message, 'Mismatch in //:animation');
    } finally {
      console.warn = originalConsoleWarn;
      await fs.promises.rm(tempDir, {recursive: true, force: true});
    }
  });
});
