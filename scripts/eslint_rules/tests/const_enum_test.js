// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/const_enum.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('const_enum', rule, {
  valid: [
    {
      code: 'const enum BadEnum { A = "a" }',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'enum BadEnum { A = "a" }',
      filename: 'front_end/components/test.ts',
      errors: [{message: 'TypeScript enums must be declared as const enums: const enum Foo {...}'}]
    },
  ]
});
