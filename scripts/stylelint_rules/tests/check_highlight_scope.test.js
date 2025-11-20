// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = require('chai');
const path = require('node:path');
const stylelint = require('stylelint');

const configBase = {
  config: {
    plugins: [path.resolve(__dirname, '../lib/check_highlight_scope.mjs')],
    rules: {'plugin/check_highlight_scope': [true]},
  },
  // Remove once we use a ESM test runner
  quietDeprecationWarnings: true,
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

const createExpectedError = selector => `::highlight not be scoped in "${
    selector}". Observed performance regressions (https://crbug.com/461462682). (plugin/check_highlight_scope)`;

describe('check_highlight_scope', () => {
  it('errors when ::highlight is used at the root level', async () => {
    const code = `::highlight(my-search-results) {
      background-color: yellow;
    }`;
    const warnings = await lintAndGetWarnings(code);

    assert.deepEqual(warnings, [
      {
        column: 1,
        line: 1,
        endColumn: 31,
        endLine: 1,
        rule: 'plugin/check_highlight_scope',
        severity: 'error',
        text: createExpectedError('::highlight(my-search-results)'),
        url: undefined,
        fix: undefined,
      },
    ]);
  });

  it('errors when ::highlight is used in a comma-separated list without scoping', async () => {
    const code = `div, ::highlight(foo) {
      color: red;
    }`;
    const warnings = await lintAndGetWarnings(code);

    assert.deepEqual(warnings, [
      {
        column: 6,
        endColumn: 22,
        endLine: 1,
        line: 1,
        rule: 'plugin/check_highlight_scope',
        severity: 'error',
        text: createExpectedError('::highlight(foo)'),
        url: undefined,
        fix: undefined,
      },
    ]);
  });

  it('allows ::highlight when scoped to :host', async () => {
    const warnings = await lintAndGetWarnings(
        ':host::highlight(my-highlight) { background: blue; }',
    );
    assert.deepEqual(warnings, []);
  });

  it('allows ::highlight when scoped to a specific class', async () => {
    const warnings = await lintAndGetWarnings(
        '.search-results::highlight(term) { color: white; }',
    );
    assert.deepEqual(warnings, []);
  });

  it('allows ::highlight when scoped to a type selector', async () => {
    const warnings = await lintAndGetWarnings(
        'p::highlight(spelling-error) { text-decoration: wavy; }',
    );
    assert.deepEqual(warnings, []);
  });

  it('ignores other pseudo-elements like ::before', async () => {
    const warnings = await lintAndGetWarnings('::before { content: ""; }');
    assert.deepEqual(warnings, []);
  });

  it('allows ::highlight when used with a combinator (child)', async () => {
    // This is technically scoped to children of 'main', so it should pass
    const warnings = await lintAndGetWarnings(
        'main > ::highlight(foo) { color: green; }',
    );
    assert.deepEqual(warnings, [
      {
        column: 1,
        line: 1,
        endColumn: 24,
        endLine: 1,
        rule: 'plugin/check_highlight_scope',
        severity: 'error',
        text: createExpectedError('main > ::highlight(foo)'),
        url: undefined,
        fix: undefined,
      },
    ]);
  });
  it('errors correctly on multiple unscoped highlights in one rule', async () => {
    const code = `::highlight(one), ::highlight(two) {
      color: pink;
    }`;
    const warnings = await lintAndGetWarnings(code);

    assert.deepEqual(warnings, [
      {
        column: 1,
        line: 1,
        endColumn: 17,
        endLine: 1,
        rule: 'plugin/check_highlight_scope',
        severity: 'error',
        text: createExpectedError('::highlight(one)'),
        url: undefined,
        fix: undefined,
      },
      {
        column: 19,
        line: 1,
        endColumn: 35,
        endLine: 1,
        rule: 'plugin/check_highlight_scope',
        severity: 'error',
        text: createExpectedError('::highlight(two)'),
        url: undefined,
        fix: undefined,
      },
    ]);
  });
});
