// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as childProcess from 'node:child_process';
import * as path from 'node:path';
import {pathToFileURL} from 'node:url';

import {normalizeForwardedOptions} from './commandline.js';
import {SOURCE_ROOT} from './paths.js';

describe('conductor CLI configuration', () => {
  describe('normalizeForwardedOptions', () => {
    it('joins numeric flag values with =', () => {
      assert.deepEqual(normalizeForwardedOptions(['--repeat', '2', '--retries', '3']), ['--repeat=2', '--retries=3']);
    });

    it('preserves trailing standalone flags', () => {
      assert.deepEqual(
          normalizeForwardedOptions(['--fgrep', '[special]', '--invert-grep']),
          ['--fgrep', '[special]', '--invert-grep'],
      );
      assert.deepEqual(normalizeForwardedOptions(['--bail']), ['--bail']);
    });

    it('leaves standalone -- delimiters and already-assigned flags untouched before numeric tokens', () => {
      assert.deepEqual(normalizeForwardedOptions(['--', '2']), ['--', '2']);
      assert.deepEqual(normalizeForwardedOptions(['--jobs=4', '2']), ['--jobs=4', '2']);
    });

    it('does not treat empty or whitespace-only string values as numeric flags', () => {
      assert.deepEqual(normalizeForwardedOptions(['--grep', '']), ['--grep', '']);
      assert.deepEqual(normalizeForwardedOptions(['--fgrep', '   ']), ['--fgrep', '   ']);
    });
  });

  describe('TestConfig', () => {
    function evaluateTestConfig(cliArgs: string[]): {
      mochaGrep: {fgrep?: string, invert?: boolean},
      artifactsDir: string,
    } {
      const resolverUrl = pathToFileURL(path.join(SOURCE_ROOT, 'test', 'scripts', 'resolver.mjs')).href;
      const testConfigUrl = pathToFileURL(path.join(SOURCE_ROOT, 'test', 'conductor', 'test_config.ts')).href;
      const script = [
        `import {register} from 'node:module';`,
        `register(${JSON.stringify(resolverUrl)});`,
        `const {TestConfig} = await import(${JSON.stringify(testConfigUrl)});`,
        `process.stdout.write(JSON.stringify({mochaGrep: TestConfig.mochaGrep, artifactsDir: TestConfig.artifactsDir}));`,
      ].join('\n');

      const result = childProcess.spawnSync(
          process.execPath,
          ['--no-warnings=ExperimentalWarning', '--input-type=module', '-e', script, 'eval.mjs', '--', ...cliArgs],
          {
            cwd: SOURCE_ROOT,
            encoding: 'utf-8',
          },
      );

      assert.strictEqual(result.status, 0, result.stderr);
      return JSON.parse(result.stdout) as {
        mochaGrep: {fgrep?: string, invert?: boolean},
        artifactsDir: string,
      };
    }

    it('sets mochaGrep.invert from --invert-grep', () => {
      const parsed = evaluateTestConfig(['--fgrep=[special]', '--invert-grep']);
      assert.deepEqual(parsed.mochaGrep, {fgrep: '[special]', invert: true});
    });

    it('resolves relative --artifacts-dir paths at load time', () => {
      const parsed = evaluateTestConfig(['--artifacts-dir=relative-artifacts-dir']);
      assert.strictEqual(parsed.artifactsDir, path.resolve(SOURCE_ROOT, 'relative-artifacts-dir'));
    });
  });
});
