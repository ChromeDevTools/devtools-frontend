// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/set_data_type_reference.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('set_data_type_reference', rule, {
  valid: [
    {
      code: `class Foo extends HTMLElement {
        set data(data: FooData) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
    {
      // Outside of a component anything goes
      code: `class Foo {
        set data(data) {}
      }`,
      filename: 'front_end/common/foo.ts',
    },
  ],

  invalid: [
    {
      code: `class Foo extends HTMLElement {
        set data(data) {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors: [{message: 'The type of a parameter in a data setter must be explicitly defined.'}]
    },
    {
      code: `class Foo extends HTMLElement {
        set data() {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors: [{message: 'A data setter must take a parameter that is explicitly typed.'}]
    },
    {
      code: `class Foo extends HTMLElement {
        set data(data: {some: 'literal'}) {}
      }`,
      filename: 'front_end/common/foo.ts',
      errors:
          [{message: 'A data setter parameter\'s type must be a type reference, not a literal type defined inline.'}]
    },
  ]
});
