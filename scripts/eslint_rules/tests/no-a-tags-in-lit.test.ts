// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-a-tags-in-lit.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-a-tags-in-lit', rule, {
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
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      code: 'Lit.html`<a></a>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      code: 'Lit.html`</a>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      code: 'Lit.html`<a >`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}><a></a></p>`',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      code: 'Lit.html`<${DataGrid.litTagName}><a /></${DataGrid.litTagName}>`',
      errors: [{messageId: 'foundAnchor'}],
    },
  ],
});
