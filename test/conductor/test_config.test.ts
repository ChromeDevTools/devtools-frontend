// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import {pathToFileURL} from 'node:url';

import {normalizeForwardedOptions} from './commandline.js';
import {DEVTOOLS_SOURCE_ROOT, SOURCE_ROOT} from './paths.js';

describe('conductor CLI configuration', () => {
  const resolverUrl = pathToFileURL(path.join(DEVTOOLS_SOURCE_ROOT, 'test', 'scripts', 'resolver.mjs')).href;

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

  describe('TestConfig and paths', () => {
    function evaluateTestConfig(cliArgs: string[]): {
      mochaGrep: {fgrep?: string, invert?: boolean},
      artifactsDir: string,
      jobs?: number,
    } {
      const testConfigUrl = pathToFileURL(path.join(DEVTOOLS_SOURCE_ROOT, 'test', 'conductor', 'test_config.ts')).href;
      const script = [
        `import {register} from 'node:module';`,
        `register(${JSON.stringify(resolverUrl)});`,
        `const {TestConfig} = await import(${JSON.stringify(testConfigUrl)});`,
        `process.stdout.write(JSON.stringify({mochaGrep: TestConfig.mochaGrep, artifactsDir: TestConfig.artifactsDir, jobs: TestConfig.jobs}));`,
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
        jobs?: number,
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

    it('parses --jobs into TestConfig.jobs', () => {
      const parsed = evaluateTestConfig(['--jobs=4']);
      assert.strictEqual(parsed.jobs, 4);
    });

    it('resolves host checkout SOURCE_ROOT and GEN_DIR from build.json', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-paths-build-json-'));
      try {
        const customSource = path.join(tempDir, 'custom-src');
        const customBuild = path.join(tempDir, 'out', 'Default');
        const customGen = path.join(customBuild, 'gen');
        const pathsUrl = pathToFileURL(path.join(DEVTOOLS_SOURCE_ROOT, 'test', 'conductor', 'paths.ts')).href;
        const script = [
          `import {register, registerHooks} from 'node:module';`,
          `import * as path from 'node:path';`,
          `import {fileURLToPath} from 'node:url';`,
          `register(${JSON.stringify(resolverUrl)});`,
          `registerHooks({`,
          `  load(url, context, nextLoad) {`,
          `    if (url.endsWith('/test/build.json')) {`,
          `      const testDir = path.dirname(fileURLToPath(url));`,
          `      return {`,
          `        format: 'json',`,
          `        shortCircuit: true,`,
          `        source: JSON.stringify({`,
          `          SOURCE_ROOT: path.relative(testDir, ${JSON.stringify(DEVTOOLS_SOURCE_ROOT)}),`,
          `          CHECKOUT_ROOT: path.relative(testDir, ${JSON.stringify(customSource)}),`,
          `          BUILD_ROOT: path.relative(testDir, ${JSON.stringify(customBuild)}),`,
          `          BUILD_WITH_CHROMIUM: false,`,
          `        }),`,
          `      };`,
          `    }`,
          `    return nextLoad(url, context);`,
          `  },`,
          `});`,
          `const paths = await import(${JSON.stringify(pathsUrl)});`,
          `const unnormalized = ${JSON.stringify(`${customGen}//sub/../a.test.ts:case_1`)};`,
          `process.stdout.write(JSON.stringify({`,
          `  sourceRoot: paths.SOURCE_ROOT,`,
          `  genDir: paths.GEN_DIR,`,
          `  devtoolsSourceRoot: paths.DEVTOOLS_SOURCE_ROOT,`,
          `  normalizedId: paths.resolveBuildTestId(unnormalized),`,
          `}));`,
        ].join('\n');

        const result = childProcess.spawnSync(
            process.execPath,
            ['--no-warnings=ExperimentalWarning', '--input-type=module', '-e', script, 'eval.mjs'],
            {
              cwd: tempDir,
              encoding: 'utf-8',
            },
        );

        assert.strictEqual(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {
          sourceRoot: customSource,
          genDir: customGen,
          devtoolsSourceRoot: DEVTOOLS_SOURCE_ROOT,
          normalizedId: `${path.join(customGen, 'a.test.js')}:case_1`,
        });
      } finally {
        fs.rmSync(tempDir, {recursive: true, force: true});
      }
    });
  });

  describe('flushTestResults', () => {
    it('flushes queued ResultSink batches when awaited explicitly', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-rdb-flush-'));
      const payloads: unknown[] = [];
      const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => {
          body += String(chunk);
        });
        req.on('end', () => {
          payloads.push(JSON.parse(body));
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end('{}');
        });
      });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

      try {
        const address = server.address();
        assert.isOk(address && typeof address === 'object');
        const luciContextPath = path.join(tempDir, 'luci_context.json');
        fs.writeFileSync(
            luciContextPath,
            JSON.stringify({result_sink: {address: `127.0.0.1:${address.port}`, auth_token: 'tok'}}),
        );

        const rdbUrl = pathToFileURL(path.join(DEVTOOLS_SOURCE_ROOT, 'test', 'conductor', 'resultsdb.ts')).href;
        const script = [
          `import {register} from 'node:module';`,
          `register(${JSON.stringify(resolverUrl)});`,
          `const ResultsDb = await import(${JSON.stringify(rdbUrl)});`,
          `const props = ResultsDb.buildTestProperties('suite/a.test.ts:s:t', 'suite/', 'a.test.ts', 's:t');`,
          `ResultsDb.sendTestResult({...props, status: 'PASS', expected: true, duration: '0.001s'});`,
          `await ResultsDb.flushTestResults();`,
          `process.exit(0);`,
        ].join('\n');

        const exitInfo = await new Promise<{code: number | null, stderr: string}>((resolve, reject) => {
          const child = childProcess.spawn(
              process.execPath,
              ['--no-warnings=ExperimentalWarning', '--input-type=module', '-e', script, 'eval.mjs'],
              {
                cwd: tempDir,
                env: {...process.env, LUCI_CONTEXT: luciContextPath},
              },
          );
          let stderr = '';
          child.stderr.on('data', chunk => {
            stderr += String(chunk);
          });
          child.on('error', reject);
          child.on('close', code => resolve({code, stderr}));
        });

        assert.strictEqual(exitInfo.code, 0, exitInfo.stderr);
        assert.lengthOf(payloads, 1);
      } finally {
        await new Promise<void>(resolve => server.close(() => resolve()));
        fs.rmSync(tempDir, {recursive: true, force: true});
      }
    });
  });
});
