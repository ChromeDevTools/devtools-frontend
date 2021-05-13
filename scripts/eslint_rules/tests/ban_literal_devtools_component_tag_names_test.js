// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/ban_literal_devtools_component_tag_names.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const EXPECTED_ERROR_MESSAGE =
    'Rendering other DevTools components should be done using LitHtml static expressions (<${Component.litTagName}>).';

ruleTester.run('ban_literal_devtools_component_tag_names', rule, {
  valid: [
    {
      code: 'LitHtml.html`<p></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'LitHtml.html`<${DataGrid.litTagName}></${DataGrid.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'LitHtml.html`<devtools-foo></devtools-foo>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'LitHtml.html`<p>${foo}</p><devtools-foo></devtools-foo>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    },
  ]
});
