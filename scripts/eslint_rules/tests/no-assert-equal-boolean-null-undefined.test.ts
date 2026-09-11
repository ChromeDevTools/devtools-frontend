// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-equal-boolean-null-undefined.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-equal-boolean-null-undefined', rule, {
  valid: [
    {
      name: 'allows assert.equal(foo, false)',
      code: 'assert.equal(foo, false);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.equal(foo, null)',
      code: 'assert.equal(foo, null);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.equal(foo, true)',
      code: 'assert.equal(foo, true);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.equal(foo, undefined)',
      code: 'assert.equal(foo, undefined);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.notEqual(foo, false)',
      code: 'assert.notEqual(foo, false);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.notEqual(foo, null)',
      code: 'assert.notEqual(foo, null);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.notEqual(foo, true)',
      code: 'assert.notEqual(foo, true);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.notEqual(foo, undefined)',
      code: 'assert.notEqual(foo, undefined);',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'flags assert.deepEqual(foo, false)',
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
      name: 'flags assert.strictEqual(foo, false)',
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
      name: 'flags assert.deepEqual(foo, null)',
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
      name: 'flags assert.strictEqual(foo, null)',
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
      name: 'flags assert.deepEqual(foo, true)',
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
      name: 'flags assert.strictEqual(foo, true)',
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
      name: 'flags assert.deepEqual(foo, undefined)',
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
      name: 'flags assert.strictEqual(foo, undefined)',
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
      name: 'flags assert.notDeepEqual(foo, false)',
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
      name: 'flags assert.notStrictEqual(foo, false)',
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
      name: 'flags assert.notDeepEqual(foo, null)',
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
      name: 'flags assert.notStrictEqual(foo, null)',
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
      name: 'flags assert.notDeepEqual(foo, true)',
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
      name: 'flags assert.notStrictEqual(foo, true)',
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
      name: 'flags assert.notDeepEqual(foo, undefined)',
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
      name: 'flags assert.notStrictEqual(foo, undefined)',
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
