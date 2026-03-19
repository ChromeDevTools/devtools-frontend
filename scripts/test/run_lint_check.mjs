// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ESLint } from 'eslint';
import { sync } from 'globby';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, relative } from 'node:path';
import stylelint from 'stylelint';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  devtoolsRootPath,
  litAnalyzerExecutablePath,
  nodePath,
  nodeModulesPath,
  tsconfigJsonPath,
} from '../devtools_paths.js';

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
    default: false || Boolean(process.env['LUCI_CONTEXT']),
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
  throw new Error('`--force-fix` need `--fix` to work as intended');
}

if (flags.debug) {
  console.log('[lint]: Cache disabled, linting may take longer.');
}
const linterFixer = flags.fix && !flags.lintOnly;
const cacheLinters = !flags.debug || flags.lintOnly;

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

function debugLogging(messages, ...args) {
  if (!flags.debug) {
    return;
  }

  messages.push(args.map(String).join(' '));
}

async function runESLint(scriptFiles) {
  if (scriptFiles.length === 0) {
    return { status: true, output: '' };
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running EsLint...');
  const cli = new ESLint({
    cwd: join(import.meta.dirname, '..', '..'),
    fix: linterFixer,
    cache: cacheLinters,
    allowInlineConfig: !flags.forceFix,
  });

  // We filter out certain files in the `eslint.config.mjs` `Ignore list` entry.
  // However, ESLint produces warnings
  // when you include a particular file that is ignored. This means that if you edit a file
  // that is directly ignored. ESLint would report a failure.
  // This was originally reported in https://github.com/eslint/eslint/issues/9977
  // The suggested workaround is to use the CLIEngine to preemptively filter out these
  // problematic paths.
  const files = (
    await Promise.all(
      scriptFiles.map(async file => {
        return (await cli.isPathIgnored(file)) ? null : file;
      }),
    )
  ).filter(file => file !== null);

  if (files.length === 0) {
    // When an empty array is pass lint CWD
    // This can happen only if we pass things that will
    // be ignored by the above filter
    // https://github.com/eslint/eslint/pull/17644
    return { status: true, output: messages.join('\n') };
  }

  const results = await cli.lintFiles(files);

  const usedDeprecatedRules = results.flatMap(
    result => result.usedDeprecatedRules,
  );
  if (usedDeprecatedRules.length) {
    messages.push('Used deprecated rules:');
    for (const { ruleId, replacedBy } of usedDeprecatedRules) {
      messages.push(
        ` Rule ${ruleId} can be replaced with ${replacedBy.join(',') ?? 'none'}`,
      );
    }
  }

  // Only do this for a single file as else its too noisy
  // Also there is no file name we can print
  if (files.length === 1) {
    debugLogging(messages, '[lint]: EsLint suppressed the following errors:');
    for (const result of results) {
      debugLogging(messages, result.suppressedMessages);
    }
  }

  if (linterFixer) {
    await ESLint.outputFixes(results);
  }

  const formatter = await cli.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) {
    messages.push(output);
  }

  return {
    status: !results.find(
      report => report.errorCount + report.warningCount > 0,
    ),
    output: messages.join('\n'),
  };
}

