// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-i18nString-call-only-with-uistrings.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-i18nString-call-only-with-uistrings', rule, {
  valid: [
    {
      name: 'allows i18nString called with UIStrings property',
      code: 'const UIStrings = { foo: "foo" } as const; i18nString(UIStrings.foo);',
    },
    {
      name: 'allows i18nLazyString called with UIStrings property',
      code: 'const UIStrings = { foo: "foo" } as const; i18nLazyString(UIStrings.foo);',
    },
  ],
  invalid: [
    {
      name: 'disallows i18nString called with string literal',
      code: 'i18nString("test");',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
    {
      name: 'disallows i18nLazyString called with string literal',
      code: 'i18nLazyString("test");',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
    {
      name: 'disallows i18nString called with function call result',
      code: 'i18nString(someFoo());',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
  ],
});
