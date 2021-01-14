// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/lit_no_style_interpolation.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('lit_no_style_interpolation', rule, {
  valid: [
    {
      code: 'LitHtml.html`<style>p { color: red; }</style>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<style>p { color: var(--blue); }</style>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<div${helloWorld}</div>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<style>div { margin-top: 5px; }</style><div${helloWorld}</div>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<div${helloWorld}</div><style>div { margin-top: 5px; }</style>`',
      filename: 'front_end/components/test.ts',
    },
    {
      // Valid because it's not in a LitHtml.html`` call so we don't make
      // any assumptions.
      code: 'const stuff = `<style>div { margin-top: ${MARGIN}; }</style>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'LitHtml.html`<style>p { color: ${RED}; }</style>`',
      filename: 'front_end/components/test.ts',
      errors: [{
        message:
            '<style> tag must not have data interpolated into it. Use CSS custom properties if you need to share data between CSS and JS in a component.'
      }]
    },
    {
      // First style block is OK, second has error
      code: 'LitHtml.html`<style>div{}</style><style>p { color: ${RED}; }</style>`',
      filename: 'front_end/components/test.ts',
      errors: [{
        message:
            '<style> tag must not have data interpolated into it. Use CSS custom properties if you need to share data between CSS and JS in a component.'
      }]
    },
  ]
});
