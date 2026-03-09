// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {resolve} from 'node:path';
import stylelint from 'stylelint';

const configBase = {
  config: {
    plugins: [resolve(import.meta.dirname, '../lib/use_monospace_font.mjs')],
    rules: {'plugin/use_monospace_font': [true]},
  },
};

const configFix = {
  config: configBase.config,
  fix: true,
};

async function lintAndGetWarnings(code) {
  const {
    results: [{warnings}],
  } = await stylelint.lint({
    code,
    ...configBase,
  });
  return warnings;
}

async function lintAndFix(code) {
  const {code: fixedCode} = await stylelint.lint({
    code,
    ...configFix,
  });
  return fixedCode;
}

const expectedError =
    'Expected "font-family: var(--monospace-font-family)" instead of "font-family: monospace". Provided for test screenshots consistency (plugin/use_monospace_font)';

describe('use_monospace_font', () => {
  it('errors on font-family: monospace', async () => {
    const code = `.foo {
      font-family: monospace;
    }`;
    const warnings = await lintAndGetWarnings(code);

    assert.deepEqual(warnings, [
      {
        column: 20,
        line: 2,
        endColumn: 29,
        endLine: 2,
        rule: 'plugin/use_monospace_font',
        severity: 'error',
        text: expectedError,
        url: undefined,
        fix: undefined,
      },
    ]);
  });

  it('errors on font-family: Menlo, monospace', async () => {
    const code = `.foo {
      font-family: Menlo, monospace;
    }`;
    const warnings = await lintAndGetWarnings(code);

    assert.deepEqual(warnings, [
      {
        column: 27,
        line: 2,
        endColumn: 36,
        endLine: 2,
        rule: 'plugin/use_monospace_font',
        severity: 'error',
        text: expectedError,
        url: undefined,
        fix: undefined,
      },
    ]);
  });

  it('allows font-family: var(--monospace-font-family)', async () => {
    const code = `.foo { font-family: var(--monospace-font-family); }`;
    const warnings = await lintAndGetWarnings(code);
    assert.deepEqual(warnings, []);
  });

  it('autofixes font-family: monospace', async () => {
    const code = `.foo {
      font-family: monospace;
    }`;
    const fixedCode = await lintAndFix(code);

    assert.strictEqual(
        fixedCode,
        `.foo {
      font-family: var(--monospace-font-family);
    }`,
    );
  });

  it('autofixes font-family: Menlo, monospace', async () => {
    const code = `.foo {
      font-family: Menlo, monospace;
    }`;
    const fixedCode = await lintAndFix(code);

    assert.strictEqual(
        fixedCode,
        `.foo {
      font-family: Menlo, var(--monospace-font-family);
    }`,
    );
  });
});
