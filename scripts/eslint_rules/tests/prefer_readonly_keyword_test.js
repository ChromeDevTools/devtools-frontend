// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/prefer_readonly_keyword.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('prefer_readonly_keyword', rule, {
  valid: [
    {
      filename: 'foo.ts',
      code: `class X {
        private foo: readonly string[];
      }`,
    },
    {
      filename: 'foo.ts',
      code: 'function x(foo: readonly string[]): readonly number[] {}',
    },
    {
      filename: 'foo.ts',
      code: 'const x: readonly string[] = []',
    },
  ],

  invalid: [
    {
      filename: 'foo.ts',
      code: `class X {
        private foo: ReadonlyArray<string>;
      }`,
      errors: [{message: 'Prefer the readonly keyword over the ReadonlyArray type.'}]
    },
    {
      filename: 'foo.ts',
      code: 'function x(foo: ReadonlyArray<string>) {}',
      errors: [{message: 'Prefer the readonly keyword over the ReadonlyArray type.'}]
    },
    {
      filename: 'foo.ts',
      code: 'function x(foo: readonly string[]): ReadonlyArray<string> {}',
      errors: [{message: 'Prefer the readonly keyword over the ReadonlyArray type.'}]
    },
    {
      filename: 'foo.ts',
      code: 'const x: ReadonlyArray<string> = []',
      errors: [{message: 'Prefer the readonly keyword over the ReadonlyArray type.'}]
    },
  ]
});
