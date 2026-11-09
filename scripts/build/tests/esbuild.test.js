// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {execFile} from 'node:child_process';
import path from 'node:path';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const ESBUILD_SCRIPT = path.resolve(import.meta.dirname, '..', 'esbuild.js');

// Only argument validation is tested here: it fails before esbuild runs. The
// bots that run these tests do not have the esbuild binary
// (third_party/esbuild), so tests that actually bundle cannot run on CQ.
describe('esbuild.js argument validation', () => {
  /**
   * Runs esbuild.js with `args` and returns its stderr, failing if it succeeds.
   * @param {string[]} args
   * @param {{bundleAll?: boolean}} options
   */
  async function expectEsbuildFailure(args, {bundleAll = true} = {}) {
    try {
      await execFileAsync(process.execPath, [
        ESBUILD_SCRIPT,
        '--entrypoint=entry.js',
        '--outfile=out.js',
        '--root-dir=.',
        '--root-gen-dir=.',
        ...(bundleAll ? ['--bundle-all'] : []),
        ...args,
      ]);
    } catch (err) {
      return String(err.stderr);
    }
    assert.fail(`esbuild.js unexpectedly succeeded with ${args.join(' ')}`);
  }

  it('rejects unsupported --platform values', async () => {
    const stderr = await expectEsbuildFailure(['--platform=neutral']);
    assert.include(stderr, '--platform must be \'browser\' or \'node\'');
  });

  for (const external of ['', './foo.js', '../foo.js', '/abs/foo.js', 'pkg/', 'pkg/*']) {
    it(`rejects --external=${JSON.stringify(external)}`, async () => {
      const stderr = await expectEsbuildFailure(['--platform=node', `--external=${external}`]);
      assert.include(stderr, '--external only supports bare package specifiers');
    });
  }

  it('rejects --external without --bundle-all', async () => {
    const stderr = await expectEsbuildFailure(['--platform=node', '--external=pkg'], {bundleAll: false});
    assert.include(stderr, '--external requires --bundle-all');
  });

  it('rejects --platform=node without --bundle-all', async () => {
    const stderr = await expectEsbuildFailure(['--platform=node'], {bundleAll: false});
    assert.include(stderr, '--platform=node requires --bundle-all');
  });

  for (const flags of [['--platform=browser'], ['--platform=node', '--format=iife']]) {
    it(`rejects --node-require-shim with ${flags.join(' ')}`, async () => {
      const stderr = await expectEsbuildFailure(['--node-require-shim', ...flags]);
      assert.include(stderr, '--node-require-shim requires --platform=node and --format=esm');
    });
  }
});
