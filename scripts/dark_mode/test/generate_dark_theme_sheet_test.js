// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = require('chai');
const {rulesToPassToColorPatching} = require('../generate_dark_theme_sheet.js');

describe('generate_dark_theme_sheet parsing', () => {
  it('includes rules that have no dark mode overrides', () => {
    const inputCSS = 'p { color: red; }';
    const output = rulesToPassToColorPatching(inputCSS);
    assert.strictEqual(output, 'p { color: red; }');
  });

  it('removes declarations that have overrides and leaves ones that do not', () => {
    const inputCSS = `p { color: red; background-color: blue; }

    :host-context(.-theme-with-dark-background) p, .-theme-with-dark-background p { color: blue; }`;
    const output = rulesToPassToColorPatching(inputCSS);
    // Here color is overriden, so the bit that needs patching is just the background color.
    assert.strictEqual(output, 'p { background-color: blue; }');
  });

  it('will entirely remove the rule if all colors are overriden', () => {
    const inputCSS = `p { color: red; background-color: blue; }

    :host-context(.-theme-with-dark-background) p, .-theme-with-dark-background p { color: blue; background-color: red; }`;
    const output = rulesToPassToColorPatching(inputCSS);
    assert.strictEqual(output, '');
  });

  it('can handle multiple rules and detect overrides correctly', () => {
    const inputCSS = `.foo {
      color: red;
    }

    .bar {
      outline: none;
      border: 1px solid red;
    }

    .baz {
      color: blue;
      background-color: red;
    }

    :host-context(.-theme-with-dark-background) .foo, .-theme-with-dark-background .foo { color: blue; }
    :host-context(.-theme-with-dark-background) .baz, .-theme-with-dark-background .baz {
      color: green;
    }`;
    const output = rulesToPassToColorPatching(inputCSS);
    assert.strictEqual(output, `.bar {
      outline: none;
      border: 1px solid red;
    }
.baz {
      background-color: red;
    }`);
  });

  it('excludes any rules that are defined as a variable', () => {
    const inputCSS = `.foo { border-color: var(--color-background); }

    .bar {
      color: blue;
      background-color: var(--override-custom-color);
    }`;

    const output = rulesToPassToColorPatching(inputCSS);
    assert.strictEqual(output, `.bar {
      color: blue;
    }`);
  });

  it('correctly excludes @media(forced-colors)', () => {
    const inputCSS = `.foo { border-color: red; }

    @media (forced-colors: active) {
      .foo { border-color: Highlight; }
    }`;

    const output = rulesToPassToColorPatching(inputCSS);
    assert.strictEqual(output, '.foo { border-color: red; }');
  });

  it('correctly excludes @keyframes', () => {
    const inputCSS = `@keyframes fadeout {
      from { background-color: red; }
      to { background-color: blue; }
    }

    .foo {
      animation: fadeout 2s 0s;
    }`;

    const output = rulesToPassToColorPatching(inputCSS);
    // The entire of the input needs to be passed through
    assert.strictEqual(output, `.foo {
      animation: fadeout 2s 0s;
    }`);
  });
});
