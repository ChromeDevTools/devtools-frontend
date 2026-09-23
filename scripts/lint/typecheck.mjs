// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {spawn} from 'node:child_process';
import {join} from 'node:path';

import {
  devtoolsRootPath,
  typescriptPyPath,
  vpython3ExecutablePath,
} from '../devtools_paths.js';

const TS_CONFIGS = [
  {
    prefix: 'scripts/eslint_rules',
    configPath: join(
      devtoolsRootPath(),
      'scripts',
      'eslint_rules',
      'tsconfig.json',
    ),
  },
  {
    prefix: 'scripts/gn_deps_verifier',
    configPath: join(
      devtoolsRootPath(),
      'scripts',
      'gn_deps_verifier',
      'tsconfig.json',
    ),
  },
];

export async function runTypeCheck(files, {debug}) {
  const configsToRun = TS_CONFIGS.filter(({prefix}) =>
    files.some(file => file.includes(prefix)),
  ).map(({configPath}) => configPath);

  if (configsToRun.length === 0) {
    return {status: true, output: ''};
  }
  const messages = [];
  if (debug) {
    messages.push('[lint]: Running scripts typechecking...');
  }
  const tscPath = typescriptPyPath();
  const args = [tscPath, '-b', ...configsToRun];

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
