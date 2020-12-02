// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/no_underscored_properties.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no_underscored_properties', rule, {
  valid: [
    {
      filename: 'foo.ts',
      code: `class X {
        private foo: string = '';
      }`,
    },
    {
      filename: 'foo.ts',
      code: `class X {
        private foo() {
        }
      }`,
    },
    {
      filename: 'foo.ts',
      code: `class X {
        public foo() {
        }
      }`,
    },
    {
      filename: 'foo.ts',
      code: `class X {
        foo() {
        }
      }`,
    },
    {
      filename: 'foo.ts',
      code: `class X {
        private _foo: string = '';
        get foo() {
          return this._foo;
        }
      }`,
    },
  ],

  invalid: [
    {
      filename: 'foo.ts',
      code: `class X {
        private _foo: string = '';
      }`,
      errors: [{message: 'Class property _foo should not begin with an underscore.'}]
    },
    {
      filename: 'foo.ts',
      code: `class X {
        public _foo: string = '';
      }`,
      errors: [{message: 'Class property _foo should not begin with an underscore.'}]
    },
    {
      filename: 'foo.ts',
      code: `class X {
        _foo: string = '';
      }`,
      errors: [{message: 'Class property _foo should not begin with an underscore.'}]
    },
    {
      filename: 'foo.ts',
      code: `class X {
        _foo() {
        }
      }`,
      errors: [{message: 'Class method _foo should not begin with an underscore.'}]
    },
    {
      filename: 'foo.ts',
      code: `class X {
        private _foo() {
          console.log('I am private');
        }
      }`,
      errors: [{message: 'Class method _foo should not begin with an underscore.'}]
    }
  ]
});
