// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-i18nString-calls-module-instantiation.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-no-i18nString-calls-module-instantiation', rule, {
  valid: [
    {
      name: 'allows i18nString in function declaration',
      code: 'function foo() { i18nString("test"); }',
    },
    {
      name: 'allows i18nString in arrow function',
      code: 'const foo = () => i18nString();',
    },
    {
      name: 'allows i18nString in class method',
      code: 'class Bar { foo(): { i18nString(); } }',
    },
    {
      name: 'allows i18nString in function expression assigned to property',
      code: 'Foo.bar = function() { i18nString(); };',
    },
    {
      name: 'allows i18nString in class property initializer',
      code: 'class Bar { private foo: String = i18nString(); }',
    },
  ],
  invalid: [
    {
      name: 'disallows top-level i18nString call',
      code: 'i18nString("test");',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      name: 'disallows i18nString as argument to top-level call',
      code: 'callSomeMethod(i18nString());',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      name: 'disallows i18nString inside object in top-level call',
      code: 'callSomeMethod({title: i18nString()});',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      name: 'disallows i18nString in top-level object property',
      code: 'const someObj = { foo: i18nString() };',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      name: 'disallows i18nString in top-level array element',
      code: 'const someArray = [i18nString()];',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
    {
      name: 'disallows i18nString in top-level Map constructor argument',
      code: 'const someMap = new Map([["foo", i18nString()]]);',
      errors: [
        {
          messageId: 'disallowedCall',
        },
      ],
    },
  ],
});
