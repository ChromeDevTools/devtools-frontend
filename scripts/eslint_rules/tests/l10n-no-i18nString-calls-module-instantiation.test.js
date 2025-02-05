// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
const rule = require('../lib/l10n-no-i18nString-calls-module-instantiation.js');

const {ruleTester} = require('./utils/utils.js');

const expectedErrors = [
  {
    message: 'Calls to i18nString in are disallowed at module instantiation time. Use i18nLazyString instead.',
  },
];

ruleTester.run('l10n-no-i18nString-calls-module-instantiation', rule, {
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
      errors: expectedErrors,
    },
    {code: 'callSomeMethod(i18nString());', errors: expectedErrors},
    {code: 'callSomeMethod({title: i18nString()});', errors: expectedErrors},
    {code: 'const someObj = { foo: i18nString() };', errors: expectedErrors},
    {code: 'const someArray = [i18nString()];', errors: expectedErrors},
    {
      code: 'const someMap = new Map([["foo", i18nString()]]);',
      errors: expectedErrors,
    },
  ],
});
