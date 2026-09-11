// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-a-tags-in-lit.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-a-tags-in-lit', rule, {
  valid: [
    {
      name: 'allows p element in template',
      code: 'Lit.html`<p></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows aside element in template',
      code: 'Lit.html`<aside></aside>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows input element in template',
      code: 'Lit.html`<input />`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows custom element tag in template',
      code: 'Lit.html`<${DataGrid.litTagName}></${DataGrid.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows custom element inside p element',
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows nested custom element tags',
      code:
          'Lit.html`<${DataGrid1.litTagName}><${DataGrid2.litTagName}></${DataGrid2.litTagName}></${DataGrid1.litTagName}>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows self-closing anchor tag',
      code: 'Lit.html`<a />`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      name: 'disallows paired anchor tag',
      code: 'Lit.html`<a></a>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      name: 'disallows stray anchor closing tag',
      code: 'Lit.html`</a>`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      name: 'disallows anchor tag with trailing space',
      code: 'Lit.html`<a >`',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      name: 'disallows anchor tag inside p element alongside custom element',
      code: 'Lit.html`<p><${DataGrid.litTagName}></${DataGrid.litTagName}><a></a></p>`',
      errors: [{messageId: 'foundAnchor'}],
    },
    {
      name: 'disallows self-closing anchor tag inside custom element',
      code: 'Lit.html`<${DataGrid.litTagName}><a /></${DataGrid.litTagName}>`',
      errors: [{messageId: 'foundAnchor'}],
    },
  ],
});
