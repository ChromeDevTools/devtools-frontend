// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {globby} from 'globby';
import {extname, resolve, relative} from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {runESLint} from './eslint.mjs';
import {runLitAnalyzer} from './litanalyzer.mjs';
import {runStylelint} from './stylelint.mjs';
import {runEslintRulesTypeCheck} from './typecheck.mjs';

const flags = yargs(hideBin(process.argv))
  .option('fix', {
    type: 'boolean',
    default: true,
    describe: 'Automatically fix, where possible, problems reported by rules.',
  })
  .option('force-fix', {
    type: 'boolean',
    default: false,
    describe:
      'Disables inline rule and allows auto fixers to run unconditionally.',
  })
  .option('debug', {
    type: 'boolean',
    default: false,
    describe:
      'Disable cache validations during debugging, useful for custom rule creation/debugging.',
  })
  .option('lint-only', {
    type: 'boolean',
    // LUCI_CONTEXT is an env that exists on the bots
    // We want to disable caches and run more logging there.
    default: Boolean(process.env['LUCI_CONTEXT']),
    describe:
      'Runs the linter against all files, ignores passed files, ignores caches, ignores --fix.',
  })
  .usage('$0 [<files...>]', 'Run the linter on the provided files', yargs => {
    return yargs.positional('files', {
      describe: 'File(s), glob(s), or directories',
      type: 'string',
      array: true,
      default: ['.'],
    });
  })
  .parseSync();

if (!flags.fix) {
  console.log('[lint]: fix is disabled; no errors will be autofixed.');
}

if (flags.forceFix && !flags.fix) {
  throw new Error('`--force-fix` needs `--fix` to work as intended');
}

if (flags.debug) {
  console.log('[lint]: Cache disabled, linting may take longer.');
}

const LIT_ANALYZER_EXCLUDED_FOLDERS = [
  'front_end/core',
  'front_end/foundation',
  'front_end/generated',
  'front_end/legacy_test_runner',
  'front_end/models',
  'front_end/services',
  'front_end/testing',
  'front_end/third_party',
];

const DEVTOOLS_ROOT_DIR = resolve(import.meta.dirname, '..', '..');
function shouldIgnoreFile(path) {
  const resolvedPath = resolve(path);
  const relativePath = relative(DEVTOOLS_ROOT_DIR, resolvedPath);

  if (
    relativePath.includes('third_party') ||
    relativePath.includes('node_modules')
  ) {
    return true;
  }

  return false;
}

function getFilesToLint() {
  if (flags.lintOnly) {
    return ['.'];
  }

  if (Array.isArray(flags.files)) {
    return flags.files;
  }

  return [flags.files];
}

async function run() {
  const files = getFilesToLint();
  const scripts = [];
  const styles = [];
  const matchedPaths = await globby(files, {
    expandDirectories: {extensions: ['css', 'mjs', 'js', 'ts']},
    gitignore: true,
    ignore: ['**/node_modules/**'],
  });

  for (const path of matchedPaths) {
    if (shouldIgnoreFile(path)) {
      continue;
    }

    if (extname(path) === '.css') {
      styles.push(path);
    } else {
      scripts.push(path);
    }
  }

  const frontEndFiles = scripts.filter(script => {
    // LitAnalyzer is filtered due to high memory usage and noise in
    // specific large or legacy folders.
    const isInExcludedFolder = LIT_ANALYZER_EXCLUDED_FOLDERS.some(folder =>
      script.includes(folder),
    );
    return (
      // Only include front_end files, as we use Lit
      // only there
      script.includes('front_end') &&
      // Don't lint test files as we don't use Lit
      !script.endsWith('.test.ts') &&
      !script.endsWith('.test.api.ts') &&
      !script.endsWith('.docs.ts') &&
      !isInExcludedFolder
    );
  });
  const esLintRules = scripts.filter(script =>
    script.includes('scripts/eslint_rules'),
  );

  const options = {
    fix: flags.fix,
    forceFix: flags.forceFix,
    debug: flags.debug,
    lintOnly: flags.lintOnly,
  };

  const results = await Promise.allSettled([
    runESLint(scripts, options),
    runLitAnalyzer(frontEndFiles, options),
    runStylelint(styles, options),
    runEslintRulesTypeCheck(esLintRules, options),
  ]);

  let succeed = true;
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason);
      succeed = false;
      continue;
    }
    const {status, output} = result.value;
    succeed &&= status;
    if (output) {
      console.log(output);
    }
  }

  return succeed;
}

run()
  .then(succeed => {
    process.exit(succeed ? 0 : 1);
  })
  .catch(err => {
    console.log(`[lint]: ${err.message}`, err.stack);
    process.exit(1);
  });
