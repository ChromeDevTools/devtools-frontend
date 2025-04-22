// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-strict-equal-for-arrays-and-objects.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-strict-equal-for-arrays-and-objects', rule, {
  valid: [
    {
      code: 'assert.deepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.notDeepEqual(someResult, [2])',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.deepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.notDeepEqual(someResult, {x: 2})',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.strictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.notStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.deepStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'assert.notDeepStrictEqual(false, false)',
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
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
