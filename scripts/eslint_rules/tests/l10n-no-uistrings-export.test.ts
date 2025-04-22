// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-uistrings-export.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-no-uistrings-export', rule, {
  valid: [
    {
      code: 'const UIStrings = {} as const;',
      filename: 'front_end/module/test.ts',
    },
    {
      code: 'export const UIStrings = {} as const;',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      code: 'export const UIStrings = {} as const;',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
    {
      code: 'export const UIStrings = {} as const;',
      // Emulate Windows path
      filename: 'front_end\\module\\ModuleUIStrings.js',
    },
  ],
  invalid: [
    {
      code: 'export const UIStrings = {} as const;',
      filename: 'front_end/module/test.ts',
      errors: [
        {
          messageId: 'noExport',
        },
      ],
      output: ' const UIStrings = {} as const;',
    },
    {
      code: 'const UIStrings = {} as const; export { UIStrings };',
      filename: 'front_end/module/test.ts',
      errors: [
        {
          messageId: 'noExport',
        },
      ],
    },
  ],
});
