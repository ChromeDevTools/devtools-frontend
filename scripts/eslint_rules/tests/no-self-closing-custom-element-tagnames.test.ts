// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-self-closing-custom-element-tagnames.ts';

import {RuleTester} from './utils/RuleTester.ts';

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
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      code: 'Lit.html`<p><${DataGrid.litTagName} /></p>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      code: 'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName} /></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      code: 'Lit.html`<${DataGrid.litTagName} .data=${{test: "Hello World"}}/>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
  ],
});
