// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/prefer-readonly-keyword.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('prefer-readonly-keyword', rule, {
  valid: [
    {
      filename: 'foo.ts',
      code: 'class Foo { private foo: readonly string[]; }',
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
      code: 'class Foo { private foo: ReadonlyArray<string>; }',
      output: 'class Foo { private foo: readonly string[]; }',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useReadonlyKeyword',
        },
      ]
    },
    {
      code: 'function x(foo: ReadonlyArray<string>) {}',
      output: 'function x(foo: readonly string[]) {}',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useReadonlyKeyword',
        },
      ]
    },
    {
      code: 'function x(foo: readonly string[]): ReadonlyArray<string> {}',
      output: 'function x(foo: readonly string[]): readonly string[] {}',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useReadonlyKeyword',
        },
      ]
    },
    {
      code: 'const x: ReadonlyArray<string> = []',
      output: 'const x: readonly string[] = []',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useReadonlyKeyword',
        },
      ]
    },
  ]
});
