// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/use_private_class_members.js');
const ruleTester = new (require('eslint').RuleTester)({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('use_private_class_members', rule, {
  valid: [
    {
      code: `class Foo {
        #method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        public method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        public field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        private constructor() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `class Foo {
        private method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'do_not_use_private'}],
    },
    {
      code: `class Foo {
        private field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'do_not_use_private'}],
    },
  ]
});
