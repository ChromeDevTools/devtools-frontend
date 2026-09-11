// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-self-closing-custom-element-tagnames.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-self-closing-custom-element-tagnames', rule, {
  valid: [
    {
      name: 'allows standard HTML paragraph tags',
      code: 'Lit.html`<p></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows self-closing standard input tag',
      code: 'Lit.html`<input />`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows custom element tag with closing tag',
      code: 'Lit.html`<${DataGrid.litTagName}></${DataGrid.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows custom element tag with closing tag inside paragraph',
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows nested custom element tags with closing tags',
      code:
          'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName}></${DataGrid2.litTagName}></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows custom element with newline between open and close tags',
      code: 'Lit.html`<${DataGrid1.litTagName}>\n</${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows self-closing custom element tag',
      code: 'Lit.html`<${DataGrid.litTagName} />`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      name: 'disallows self-closing custom element tag inside paragraph',
      code: 'Lit.html`<p><${DataGrid.litTagName} /></p>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      name: 'disallows nested self-closing custom element tag',
      code: 'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName} /></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
    {
      name: 'disallows self-closing custom element tag with property binding',
      code: 'Lit.html`<${DataGrid.litTagName} .data=${{test: "Hello World"}}/>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'requiredEndTag'}],
    },
  ],
});
