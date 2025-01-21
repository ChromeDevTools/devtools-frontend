// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { loadESLint } from 'eslint';
import stylelint from 'stylelint';

import { extname, join } from 'path';
import { sync } from 'globby';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

import {
  devtoolsRootPath,
  litAnalyzerExecutablePath,
  nodePath,
  tsconfigJsonPath,
} from '../devtools_paths.js';

const flags = yargs(hideBin(process.argv))
  .option('fix', {
    type: 'boolean',
    default: true,
    describe: 'Automatically fix, where possible, problems reported by rules.',
  })
  .usage('$0 [<files...>]', 'Run the linter on the provided files', yargs => {
    yargs.positional('files', {
      describe: 'File(s), glob(s), or directories',
      type: 'array',
      default: [
        'front_end',
        'inspector_overlay',
        'scripts',
        'test',
        'extensions',
      ],
    });
  })
  .parse();

if (!flags.fix) {
  console.log('[lint]: fix is disabled; no errors will be autofixed.');
}

async function runESLint(files) {
  const EsLintFlat = await loadESLint({ useFlatConfig: true });
  const cli = new EsLintFlat({
    cwd: join(import.meta.dirname, '..', '..'),
    fix: flags.fix,
  });

  // We filter out certain files in the `.eslintignore`. However, ESLint produces warnings
  // when you include a particular file that is ignored. This means that if you edit a file
  // that is directly ignored in the `.eslintignore`, ESLint would report a failure.
  // This was originally reported in https://github.com/eslint/eslint/issues/9977
  // The suggested workaround is to use the CLIEngine to preemptively filter out these
  // problematic paths.
  files = await Promise.all(
    files.map(async file => {
      return (await cli.isPathIgnored(file)) ? null : file;
    }),
  );
  files = files.filter(file => file !== null);

  const results = await cli.lintFiles(files);

  const usedDeprecatedRules = results.flatMap(
    result => result.usedDeprecatedRules,
  );
  if (usedDeprecatedRules.length) {
    console.log('Used deprecated rules:');
    for (const { ruleId, replaceBy } of usedDeprecatedRules) {
      console.log(
        ` Rule ${ruleId} can be replaced with ${replaceBy ?? 'none'}`,
      );
    }
  }

  if (flags.fix) {
    await EsLintFlat.outputFixes(results);
  }

  const formatter = await cli.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) {
    console.log(output);
  }

  return !results.find(report => report.errorCount + report.warningCount > 0);
}

async function runStylelint(files) {
  const { report, errored } = await stylelint.lint({
    configFile: join(import.meta.dirname, '..', '..', '.stylelintrc.json'),
    ignorePath: join(import.meta.dirname, '..', '..', '.stylelintignore'),
    fix: flags.fix,
    files,
    formatter: 'string',
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
 * @param {string[]} files the input files to analyze.
 */
async function runLitAnalyzer(files) {
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
        encoding: 'utf-8',
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
    if (result.output) {
      console.log(result.output);
    }
    if (result.error) {
      console.log(result.error);
    }
  }

  return results.every(r => r.status);
}

async function run() {
  const scripts = [];
  const styles = [];
  for (const path of sync(flags.files, {
    expandDirectories: { extensions: ['css', 'mjs', 'js', 'ts'] },
  })) {
    if (extname(path) === '.css') {
      styles.push(path);
    } else {
      scripts.push(path);
    }
  }

  const frontEndFiles = scripts.filter(script => script.includes('front_end'));

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
