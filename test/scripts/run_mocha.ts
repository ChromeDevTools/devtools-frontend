// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import {register} from 'node:module';
import * as path from 'node:path';

// Register an ESM loader to resolve TypeScript source files directly.
// DevTools uses '.js' extension specifiers in import statements (e.g. import './foo.js').
// When running uncompiled TypeScript source files directly with Node, this custom loader
// resolves relative '.js' imports to corresponding '.ts' files on disk if the '.js' file
// does not exist.
register('./resolver.mjs', import.meta.url);

const {SOURCE_ROOT, TEST_ID_REGEX} = await import('../conductor/paths.js');
const {shardFilter} = await import('../conductor/sharding.js');
const {shuffleTests, TestConfig} = await import('../conductor/test_config.js');
const {run} = await import('../shared/run-mocha.js');

const SCRIPT_TEST_DIRECTORIES = [
  'scripts/eslint_rules/tests',
  'scripts/stylelint_rules/tests',
  'scripts/build/tests',
  'scripts/gn_deps_verifier/tests',
];

export function loadScriptTests(): string[] {
  const tests = SCRIPT_TEST_DIRECTORIES
                    .flatMap(d => {
                      const absDir = path.join(SOURCE_ROOT, d);
                      return fs.globSync(`${absDir}/**/*.{js,ts}`, {
                        exclude: p => p.includes('/fixtures/') || p.includes('\\fixtures\\'),
                      });
                    })
                    .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js') || f.endsWith('_test.js'))
                    .map(t => path.normalize(t))
                    .filter(
                        t => TestConfig.tests.some((spec: string) => {
                          if (TEST_ID_REGEX.test(spec)) {
                            spec = spec.match(TEST_ID_REGEX)![1];
                          }
                          return t.startsWith(spec);
                        }),
                        )
                    .filter(
                        t => shardFilter(
                            TestConfig,
                            path.relative(SOURCE_ROOT, t).replaceAll('\\', '/'),
                            ),
                    );
  return shuffleTests(tests);
}

TestConfig.tests = TestConfig.tests.map(testId => {
  if (TEST_ID_REGEX.test(testId)) {
    const match = testId.match(TEST_ID_REGEX)!;
    return `${path.resolve(SOURCE_ROOT, match[1])}:${match[2]}`;
  }
  return testId;
});

void run({
  require: [
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
  ],
  spec: loadScriptTests(),
  timeout: 4_000,
  suiteName: 'scripts',
  failZero: true,
});
