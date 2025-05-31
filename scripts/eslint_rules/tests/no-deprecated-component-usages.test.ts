// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-deprecated-component-usages.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-deprecated-component-usages', rule, {
  valid: [
    {
      code: `
        const menu = document.querySelector('devtools-select-menu');
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `
        document.querySelector('devtools-select-menu')?.click();
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `
        const output = html\`
      <style></style>
      <devtools-select-menu
        @selectmenuselected${() => {}}
        .buttonTitle=${'Click me'}
        .title=${'Button to click'}>
          <devtools-menu-item>${'Item'}</devtools-menu-item>
      </devtools-select-menu>
      \`;
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noDevToolsSelectMenu',
        },
      ],
    },

  ],
});
