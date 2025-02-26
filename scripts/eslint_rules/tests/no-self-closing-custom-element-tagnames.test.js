// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const rule = require('../lib/no-self-closing-custom-element-tagnames.js');

const {RuleTester} = require('./utils/utils.js');

const EXPECTED_ERROR_MESSAGE = 'Custom elements should not be self closing.';

new RuleTester().run('no-self-closing-custom-element-tagnames', rule, {
  valid: [
    {
      code: 'Lit.html`<p></p>`',
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
    {
      code: 'Lit.html`<${DataGrid1.litTagName}>\n</${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'Lit.html`<${DataGrid.litTagName} />`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<p><${DataGrid.litTagName} /></p>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName} /></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
    {
      code: 'Lit.html`<${DataGrid.litTagName} .data=${{test: "Hello World"}}/>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
  ],
});
