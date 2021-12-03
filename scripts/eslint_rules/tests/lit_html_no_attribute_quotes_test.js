// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/lit_html_no_attribute_quotes.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('lit_html_no_attribute_quotes', rule, {
  valid: [
    {
      code: 'LitHtml.html`<p class=${foo}>foo</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'LitHtml.html`<p class=${foo}>"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'html`<p class=${foo}>"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'html`<p class="my-${fooClassName}">"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
  ],
  invalid: [
    {
      code: 'LitHtml.html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'attributeQuotesNotRequired', column: 26, line: 1}],
      output: 'LitHtml.html`<p class=${foo}>foo</p>`',
    },
    {
      code: 'html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'attributeQuotesNotRequired'}],
      output: 'html`<p class=${foo}>foo</p>`',
    },
  ]
});
