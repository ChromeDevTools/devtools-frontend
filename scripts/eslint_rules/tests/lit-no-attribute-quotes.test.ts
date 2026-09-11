// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/lit-no-attribute-quotes.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('lit-no-attribute-quotes', rule, {
  valid: [
    {
      name: 'allows unquoted attribute expression with Lit.html',
      code: 'Lit.html`<p class=${foo}>foo</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows quotes in text content with Lit.html',
      code: 'Lit.html`<p class=${foo}>"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows quotes in text content with html',
      code: 'html`<p class=${foo}>"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows quoted attribute with text prefix and expression',
      code: 'html`<p class="my-${fooClassName}">"${someOutput}"</p>`',
      filename: 'front_end/components/datagrid.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows quoted attribute expression with Lit.html',
      code: 'Lit.html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [
        {messageId: 'attributeQuotesNotRequired', column: 22, line: 1},
      ],
      output: 'Lit.html`<p class=${foo}>foo</p>`',
    },
    {
      name: 'disallows quoted attribute expression with html',
      code: 'html`<p class="${foo}">foo</p>`',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'attributeQuotesNotRequired'}],
      output: 'html`<p class=${foo}>foo</p>`',
    },
  ],
});
