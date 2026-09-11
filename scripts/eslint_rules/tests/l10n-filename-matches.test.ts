// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import rule from '../lib/l10n-filename-matches.ts';

import {RuleTester} from './utils/RuleTester.ts';

const optionsFrontEndDir = [
  {
    rootFrontendDirectory: path.join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'front_end',
        ),
  },
] as const;

const optionsComponentDir = [
  {
    rootFrontendDirectory: path.join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'front_end',
        'components',
        ),
  },
] as const;

new RuleTester().run('l10n-filename-matches', rule, {
  valid: [
    {
      name: 'allows matching relative path from frontend root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      name: 'allows ModuleUIStrings.js from frontend root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.js\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      name: 'allows ModuleUIStrings.ts from frontend root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      name: 'allows ModuleUIStrings.ts from component root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsComponentDir,
    },
    {
      name: 'allows matching relative path from component root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsComponentDir,
    },
  ],
  invalid: [
    {
      name: 'disallows mismatched filename from frontend root',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/foo.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
      errors: [
        {
          messageId: 'pathMismatch',
        },
      ],
      output: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
    },
    {
      name: 'disallows prefix when root is component directory',
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'pathMismatch',
        },
      ],
      output: 'const str_ = i18n.i18n.registerUIStrings(\'test.ts\', UIStrings);',
      options: optionsComponentDir,
    },
  ],
});
