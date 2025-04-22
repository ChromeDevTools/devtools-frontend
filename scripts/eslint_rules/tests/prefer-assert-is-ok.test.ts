// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-is-ok.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-is-ok', rule, {
  valid: [
    {
      code: 'assert(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert(a, "message");',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isOk(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isOk(a, "message");',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isNotOk(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isNotOk(a, "message");',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'assert(!foo);',
      output: 'assert.isNotOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert(!foo, "message");',
      output: 'assert.isNotOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },

    {
      code: 'assert.ok(foo);',
      output: 'assert.isOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOk',
        },
      ],
    },
    {
      code: 'assert.ok(foo, "message");',
      output: 'assert.isOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOk',
        },
      ],
    },
    {
      code: 'assert.notOk(foo);',
      output: 'assert.isNotOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOk',
        },
      ],
    },
    {
      code: 'assert.notOk(foo, "message");',
      output: 'assert.isNotOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOk',
        },
      ],
    },

    {
      code: 'assert.ok(!foo);',
      output: 'assert.isNotOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.ok(!foo, "message");',
      output: 'assert.isNotOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.notOk(!foo);',
      output: 'assert.isOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.notOk(!foo, "message");',
      output: 'assert.isOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOkInsteadOfNegation',
        },
      ],
    },

    {
      code: 'assert.isTrue(!foo);',
      output: 'assert.isNotOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.isTrue(!foo, "message");',
      output: 'assert.isNotOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.isFalse(!foo);',
      output: 'assert.isOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOkInsteadOfNegation',
        },
      ],
    },
    {
      code: 'assert.isFalse(!foo, "message");',
      output: 'assert.isOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOkInsteadOfNegation',
        },
      ],
    },
  ],
});
