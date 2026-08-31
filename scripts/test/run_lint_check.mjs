// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLint} from 'eslint';
import {globby} from 'globby';
import {spawn} from 'node:child_process';
import {readFile, stat, writeFile} from 'node:fs/promises';
import {extname, join, resolve, relative} from 'node:path';
import stylelint from 'stylelint';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {
  devtoolsRootPath,
  litAnalyzerExecutablePath,
  nodePath,
  tsconfigJsonPath,
  typescriptPyPath,
  vpython3ExecutablePath,
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
const cacheLinters = !flags.debug && !flags.lintOnly;

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
    return {status: true, output: ''};
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
    return {status: true, output: messages.join('\n')};
  }

  const results = await cli.lintFiles(files);

  const usedDeprecatedRules = results.flatMap(
    result => result.usedDeprecatedRules,
  );
  if (usedDeprecatedRules.length) {
    messages.push('Used deprecated rules:');
    for (const {ruleId, replacedBy} of usedDeprecatedRules) {
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
      debugLogging(messages, JSON.stringify(result.suppressedMessages));
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
    return {status: true, output: ''};
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running StyleLint...');
  const {report, errored} = await stylelint.lint({
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

  return {status: !errored, output: messages.join('\n')};
}

class LitAnalyzerCache {
  #cachePath = join(devtoolsRootPath(), '.litanalyzercache');
  #cache = {config: '', files: {}};
  #enabled = false;

  constructor(enabled, config, cacheData = null) {
    this.#enabled = enabled;
    if (cacheData) {
      this.#cache = cacheData;
    } else {
      this.#cache = {config, files: {}};
    }
  }

  static async create(enabled, config) {
    if (!enabled) {
      return new LitAnalyzerCache(enabled, config);
    }
    const cachePath = join(devtoolsRootPath(), '.litanalyzercache');
    try {
      const data = JSON.parse(await readFile(cachePath, 'utf-8'));
      if (
        data &&
        data.config === config &&
        data.files &&
        typeof data.files === 'object' &&
        !Array.isArray(data.files)
      ) {
        return new LitAnalyzerCache(enabled, config, data);
      }
    } catch {
      // Fall through to empty cache
    }
    return new LitAnalyzerCache(enabled, config);
  }

  async filterFiles(files) {
    if (!this.#enabled) {
      return files;
    }
    const results = await Promise.all(
      files.map(async file => {
        try {
          const fileStat = await stat(file);
          if (this.#cache.files[file] !== fileStat.mtimeMs) {
            return file;
          }
          return null;
        } catch {
          return file;
        }
      }),
    );
    return results.filter(file => file !== null);
  }

  async update(files) {
    if (!this.#enabled) {
      return;
    }
    const filesToUpdate = new Set(files);
    await Promise.all(
      files.map(async file => {
        try {
          const fileStat = await stat(file);
          this.#cache.files[file] = fileStat.mtimeMs;
        } catch {
          delete this.#cache.files[file];
        }
      }),
    );
    // Prune entries for files that no longer exist on disk.
    await Promise.all(
      Object.keys(this.#cache.files).map(async file => {
        if (filesToUpdate.has(file)) {
          return;
        }
        try {
          await stat(file);
        } catch {
          delete this.#cache.files[file];
        }
      }),
    );
    try {
      await writeFile(
        this.#cachePath,
        JSON.stringify(this.#cache, null, 2),
        'utf-8',
      );
    } catch {
      // Ignore cache write errors
    }
  }
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
    return {status: true, output: ''};
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running LitAnalyzer...');

  const readLitAnalyzerConfigFromCompilerOptions = async () => {
    const configData = await readFile(tsconfigJsonPath(), 'utf-8');
    const {compilerOptions} = JSON.parse(configData);
    const {plugins} = compilerOptions;
    const tsLitPluginOptions = plugins.find(
      plugin => plugin.name === 'ts-lit-plugin',
    );
    if (tsLitPluginOptions === null) {
      throw new Error(
        `Failed to find ts-lit-plugin options in ${tsconfigJsonPath()}`,
      );
    }
    return {rules: tsLitPluginOptions.rules, configData};
  };

  const {rules, configData} = await readLitAnalyzerConfigFromCompilerOptions();
  const litAnalyzerCache = await LitAnalyzerCache.create(
    cacheLinters,
    configData,
  );
  const filesToAnalyze = await litAnalyzerCache.filterFiles(files);
  if (filesToAnalyze.length === 0) {
    return {status: true, output: ''};
  }

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
    getSplitFiles(filesToAnalyze).map(filesBatch => {
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

  const success = results.every(r => r.status);
  if (success) {
    await litAnalyzerCache.update(filesToAnalyze);
  }

  return {status: success, output: messages.join('\n')};
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
    return {status: true, output: ''};
  }
  const messages = [];
  debugLogging(messages, '[lint]: Running EsLint custom rules typechecking...');
  const tscPath = typescriptPyPath();
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
      const tscProcess = spawn(vpython3ExecutablePath(), args, {
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
  return {status: result.status, output: messages.join('\n')};
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
    ignore: [
      '**/node_modules/**',
    ],
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
