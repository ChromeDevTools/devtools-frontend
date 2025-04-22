// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-i18nString-calls-module-instantiation.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-no-i18nString-calls-module-instantiation', rule, {
  valid: [
    {
      code: 'function foo() { i18nString("test"); }',
    },
    {
      code: 'const foo = () => i18nString();',
    },
    {
      code: 'class Bar { foo(): { i18nString(); } }',
    },
    {
      code: 'Foo.bar = function() { i18nString(); };',
    },
    {
      code: 'class Bar { private foo: String = i18nString(); }',
    },
  ],
  invalid: [
    {
      code: 'i18nString("test");',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      code: 'callSomeMethod(i18nString());',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      code: 'callSomeMethod({title: i18nString()});',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      code: 'const someObj = { foo: i18nString() };',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      code: 'const someArray = [i18nString()];',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      code: 'const someMap = new Map([["foo", i18nString()]]);',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
  ],
});
