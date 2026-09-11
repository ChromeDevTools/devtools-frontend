// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-deep-strict-equal.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-deep-strict-equal', rule, {
  valid: [
    {
      name: 'allows assert.deepEqual',
      code: 'assert.deepEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      name: 'allows bar.deepStrictEqual on non-assert object',
      code: 'bar.deepStrictEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      name: 'allows chained assert.deepStrictEqual on property',
      code: 'foo.assert.deepStrictEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assigning assert.deepStrictEqual without call',
      code: 'const fn = assert.deepStrictEqual;',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows assert.deepStrictEqual without custom message',
      code: 'assert.deepStrictEqual(array, [1, 2]);',
      output: 'assert.deepEqual(array, [1, 2]);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'unexpectedAssertDeepStrictEqual',
        },
      ],
    },
    {
      name: 'disallows assert.deepStrictEqual with custom message',
      code: 'assert.deepStrictEqual(array, [1, 2], "Some message");',
      output: 'assert.deepEqual(array, [1, 2], "Some message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'unexpectedAssertDeepStrictEqual',
        },
      ],
    },
  ],
});
