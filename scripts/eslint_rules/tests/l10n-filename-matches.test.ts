// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'path';

import rule from '../lib/l10n-filename-matches.ts';

import {RuleTester} from './utils/RuleTester.ts';

const optionsFrontEndDir = [
  {
    rootFrontendDirectory: path.join(
        // @ts-expect-error
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
        // @ts-expect-error
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
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.js\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsFrontEndDir,
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsComponentDir,
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: optionsComponentDir,
    },
  ],
  invalid: [
    {
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
