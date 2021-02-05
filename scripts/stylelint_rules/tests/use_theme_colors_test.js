// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const stylelint = require('stylelint');
const path = require('path');
const {assert} = require('chai');

const config = {
  plugins: [path.resolve(__dirname, '../lib/use_theme_colors.js')],
  rules: {'plugin/use_theme_colors': [true]}
};

async function lint(code) {
  const {results: [{warnings}]} = await stylelint.lint({
    code,
    config,
  });
  return warnings;
}

const EXPECTED_ERROR_MESSAGE = 'All CSS color declarations should use a variable defined in ui/themeColors.css';

describe('use_theme_colors', () => {
  beforeEach(() => {
    delete process.env.THEME_COLORS_AUTOFIX;
  });

  it('errors when a hex color is used', async () => {
    const warnings = await lint('p { color: #fff000; }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('errors when a RGB color is used', async () => {
    const warnings = await lint('p { color: rgb(0, 0, 0); }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('errors when an HSL color is used', async () => {
    const warnings = await lint('p { color: hsl(0deg 0% 70% / 50%); }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('errors when finding a bad color inside a border declaration', async () => {
    const warnings = await lint('p { border-left: 1px solid #fff; }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('disables all the violations of the rule', async () => {
    const code = `p {
    background: #fff;
    border-radius: 2px;
    color: hsl(0deg 0% 20%);
    padding: 5px 8px;
}`;

    process.env.THEME_COLORS_AUTOFIX = 1;
    const {output} = await stylelint.lint({
      fix: true,
      code,
      config,
    });
    assert.strictEqual(output, `p {
    background: #fff; /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    border-radius: 2px;
    color: hsl(0deg 0% 20%); /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    padding: 5px 8px;
}`);
  });

  it('disables new rule violations when existing ones have been fixed', async () => {
    const code = `p {
    background: #fff;
    border-radius: 2px;
    color: hsl(0deg 0% 20%); /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    padding: 5px 8px;
}`;

    process.env.THEME_COLORS_AUTOFIX = 1;
    const {output} = await stylelint.lint({
      fix: true,
      code,
      config,
    });
    assert.strictEqual(output, `p {
    background: #fff; /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    border-radius: 2px;
    color: hsl(0deg 0% 20%); /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    padding: 5px 8px;
}`);
  });

  it('does not autofix valid variable color usage', async () => {
    const {output} = await stylelint.lint({
      fix: true,
      code: 'p { color: var(--color-primary); }',
      config,
    });
    assert.strictEqual(output, 'p { color: var(--color-primary); }');
  });


  it('errors when a variable is used that is not defined in themeColors', async () => {
    const warnings = await lint('p { color: var(--not-a-theme-color); }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('errors when finding a bad variable in a border declaration', async () => {
    const warnings = await lint('p { border-left: 1px solid var(--not-a-theme-color); }');

    assert.deepEqual(
        warnings,
        [{column: 5, line: 1, rule: 'plugin/use_theme_colors', severity: 'error', text: EXPECTED_ERROR_MESSAGE}]);
  });

  it('allows locally declared variables to be used', async () => {
    const warnings = await lint('p { color: var(--color-primary); }');
    assert.lengthOf(warnings, 0);
  });

  it('allows any color to be used when in a :host-context dark theme block', async () => {
    const code = `:host-context(.-theme-with-dark-background) p {
      color: #fff;
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('allows any color to be used when in a .-theme-with-dark-background block', async () => {
    const code = `.-theme-with-dark-background p {
      color: #fff;
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });
});
