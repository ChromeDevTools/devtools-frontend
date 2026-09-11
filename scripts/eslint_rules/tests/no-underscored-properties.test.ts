// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-underscored-properties.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-underscored-properties', rule, {
  valid: [
    {
      name: 'allows private property without underscore',
      filename: 'foo.ts',
      code: `class X {
        private foo: string = '';
      }`,
    },
    {
      name: 'allows private method without underscore',
      filename: 'foo.ts',
      code: `class X {
        private foo() {
        }
      }`,
    },
    {
      name: 'allows public method without underscore',
      filename: 'foo.ts',
      code: `class X {
        public foo() {
        }
      }`,
    },
    {
      name: 'allows public method without accessibility modifier',
      filename: 'foo.ts',
      code: `class X {
        foo() {
        }
      }`,
    },
    {
      name: 'allows private underscored property when getter with matching name exists',
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
      name: 'disallows private underscored property without getter',
      filename: 'foo.ts',
      code: `class X {
        private _foo: string = '';
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      name: 'disallows public underscored property',
      filename: 'foo.ts',
      code: `class X {
        public _foo: string = '';
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      name: 'disallows implicit public underscored property',
      filename: 'foo.ts',
      code: `class X {
        _foo: string = '';
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      name: 'disallows underscored method',
      filename: 'foo.ts',
      code: `class X {
        _foo() {
        }
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      name: 'disallows private underscored method',
      filename: 'foo.ts',
      code: `class X {
        private _foo() {
          console.log('I am private');
        }
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
  ],
});
