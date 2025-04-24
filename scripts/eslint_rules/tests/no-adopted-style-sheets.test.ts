// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-adopted-style-sheets.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-adopted-style-sheets', rule, {
  valid: [
    {
      code: 'adoptedStyleSheets = []',
      filename: 'foo.ts',
    },
    {
      code: 'adoptedStyleSheets = [style]',
      filename: 'foo.ts',
    },
    {
      code: 'adoptedStyleSheets.push(style)',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'document.adoptedStyleSheets = [style]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      code: 'document.adoptedStyleSheets = [style1, style2]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      code: 'document.adoptedStyleSheets.push(style)',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      code: 'this.shadowRoot.adoptedStyleSheets = [style]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      code: 'widget.contentElement.shadowRoot.adoptedStyleSheets.push(style);',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
  ],
});
