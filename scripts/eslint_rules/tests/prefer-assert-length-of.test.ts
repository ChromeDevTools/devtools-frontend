// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-length-of.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-length-of', rule, {
  valid: [
    {
      name: 'allows comparing sum of lengths',
      code: 'assert.strictEqual(a.length + b.length, 4);',
      filename: 'foo.ts',
    },
    {
      name: 'allows non-assert deepEqual on length property',
      code: 'bar.deepEqual(weirdObject.length, [1, 2]);',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows strictEqual with array.length as actual',
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
      name: 'disallows strictEqual with array.length as expected',
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
      name: 'disallows strictEqual with array.length and custom message',
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
      name: 'disallows strictEqual with number first and custom message',
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
      name: 'disallows deepEqual with array.length as actual',
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
      name: 'disallows deepEqual with array.length as expected',
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
      name: 'disallows deepEqual with array.length and custom message',
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
      name: 'disallows deepEqual with number first and custom message',
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
      name: 'disallows equal with array.length as actual',
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
      name: 'disallows equal with array.length as expected',
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
      name: 'disallows equal with array.length and custom message',
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
      name: 'disallows equal with number first and custom message',
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
