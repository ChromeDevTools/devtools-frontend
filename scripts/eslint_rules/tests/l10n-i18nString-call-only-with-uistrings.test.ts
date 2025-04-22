// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-i18nString-call-only-with-uistrings.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-i18nString-call-only-with-uistrings', rule, {
  valid: [
    {
      code: 'const UIStrings = { foo: "foo" } as const; i18nString(UIStrings.foo);',
    },
    {
      code: 'const UIStrings = { foo: "foo" } as const; i18nLazyString(UIStrings.foo);',
    },
  ],
  invalid: [
    {
      code: 'i18nString("test");',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
    {
      code: 'i18nLazyString("test");',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
    {
      code: 'i18nString(someFoo());',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
  ],
});
