// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-equal-boolean-null-undefined.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-equal-boolean-null-undefined', rule, {
  valid: [
    {
      code: 'assert.equal(foo, false);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.equal(foo, null);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.equal(foo, true);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.equal(foo, undefined);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.notEqual(foo, false);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.notEqual(foo, null);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.notEqual(foo, true);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.notEqual(foo, undefined);',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'assert.deepEqual(foo, false);',
      output: 'assert.isFalse(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsFalse',
        },
      ],
    },
    {
      code: 'assert.strictEqual(foo, false);',
      output: 'assert.isFalse(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsFalse',
        },
      ],
    },
    {
      code: 'assert.deepEqual(foo, null);',
      output: 'assert.isNull(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNull',
        },
      ],
    },
    {
      code: 'assert.strictEqual(foo, null);',
      output: 'assert.isNull(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNull',
        },
      ],
    },
    {
      code: 'assert.deepEqual(foo, true);',
      output: 'assert.isTrue(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsTrue',
        },
      ],
    },
    {
      code: 'assert.strictEqual(foo, true);',
      output: 'assert.isTrue(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsTrue',
        },
      ],
    },
    {
      code: 'assert.deepEqual(foo, undefined);',
      output: 'assert.isUndefined(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsUndefined',
        },
      ],
    },
    {
      code: 'assert.strictEqual(foo, undefined);',
      output: 'assert.isUndefined(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsUndefined',
        },
      ],
    },
    {
      code: 'assert.notDeepEqual(foo, false);',
      output: 'assert.isNotFalse(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotFalse',
        },
      ],
    },
    {
      code: 'assert.notStrictEqual(foo, false);',
      output: 'assert.isNotFalse(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotFalse',
        },
      ],
    },
    {
      code: 'assert.notDeepEqual(foo, null);',
      output: 'assert.isNotNull(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotNull',
        },
      ],
    },
    {
      code: 'assert.notStrictEqual(foo, null);',
      output: 'assert.isNotNull(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotNull',
        },
      ],
    },
    {
      code: 'assert.notDeepEqual(foo, true);',
      output: 'assert.isNotTrue(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotTrue',
        },
      ],
    },
    {
      code: 'assert.notStrictEqual(foo, true);',
      output: 'assert.isNotTrue(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotTrue',
        },
      ],
    },
    {
      code: 'assert.notDeepEqual(foo, undefined);',
      output: 'assert.isDefined(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsDefined',
        },
      ],
    },
    {
      code: 'assert.notStrictEqual(foo, undefined);',
      output: 'assert.isDefined(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsDefined',
        },
      ],
    },
  ],
});
