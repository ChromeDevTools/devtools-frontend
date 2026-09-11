// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-adopted-style-sheets.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-adopted-style-sheets', rule, {
  valid: [
    {
      name: 'allows bare adoptedStyleSheets assignment to empty array',
      code: 'adoptedStyleSheets = []',
      filename: 'foo.ts',
    },
    {
      name: 'allows bare adoptedStyleSheets assignment with style',
      code: 'adoptedStyleSheets = [style]',
      filename: 'foo.ts',
    },
    {
      name: 'allows bare adoptedStyleSheets push call',
      code: 'adoptedStyleSheets.push(style)',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows document.adoptedStyleSheets assignment with one style',
      code: 'document.adoptedStyleSheets = [style]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      name: 'disallows document.adoptedStyleSheets assignment with multiple styles',
      code: 'document.adoptedStyleSheets = [style1, style2]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      name: 'disallows document.adoptedStyleSheets.push',
      code: 'document.adoptedStyleSheets.push(style)',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      name: 'disallows shadowRoot.adoptedStyleSheets assignment',
      code: 'this.shadowRoot.adoptedStyleSheets = [style]',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
    {
      name: 'disallows nested shadowRoot.adoptedStyleSheets.push',
      code: 'widget.contentElement.shadowRoot.adoptedStyleSheets.push(style);',
      filename: 'foo.ts',
      errors: [{messageId: 'noAdoptedStyleSheetsProperty'}],
    },
  ],
});
