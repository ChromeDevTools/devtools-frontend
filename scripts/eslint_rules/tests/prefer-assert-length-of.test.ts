// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-length-of.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-length-of', rule, {
  valid: [
    {
      code: 'assert.strictEqual(a.length + b.length, 4);',
      filename: 'foo.ts',
    },
    {
      code: 'bar.deepEqual(weirdObject.length, [1, 2]);',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'assert.strictEqual(array.length, 1);',
      output: 'assert.lengthOf(array, 1);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.strictEqual(20, array.length);',
      output: 'assert.lengthOf(array, 20);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.strictEqual(array.length, 5, "message");',
      output: 'assert.lengthOf(array, 5, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.strictEqual(9, array.length, "message");',
      output: 'assert.lengthOf(array, 9, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.deepEqual(array.length, 1);',
      output: 'assert.lengthOf(array, 1);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.deepEqual(20, array.length);',
      output: 'assert.lengthOf(array, 20);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.deepEqual(array.length, 5, "message");',
      output: 'assert.lengthOf(array, 5, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.deepEqual(9, array.length, "message");',
      output: 'assert.lengthOf(array, 9, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.equal(array.length, 1);',
      output: 'assert.lengthOf(array, 1);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.equal(20, array.length);',
      output: 'assert.lengthOf(array, 20);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.equal(array.length, 5, "message");',
      output: 'assert.lengthOf(array, 5, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
    {
      code: 'assert.equal(9, array.length, "message");',
      output: 'assert.lengthOf(array, 9, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertLengthOf',
        },
      ],
    },
  ],
});
