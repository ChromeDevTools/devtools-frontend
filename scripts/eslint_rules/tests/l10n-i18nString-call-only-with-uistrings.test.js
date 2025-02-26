// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
const rule = require('../lib/l10n-i18nString-call-only-with-uistrings.js');

const {RuleTester} = require('./utils/utils.js');

const expectedErrors = [
  {
    message: 'Calling i18nString/i18nLazyString without using a UIStrings object is illegal.',
  },
];

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
      errors: expectedErrors,
    },
    {
      code: 'i18nLazyString("test");',
      errors: expectedErrors,
    },
    {
      code: 'i18nString(someFoo());',
      errors: expectedErrors,
    },
  ],
});
