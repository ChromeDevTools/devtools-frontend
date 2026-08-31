// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLint} from 'eslint';
import {join} from 'node:path';

export async function runESLint(scriptFiles, {fix, lintOnly, forceFix, debug}) {
  if (scriptFiles.length === 0) {
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
        ` Rule ${ruleId} can be replaced with ${replacedBy?.join(',') ?? 'none'}`,
      );
    }
  }

  if (files.length === 1 && debug) {
    messages.push('[lint]: EsLint suppressed the following errors:');
    for (const result of results) {
      messages.push(result.suppressedMessages.map(String).join(' '));
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
