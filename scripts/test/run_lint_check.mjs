// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { spawn } from 'child_process';
import { ESLint } from 'eslint';
import { readFileSync } from 'fs';
import { sync } from 'globby';
import { extname, join, resolve, relative } from 'path';
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
  .option('debug', {
    type: 'boolean',
    default: false,
    describe:
      'Disable cache validations during debugging, useful for custom rule creation/debugging.',
  })
  .usage('$0 [<files...>]', 'Run the linter on the provided files', yargs => {
    return yargs.positional('files', {
      describe: 'File(s), glob(s), or directories',
      type: 'string',
      array: true,
      default: [
        'front_end',
        'inspector_overlay',
        'scripts',
        'test',
        'extensions',
        'extension-api',
      ],
    });
  })
  .parseSync();

if (!flags.fix) {
  console.log('[lint]: fix is disabled; no errors will be autofixed.');
}
if (flags.debug) {
  console.log('[lint]: Cache disabled, linting may take longer.');
}
const cacheLinters = !flags.debug;

function debugLogging(...args) {
  if (!flags.debug) {
    return;
  }

  console.log(...args);
}

async function runESLint(scriptFiles) {
  debugLogging('[lint]: Running EsLint...');
  const cli = new ESLint({
    cwd: join(import.meta.dirname, '..', '..'),
    fix: flags.fix,
    cache: cacheLinters,
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
    return true;
  }

  const results = await cli.lintFiles(files);

  const usedDeprecatedRules = results.flatMap(
    result => result.usedDeprecatedRules,
  );
  if (usedDeprecatedRules.length) {
    console.log('Used deprecated rules:');
    for (const { ruleId, replacedBy } of usedDeprecatedRules) {
      console.log(
        ` Rule ${ruleId} can be replaced with ${
          replacedBy.join(',') ?? 'none'
        }`,
      );
    }
  }

  if (flags.fix) {
    await ESLint.outputFixes(results);
  }

  const formatter = await cli.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) {
    console.log(output);
  }

  return !results.find(report => report.errorCount + report.warningCount > 0);
}

async function runStylelint(files) {
  debugLogging('[lint]: Running StyleLint...');
  const { report, errored } = await stylelint.lint({
    configFile: join(import.meta.dirname, '..', '..', '.stylelintrc.json'),
    ignorePath: join(import.meta.dirname, '..', '..', '.stylelintignore'),
    fix: flags.fix,
    files,
    formatter: 'string',
    cache: cacheLinters,
    allowEmptyInput: true,
  });

  if (report) {
    console.log(report);
  }

  return !errored;
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
  debugLogging('[lint]: Running LitAnalyzer...');

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

  const {rules} = readLitAnalyzerConfigFromCompilerOptions();
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
      console.log(result.output);
    }
    if (result.error) {
      console.log(result.error);
    }
  }

  return results.every(r => r.status);
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

async function runEslintRulesTypeCheck(_files) {
  debugLogging('[lint]: Running EsLint custom rules typechecking...');
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
    console.log(result.output);
  }
  if (result.error) {
    console.log(result.error);
  }
  return result.status;
}

async function run() {
  const files = Array.isArray(flags.files) ? flags.files : [flags.files];
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

  const frontEndFiles = scripts.filter(script => script.includes('front_end'));
  const esLintRules = scripts.filter(script =>
    script.includes('scripts/eslint_rules'),
  );

  let succeed = true;
  if (scripts.length !== 0) {
    succeed &&= await runESLint(scripts);
  }
  if (frontEndFiles.length !== 0) {
    succeed &&= await runLitAnalyzer(frontEndFiles);
  }
  if (styles.length !== 0) {
    succeed &&= await runStylelint(styles);
  }
  if (esLintRules.length !== 0) {
    succeed &&= await runEslintRulesTypeCheck();
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
