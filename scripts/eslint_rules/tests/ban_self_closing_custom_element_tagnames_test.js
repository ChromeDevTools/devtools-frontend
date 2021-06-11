// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/ban_self_closing_custom_element_tagnames.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const EXPECTED_ERROR_MESSAGE = 'Custom elements should not be self closing.';

ruleTester.run('ban_self_closing_custom_element_tagnames', rule, {
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
    },
    {
      code: 'LitHtml.html`<${DataGrid1.litTagName}>\n</${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'LitHtml.html`<${DataGrid.litTagName} />`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {
      code: 'LitHtml.html`<p><${DataGrid.litTagName} /></p>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {
      code: 'LitHtml.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName} /></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
    {
      code: 'LitHtml.html`<${DataGrid.litTagName} .data=${{test: "Hello World"}}/>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
  ]
});
