// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-uistrings-export.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-no-uistrings-export', rule, {
  valid: [
    {
      name: 'allows non-exported UIStrings in regular file',
      code: 'const UIStrings = {} as const;',
      filename: 'front_end/module/test.ts',
    },
    {
      name: 'allows exporting in ModuleUIStrings.ts',
      code: 'export const UIStrings = {} as const;',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      name: 'allows exporting in ModuleUIStrings.js',
      code: 'export const UIStrings = {} as const;',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
    {
      name: 'allows exporting in ModuleUIStrings.js with Windows path',
      code: 'export const UIStrings = {} as const;',
      // Emulate Windows path
      filename: 'front_end\\module\\ModuleUIStrings.js',
    },
  ],
  invalid: [
    {
      name: 'disallows exported UIStrings in regular file',
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
      name: 'disallows export clause for UIStrings in regular file',
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
