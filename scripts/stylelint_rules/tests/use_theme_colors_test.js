// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const stylelint = require('stylelint');
const path = require('path');
const {assert} = require('chai');

const config = {
  plugins: [path.resolve(__dirname, '../lib/use_theme_colors.js')],
  rules: {'plugin/use_theme_colors': [true]},
};

async function lint(code) {
  const {
    results: [{warnings}],
  } = await stylelint.lint({
    code,
    config,
  });
  return warnings;
}

const EXPECTED_ERROR_MESSAGE = 'All CSS color declarations should use a variable defined in ui/legacy/themeColors.css';

describe('use_theme_colors', () => {
  beforeEach(() => {
    delete process.env.THEME_COLORS_AUTOFIX;
  });

  it('errors when a hex color is used', async () => {
    const warnings = await lint('p { color: #fff000; }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors when a RGB color is used', async () => {
    const warnings = await lint('p { color: rgb(0, 0, 0); }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors when an HSL color is used', async () => {
    const warnings = await lint('p { color: hsl(0deg 0% 70% / 50%); }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors when finding a bad color inside a border declaration', async () => {
    const warnings = await lint('p { border-left: 1px solid #fff; }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors on border-color', async () => {
    const warnings = await lint('p { border-color: #fff; }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors on outline', async () => {
    const warnings = await lint('p { outline: 4px solid #ff0000; }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
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
    assert.strictEqual(
        output,
        `p {
    background: #fff; /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    border-radius: 2px;
    color: hsl(0deg 0% 20%); /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    padding: 5px 8px;
}`,
    );
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
    assert.strictEqual(
        output,
        `p {
    background: #fff; /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    border-radius: 2px;
    color: hsl(0deg 0% 20%); /* stylelint-disable-line plugin/use_theme_colors */
    /* See: crbug.com/1152736 for color variable migration. */
    padding: 5px 8px;
}`,
    );
  });

  it('does not autofix valid variable color usage', async () => {
    const {output} = await stylelint.lint({
      fix: true,
      code: 'p { color: var(--color-primary-old); }',
      config,
    });
    assert.strictEqual(output, 'p { color: var(--color-primary-old); }');
  });

  it('errors when a variable is used that is not defined in themeColors', async () => {
    const warnings = await lint('p { color: var(--not-a-theme-color); }');

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('errors when finding a bad variable in a border declaration', async () => {
    const warnings = await lint(
        'p { border-left: 1px solid var(--not-a-theme-color); }',
    );

    assert.deepEqual(warnings, [
      {
        column: 5,
        line: 1,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });

  it('allows locally declared variables to be used', async () => {
    const warnings = await lint('p { color: var(--color-primary-old); }');
    assert.lengthOf(warnings, 0);
  });

  it('allows any var(--image-file-*)', async () => {
    const warnings = await lint('p { background: var(--image-file-fof); }');
    assert.lengthOf(warnings, 0);
  });

  it('allows variables within rgb', async () => {
    const warnings = await lint(
        'p { background: rgb(var(--override-base-color) / 20%); }',
    );
    assert.lengthOf(warnings, 0);
  });

  it('allows any color to be used when in a :host-context dark theme block', async () => {
    const code = `:host-context(.theme-with-dark-background) p {
      color: #fff;
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('does not lint against background-image properties when they are defined as just a variable', async () => {
    const code = `.spectrum-sat {
      background-image: var(--my-lovely-image);
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('does lint against background-image properties when they are a gradient with a colour in', async () => {
    const code = `.spectrum-sat {
      background-image: linear-gradient(to right, #fff, rgb(204 154 129 / 0%));
    }`;
    const warnings = await lint(code);
    // Two warnings: one for each colour (#fff and rgb(...))
    assert.deepEqual(warnings, [
      {
        line: 2,
        column: 7,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: 'All CSS color declarations should use a variable defined in ui/legacy/themeColors.css',
      },
      {
        line: 2,
        column: 7,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: 'All CSS color declarations should use a variable defined in ui/legacy/themeColors.css',
      },
    ]);
  });

  it('allows any color to be used when in a .theme-with-dark-background block', async () => {
    const code = `.theme-with-dark-background p {
      color: #fff;
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('ignores any css variables prefixed with "--override-"', async () => {
    const code = `p {
      color: var(--override-custom-color);
    }`;
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('correctly only detects the relevant color variables for border-X declarations', async () => {
    const code = 'header {border-bottom: var(--header-border-height) solid var(--color-details-hairline); }';
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('errors on a bad variable name for a border color', async () => {
    const code = 'header {border-top: var(--header-border-height) solid var(--color-does-not-exist); }';
    const warnings = await lint(code);
    assert.deepEqual(warnings, [
      {
        line: 1,
        column: 9,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: 'All CSS color declarations should use a variable defined in ui/legacy/themeColors.css',
      },
    ]);
  });

  it('does not error when there is a var for the border width', async () => {
    const warnings = await lint(
        'p { border: var(--button-border-size) solid var(--color-primary); }',
    );

    assert.lengthOf(warnings, 0);
  });

  it('does not error when there is a var for the outline width', async () => {
    const warnings = await lint(
        'p { outline: var(--button-border-size) solid var(--color-primary); }',
    );

    assert.lengthOf(warnings, 0);
  });

  it('does not error when the outline is set to none', async () => {
    const warnings = await lint(
        'p { outline: none; }',
    );

    assert.lengthOf(warnings, 0);
  });

  it('does not error when using --sys-elevation for box-shadow', async () => {
    const warnings = await lint(
        'p { box-shadow: var(--sys-elevation-level1); }',
    );

    assert.lengthOf(warnings, 0);
  });

  it('does error when using a random color for box shadow', async () => {
    const warnings = await lint('p { box-shadow: 0 1px 2px 0 #ff0000; }');

    assert.lengthOf(warnings, 1);
  });

  it('is silent when linting code that has an empty var()', async () => {
    /**
     * This is a weird test case but if you've got Stylelint in your editor and
     * you're working on changing files, I've found that after typing "var("
     * (and my editor adding the closing ")"), the theme_colors rule tries to
     * run against this and fails as it expects the var() to contain a variable.
     * So if we do detect var(), we just do nothing and wait for the user to
     * actually fill it in.
     */
    const code = 'header { color: var(); }';
    const warnings = await lint(code);
    assert.lengthOf(warnings, 0);
  });

  it('allows multi line declared variables to be used', async () => {
    const warnings = await lint(
        `p {
        color: var(
          --color-primary-old
        );
      }`,
    );
    assert.lengthOf(warnings, 0);
  });

  it('error with multi line variable declarations', async () => {
    const warnings = await lint(
        `p {
        color: var(
          --my-color
        );
      }`,
    );
    assert.deepEqual(warnings, [
      {
        column: 9,
        line: 2,
        rule: 'plugin/use_theme_colors',
        severity: 'error',
        text: EXPECTED_ERROR_MESSAGE,
      },
    ]);
  });
});
