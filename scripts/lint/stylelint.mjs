// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {join} from 'node:path';
import stylelint from 'stylelint';

export async function runStylelint(files, {fix, lintOnly, debug}) {
  if (files.length === 0) {
    return {status: true, output: ''};
  }

  const linterFixer = fix && !lintOnly;
  const cacheLinters = !debug && !lintOnly;

  const messages = [];
  if (debug) {
    messages.push('[lint]: Running StyleLint...');
  }

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