async function runStylelint(files) {
  if (files.length === 0) {
    return { status: true, output: '' };
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running StyleLint...');
  const { report, errored } = await stylelint.lint({
    configFile: join(import.meta.dirname, '..', '..', '.stylelintrc.json'),
    ignorePath: join(import.meta.dirname, '..', '..', '.stylelintignore'),
    fix: linterFixer,
    files,
    formatter: 'string',
    cache: cacheLinters,
    allowEmptyInput: true,
  });

  if (report) {
    messages.push(report);
  }

  return { status: !errored, output: messages.join('\n') };
}

/**
 * Runs the `lit-analyzer` on the `files`.
 *
 * The configuration for the `lit-analyzer` is parsed from the options for
 * the "ts-lit-plugin" from the toplevel `tsconfig.json` file.
 *
 * @param files the input files to analyze.
 */
async function runLitAnalyzer(files) {
  if (files.length === 0) {
    return { status: true, output: '' };
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running LitAnalyzer...');

  const readLitAnalyzerConfigFromCompilerOptions = () => {
    const { compilerOptions } = JSON.parse(
      readFileSync(tsconfigJsonPath(), 'utf-8'),
    );
    const { plugins } = compilerOptions;
    const tsLitPluginOptions = plugins.find(
      plugin => plugin.name === 'ts-lit-plugin',
    );
    if (tsLitPluginOptions === null) {
      throw new Error(
        `Failed to find ts-lit-plugin options in ${tsconfigJsonPath()}`,
      );
    }
    return tsLitPluginOptions;
  };

  const { rules } = readLitAnalyzerConfigFromCompilerOptions();
  const getLitAnalyzerResult = async subsetFiles => {
    const args = [
      litAnalyzerExecutablePath(),
      ...Object.entries(rules).flatMap(([k, v]) => [`--rules.${k}`, v]),
      ...subsetFiles,
    ];

    const result = {
      output: '',
      error: '',
      status: false,
    };

    return await new Promise(resolve => {
      const litAnalyzerProcess = spawn(nodePath(), args, {
        cwd: devtoolsRootPath(),
      });

      litAnalyzerProcess.stdout.on('data', data => {
        result.output += `\n${data.toString()}`;
      });
      litAnalyzerProcess.stderr.on('data', data => {
        result.error += `\n${data.toString()}`;
      });

      litAnalyzerProcess.on('error', message => {
        result.error += `\n${message}`;
        resolve(result);
      });

      litAnalyzerProcess.on('exit', code => {
        result.status = code === 0;
        resolve(result);
      });
    });
  };

  const getSplitFiles = filesToSplit => {
    if (process.platform !== 'win32') {
      return [filesToSplit];
    }

    /**
     * @type {string[][]}
     */
    const splitFiles = [[]];
    let index = 0;
    for (const file of filesToSplit) {
      // Windows max input is 8191 so we should be conservative
      if (splitFiles[index].join(' ').length + file.length < 6144) {
        splitFiles[index].push(file);
      } else {
        index++;
        splitFiles[index] = [file];
      }
    }
    return splitFiles;
  };

  const results = await Promise.all(
    getSplitFiles(files).map(filesBatch => {
      return getLitAnalyzerResult(filesBatch);
    }),
  );
  for (const result of results) {
    // Don't print if no problems are found
    // Mimics the other tools
    if (result.output && !result.output.includes('Found 0 problems')) {
      messages.push(result.output);
    }
    if (result.error) {
      messages.push(result.error);
    }
  }

  return { status: results.every(r => r.status), output: messages.join('\n') };
}

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

async function runEslintRulesTypeCheck(files) {
  if (files.length === 0) {
    return { status: true, output: '' };
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running EsLint custom rules typechecking...');
  const tscPath = join(nodeModulesPath(), 'typescript', 'bin', 'tsc');
  const tsConfigEslintRules = join(
    devtoolsRootPath(),
    'scripts',
    'eslint_rules',
    'tsconfig.json',
  );
  const args = [tscPath, '-b', tsConfigEslintRules];
  /**
   * @returns
   */
  async function runTypeCheck() {
    const result = {
      output: '',
      error: '',
      status: false,
    };

    return await new Promise(resolve => {
      const tscProcess = spawn(nodePath(), args, {
        cwd: devtoolsRootPath(),
      });

      tscProcess.stdout.on('data', data => {
        result.output += `\n${data.toString()}`;
      });
      tscProcess.stderr.on('data', data => {
        result.error += `\n${data.toString()}`;
      });

      tscProcess.on('error', message => {
        result.error += `\n${message}`;
        resolve(result);
      });

      tscProcess.on('exit', code => {
        result.status = code === 0;
        resolve(result);
      });
    });
  }

  const result = await runTypeCheck();

  if (result.output) {
    messages.push(result.output);
  }
  if (result.error) {
    messages.push(result.error);
  }
  return { status: result.status, output: messages.join('\n') };
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
  for (const path of sync(files, {
    expandDirectories: { extensions: ['css', 'mjs', 'js', 'ts'] },
    gitignore: true,
  })) {
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
      !isInExcludedFolder
    );
  });
  const esLintRules = scripts.filter(script =>
    script.includes('scripts/eslint_rules'),
  );

  const results = await Promise.allSettled([
    runESLint(scripts),
    runLitAnalyzer(frontEndFiles),
    runStylelint(styles),
    runEslintRulesTypeCheck(esLintRules),
  ]);

  let succeed = true;
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason);
      succeed = false;
      continue;
    }
    const { status, output } = result.value;
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
