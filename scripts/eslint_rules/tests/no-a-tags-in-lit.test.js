// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const tsParser = require('@typescript-eslint/parser');

const rule = require('../lib/no-a-tags-in-lit.js');
const ruleTester = new (require('eslint').RuleTester)({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
  },
});

const EXPECTED_ERROR_MESSAGE = 'Adding links to a component should be done using `front_end/ui/legacy/XLink.ts`';

ruleTester.run('no-a-tags-in-lit', rule, {
  valid: [
    {
      code: 'Lit.html`<p></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'Lit.html`<aside></aside>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'Lit.html`<input />`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'Lit.html`<${DataGrid.litTagName}></${DataGrid.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code:
          'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName}></${DataGrid2.litTagName}></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'Lit.html`<a />`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<a></a>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`</a>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<a >`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}><a></a></p>`',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<${DataGrid.litTagName}><a /></${DataGrid.litTagName}>`',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
  ],
});
