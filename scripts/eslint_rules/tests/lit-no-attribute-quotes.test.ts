// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/lit-no-attribute-quotes.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('lit-no-attribute-quotes', rule, {
  valid: [
    {
      code: 'Lit.html`<p class=${foo}>foo</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'Lit.html`<p class=${foo}>"${someOutput}"</p>`',
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
      code: 'Lit.html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [
        {messageId: 'attributeQuotesNotRequired', column: 22, line: 1},
      ],
      output: 'Lit.html`<p class=${foo}>foo</p>`',
    },
    {
      code: 'html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'attributeQuotesNotRequired'}],
      output: 'html`<p class=${foo}>foo</p>`',
    },
  ],
});
