// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-is-ok.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-is-ok', rule, {
  valid: [
    {
      name: 'allows assert(a)',
      code: 'assert(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert(a, message)',
      code: 'assert(a, "message");',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isOk(a)',
      code: 'assert.isOk(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isOk(a, message)',
      code: 'assert.isOk(a, "message");',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isNotOk(a)',
      code: 'assert.isNotOk(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isNotOk(a, message)',
      code: 'assert.isNotOk(a, "message");',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'flags assert(!foo)',
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
      name: 'flags assert(!foo, message)',
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
      name: 'flags assert.ok(foo)',
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
      name: 'flags assert.ok(foo, message)',
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
      name: 'flags assert.notOk(foo)',
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
      name: 'flags assert.notOk(foo, message)',
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
      name: 'flags assert.ok(!foo)',
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
      name: 'flags assert.ok(!foo, message)',
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
      name: 'flags assert.notOk(!foo)',
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
      name: 'flags assert.notOk(!foo, message)',
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
      name: 'flags assert.isTrue(!foo)',
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
      name: 'flags assert.isTrue(!foo, message)',
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
      name: 'flags assert.isFalse(!foo)',
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
      name: 'flags assert.isFalse(!foo, message)',
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
