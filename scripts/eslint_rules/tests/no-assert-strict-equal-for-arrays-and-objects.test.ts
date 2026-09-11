// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-strict-equal-for-arrays-and-objects.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-strict-equal-for-arrays-and-objects', rule, {
  valid: [
    {
      name: 'allows assert.deepEqual for array',
      code: 'assert.deepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.notDeepEqual for array',
      code: 'assert.notDeepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.deepEqual for object',
      code: 'assert.deepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.notDeepEqual for object',
      code: 'assert.notDeepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.strictEqual for boolean',
      code: 'assert.strictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.notStrictEqual for boolean',
      code: 'assert.notStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.deepStrictEqual for boolean',
      code: 'assert.deepStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.notDeepStrictEqual for boolean',
      code: 'assert.notDeepStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows assert.strictEqual for array and replaces with deepEqual',
      code: 'assert.strictEqual(someResult, [2])',
      output: 'assert.deepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'unexpectedAssertStrictEqual',
        },
      ],
    },
    {
      name: 'disallows assert.notStrictEqual for array and replaces with notDeepEqual',
      code: 'assert.notStrictEqual(someResult, [2])',
      output: 'assert.notDeepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'unexpectedAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'disallows assert.strictEqual for object and replaces with deepEqual',
      code: 'assert.strictEqual(someResult, {x: 2})',
      output: 'assert.deepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'unexpectedAssertStrictEqual',
        },
      ],
    },
    {
      name: 'disallows assert.notStrictEqual for object and replaces with notDeepEqual',
      code: 'assert.notStrictEqual(someResult, {x: 2})',
      output: 'assert.notDeepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'unexpectedAssertNotStrictEqual',
        },
      ],
    },
  ],
});
