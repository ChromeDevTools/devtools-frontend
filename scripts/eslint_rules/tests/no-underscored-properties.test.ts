// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-underscored-properties.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-underscored-properties', rule, {
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
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      filename: 'foo.ts',
      code: `class X {
        public _foo: string = '';
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
      filename: 'foo.ts',
      code: `class X {
        _foo: string = '';
      }`,
      errors: [
        {messageId: 'underscorePrefix'},
      ],
    },
    {
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
