// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-locked-or-placeholder-only-phrase.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-no-locked-or-placeholder-only-phrase', rule, {
  valid: [
    {
      code: 'const UIStrings = { foo: \'No locked part\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Some `locked` part\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'One {PH} placeholder\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'{PH} two {PH} placeholders\' } as const;',
    },
    {
      code: 'const variableNotNamedUIStrings = { foo: \'`whole phrase is locked`\' } as const;',
    },
  ],
  invalid: [
    {
      code: 'const UIStrings = { foo: \'`whole phrase is locked`\'} as const;',
      errors: [
        {
          messageId: 'fullyLockedPhrase',
        },
      ],
    },
    {
      code: 'const UIStrings = { foo: \'{PH}\'} as const;',
      errors: [
        {
          messageId: 'singlePlaceholderPhrase',
        },
      ],
    },
  ],
});
