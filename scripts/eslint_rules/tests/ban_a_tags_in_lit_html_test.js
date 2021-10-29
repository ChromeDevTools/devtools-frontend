// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/ban_a_tags_in_lit_html.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const EXPECTED_ERROR_MESSAGE = 'Adding links to a component should be done using `front_end/ui/legacy/XLink.ts`';

ruleTester.run('ban_a_tags_in_lit_html', rule, {
  valid: [
    {
      code: 'LitHtml.html`<p></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<input />`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<${DataGrid.litTagName}></${DataGrid.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code:
          'LitHtml.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName}></${DataGrid2.litTagName}></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    }
  ],
  invalid: [
    {
      code: 'LitHtml.html`<a />`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {
      code: 'LitHtml.html`<a></a>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {code: 'LitHtml.html`</a>`', filename: 'front_end/components/test.ts', errors: [{message: EXPECTED_ERROR_MESSAGE}]},
    {code: 'LitHtml.html`<a >`', filename: 'front_end/components/test.ts', errors: [{message: EXPECTED_ERROR_MESSAGE}]},
    {
      code: 'LitHtml.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}><a></a></p>`',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {
      code: 'LitHtml.html`<${DataGrid.litTagName}><a /></${DataGrid.litTagName}>`',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
  ]
});
