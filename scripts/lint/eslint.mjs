// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLint} from 'eslint';
import {join} from 'node:path';

export async function runESLint(files, {fix, lintOnly, forceFix, debug}) {
  if (files.length === 0) {
    return {status: true, output: ''};
  }

  const linterFixer = fix && !lintOnly;
  const cacheLinters = !debug && !lintOnly;

  const messages = [];
  if (debug) {
    messages.push('[lint]: Running EsLint...');
  }

  const cli = new ESLint({
    cwd: join(import.meta.dirname, '..', '..'),
    fix: linterFixer,
    cache: cacheLinters,
    allowInlineConfig: !forceFix,
    warnIgnored: false,
  });

  const results = await cli.lintFiles(files);

  const usedDeprecatedRules = results.flatMap(
    result => result.usedDeprecatedRules,
  );
  if (usedDeprecatedRules.length) {
    messages.push('Used deprecated rules:');
    for (const {ruleId, replacedBy} of usedDeprecatedRules) {
      messages.push(
        ` Rule ${ruleId} can be replaced with ${replacedBy?.join(',') ?? 'none'}`,
      );
    }
  }

  if (files.length === 1 && debug) {
    messages.push('[lint]: EsLint suppressed the following errors:');
    for (const result of results) {
      for (const message of result.suppressedMessages) {
        messages.push(JSON.stringify(message));
      }
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
